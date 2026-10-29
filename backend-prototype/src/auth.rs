use argon2::{
    Argon2,
    password_hash::{PasswordHasher, PasswordVerifier},
};

// Turn a password into a secure hash
pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let argon2 = Argon2::default();

    // Generates a random salt automatically
    let password_hash = argon2.hash_password(password.as_bytes())?;

    Ok(password_hash.to_string())
}

// Check whether an entered password is correct
pub fn verify_password(password: &str, stored_hash: &str) -> bool {
    let argon2 = Argon2::default();

    argon2
        .verify_password(password.as_bytes(), stored_hash)
        .is_ok()
}
