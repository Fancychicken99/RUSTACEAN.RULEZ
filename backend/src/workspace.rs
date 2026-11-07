//! Final-workflow reads, taxonomy assignment, archives and combined SQL search.
use crate::{
    database::{Contractor, get_contractor},
    profiles::{ProfileError, validate_id},
};
use rusqlite::{Connection, params};

#[derive(Clone, Copy, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Kind {
    Contractor,
    Organization,
}
impl Kind {
    pub fn table(self) -> &'static str {
        match self {
            Self::Contractor => "contractors",
            Self::Organization => "organizations",
        }
    }
    fn singular(self) -> &'static str {
        match self {
            Self::Contractor => "contractor",
            Self::Organization => "organization",
        }
    }
}
#[derive(serde::Serialize)]
pub struct Archive {
    pub id: i64,
    pub name: String,
    pub kind: Kind,
    pub archived_at: String,
}
#[derive(serde::Serialize)]
pub struct RecordMeta {
    pub id: i64,
    pub kind: Kind,
    pub tags: Vec<String>,
    pub skills: Vec<String>,
}
#[derive(serde::Serialize)]
pub struct HistoryEntry {
    pub kind: String,
    pub id: i64,
    pub event: String,
    pub detail: String,
    pub at: String,
}
#[derive(serde::Serialize)]
pub struct Snapshot {
    pub meta: Vec<RecordMeta>,
    pub archives: Vec<Archive>,
    pub history: Vec<HistoryEntry>,
    pub contacts: Vec<crate::contacts::ContactEvent>,
    pub tags: Vec<String>,
    pub skills: Vec<String>,
}
#[derive(Default, serde::Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct Search {
    pub region: Option<String>,
    pub country: Option<String>,
    pub city: Option<String>,
    pub organization_id: Option<i64>,
    pub status: Option<String>,
    pub query: Option<String>,
    pub tag: Option<String>,
    pub skill: Option<String>,
    pub due_days: Option<u32>,
}

fn input(message: &str) -> ProfileError {
    ProfileError::InvalidInput(message.into())
}
fn clean(value: Option<String>, max: usize) -> Result<Option<String>, ProfileError> {
    let value = value.unwrap_or_default();
    let value = value.trim();
    if value.chars().count() > max || value.chars().any(char::is_control) {
        return Err(input(
            "Search or label is too long or contains control characters",
        ));
    }
    Ok((!value.is_empty()).then(|| value.to_owned()))
}
fn names(conn: &Connection, sql: &str, id: Option<i64>) -> rusqlite::Result<Vec<String>> {
    let mut statement = conn.prepare(sql)?;
    if let Some(id) = id {
        statement.query_map([id], |r| r.get(0))?.collect()
    } else {
        statement.query_map([], |r| r.get(0))?.collect()
    }
}
pub fn snapshot(conn: &Connection) -> Result<Snapshot, ProfileError> {
    let mut result = Snapshot {
        meta: vec![],
        archives: vec![],
        history: vec![],
        contacts: vec![],
        tags: names(conn, "SELECT name FROM tags ORDER BY name", None)?,
        skills: names(conn, "SELECT name FROM skills ORDER BY name", None)?,
    };
    for kind in [Kind::Contractor, Kind::Organization] {
        let table = kind.table();
        let singular = kind.singular();
        let label = if matches!(kind, Kind::Contractor) {
            "full_name"
        } else {
            "name"
        };
        let mut statement = conn.prepare(&format!(
            "SELECT id,{label},archived_at FROM {table} ORDER BY {label}"
        ))?;
        let rows = statement.query_map([], |r| {
            Ok((
                r.get::<_, i64>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, Option<String>>(2)?,
            ))
        })?;
        for row in rows {
            let (id, name, archived) = row?;
            if let Some(archived_at) = archived {
                result.archives.push(Archive {
                    id,
                    name,
                    kind,
                    archived_at,
                });
            } else {
                result.meta.push(RecordMeta{id,kind,
                tags:names(conn,&format!("SELECT t.name FROM tags t JOIN {singular}_tags j ON j.tag_id=t.id WHERE j.{singular}_id=?1 ORDER BY t.name"),Some(id))?,
                skills:names(conn,&format!("SELECT s.name FROM skills s JOIN {singular}_skills j ON j.skill_id=s.id WHERE j.{singular}_id=?1 ORDER BY s.name"),Some(id))?});
            }
        }
    }
    let mut statement = conn.prepare(
        "SELECT entity_kind,entity_id,event,detail,at FROM record_history ORDER BY at DESC,id DESC",
    )?;
    result.history = statement
        .query_map([], |r| {
            Ok(HistoryEntry {
                kind: r.get(0)?,
                id: r.get(1)?,
                event: r.get(2)?,
                detail: r.get(3)?,
                at: r.get(4)?,
            })
        })?
        .collect::<rusqlite::Result<_>>()?;
    let mut statement=conn.prepare("SELECT id,contractor_id,method,note,contacted_at FROM contact_events ORDER BY contacted_at DESC,id DESC")?;
    result.contacts = statement
        .query_map([], |r| {
            Ok(crate::contacts::ContactEvent {
                id: r.get(0)?,
                contractor_id: r.get(1)?,
                method: r.get(2)?,
                note: r.get(3)?,
                contacted_at: r.get(4)?,
            })
        })?
        .collect::<rusqlite::Result<_>>()?;
    Ok(result)
}

pub fn save_taxonomy(
    conn: &mut Connection,
    kind: Kind,
    id: i64,
    tags: Vec<String>,
    skills: Vec<String>,
) -> Result<(), ProfileError> {
    validate_id(id)?;
    if tags.len() > 30 || skills.len() > 30 {
        return Err(input("Use at most 30 tags and 30 skills"));
    }
    let tags = tags
        .into_iter()
        .map(|s| clean(Some(s), 100)?.ok_or_else(|| input("Tag name is required")))
        .collect::<Result<Vec<_>, _>>()?;
    let skills = skills
        .into_iter()
        .map(|s| clean(Some(s), 100)?.ok_or_else(|| input("Skill name is required")))
        .collect::<Result<Vec<_>, _>>()?;
    let tx = conn.transaction()?;
    let table = kind.table();
    let singular = kind.singular();
    let exists: bool = tx.query_row(
        &format!("SELECT EXISTS(SELECT 1 FROM {table} WHERE id=?1 AND archived_at IS NULL)"),
        [id],
        |r| r.get(0),
    )?;
    if !exists {
        return Err(input("Record not found or archived"));
    }
    for (labels, is_tag) in [(tags, true), (skills, false)] {
        let noun = if is_tag { "tag" } else { "skill" };
        let catalog = if is_tag { "tags" } else { "skills" };
        let join = format!("{singular}_{catalog}");
        tx.execute(&format!("DELETE FROM {join} WHERE {singular}_id=?1"), [id])?;
        for name in labels {
            let target = if is_tag {
                crate::tags::add_tag(&tx, &name)?
            } else {
                crate::skills::add_skill(&tx, &name)?
            };
            tx.execute(
                &format!("INSERT OR IGNORE INTO {join}({singular}_id,{noun}_id) VALUES (?1,?2)"),
                params![id, target],
            )?;
        }
    }
    tx.commit()?;
    Ok(())
}
pub fn restore(conn: &Connection, kind: Kind, id: i64) -> Result<(), ProfileError> {
    validate_id(id)?;
    if conn.execute(
        &format!(
            "UPDATE {} SET archived_at=NULL WHERE id=?1 AND archived_at IS NOT NULL",
            kind.table()
        ),
        [id],
    )? == 0
    {
        return Err(input("Archived record not found"));
    }
    Ok(())
}
pub fn search(conn: &Connection, filter: Search) -> Result<Vec<Contractor>, ProfileError> {
    let region = clean(filter.region, 120)?;
    let country = clean(filter.country, 100)?;
    let city = clean(filter.city, 100)?;
    let query = clean(filter.query, 200)?;
    let tag = clean(filter.tag, 100)?;
    let skill = clean(filter.skill, 100)?;
    let status = clean(filter.status, 40)?;
    if let Some(id) = filter.organization_id {
        validate_id(id)?;
    }
    if filter.due_days.is_some_and(|d| d > 36500) {
        return Err(input("Contact age must be at most 36500 days"));
    }
    let mut statement=conn.prepare("SELECT c.id FROM contractors c LEFT JOIN organizations o ON o.id=c.organization_id
      WHERE c.archived_at IS NULL
      AND (?1 IS NULL OR o.region=?1 COLLATE NOCASE)
      AND (?2 IS NULL OR instr(lower(COALESCE(c.country,'')),lower(?2))>0)
      AND (?3 IS NULL OR instr(lower(COALESCE(c.city,'')),lower(?3))>0)
      AND (?4 IS NULL OR c.organization_id=?4) AND (?5 IS NULL OR c.status=?5)
      AND (?6 IS NULL OR instr(lower(c.full_name||' '||COALESCE(o.name,'')||' '||COALESCE(c.email,'')||' '||COALESCE(c.role,'')),lower(?6))>0
        OR soundex(c.full_name)=soundex(?6) OR soundex(c.first_name)=soundex(?6) OR soundex(c.last_name)=soundex(?6))
      AND (?7 IS NULL OR EXISTS(SELECT 1 FROM contractor_tags j JOIN tags t ON t.id=j.tag_id WHERE j.contractor_id=c.id AND t.name=?7 COLLATE NOCASE))
      AND (?8 IS NULL OR EXISTS(SELECT 1 FROM contractor_skills j JOIN skills s ON s.id=j.skill_id WHERE j.contractor_id=c.id AND s.name=?8 COLLATE NOCASE))
      AND (?9 IS NULL OR NOT EXISTS(SELECT 1 FROM contact_events e WHERE e.contractor_id=c.id)
        OR julianday('now')-julianday((SELECT MAX(contacted_at) FROM contact_events e WHERE e.contractor_id=c.id))>=?9)
      ORDER BY CASE WHEN c.status IN ('Retired','Deceased') THEN 1 ELSE 0 END,c.full_name")?;
    let ids = statement
        .query_map(
            params![
                region,
                country,
                city,
                filter.organization_id,
                status,
                query,
                tag,
                skill,
                filter.due_days
            ],
            |r| r.get::<_, i64>(0),
        )?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    ids.into_iter()
        .map(|id| get_contractor(conn, id)?.ok_or_else(|| input("Record no longer available")))
        .collect()
}
pub fn migrate(conn: &Connection) -> rusqlite::Result<()> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if version >= 6 {
        return Ok(());
    }
    if version != 5 {
        return Err(rusqlite::Error::InvalidQuery);
    }
    let tx = conn.unchecked_transaction()?;
    tx.execute_batch("CREATE TABLE record_media(kind TEXT NOT NULL CHECK(kind IN ('contractor','organization')),record_id INTEGER NOT NULL,path TEXT NOT NULL,PRIMARY KEY(kind,record_id));
      CREATE TABLE record_history(id INTEGER PRIMARY KEY,entity_kind TEXT NOT NULL,entity_id INTEGER NOT NULL,event TEXT NOT NULL,detail TEXT NOT NULL,at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')));")?;
    for (table, singular) in [
        ("contractors", "contractor"),
        ("organizations", "organization"),
    ] {
        tx.execute_batch(&format!("CREATE TRIGGER {singular}_status_audit AFTER UPDATE OF status ON {table} WHEN OLD.status IS NOT NEW.status BEGIN
          INSERT INTO record_history(entity_kind,entity_id,event,detail) VALUES ('{singular}',NEW.id,'Status',OLD.status||' → '||NEW.status); END;
          CREATE TRIGGER {singular}_archive_audit AFTER UPDATE OF archived_at ON {table} WHEN OLD.archived_at IS NOT NEW.archived_at BEGIN
          INSERT INTO record_history(entity_kind,entity_id,event,detail) VALUES ('{singular}',NEW.id,CASE WHEN NEW.archived_at IS NULL THEN 'Restored' ELSE 'Archived' END,'Record retained'); END;"))?;
    }
    tx.execute_batch("CREATE TRIGGER contractor_transfer_audit AFTER UPDATE OF organization_id ON contractors WHEN OLD.organization_id IS NOT NEW.organization_id BEGIN
      INSERT INTO record_history(entity_kind,entity_id,event,detail) VALUES ('contractor',NEW.id,'Transfer','Organization #'||COALESCE(OLD.organization_id,'unassigned')||' → #'||COALESCE(NEW.organization_id,'unassigned')); END;
      PRAGMA user_version=6;")?;
    tx.commit()
}
