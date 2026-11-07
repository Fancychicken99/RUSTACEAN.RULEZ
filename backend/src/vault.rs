//! SQLCipher database access, password key wrapping, and offline recovery.
//! Never expose database keys through IPC or write them unwrapped to disk.
use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit, Payload},
};
use argon2::{Algorithm, Argon2, Params, Version};
use fs2::FileExt;
use rusqlite::{Connection, OpenFlags, params};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File, OpenOptions},
    io::Read,
    path::{Path, PathBuf},
};
use zeroize::Zeroizing;

type VaultResult<T> = Result<T, String>;
mod transfer;
pub use transfer::TransferPreview;
const FORMAT: u32 = 1;
const PASSWORD_LIMIT: usize = 1024;

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
struct WrappedKey {
    salt: [u8; 16],
    nonce: [u8; 12],
    ciphertext: Vec<u8>,
}

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
struct Manifest {
    version: u32,
    vault_id: [u8; 16],
    database_file: String,
    password: WrappedKey,
    recovery: WrappedKey,
    legacy_digest: Option<[u8; 32]>,
}

pub struct VaultStore {
    source: PathBuf,
    manifest: PathBuf,
    // Keep an exclusive process lock for the store's lifetime, including while locked.
    _lock: File,
}

pub struct VaultStatus {
    pub configured: bool,
    pub encrypted: bool,
    pub legacy_copy_present: bool,
}

pub struct UnlockedVault {
    pub conn: Connection,
    pub recovery_key: Option<Zeroizing<String>>,
}

fn random<const N: usize>() -> VaultResult<[u8; N]> {
    let mut bytes = [0; N];
    getrandom::fill(&mut bytes).map_err(|_| "Secure random generator unavailable")?;
    Ok(bytes)
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn aad(vault_id: &[u8; 16], label: &str) -> Vec<u8> {
    let mut bytes = b"HippoHarbor-vault-v1:".to_vec();
    bytes.extend_from_slice(vault_id);
    bytes.extend_from_slice(label.as_bytes());
    bytes
}

fn wrapping_key(secret: &str, salt: &[u8; 16]) -> VaultResult<Zeroizing<[u8; 32]>> {
    if secret.len() > PASSWORD_LIMIT {
        return Err("Password or recovery key is too long".into());
    }
    // Fixed parameters are part of format v1, not attacker-controlled metadata.
    let params = Params::new(65_536, 3, 1, Some(32)).map_err(|_| "Key derivation unavailable")?;
    let mut key = Zeroizing::new([0; 32]);
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
        .hash_password_into(secret.as_bytes(), salt, &mut key[..])
        .map_err(|_| "Unable to derive unlock key")?;
    Ok(key)
}

fn wrap(secret: &str, key: &[u8; 32], vault_id: &[u8; 16], label: &str) -> VaultResult<WrappedKey> {
    let salt = random()?;
    let nonce = random()?;
    let wrapping = wrapping_key(secret, &salt)?;
    let cipher =
        Aes256Gcm::new_from_slice(&wrapping[..]).map_err(|_| "Key wrapping unavailable")?;
    let ciphertext = cipher
        .encrypt(
            Nonce::from_slice(&nonce),
            Payload {
                msg: key,
                aad: &aad(vault_id, label),
            },
        )
        .map_err(|_| "Unable to protect database key")?;
    Ok(WrappedKey {
        salt,
        nonce,
        ciphertext,
    })
}

fn unwrap(
    secret: &str,
    wrapped: &WrappedKey,
    vault_id: &[u8; 16],
    label: &str,
) -> VaultResult<Option<Zeroizing<[u8; 32]>>> {
    if wrapped.ciphertext.len() != 48 {
        return Err("Invalid vault metadata".into());
    }
    let wrapping = wrapping_key(secret, &wrapped.salt)?;
    let cipher =
        Aes256Gcm::new_from_slice(&wrapping[..]).map_err(|_| "Key wrapping unavailable")?;
    let Ok(plaintext) = cipher.decrypt(
        Nonce::from_slice(&wrapped.nonce),
        Payload {
            msg: &wrapped.ciphertext,
            aad: &aad(vault_id, label),
        },
    ) else {
        return Ok(None);
    };
    let plaintext = Zeroizing::new(plaintext);
    let mut key = Zeroizing::new([0; 32]);
    if plaintext.len() != key.len() {
        return Err("Invalid database key".into());
    }
    key.copy_from_slice(&plaintext);
    Ok(Some(key))
}

fn password_valid(password: &str) -> VaultResult<()> {
    if password.chars().count() < 12 {
        return Err("Password must contain at least 12 characters".into());
    }
    if password.len() > PASSWORD_LIMIT {
        return Err("Password must be at most 1024 UTF-8 bytes".into());
    }
    Ok(())
}

fn recovery_secret(code: &str) -> VaultResult<Zeroizing<String>> {
    if code.len() > 128 {
        return Err("Invalid recovery key".into());
    }
    let code: String = code
        .chars()
        .filter(|c| !c.is_ascii_whitespace() && *c != '-')
        .map(|c| c.to_ascii_lowercase())
        .collect();
    if code.len() != 64 || !code.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err("Invalid recovery key".into());
    }
    Ok(Zeroizing::new(code))
}

fn new_recovery() -> VaultResult<(Zeroizing<String>, Zeroizing<String>)> {
    let bytes = Zeroizing::new(random::<32>()?);
    let secret = Zeroizing::new(hex(&bytes[..]));
    let display = Zeroizing::new(
        secret
            .as_bytes()
            .chunks(8)
            .map(|chunk| std::str::from_utf8(chunk).unwrap())
            .collect::<Vec<_>>()
            .join("-"),
    );
    Ok((secret, display))
}

fn cipher_available(conn: &Connection) -> VaultResult<()> {
    let version = conn
        .query_row("PRAGMA cipher_version", [], |row| row.get::<_, String>(0))
        .map_err(|_| "This build does not include database encryption")?;
    if version.is_empty() {
        return Err("This build does not include database encryption".into());
    }
    Ok(())
}

fn open_encrypted(path: &Path, key: &[u8; 32]) -> VaultResult<Connection> {
    let conn = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
        .map_err(|_| "Unable to open encrypted database")?;
    cipher_available(&conn)?;
    // SQLCipher versions can return a status row for key PRAGMAs. sqlite3_exec
    // accepts that response; rusqlite's pragma_update expects no returned rows.
    // Only internally generated fixed-length hex enters this statement.
    let sql_key = Zeroizing::new(format!("PRAGMA key = \"x'{}'\";", hex(key)));
    conn.execute_batch(&sql_key)
        .map_err(|_| "Unable to unlock database")?;
    conn.execute_batch(
        "PRAGMA cipher_memory_security=ON; PRAGMA temp_store=MEMORY; PRAGMA foreign_keys=ON;",
    )
    .map_err(|_| "Unable to configure encrypted database")?;
    conn.query_row("SELECT COUNT(*) FROM sqlite_master", [], |row| {
        row.get::<_, i64>(0)
    })
    .map_err(|_| "Encrypted database could not be read; keep your files for recovery")?;
    Ok(conn)
}

fn integrity(conn: &Connection) -> VaultResult<()> {
    let mut statement = conn
        .prepare("PRAGMA cipher_integrity_check")
        .map_err(|_| "Unable to check encrypted database")?;
    if statement
        .query([])
        .map_err(|_| "Unable to check encrypted database")?
        .next()
        .map_err(|_| "Unable to check encrypted database")?
        .is_some()
    {
        return Err("Encrypted database integrity check failed".into());
    }
    let result: String = conn
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|_| "Unable to check database")?;
    if result != "ok" {
        return Err("Database integrity check failed".into());
    }
    Ok(())
}

fn digest(path: &Path) -> VaultResult<[u8; 32]> {
    let mut file = File::open(path).map_err(|_| "Unable to read original database")?;
    let mut hash = Sha256::new();
    let mut chunk = [0u8; 65536];
    loop {
        let n = file
            .read(&mut chunk)
            .map_err(|_| "Unable to read original database")?;
        if n == 0 {
            break;
        }
        hash.update(&chunk[..n]);
    }
    Ok(hash.finalize().into())
}

impl VaultStore {
    pub fn open(source: &Path) -> VaultResult<Self> {
        let lock_path = source.with_extension("vault.lock");
        let lock = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(lock_path)
            .map_err(|_| "Unable to open workspace lock")?;
        lock.try_lock_exclusive()
            .map_err(|_| "This workspace is already open in another process")?;
        Ok(Self {
            source: source.into(),
            manifest: source.with_extension("vault.json"),
            _lock: lock,
        })
    }

    fn load(&self) -> VaultResult<Option<Manifest>> {
        let mut file = match File::open(&self.manifest) {
            Ok(file) => file,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                let parent = self.source.parent().ok_or("Invalid workspace directory")?;
                for entry in fs::read_dir(parent).map_err(|_| "Unable to inspect workspace")? {
                    let entry = entry.map_err(|_| "Unable to inspect workspace")?;
                    let name = entry.file_name();
                    let name = name.to_string_lossy();
                    if name.starts_with("vault-") && name.ends_with(".db") {
                        return Err("Encrypted workspace files exist but vault metadata is missing. Preserve all files for recovery".into());
                    }
                }
                return Ok(None);
            }
            Err(_) => return Err("Unable to read vault metadata".into()),
        };
        let mut bytes = Vec::new();
        Read::by_ref(&mut file)
            .take(16_385)
            .read_to_end(&mut bytes)
            .map_err(|_| "Unable to read vault metadata")?;
        if bytes.len() > 16_384 {
            return Err("Invalid vault metadata".into());
        }
        let manifest: Manifest = serde_json::from_slice(&bytes)
            .map_err(|_| "Invalid vault metadata; keep your files for recovery")?;
        if manifest.version != FORMAT
            || !manifest.database_file.starts_with("vault-")
            || !manifest.database_file.ends_with(".db")
            || manifest.database_file.len() != 41
            || !manifest.database_file[6..38]
                .bytes()
                .all(|b| b.is_ascii_hexdigit())
        {
            return Err("Unsupported or invalid vault metadata".into());
        }
        if !self.database_path(&manifest).is_file() {
            return Err("Encrypted database is missing; do not reset this workspace".into());
        }
        Ok(Some(manifest))
    }

    fn database_path(&self, manifest: &Manifest) -> PathBuf {
        self.source.with_file_name(&manifest.database_file)
    }

    fn write(&self, manifest: &Manifest, fresh: bool) -> VaultResult<()> {
        let parent = self
            .manifest
            .parent()
            .ok_or("Invalid workspace directory")?;
        let mut temporary = tempfile::NamedTempFile::new_in(parent)
            .map_err(|_| "Unable to stage vault metadata")?;
        serde_json::to_writer(&mut temporary, manifest)
            .map_err(|_| "Unable to encode vault metadata")?;
        temporary
            .as_file()
            .sync_all()
            .map_err(|_| "Unable to save vault metadata")?;
        if fresh {
            temporary
                .persist_noclobber(&self.manifest)
                .map_err(|_| "Unable to create vault metadata")?;
        } else {
            temporary
                .persist(&self.manifest)
                .map_err(|_| "Unable to replace vault metadata")?;
        }
        #[cfg(unix)]
        File::open(parent)
            .and_then(|directory| directory.sync_all())
            .map_err(|_| "Unable to synchronize vault metadata")?;
        Ok(())
    }

    fn legacy(&self, writable: bool) -> VaultResult<Option<Connection>> {
        if !self.source.exists() {
            return Ok(None);
        }
        let mut header = [0; 16];
        File::open(&self.source)
            .and_then(|mut file| file.read_exact(&mut header))
            .map_err(|_| "Unable to read existing database")?;
        if &header != b"SQLite format 3\0" {
            return Err("Existing database format is unknown; keep it for recovery".into());
        }
        let flags = if writable {
            OpenFlags::SQLITE_OPEN_READ_WRITE
        } else {
            OpenFlags::SQLITE_OPEN_READ_ONLY
        };
        Connection::open_with_flags(&self.source, flags)
            .map(Some)
            .map_err(|_| "Unable to open original database".into())
    }

    pub fn status(&self) -> VaultResult<VaultStatus> {
        if let Some(manifest) = self.load()? {
            return Ok(VaultStatus {
                configured: true,
                encrypted: true,
                legacy_copy_present: manifest.legacy_digest.is_some() && self.source.exists(),
            });
        }
        let configured = match self.legacy(false)? {
            Some(conn) => crate::admin::admin_exists(&conn)
                .map_err(|_| "Unable to read existing administrator")?,
            None => false,
        };
        Ok(VaultStatus {
            configured,
            encrypted: false,
            legacy_copy_present: self.source.exists(),
        })
    }

    pub fn setup(&self, password: &str) -> VaultResult<Zeroizing<String>> {
        if self.status()?.configured {
            return Err("Administrator already configured".into());
        }
        password_valid(password)?;
        self.provision(password)
    }

    fn provision(&self, password: &str) -> VaultResult<Zeroizing<String>> {
        let key = Zeroizing::new(random::<32>()?);
        let vault_id = random::<16>()?;
        let (recovery, display) = new_recovery()?;
        let mut manifest = Manifest {
            version: FORMAT,
            vault_id,
            database_file: format!("vault-{}.db", hex(&random::<16>()?)),
            password: wrap(password, &key, &vault_id, "password")?,
            recovery: wrap(&recovery, &key, &vault_id, "recovery")?,
            legacy_digest: None,
        };
        let path = self.database_path(&manifest);
        // Reserve without overwriting any database, then key before the first write.
        OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)
            .map_err(|_| "Unable to create encrypted database")?;
        if let Some(source) = self.legacy(true)? {
            cipher_available(&source)?;
            source
                .execute_batch("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE;")
                .map_err(|_| "Close other database users before migration")?;
            let raw = Zeroizing::new(format!("x'{}'", hex(&key[..])));
            source
                .execute(
                    "ATTACH DATABASE ?1 AS encrypted KEY ?2",
                    params![path.to_str().ok_or("Invalid database path")?, &*raw],
                )
                .map_err(|_| "Unable to stage encrypted migration")?;
            let version: i64 = source
                .query_row("PRAGMA user_version", [], |row| row.get(0))
                .map_err(|_| "Unable to read database version")?;
            {
                let tx = source
                    .unchecked_transaction()
                    .map_err(|_| "Unable to start encrypted migration")?;
                tx.query_row("SELECT sqlcipher_export('encrypted')", [], |_| Ok(()))
                    .map_err(|_| "Unable to copy existing database; original preserved")?;
                let tables = {
                    let mut statement = tx.prepare("SELECT name FROM main.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
                        .map_err(|_| "Unable to inspect migration")?;
                    statement
                        .query_map([], |row| row.get::<_, String>(0))
                        .map_err(|_| "Unable to inspect migration")?
                        .collect::<rusqlite::Result<Vec<_>>>()
                        .map_err(|_| "Unable to inspect migration")?
                };
                for table in tables {
                    let table = table.replace('"', "\"\"");
                    let original: i64 = tx
                        .query_row(
                            &format!("SELECT COUNT(*) FROM main.\"{table}\""),
                            [],
                            |row| row.get(0),
                        )
                        .map_err(|_| "Unable to verify migration")?;
                    let copied: i64 = tx
                        .query_row(
                            &format!("SELECT COUNT(*) FROM encrypted.\"{table}\""),
                            [],
                            |row| row.get(0),
                        )
                        .map_err(|_| "Unable to verify migration")?;
                    if original != copied {
                        return Err(
                            "Migration row counts differ; original database preserved".into()
                        );
                    }
                }
                tx.execute_batch(&format!("PRAGMA encrypted.user_version={version};"))
                    .map_err(|_| "Unable to copy database version")?;
                tx.commit()
                    .map_err(|_| "Unable to commit encrypted migration")?;
            }
            source
                .execute_batch("DETACH DATABASE encrypted;")
                .map_err(|_| "Unable to finish encrypted migration")?;
            drop(source);
            manifest.legacy_digest = Some(digest(&self.source)?);
        }
        let conn = open_encrypted(&path, &key)?;
        crate::setup::initialize_database(&conn)
            .map_err(|_| "Unable to initialize encrypted database")?;
        if !crate::admin::admin_exists(&conn).map_err(|_| "Unable to read administrator")? {
            crate::admin::create_first_admin(&conn, password)
                .map_err(|_| "Unable to configure administrator")?;
        }
        integrity(&conn)?;
        drop(conn);
        OpenOptions::new()
            .read(true)
            .write(true)
            .open(&path)
            .and_then(|file| file.sync_all())
            .map_err(|_| "Unable to synchronize encrypted database")?;
        self.write(&manifest, true)?;
        Ok(display)
    }

    pub fn unlock(&self, password: &str) -> VaultResult<Option<UnlockedVault>> {
        if password.len() > PASSWORD_LIMIT {
            return Err("Password is too long".into());
        }
        let mut recovery_key = None;
        let manifest = match self.load()? {
            Some(manifest) => manifest,
            None => {
                let Some(source) = self.legacy(false)? else {
                    return Ok(None);
                };
                if !crate::admin::verify_admin_login(&source, password)
                    .map_err(|_| "Unable to verify original password")?
                {
                    return Ok(None);
                }
                drop(source);
                recovery_key = Some(self.provision(password)?);
                self.load()?.ok_or("Unable to read migrated vault")?
            }
        };
        let Some(key) = unwrap(password, &manifest.password, &manifest.vault_id, "password")?
        else {
            return Ok(None);
        };
        let conn = open_encrypted(&self.database_path(&manifest), &key)?;
        crate::setup::initialize_database(&conn)
            .map_err(|_| "Unable to update encrypted database")?;
        Ok(Some(UnlockedVault { conn, recovery_key }))
    }

    fn replace_access(
        &self,
        mut manifest: Manifest,
        key: &[u8; 32],
        new_password: &str,
    ) -> VaultResult<Zeroizing<String>> {
        password_valid(new_password)?;
        let conn = open_encrypted(&self.database_path(&manifest), key)?;
        integrity(&conn)?;
        drop(conn);
        let (recovery, display) = new_recovery()?;
        manifest.password = wrap(new_password, key, &manifest.vault_id, "password")?;
        manifest.recovery = wrap(&recovery, key, &manifest.vault_id, "recovery")?;
        // The database key is unchanged, so replacing metadata is the only commit.
        self.write(&manifest, false)?;
        Ok(display)
    }

    pub fn recover(&self, code: &str, new_password: &str) -> VaultResult<Zeroizing<String>> {
        password_valid(new_password)?;
        let manifest = self
            .load()?
            .ok_or("Recovery is available after encryption setup")?;
        let secret = recovery_secret(code)?;
        let key = unwrap(&secret, &manifest.recovery, &manifest.vault_id, "recovery")?
            .ok_or("Invalid recovery key")?;
        self.replace_access(manifest, &key, new_password)
    }

    pub fn change_password(
        &self,
        current: &str,
        new_password: &str,
    ) -> VaultResult<Zeroizing<String>> {
        password_valid(new_password)?;
        let manifest = self.load()?.ok_or("Encryption setup required")?;
        let key = unwrap(current, &manifest.password, &manifest.vault_id, "password")?
            .ok_or("Incorrect current password")?;
        self.replace_access(manifest, &key, new_password)
    }

    pub fn remove_legacy_copy(&self, unlocked: &Connection) -> VaultResult<()> {
        integrity(unlocked)?;
        let manifest = self.load()?.ok_or("Encryption setup required")?;
        let expected = manifest
            .legacy_digest
            .ok_or("No original migration copy to remove")?;
        if !self.source.exists() {
            return Ok(());
        }
        for suffix in ["-wal", "-journal", "-shm"] {
            let mut sidecar = self.source.as_os_str().to_os_string();
            sidecar.push(suffix);
            if Path::new(&sidecar).exists() {
                return Err("Original database has active journal files; close other database users before cleanup".into());
            }
        }
        if digest(&self.source)? != expected {
            return Err("Original database changed after migration; preserve it and reconcile changes before cleanup".into());
        }
        // The IPC caller must be authenticated and confirm cleanup in the UI.
        fs::remove_file(&self.source)
            .map_err(|_| "Unable to remove original copy; close other database users and retry")?;
        Ok(())
    }
}
