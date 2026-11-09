//! Validated local image copies. Paths never come from frontend requests.
use crate::{
    profiles::{ProfileError, validate_id},
    workspace::Kind,
};
use rusqlite::{Connection, OptionalExtension, params};
use std::{io::Cursor, path::PathBuf};

#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ImageUpload {
    pub bytes: Vec<u8>,
}
fn invalid(message: &str) -> ProfileError {
    ProfileError::InvalidInput(message.into())
}
fn root(conn: &Connection) -> Result<PathBuf, ProfileError> {
    let path = conn
        .path()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| invalid("Image storage requires a file-backed workspace"))?;
    Ok(std::path::Path::new(path)
        .parent()
        .ok_or_else(|| invalid("Invalid image directory"))?
        .join("media"))
}
pub fn save(
    conn: &Connection,
    kind: Kind,
    id: i64,
    upload: ImageUpload,
) -> Result<(), ProfileError> {
    validate_id(id)?;
    if upload.bytes.is_empty() || upload.bytes.len() > 8 * 1024 * 1024 {
        return Err(invalid("Choose a PNG or JPEG image up to 8 MiB"));
    }
    let mut reader = image::ImageReader::new(Cursor::new(upload.bytes))
        .with_guessed_format()
        .map_err(|_| invalid("Unable to identify image"))?;
    if !matches!(
        reader.format(),
        Some(image::ImageFormat::Png | image::ImageFormat::Jpeg)
    ) {
        return Err(invalid("Only PNG and JPEG images are supported"));
    }
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(4096);
    limits.max_image_height = Some(4096);
    limits.max_alloc = Some(128 * 1024 * 1024);
    reader.limits(limits);
    let image = reader
        .decode()
        .map_err(|_| invalid("Invalid image or dimensions larger than 4096 pixels"))?;
    let mut output = Cursor::new(Vec::new());
    image
        .write_to(&mut output, image::ImageFormat::Png)
        .map_err(|_| invalid("Unable to prepare image"))?;
    let bytes = output.into_inner();
    if bytes.len() > 24 * 1024 * 1024 {
        return Err(invalid("Image is too large after decoding"));
    }
    let directory = root(conn)?;
    std::fs::create_dir_all(&directory)
        .map_err(|_| invalid("Unable to create local image directory"))?;
    let mut random = [0u8; 16];
    getrandom::fill(&mut random).map_err(|_| invalid("Secure random generator unavailable"))?;
    let name = format!(
        "{}.png",
        random
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect::<String>()
    );
    let path = directory.join(&name);
    let mut file = tempfile::NamedTempFile::new_in(&directory)
        .map_err(|_| invalid("Unable to stage image"))?;
    std::io::Write::write_all(&mut file, &bytes).map_err(|_| invalid("Unable to save image"))?;
    file.as_file()
        .sync_all()
        .map_err(|_| invalid("Unable to synchronize image"))?;
    file.persist_noclobber(&path)
        .map_err(|_| invalid("Unable to finish image copy"))?;
    let kind = match kind {
        Kind::Contractor => "contractor",
        Kind::Organization => "organization",
    };
    if let Err(error)=conn.execute("INSERT INTO record_media(kind,record_id,path) VALUES (?1,?2,?3) ON CONFLICT(kind,record_id) DO UPDATE SET path=excluded.path",params![kind,id,name]){
        let _=std::fs::remove_file(path);return Err(error.into());
    }
    // An outer rollback can leave an unreferenced generated copy; it is never shown
    // as a saved image and portable exports include only database-linked files.
    Ok(())
}
pub fn load(conn: &Connection, kind: Kind, id: i64) -> Result<Option<String>, ProfileError> {
    validate_id(id)?;
    let exists: bool = conn.query_row(
        &format!(
            "SELECT EXISTS(SELECT 1 FROM {} WHERE id=?1 AND archived_at IS NULL)",
            kind.table()
        ),
        [id],
        |r| r.get(0),
    )?;
    if !exists {
        return Err(invalid("Record not found or archived"));
    }
    let label = match kind {
        Kind::Contractor => "contractor",
        Kind::Organization => "organization",
    };
    let name: Option<String> = conn
        .query_row(
            "SELECT path FROM record_media WHERE kind=?1 AND record_id=?2",
            params![label, id],
            |r| r.get(0),
        )
        .optional()?;
    let Some(name) = name else {
        return Ok(None);
    };
    let bytes = read_owned(conn, &name)?;
    use base64::Engine;
    Ok(Some(format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(bytes)
    )))
}
pub fn read_owned(conn: &Connection, name: &str) -> Result<Vec<u8>, ProfileError> {
    if name.len() != 36
        || !name.ends_with(".png")
        || !name[..32].bytes().all(|b| b.is_ascii_hexdigit())
    {
        return Err(invalid("Invalid stored media reference"));
    }
    let path = root(conn)?.join(name);
    let meta = std::fs::symlink_metadata(&path).map_err(|_| invalid("Saved image is missing"))?;
    if !meta.is_file() || meta.file_type().is_symlink() || meta.len() > 24 * 1024 * 1024 {
        return Err(invalid("Invalid saved image"));
    }
    std::fs::read(path).map_err(|_| invalid("Unable to read saved image"))
}
pub fn validate_imported_png(bytes: &[u8]) -> Result<(), ProfileError> {
    if bytes.len() > 24 * 1024 * 1024 || !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        return Err(invalid("Invalid imported image"));
    }
    let mut reader = image::ImageReader::with_format(Cursor::new(bytes), image::ImageFormat::Png);
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(4096);
    limits.max_image_height = Some(4096);
    limits.max_alloc = Some(128 * 1024 * 1024);
    reader.limits(limits);
    reader
        .decode()
        .map_err(|_| invalid("Imported image is invalid or exceeds dimension limits"))?;
    Ok(())
}
