use std::sync::Mutex;
use std::time::{Duration, Instant};

use crate::admin::verify_admin_login;
use rusqlite::Connection;

pub struct SessionManager {
    last_activity: Mutex<Option<Instant>>,
    inactivity_timeout: Duration,
}

impl SessionManager {
    // Create a session manager with a time limit
    pub fn new(inactivity_timeout: Duration) -> Self {
        Self {
            last_activity: Mutex::new(None),
            inactivity_timeout,
        }
    }

    // Log in using the administrator password
    pub fn login(&self, conn: &Connection, password: &str) -> rusqlite::Result<bool> {
        let correct = verify_admin_login(conn, password)?;

        if correct {
            if let Ok(mut last) = self.last_activity.lock() {
                *last = Some(Instant::now());
                return Ok(true);
            }

            Ok(false)
        } else {
            self.logout();
            Ok(false)
        }
    }

    // Check login status without resetting the timer
    pub fn is_authenticated(&self) -> bool {
        match self.last_activity.lock() {
            Ok(mut last) => match *last {
                Some(time) if time.elapsed() < self.inactivity_timeout => true,
                _ => {
                    *last = None;
                    false
                }
            },
            Err(_) => false,
        }
    }

    // Allow a protected action and renew the timer
    pub fn authorize_action(&self) -> bool {
        match self.last_activity.lock() {
            Ok(mut last) => match *last {
                Some(time) if time.elapsed() < self.inactivity_timeout => {
                    *last = Some(Instant::now());
                    true
                }
                _ => {
                    *last = None;
                    false
                }
            },
            Err(_) => false,
        }
    }

    // Lock the session
    pub fn logout(&self) {
        if let Ok(mut last) = self.last_activity.lock() {
            *last = None;
        }
    }
}
