// Build-time provisioning only. Installed applications never download these files.
const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { pipeline } = require('node:stream/promises'); const { Readable } = require('node:stream');
const manifest = require('./voice-resources.json');
const root = path.resolve(__dirname, '..'); const cache = path.join(root, 'src-tauri/target/build-tools');
const resources = path.join(root, 'src-tauri/resources/voice');
function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function run(command, args) { const result = spawnSync(command, args, { stdio: 'inherit', windowsHide: true }); if (result.error || result.status) throw new Error(`${command} failed: ${result.error?.message || result.status}`); }
async function obtain(entry, file) {
  if (fs.existsSync(file) && hash(file) === entry.sha256) return;
  const response = await fetch(entry.url); if (!response.ok) throw new Error(`Resource download failed (${response.status})`);
  const staged = file + '.download'; await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(staged));
  if (hash(staged) !== entry.sha256) throw new Error('Resource checksum mismatch: ' + path.basename(file));
  fs.renameSync(staged, file);
}
(async () => {
  fs.mkdirSync(cache, { recursive: true }); fs.mkdirSync(resources, { recursive: true });
  await obtain(manifest.model, path.join(resources, 'ggml-base.bin'));
  const sourceArchive = path.join(cache, 'whisper-v1.8.2-source.tar.gz'); await obtain(manifest.source, sourceArchive);
  run('tar', ['-xf', sourceArchive, '-C', cache]);
  const source = path.join(cache, 'whisper.cpp-' + manifest.version);
  fs.copyFileSync(path.join(source, 'LICENSE'), path.join(resources, 'WHISPER-LICENSE.txt'));
  fs.writeFileSync(path.join(resources, 'provenance.json'), JSON.stringify(manifest, null, 2));
  if (process.platform === 'win32') {
    const archive = path.join(cache, 'whisper-v1.8.2-x64.zip'); await obtain(manifest.runtime, archive);
    const extracted = path.join(cache, 'whisper-runtime'); fs.mkdirSync(extracted, { recursive: true }); run('tar', ['-xf', archive, '-C', extracted]);
    const destination = path.join(resources, 'Release'); fs.mkdirSync(destination, { recursive: true });
    for (const name of ['whisper-cli.exe', 'whisper.dll', 'ggml.dll', 'ggml-base.dll', 'ggml-cpu.dll']) fs.copyFileSync(path.join(extracted, 'Release', name), path.join(destination, name));
  } else if (process.platform === 'darwin') {
    const binaries = [];
    for (const arch of ['arm64', 'x86_64']) {
      const build = path.join(cache, 'whisper-mac-' + arch);
      run('cmake', ['-S', source, '-B', build, '-DCMAKE_BUILD_TYPE=Release', '-DCMAKE_SYSTEM_NAME=Darwin', '-DCMAKE_OSX_DEPLOYMENT_TARGET=13.0', '-DBUILD_SHARED_LIBS=OFF', '-DGGML_NATIVE=OFF', '-DGGML_METAL=OFF', '-DGGML_OPENMP=OFF', '-DWHISPER_BUILD_TESTS=OFF', '-DWHISPER_BUILD_EXAMPLES=ON', '-DCMAKE_OSX_ARCHITECTURES=' + arch, '-DCMAKE_SYSTEM_PROCESSOR=' + arch]);
      run('cmake', ['--build', build, '--config', 'Release', '--target', 'whisper-cli', '--parallel', '3']);
      binaries.push(path.join(build, 'bin/whisper-cli'));
    }
    const destination = path.join(resources, 'whisper-cli'); run('lipo', ['-create', ...binaries, '-output', destination]); fs.chmodSync(destination, 0o755); run('codesign', ['--force', '--sign', '-', destination]);
  } else throw new Error('This release resource script currently packages Windows x64 and macOS universal.');
  console.log('Pinned offline dictation resources prepared for ' + process.platform);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
