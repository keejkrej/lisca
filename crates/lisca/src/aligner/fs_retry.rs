//! Retry filesystem replaces that Windows reports as access denied.
//!
//! Crop publish is a directory rename after TIFF writers close. Windows Defender,
//! Search Indexer, and OneDrive often keep a handle on a just-written file, which
//! surfaces as `PermissionDenied` / OS error 5 (`ERROR_ACCESS_DENIED`) or 32
//! (`ERROR_SHARING_VIOLATION`). Retrying with a short backoff is enough; the
//! files are already closed.

use std::{
    io::{self, ErrorKind},
    path::Path,
    thread,
    time::Duration,
};

const ATTEMPTS: u32 = 8;
const INITIAL_DELAY: Duration = Duration::from_millis(15);
const MAX_DELAY: Duration = Duration::from_millis(250);

/// True for the Windows sharing/access-denied family, including localized
/// messages such as "Zugriff verweigert (os error 5)".
pub fn is_access_denied(error: &io::Error) -> bool {
    matches!(
        error.kind(),
        ErrorKind::PermissionDenied | ErrorKind::TimedOut
    ) || matches!(error.raw_os_error(), Some(5) | Some(32) | Some(33))
}

pub fn format_access_denied(context: &str, error: &io::Error) -> String {
    format!(
        "{context}: {error}. Another program still has this folder open \
         (antivirus, Explorer preview, or cloud sync). Close it, then retry \
         the failed position from Tasks. Positions that already finished are kept."
    )
}

pub fn retry_io<T>(op: impl Fn() -> io::Result<T>) -> io::Result<T> {
    let mut delay = INITIAL_DELAY;
    let mut last = None;
    for attempt in 0..ATTEMPTS {
        match op() {
            Ok(value) => return Ok(value),
            Err(error) if is_access_denied(&error) && attempt + 1 < ATTEMPTS => {
                last = Some(error);
                thread::sleep(delay);
                delay = (delay * 2).min(MAX_DELAY);
            }
            Err(error) => return Err(error),
        }
    }
    Err(last.expect("access-denied retry keeps the last error"))
}

pub fn rename_retry(from: &Path, to: &Path) -> io::Result<()> {
    retry_io(|| std::fs::rename(from, to))
}

pub fn remove_dir_all_retry(path: &Path) -> io::Result<()> {
    retry_io(|| std::fs::remove_dir_all(path))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};

    #[test]
    fn retries_permission_denied_then_succeeds() {
        let attempts = AtomicU32::new(0);
        let value = retry_io(|| {
            let n = attempts.fetch_add(1, Ordering::SeqCst);
            if n < 2 {
                Err(io::Error::new(
                    ErrorKind::PermissionDenied,
                    "Zugriff verweigert (os error 5)",
                ))
            } else {
                Ok(7_u32)
            }
        })
        .expect("retry");
        assert_eq!(value, 7);
        assert_eq!(attempts.load(Ordering::SeqCst), 3);
    }

    #[test]
    fn does_not_retry_unrelated_errors() {
        let attempts = AtomicU32::new(0);
        let error = retry_io(|| {
            attempts.fetch_add(1, Ordering::SeqCst);
            Err::<u32, _>(io::Error::new(ErrorKind::NotFound, "missing"))
        })
        .expect_err("not found");
        assert_eq!(error.kind(), ErrorKind::NotFound);
        assert_eq!(attempts.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn access_denied_message_keeps_os_error_and_points_at_retry() {
        let error = io::Error::new(
            ErrorKind::PermissionDenied,
            "Zugriff verweigert (os error 5)",
        );
        let message = format_access_denied("Pos3", &error);
        assert!(message.contains("os error 5"));
        assert!(message.contains("Tasks"));
        assert!(message.contains("already finished"));
    }
}
