
# Secure Military Contractor CRM
## Backend Handoff — Rust + SQLite

### Developer Responsibility
Backend & Data Lead: Josseline

### Backend Technology
- Programming language: Rust
- Database: SQLite
- Database library: rusqlite
- Data serialization: Serde
- Development environment: Ubuntu via WSL / VS Code

### Database Initialization

Function:
initialize_database(&conn)

Location:
src/setup.rs

This prepares the CRM database, runs existing
migrations, and creates the required tables.

### Contractor Functions

| Function | Purpose |
|---|---|
| add_contractor | Create a contractor |
| get_contractors | Retrieve active contractors |
| update_contractor_name | Update contractor name |
| update_contractor_details | Update role, email, phone |
| archive_contractor | Archive without deleting |

### Organization Functions

| Function | Purpose |
|---|---|
| add_organization | Create organization |
| get_organizations | Retrieve active organizations |
| update_organization | Update organization |
| archive_organization | Archive organization |

### Search Functions

| Function | Parameters |
|---|---|
| get_contractors_by_region | Connection, region |
| get_contractors_by_skill | Connection, skill |
| search_contractors | Connection, optional region, optional skill |
| get_contractors_needing_followup | Connection, minimum days |

### History and Communication Functions

| Function | Purpose |
|---|---|
| transfer_contractor | Transfer contractor and save history |
| get_organization_history | Retrieve organization transfers |
| record_contact | Save communication event |
| get_last_contact | Retrieve most recent contact date |

### Integration Notes

- Functions are implemented in reusable Rust modules.
- Most functions accept a SQLite Connection reference.
- transfer_contractor requires a mutable connection.
- Contractor, Organization, and OrganizationHistory
  structures support JSON serialization through Serde.
- Parameterized SQL queries are used.
- Archived records are retained in SQLite.
- The frontend must not access SQLite directly.
- Use synthetic profiles only.

### Testing

Run:
cargo test

Run demonstration program:
cargo run

### Work Still Required

- Tauri IPC integration
- OS-specific application data paths
- Local image and logo storage
- Password authentication and inactivity lock
- Additional validation and audit coverage
- Native macOS, Windows, and Linux testing

### Important

The current crm_demo.db is a local demonstration
database. Production data should be stored in
the OS-specific application data directory.
