# Local voice input: first workflow and acceptance plan

Recorded November 4, 2026. Step 1 defines behavior; no voice implementation or
platform verification is claimed here.

## Current decision: implementation deferred

The user directed that Whisper implementation wait until all fields requiring
user input are known. Do not install/download the engine or models, build a
transcription prototype, or add recording UI, IPC, or packaging changes until
that inventory is complete and the voice-input scope has been determined.

Before implementation, inventory existing and planned input fields against the
Statement of Work. For each field, record its screen/workflow, type, required or
optional status, validation/length rules, sensitivity, and whether voice input
is appropriate. Include text, selections, dates, search/filter controls, and file
inputs; an input field does not automatically require dictation support. Mark
unknown or planned fields explicitly rather than treating the current UI as the
complete requirements list. Use the inventory to determine voice-enabled fields
and their review/correction behavior while retaining Windows/macOS/Linux scope.

## Scope and assumptions

The user requested local voice input and cross-operating-system compatibility.
English contact-note dictation using the existing Log contact note dialog is a
candidate example, not the selected implementation scope. English and a
60-second recording limit are provisional ideas, not agreed requirements.

The current [Statement of Work](statement-of-work.md) excludes voice dictation
from its phase. This document records a newly requested extension without
changing that agreement or claiming client acceptance. Windows and macOS are
the existing MVP targets; Linux remains a final platform target. Voice design
must accommodate all three. Support claims require installed-build evidence.

## Candidate contact-note workflow (pending input inventory)

1. Authenticate, select a contractor, and open Log contact note.
2. Choose the contact method as today. Dictation does not change that selection.
3. Click Record. Request microphone permission when needed and display a clear
   recording indicator, elapsed time, Stop, and Cancel controls.
4. Speak a note, then click Stop. Stop microphone capture and show Transcribing.
   At the duration limit, stop capture and transcribe the recorded portion.
5. Show the transcript as an editable preview. Do not change the existing draft
   automatically. Offer Insert into note, Discard transcript, and Record again.
6. Insert appends the reviewed plain text to the existing draft with a separating
   newline when needed. Preserve typed content and formatting. Never interpret
   transcript text as HTML, code, or application commands.
7. Review/edit the note and click the existing Save action. Only successful
   completion of recordContactNote means the note was saved. Keep the current
   save-time timestamp behavior; recording does not update last contact.

Typing remains available if voice input is unavailable. Disable Save during
recording/transcription and while a transcript awaits insertion or discard, so
an unfinished recording is not silently omitted. Allow only one voice operation
at a time. Controls must have keyboard access and accessible labels/status text.

## Cancellation, failure, and session behavior

- Cancel releases the microphone, cancels pending work, and discards only voice
  artifacts. Existing typed notes remain while the dialog stays open.
- Closing the dialog cancels voice work and follows the existing draft-discard
  behavior. Late results must never populate another contractor's dialog.
- Lock/logout cancels voice work and clears voice previews alongside the existing
  protected UI. Check authentication at the backend boundary and reject stale
  results after locking, reopening, or changing the selected contractor.
- Permission denial, absent devices, missing models, engine errors, and timeouts
  produce actionable errors without modifying the draft or reporting success.
- Silence/no usable speech produces a retry message. Test quiet and noisy input;
  do not assume a speech recognizer always returns an empty transcript for silence.

## Local processing and compatibility constraints

Use a local Whisper engine; whisper.cpp is the proposed runtime, not an installed
dependency yet. No cloud transcription, runtime model downloads, transcript
telemetry, or local HTTP server is needed for this design.

Keep a common frontend/IPC interface and backend service across Windows, macOS,
and Linux. Package native engine binaries/libraries per OS and architecture with
the same compatible model. Resolve resources and temporary locations through
portable APIs, never developer-specific paths. Record the pinned runtime/model,
checksums, licenses, and platform build instructions when dependencies are added.

Evaluate microphone capture on each target early; do not assume identical WebView
permissions or recording formats. Normalize audio to a tested common format
(initial proposal: 16 kHz mono 16-bit PCM WAV). A renamed file is not conversion.
Use background processing so recording/transcription does not freeze the UI.

Prefer memory for transient audio where practical. If the CLI requires files,
use a unique application-owned temporary workspace outside the repository and
cloud-synced folders. Clean up on success, error, cancellation, and startup after
an interrupted operation. Do not log audio or transcripts. File deletion is not
a secure-erasure guarantee. Only the user-reviewed saved note belongs in SQLite.

## Acceptance evidence to collect

For every tested build, record OS version, CPU architecture, hardware, engine and
model versions, installer/build identity, transcription duration, and outcome.
Windows x64 and macOS Apple Silicon/Intel are initial candidates; actual supported
architectures must match release commitments. Identify a Linux distribution and
architecture for final acceptance instead of claiming generic Linux support.

| Scenario | Required observation |
| --- | --- |
| Same fictional sample WAV on each target | Local engine returns usable text with networking disabled; differences recorded. |
| Installed build, no developer tools | Engine, model, libraries, and microphone setup work without downloads. |
| Record, stop, preview, insert | Text reaches the correct note draft; existing draft is preserved. |
| Edit, save, restart | Reviewed note persists through the existing save path. |
| Cancel, retry, close dialog | Microphone is released; no stale transcript or temporary artifacts remain. |
| Lock or switch context mid-operation | Pending output cannot restore protected data or modify another draft. |
| Permission denial, no microphone, missing model, failure | Useful error; typed workflow still works. |
| Silence, noise, unfamiliar fictional names | Accuracy limitations documented; user review remains available. |
| Duration limit and repeated clicks | Bounded input and one operation; responsive UI. |

## Implementation order after step 1

1. Complete the existing/planned input-field inventory and determine which
   fields should support voice. Revisit this candidate workflow and acceptance
   criteria against that scope before beginning implementation.
2. Pin the runtime/model and transcribe the same fictional sample WAV on Windows
   and macOS; track Linux verification separately until performed.
3. Add a background Rust transcription service and authenticated Tauri command.
   Document the actual request/response, limits, cancellation, and errors in
   ipc-contract.md when the interface is implemented.
4. Prove microphone capture/audio conversion on target systems, then connect the
   recording controls and preview to the fields selected from the inventory.
5. Bundle native components and model; run installed/offline acceptance per target.

No voice commands, automatic saves, always-on listening, schema changes, or
changes to existing contact methods are part of this first workflow.
