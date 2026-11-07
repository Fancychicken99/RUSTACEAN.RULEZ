# Database encryption and recovery

Implemented November 7, 2026. Final verification includes 49 passing backend and
six bridge/voice tests, with actual SQLCipher migration, recovery and encrypted
portable transfer in isolated temporary workspaces. Windows release compiled;
UI and installer acceptance are tracked in final-submission-verification.md.
No ordinary user database has been opened or migrated by this work. Tests provide
specific behavior evidence, not security certification or full platform proof.

## Storage and unlock design

- SQLCipher is statically bundled through rusqlite's
  bundled-sqlcipher-vendored-openssl feature. A build without cipher_version fails
  closed. No database password/key is compiled into the executable.
- Every new workspace gets a random 256-bit database key. SQLCipher encrypts the
  active SQLite file and its database pages/journals. Temporary SQL storage is
  configured in memory. SQLCipher memory security is enabled.
- Password and recovery secret independently protect the same database key with
  AES-256-GCM. Each wrapping operation has a fresh random 128-bit salt and 96-bit
  nonce. Argon2id v19 derives a 256-bit wrapping key: m=65536 KiB, t=3, p=1.
  These fixed parameters belong to format v1 and are not accepted from metadata.
- Authenticated data binds each wrapper to the vault ID, format and purpose.
  Metadata contains encrypted key wrappers, not the password, recovery secret,
  or raw database key. Read size/version/filename/wrapper sizes are bounded.
- Store layout: crm.vault.json, random vault-<32 hex>.db, crm.vault.lock in app
  data. The manifest names its associated database; both are required for recovery
  or eventual portable transfer. Copying only the encrypted .db is insufficient.
- Metadata replacement stages a private temporary file, syncs it, and atomically
  persists it; Unix also syncs the directory. An exclusive process lock prevents
  simultaneous application instances from changing workspace access metadata.
- Setup/login/recovery IPC credentials are wrapped in Zeroizing on the Rust side;
  derived keys and raw-key strings get best-effort cleanup. Browser/IPC copies,
  cryptographic library buffers and OS memory do not establish full memory erasure.
- No real database connection is retained while locked: the bridge uses an empty
  in-memory placeholder; logout/observed expiry closes the SQLCipher connection.
  Existing backend session expiry and authorization remain enforced. Repeated
  failed login/recovery/password changes get in-process delays (8/16/32 seconds
  after attempts 3/4/5+). Restart resets this delay; this is not a host-proof lockout.

## Setup and recovery experience

Setup requires 12 or more Rust characters and at most 1024 UTF-8 bytes. Passwords
are never trimmed. Setup returns one recovery code: 256 random bits encoded as
eight groups of eight hexadecimal characters. The screen requires acknowledgement
that the code was saved; it is then cleared. It is not saved to localStorage or
logged. No email, network service, security questions, or destructive reset.

Forgot-password accepts the saved code plus a new password. It first verifies
the encrypted database, then replaces the password/recovery wrappers atomically.
It leaves records intact, rotates the recovery code and requires a fresh login.
Settings also supports current-password verification followed by changing the
password/recovery code. The old code/password no longer unlock via the current
manifest. Copies of old manifests/keys/backups are not revoked by wrapper rotation;
the database key is unchanged. Protect backups accordingly.

An encrypted workspace authenticates through successful key unwrap, not the
legacy local_admin hash. That table remains for old database compatibility and
standalone backend tests, and its hash is not the encrypted vault's credential
authority after password changes.

## Existing plaintext installations

Until a vault manifest exists, the old database is read only to discover/verify
its existing administrator. After a successful old-password login (or setup on
an unconfigured store), provision a new encrypted database using sqlcipher_export.
Copy user_version, compare every application table's row count, initialize current
migrations, run SQLCipher and SQLite integrity checks, sync the result and commit
the manifest. Source remains intact on migration failure. A newly generated
recovery key is delivered once through authenticated take_recovery_key.

The original plaintext source is intentionally retained initially. A persistent
notice says it is unencrypted; no claim that all on-device data is encrypted while
it remains. Cleanup requires login and explicit UI confirmation, repeats encrypted
integrity checking, refuses an original whose SHA-256 changed or which has journal
sidecars, and removes only the original file. This is removing a redundant copy,
not deleting the active records. External backups/OS snapshots are outside this
cleanup and secure physical erasure is not promised.

Failed provisioning may leave an orphan encrypted staging database, while the
original remains authoritative until a valid manifest is committed. No automatic
destructive repair or empty-store replacement when files/metadata are corrupt or
missing. Preserve the files and diagnose before any recovery beyond the key flow.

## Boundaries and final verification queue

Database encryption does not encrypt external photos/logos, user-saved recovery
codes, OS backups or screenshots. Portable .hharbor export separately encrypts
the snapshot and linked media with authenticated encryption. Neither protects an
unlocked compromised host, replaces OS controls or implies certification.

Windows build prerequisites are resolved using checksum-pinned portable Perl
under the ignored target/build-tools directory. Current debug and optimized
Windows builds compile with statically vendored crypto; installer generation
works. Native macOS build and clean installed-device acceptance remain pending.
Cargo dependencies and both lockfiles are updated.

Run real tests for fresh setup/restart, wrong/old/new passwords and recovery codes,
rate limiting, key acknowledgement/clearing/rotation, idle/sleep closure, missing/
corrupt metadata/database, migration with relationships/archives/history, injected
copy/metadata failures, sidecar/changed-source cleanup refusal, successful cleanup,
ordinary SQLite's inability to read encrypted records, disk inspection for
plaintext, and native installed/offline behavior. Actual migration, cipher
unreadability, recovery/rotation and encrypted transfer already pass backend tests;
the remaining negative/fault/platform scenarios require their own evidence. The
native smoke now acknowledges recovery keys and reads archive state through
authenticated IPC instead of opening the encrypted file with plaintext SQLite.

Design references: [SQLCipher API](https://www.zetetic.net/sqlcipher/sqlcipher-api/),
[plaintext migration](https://www.zetetic.net/sqlcipher/encrypting-plaintext-databases/),
[Argon2 key derivation](https://docs.rs/argon2/latest/argon2/),
[AES-GCM API](https://docs.rs/aes-gcm/0.10.3/aes_gcm/),
[atomic metadata persistence](https://docs.rs/tempfile/latest/tempfile/struct.NamedTempFile.html),
[vendored crypto build requirements](https://docs.rs/openssl/latest/openssl/#vendored).
