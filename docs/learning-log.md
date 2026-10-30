# Rust learning log

Personal to Broughnut. Updated October 29, 2026.
Goal: understand Rust and explain project decisions in the final defense.
Explain purpose/file placement, introduce syntax as it appears, and keep steps
small. Distinguish Rust features from rusqlite, Serde, and Tauri APIs.

## Environment and introduced topics

Rust/Cargo 1.99.1 installed on this Windows device with existing C++ Build Tools.
All 27 locked backend tests passed. Setup/test execution is not user coding practice.
Introduced compiler vs Cargo, version numbers vs edition, Cargo.toml/Cargo.lock,
lib.rs/main.rs/modules/tests, and tracing add_contractor into SQLite.
Also introduced function parameters/return types, Result/?, match, ownership and
borrowing, String/&str, structs/Option, serialization, IPC, managed state,
mutex guards, startup, and command registration. No hands-on exercise completed.

## Teach-back evidence

- Rust/Cargo distinction confirmed at introductory level: user said Rust is the
  language and Cargo the builder; expanded Cargo's dependency/test role.
- Result/? effect understood: user identified preventing false insert success.
- Empty successful list vs failure understood: user selected empty list for zero
  records and login error for failed authentication.
- Borrowing: user confirmed connection remains usable after a borrowed call.
  Initially attributed cleanup to the let line; corrected that cleanup occurs
  when owner leaves scope. Revisit scope and ownership transfer in actual code.
- Option: user said it can be empty; clarified None vs Some(empty String).
  Distinction introduced, not independently confirmed yet.
- Mutex: user correctly said finishing command should release the lock.
- Registration: user correctly said an unregistered command cannot be invoked.
- Layer boundary: user correctly placed SQL in the backend.

## Next learning steps

1. Apply the concepts while defining and implementing the first Tauri command.
2. Revisit ownership moves, scope cleanup, and None vs empty text with examples.
3. Explain managed state, mutex error mapping, and serialization in actual code.
4. Run the connected executable and distinguish backend tests from desktop E2E.

No claim of independent implementation proficiency yet; teach-back confirms only
these introductory concepts. User has asked to proceed toward implementation.
