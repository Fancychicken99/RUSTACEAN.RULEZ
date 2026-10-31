use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime};

use crate::admin::verify_admin_login;
use rusqlite::Connection;

pub struct SessionManager {
    last_activity: Mutex<Option<ActivityTime>>,
    inactivity_timeout: Duration,
}

#[derive(Clone, Copy)]
struct ActivityTime {
    monotonic: Instant,
    wall: SystemTime,
}

impl ActivityTime {
    fn now() -> Self {
        Self {
            monotonic: Instant::now(),
            wall: SystemTime::now(),
        }
    }

    fn is_fresh(self, timeout: Duration) -> bool {
        // Instant may exclude suspend on some platforms. Require both clocks
        // to be within the interval, and fail closed on a backward clock jump.
        matches!(Instant::now().checked_duration_since(self.monotonic), Some(elapsed) if elapsed < timeout)
            && matches!(self.wall.elapsed(), Ok(elapsed) if elapsed < timeout)
    }
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
                *last = Some(ActivityTime::now());
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
                Some(time) if time.is_fresh(self.inactivity_timeout) => true,
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
                Some(time) if time.is_fresh(self.inactivity_timeout) => {
                    *last = Some(ActivityTime::now());
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

#[cfg(test)]
mod tests {
    use super::*;

    fn session_at(monotonic: Instant, wall: SystemTime) -> SessionManager {
        let session = SessionManager::new(Duration::from_secs(900));
        *session.last_activity.lock().unwrap() = Some(ActivityTime { monotonic, wall });
        session
    }

    #[test]
    fn suspend_like_wall_elapsed_expires_and_cannot_be_renewed() {
        let session = session_at(Instant::now(), SystemTime::now() - Duration::from_secs(901));
        assert!(!session.authorize_action());
        assert!(!session.is_authenticated());
        assert!(session.last_activity.lock().unwrap().is_none());
    }

    #[test]
    fn backward_wall_clock_jump_locks_instead_of_extending_access() {
        let session = session_at(
            Instant::now(),
            SystemTime::now() + Duration::from_secs(3600),
        );
        assert!(!session.is_authenticated());
        assert!(!session.authorize_action());
    }

    #[test]
    fn monotonic_expiry_cannot_be_hidden_by_wall_clock_adjustment() {
        let session = session_at(Instant::now() - Duration::from_secs(901), SystemTime::now());
        assert!(!session.authorize_action());
        assert!(!session.is_authenticated());
    }

    #[test]
    fn fresh_activity_renews_both_clocks_and_status_does_not() {
        let session = session_at(
            Instant::now() - Duration::from_secs(10),
            SystemTime::now() - Duration::from_secs(10),
        );
        let original = session.last_activity.lock().unwrap().unwrap();
        assert!(session.is_authenticated());
        assert_eq!(
            session.last_activity.lock().unwrap().unwrap().wall,
            original.wall
        );
        assert!(session.authorize_action());
        let renewed = session.last_activity.lock().unwrap().unwrap();
        assert!(renewed.wall > original.wall);
        assert!(renewed.monotonic > original.monotonic);
    }
}
