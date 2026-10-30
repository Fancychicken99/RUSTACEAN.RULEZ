use secure_crm_backend::auth::{hash_password, verify_password};

#[test]
fn test_password_authentication() {
    // Fictional password used for testing only
    let password = "ExampleSecurePassword123!";

    // Generate a password hash
    let stored_hash = hash_password(password).expect("Hashing failed");

    // The stored value should not be the original password
    assert_ne!(stored_hash, password);

    // Confirm Argon2id was used
    assert!(stored_hash.starts_with("$argon2id$"));

    // Correct password should work
    assert!(verify_password(password, &stored_hash));

    // Incorrect password should fail
    assert!(!verify_password("WrongPassword123!", &stored_hash));

    // Invalid hash should fail
    assert!(!verify_password(password, "invalid_hash"));

    // Each password hash should use a different random salt
    let second_hash = hash_password(password).expect("Hashing failed");

    assert_ne!(stored_hash, second_hash);

    // Both hashes should still accept the correct password
    assert!(verify_password(password, &second_hash));
}
