//! Password-encrypted, versioned portable workspace snapshots, including media.
use super::*;
use base64::{Engine, engine::general_purpose::STANDARD};
const MAGIC: &[u8; 8] = b"HHCRM001";
const MAX_ARCHIVE: usize = 64 * 1024 * 1024;
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct Portable {
    version: u32,
    database: String,
    key: [u8; 32],
    media: std::collections::BTreeMap<String, String>,
}
#[derive(serde::Serialize)]
pub struct TransferPreview {
    pub contractors: i64,
    pub organizations: i64,
    pub images: usize,
}
pub struct ImportResult {
    pub recovery_key: Zeroizing<String>,
    pub backup_name: Option<String>,
}

impl VaultStore {
    pub fn export_to(
        &self,
        conn: &Connection,
        path: &Path,
        password: &str,
    ) -> VaultResult<TransferPreview> {
        password_valid(password)?;
        let parent = self.source.parent().ok_or("Invalid workspace directory")?;
        let temporary =
            tempfile::NamedTempFile::new_in(parent).map_err(|_| "Unable to stage export")?;
        let key = Zeroizing::new(random::<32>()?);
        let raw = Zeroizing::new(format!("x'{}'", hex(&key[..])));
        conn.execute(
            "ATTACH DATABASE ?1 AS portable KEY ?2",
            params![
                temporary.path().to_str().ok_or("Invalid export path")?,
                &*raw
            ],
        )
        .map_err(|_| "Unable to stage encrypted snapshot")?;
        let copy = (|| -> VaultResult<()> {
            let tx = conn
                .unchecked_transaction()
                .map_err(|_| "Unable to snapshot workspace")?;
            tx.query_row("SELECT sqlcipher_export('portable')", [], |_| Ok(()))
                .map_err(|_| "Unable to copy workspace")?;
            let version: i64 = tx
                .query_row("PRAGMA user_version", [], |r| r.get(0))
                .map_err(|_| "Unable to read workspace version")?;
            tx.execute_batch(&format!("PRAGMA portable.user_version={version};"))
                .map_err(|_| "Unable to copy workspace version")?;
            tx.commit()
                .map_err(|_| "Unable to finish workspace snapshot")?;
            Ok(())
        })();
        let detach = conn.execute_batch("DETACH DATABASE portable;");
        copy?;
        detach.map_err(|_| "Unable to close snapshot")?;
        let snapshot = open_encrypted(temporary.path(), &key)?;
        snapshot
            .execute("DELETE FROM local_admin", [])
            .map_err(|_| "Unable to remove credentials from transfer snapshot")?;
        integrity(&snapshot)?;
        drop(snapshot);
        let mut media = std::collections::BTreeMap::new();
        let mut statement = conn
            .prepare("SELECT DISTINCT path FROM record_media")
            .map_err(|_| "Unable to read image references")?;
        let paths = statement
            .query_map([], |r| r.get::<_, String>(0))
            .map_err(|_| "Unable to read image references")?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|_| "Unable to read image references")?;
        let mut total = 0usize;
        for name in paths {
            let bytes = crate::media::read_owned(conn, &name)
                .map_err(|_| "An image is missing or invalid; export stopped")?;
            total = total
                .checked_add(bytes.len())
                .ok_or("Export is too large")?;
            if total > MAX_ARCHIVE / 2 {
                return Err("Images exceed this version's portable export limit (32 MiB)".into());
            }
            media.insert(name, STANDARD.encode(bytes));
        }
        let preview = preview(conn, media.len())?;
        let database =
            fs::read(temporary.path()).map_err(|_| "Unable to read encrypted snapshot")?;
        if database.len() > MAX_ARCHIVE / 4 {
            return Err("Database exceeds this version's portable export limit (16 MiB)".into());
        }
        let payload = Zeroizing::new(
            serde_json::to_vec(&Portable {
                version: 1,
                database: STANDARD.encode(database),
                key: *key,
                media,
            })
            .map_err(|_| "Unable to encode export")?,
        );
        if payload.len() > MAX_ARCHIVE - 52 {
            return Err("Portable export is too large".into());
        }
        let salt = random::<16>()?;
        let nonce = random::<12>()?;
        let derived = wrapping_key(password, &salt)?;
        let cipher =
            Aes256Gcm::new_from_slice(&derived[..]).map_err(|_| "Export encryption unavailable")?;
        let encrypted = cipher
            .encrypt(
                Nonce::from_slice(&nonce),
                Payload {
                    msg: &payload,
                    aad: MAGIC,
                },
            )
            .map_err(|_| "Unable to encrypt export")?;
        let directory = path.parent().ok_or("Invalid export destination")?;
        let mut file =
            tempfile::NamedTempFile::new_in(directory).map_err(|_| "Unable to create export")?;
        use std::io::Write;
        file.write_all(MAGIC)
            .and_then(|_| file.write_all(&salt))
            .and_then(|_| file.write_all(&nonce))
            .and_then(|_| file.write_all(&encrypted))
            .map_err(|_| "Unable to write export")?;
        file.as_file()
            .sync_all()
            .map_err(|_| "Unable to synchronize export")?;
        file.persist(path).map_err(|_| "Unable to finish export")?;
        Ok(preview)
    }
    pub fn import_from(
        &self,
        path: &Path,
        password: &str,
        new_password: &str,
        confirm: impl FnOnce(&TransferPreview) -> bool,
    ) -> VaultResult<Option<ImportResult>> {
        password_valid(new_password)?;
        let metadata = fs::metadata(path).map_err(|_| "Unable to read transfer file")?;
        if metadata.len() > MAX_ARCHIVE as u64 || metadata.len() < 52 {
            return Err("Invalid transfer file size".into());
        }
        let archive = fs::read(path).map_err(|_| "Unable to read transfer file")?;
        if &archive[..8] != MAGIC {
            return Err("Unsupported transfer file".into());
        }
        let salt: [u8; 16] = archive[8..24]
            .try_into()
            .map_err(|_| "Invalid transfer header")?;
        let derived = wrapping_key(password, &salt)?;
        let cipher =
            Aes256Gcm::new_from_slice(&derived[..]).map_err(|_| "Import encryption unavailable")?;
        let plaintext = Zeroizing::new(
            cipher
                .decrypt(
                    Nonce::from_slice(&archive[24..36]),
                    Payload {
                        msg: &archive[36..],
                        aad: MAGIC,
                    },
                )
                .map_err(|_| "Incorrect transfer password or damaged file")?,
        );
        let portable: Portable =
            serde_json::from_slice(&plaintext).map_err(|_| "Invalid transfer contents")?;
        if portable.version != 1 || portable.media.len() > 1000 {
            return Err("Unsupported transfer version or image count".into());
        }
        let old_key = Zeroizing::new(portable.key);
        let database = STANDARD
            .decode(portable.database)
            .map_err(|_| "Invalid encrypted snapshot")?;
        if database.len() > MAX_ARCHIVE / 4 {
            return Err("Transfer database is too large".into());
        }
        let parent = self.source.parent().ok_or("Invalid workspace directory")?;
        let mut staged =
            tempfile::NamedTempFile::new_in(parent).map_err(|_| "Unable to stage import")?;
        std::io::Write::write_all(&mut staged, &database)
            .map_err(|_| "Unable to stage imported database")?;
        staged
            .as_file()
            .sync_all()
            .map_err(|_| "Unable to synchronize imported database")?;
        let conn = open_encrypted(staged.path(), &old_key)?;
        integrity(&conn)?;
        let version: i64 = conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .map_err(|_| "Invalid imported schema")?;
        if !matches!(version, 6 | 7) {
            return Err("This release imports version 6 or 7 workspace schemas only".into());
        }
        crate::setup::initialize_database(&conn)
            .map_err(|_| "Unable to upgrade imported workspace")?;
        let mut check = conn
            .prepare("PRAGMA foreign_key_check")
            .map_err(|_| "Unable to check imported relationships")?;
        if check
            .query([])
            .map_err(|_| "Unable to check imported relationships")?
            .next()
            .map_err(|_| "Unable to check imported relationships")?
            .is_some()
        {
            return Err("Imported relationships are invalid".into());
        }
        drop(check);
        let info = preview(&conn, portable.media.len())?;
        let mut statement = conn
            .prepare("SELECT DISTINCT path FROM record_media")
            .map_err(|_| "Invalid imported media schema")?;
        let required = statement
            .query_map([], |r| r.get::<_, String>(0))
            .map_err(|_| "Invalid imported media")?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|_| "Invalid imported media")?;
        drop(statement);
        let mut decoded = std::collections::BTreeMap::new();
        for name in required {
            if name.len() != 36
                || !name.ends_with(".png")
                || !name[..32].bytes().all(|b| b.is_ascii_hexdigit())
            {
                return Err("Invalid imported image reference".into());
            }
            let bytes = STANDARD
                .decode(
                    portable
                        .media
                        .get(&name)
                        .ok_or("An imported image is missing")?,
                )
                .map_err(|_| "Invalid imported image data")?;
            if bytes.len() > 24 * 1024 * 1024 || !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
                return Err("Invalid imported image".into());
            }
            crate::media::validate_imported_png(&bytes).map_err(|error| error.to_string())?;
            decoded.insert(name, bytes);
        }
        if !confirm(&info) {
            return Ok(None);
        }
        conn.execute("DELETE FROM local_admin", [])
            .map_err(|_| "Unable to reset imported credentials")?;
        // Stage all replacement paths under fresh owned names; never overwrite
        // media still referenced by the previous workspace or its backup.
        let directory = parent.join("media");
        fs::create_dir_all(&directory).map_err(|_| "Unable to stage imported images")?;
        for (old, bytes) in decoded {
            let new = format!("{}.png", hex(&random::<16>()?));
            let mut file = tempfile::NamedTempFile::new_in(&directory)
                .map_err(|_| "Unable to stage imported image")?;
            std::io::Write::write_all(&mut file, &bytes)
                .map_err(|_| "Unable to write imported image")?;
            file.as_file()
                .sync_all()
                .map_err(|_| "Unable to synchronize imported image")?;
            file.persist_noclobber(directory.join(&new))
                .map_err(|_| "Unable to finish imported image")?;
            conn.execute(
                "UPDATE record_media SET path=?1 WHERE path=?2",
                params![new, old],
            )
            .map_err(|_| "Unable to remap imported image")?;
        }
        let key = Zeroizing::new(random::<32>()?);
        let raw = Zeroizing::new(format!("PRAGMA rekey = \"x'{}'\";", hex(&key[..])));
        conn.execute_batch(&raw)
            .map_err(|_| "Unable to protect imported workspace")?;
        integrity(&conn)?;
        drop(conn);
        let vault_id = random::<16>()?;
        let (recovery, display) = new_recovery()?;
        let old = self.load()?;
        let name = format!("vault-{}.db", hex(&random::<16>()?));
        let manifest = Manifest {
            version: FORMAT,
            vault_id,
            database_file: name,
            password: wrap(new_password, &key, &vault_id, "password")?,
            recovery: wrap(&recovery, &key, &vault_id, "recovery")?,
            legacy_digest: old.as_ref().and_then(|m| m.legacy_digest),
        };
        staged
            .persist_noclobber(self.database_path(&manifest))
            .map_err(|_| "Unable to finish imported database")?;
        let backup_name = if let Some(old) = old {
            let name = format!("before-import-{}.vault.json", hex(&random::<8>()?));
            let mut backup = tempfile::NamedTempFile::new_in(parent)
                .map_err(|_| "Unable to create recovery backup")?;
            serde_json::to_writer(&mut backup, &old)
                .map_err(|_| "Unable to encode recovery backup")?;
            backup
                .as_file()
                .sync_all()
                .map_err(|_| "Unable to synchronize recovery backup")?;
            backup
                .persist_noclobber(parent.join(&name))
                .map_err(|_| "Unable to preserve recovery backup")?;
            Some(name)
        } else {
            None
        };
        self.write(&manifest, false)?;
        Ok(Some(ImportResult {
            recovery_key: display,
            backup_name,
        }))
    }
}
fn preview(conn: &Connection, images: usize) -> VaultResult<TransferPreview> {
    let contractors = conn
        .query_row("SELECT COUNT(*) FROM contractors", [], |r| r.get(0))
        .map_err(|_| "Invalid contractor snapshot")?;
    let organizations = conn
        .query_row("SELECT COUNT(*) FROM organizations", [], |r| r.get(0))
        .map_err(|_| "Invalid organization snapshot")?;
    Ok(TransferPreview {
        contractors,
        organizations,
        images,
    })
}
