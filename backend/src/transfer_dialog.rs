//! Native file/protocol handoffs; callers authorize before and after dialogs.
pub fn save_path() -> Option<std::path::PathBuf> {
    rfd::FileDialog::new()
        .set_title("Export encrypted Hippo Harbor workspace")
        .set_file_name("Hippo-Harbor-Workspace.hharbor")
        .add_filter("Encrypted Hippo Harbor workspace", &["hharbor"])
        .save_file()
}
pub fn open_path() -> Option<std::path::PathBuf> {
    rfd::FileDialog::new()
        .set_title("Import encrypted Hippo Harbor workspace")
        .add_filter("Encrypted Hippo Harbor workspace", &["hharbor"])
        .pick_file()
}
pub fn confirm(info: &crate::vault::TransferPreview) -> bool {
    rfd::MessageDialog::new().set_title("Review workspace import").set_description(format!("Import {} contractors, {} organizations and {} images, including archived records and history?\n\nThis replaces the current workspace. An encrypted recovery backup of the current workspace will be retained. You will log in with the new password you entered.",info.contractors,info.organizations,info.images)).set_level(rfd::MessageLevel::Warning).set_buttons(rfd::MessageButtons::OkCancel).show()==rfd::MessageDialogResult::Ok
}
pub fn contact(conn: &rusqlite::Connection, id: i64, method: &str) -> Result<(), String> {
    crate::profiles::validate_id(id).map_err(|e| e.to_string())?;
    let record = crate::database::get_contractor(conn, id)
        .map_err(|_| "Unable to read contact")?
        .ok_or("Contractor not found or archived")?;
    let address = match method {
        "tel" | "sms" => {
            let phone = record.phone.ok_or("This record has no phone number")?;
            crate::profiles::validate_phone(&phone).map_err(|e| e.to_string())?;
            format!(
                "{method}:{}",
                phone
                    .chars()
                    .filter(|c| c.is_ascii_digit() || *c == '+')
                    .collect::<String>()
            )
        }
        "teams" => {
            let email = record.email.ok_or("This record has no email address")?;
            crate::profiles::validate_email(&email).map_err(|e| e.to_string())?;
            let mut url = url::Url::parse("msteams:/l/chat/0/0")
                .map_err(|_| "Unable to prepare Teams link")?;
            url.query_pairs_mut().append_pair("users", &email);
            url.into()
        }
        _ => return Err("Select phone, SMS or Teams".into()),
    };
    open::that(address).map_err(|_| "No installed application accepted this contact action".into())
}
