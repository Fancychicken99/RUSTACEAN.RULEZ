# Hippo Harbor CRM final demonstration

Use synthetic records only. Start with the installed application rather than a
development server. Verify the artifact version and platform before presenting.

1. Create a local password and save the one-time recovery key privately. Lock
   the workspace and show incorrect/correct password behavior. Do not display a
   real password or recovery key on the projector.
2. Import samples through Settings. Explain that all identities, example-domain
   emails and generated portraits are synthetic. Show 56 directory records and
   four archived examples; repeating import preserves existing edits.
3. Open a contractor, then edit Basic Details. Show split names, optional role,
   country-aware telephone formatting and the name-plus-phone-or-email rule.
   Add an address and a small PNG/JPEG portrait, save, then reopen the record.
4. Create/edit an organization with secondary contact information and a logo.
   Demonstrate the optional inline contractor. Both records commit together.
5. Assign tags/skills in Record tools. Combine filters, show active-filter pills,
   search with a spelling variation, and clear filters. Explain that the Rust
   backend combines filters in SQL rather than substituting fixture records.
6. Log a contact note. Show derived contact age, chronological notes, status
   changes and organization transfer history. Archive and restore a sample.
7. Demonstrate system theme behavior and the light/dark preference. Notifications
   report completed operations; persistent failures remain dismissible.
8. If the microphone has passed device acceptance, dictate into an eligible text
   field. Stop, correct the transcript, explicitly insert into the draft and save.
   The bundled model runs locally. Engine verification and actual device capture
   are separate acceptance checks.
9. Export a password-encrypted portable archive using the native picker. Import
   only into a disposable demonstration workspace: import replaces its contents,
   keeps an encrypted backup and returns a new recovery key. Never import over
   ordinary records merely to demonstrate the feature.
10. Close/reopen the executable and verify the saved record/image. Show password
    recovery only in the disposable workspace, since it rotates recovery access.

## Defense explanations

- HTML/CSS/JavaScript render the interface. tauri-api.js is the shared frontend
  boundary. Typed Rust commands validate access and requests, then call backend
  modules that own SQLite and file operations.
- Cargo builds and resolves Rust dependencies. The installed user runs native
  packages without Cargo, Rust, Node or the development environment.
- SQLCipher protects the database. Password and recovery secrets independently
  wrap a random database key. Local images are separate filesystem files; avoid
  claiming that database encryption encrypts every file on the device.
- Transactions prevent a successful-looking partial save. The UI reports success
  only after the backend returns a completed operation.
- Test evidence is specific: backend behavior, native engine, desktop UI,
  installation and each operating system require their own checks. Read
  final-submission-verification.md before stating completion or compliance.

Do not present older MVP artifacts as proof that the current final build passed
on macOS. Draft-SOW Linux delivery and full manual accessibility acceptance are
explicit open items until evidence or agreed scope changes resolve them.
