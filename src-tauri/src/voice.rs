//! One cancellable offline dictation job; credentials and database are not involved.
use std::{
    io::Read,
    path::Path,
    process::{Child, Command, Stdio},
    sync::Mutex,
    time::{Duration, Instant},
};
#[derive(Default)]
struct Job {
    generation: u64,
    child: Option<Child>,
}
#[derive(Default)]
pub struct VoiceManager {
    job: Mutex<Job>,
}
impl VoiceManager {
    pub fn ticket(&self) -> Result<u64, String> {
        Ok(self
            .job
            .lock()
            .map_err(|_| "Dictation unavailable")?
            .generation)
    }
    pub fn cancel(&self) {
        if let Ok(mut job) = self.job.lock() {
            job.generation = job.generation.wrapping_add(1);
            if let Some(mut child) = job.child.take() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
    pub fn transcribe(
        &self,
        resources: &Path,
        audio: Vec<u8>,
        ticket: u64,
    ) -> Result<String, String> {
        validate_wave(&audio)?;
        let executable = if cfg!(windows) {
            resources.join("Release/whisper-cli.exe")
        } else {
            resources.join("whisper-cli")
        };
        let model = resources.join("ggml-base.bin");
        if !executable.is_file() || !model.is_file() {
            return Err("Offline dictation resources are missing from this build".into());
        }
        let directory = tempfile::Builder::new()
            .prefix("hippo-dictation-")
            .tempdir()
            .map_err(|_| "Unable to create private audio workspace")?;
        let wave = directory.path().join("audio.wav");
        std::fs::write(&wave, audio).map_err(|_| "Unable to prepare audio")?;
        let output = directory.path().join("transcript");
        let token = {
            let mut job = self.job.lock().map_err(|_| "Dictation unavailable")?;
            if job.generation != ticket {
                return Err("Dictation cancelled".into());
            }
            if job.child.is_some() {
                return Err("A dictation job is already running".into());
            }
            job.generation = job.generation.wrapping_add(1);
            let mut command = Command::new(executable);
            command
                .arg("-m")
                .arg(model)
                .arg("-f")
                .arg(wave)
                .args(["-l", "auto", "-otxt", "-nt", "-np", "-ng", "-t", "4"])
                .arg("-of")
                .arg(&output)
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null());
            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                command.creation_flags(0x08000000);
            }
            job.child = Some(
                command
                    .spawn()
                    .map_err(|_| "Unable to start offline dictation engine")?,
            );
            job.generation
        };
        let start = Instant::now();
        loop {
            {
                let mut job = self.job.lock().map_err(|_| "Dictation unavailable")?;
                if job.generation != token {
                    return Err("Dictation cancelled".into());
                }
                let result = job
                    .child
                    .as_mut()
                    .ok_or("Dictation cancelled")?
                    .try_wait()
                    .map_err(|_| "Unable to read dictation status")?;
                if let Some(status) = result {
                    job.child.take();
                    if !status.success() {
                        return Err("Offline transcription failed; type your text or try a shorter recording".into());
                    }
                    break;
                }
                if start.elapsed() > Duration::from_secs(180) {
                    if let Some(mut child) = job.child.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                    return Err("Dictation timed out; try a shorter recording".into());
                }
            }
            std::thread::sleep(Duration::from_millis(60));
        }
        let mut transcript = String::new();
        std::fs::File::open(output.with_extension("txt"))
            .map_err(|_| "No transcript was produced")?
            .take(40_001)
            .read_to_string(&mut transcript)
            .map_err(|_| "Unable to read transcript")?;
        if transcript.len() > 40_000 {
            return Err("Transcript is too long".into());
        }
        if self
            .job
            .lock()
            .map_err(|_| "Dictation unavailable")?
            .generation
            != token
        {
            return Err("Dictation cancelled".into());
        }
        Ok(transcript.trim().to_owned())
    }
}
impl Drop for VoiceManager {
    fn drop(&mut self) {
        self.cancel();
    }
}
fn validate_wave(bytes: &[u8]) -> Result<(), String> {
    if bytes.len() < 46
        || bytes.len() > 3_840_044
        || &bytes[..4] != b"RIFF"
        || &bytes[8..16] != b"WAVEfmt "
        || &bytes[36..40] != b"data"
        || bytes[16..36]
            != [
                16, 0, 0, 0, 1, 0, 1, 0, 128, 62, 0, 0, 0, 125, 0, 0, 2, 0, 16, 0,
            ]
        || u32::from_le_bytes(bytes[4..8].try_into().unwrap()) as usize != bytes.len() - 8
        || u32::from_le_bytes(bytes[40..44].try_into().unwrap()) as usize != bytes.len() - 44
        || (bytes.len() - 44) % 2 != 0
    {
        return Err("Audio must be mono 16-bit PCM WAV at 16000 Hz, up to 120 seconds".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_invalid_audio_before_starting_engine() {
        let manager = VoiceManager::default();
        assert!(
            manager
                .transcribe(Path::new("missing"), vec![0; 44], manager.ticket().unwrap())
                .unwrap_err()
                .contains("PCM WAV")
        );
    }
    #[test]
    fn bundled_engine_transcribes_the_pinned_public_sample() {
        let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let audio =
            std::fs::read(root.join("target/build-tools/whisper.cpp-1.8.2/samples/jfk.wav"))
                .expect("Run npm run prepare:voice before bridge tests");
        // The upstream sample contains a LIST metadata chunk. Browser capture
        // emits canonical PCM; preserve the speech samples and normalize its header.
        let mut position = 12usize;
        let (offset, length) = loop {
            let length =
                u32::from_le_bytes(audio[position + 4..position + 8].try_into().unwrap()) as usize;
            if &audio[position..position + 4] == b"data" {
                break (position + 8, length);
            }
            position += 8 + length + (length % 2);
        };
        let mut canonical = audio[..36].to_vec();
        canonical.extend_from_slice(b"data");
        canonical.extend_from_slice(&(length as u32).to_le_bytes());
        canonical.extend_from_slice(&audio[offset..offset + length]);
        let riff_length = (canonical.len() - 8) as u32;
        canonical[4..8].copy_from_slice(&riff_length.to_le_bytes());
        let audio = canonical;
        let manager = VoiceManager::default();
        let ticket = manager.ticket().unwrap();
        let transcript = manager
            .transcribe(&root.join("resources/voice"), audio, ticket)
            .unwrap();
        assert!(
            transcript.to_lowercase().contains("fellow americans"),
            "Expected speech was not recognized"
        );
    }
}
