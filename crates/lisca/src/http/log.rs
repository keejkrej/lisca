//! One log file per process start: `~/.lisca/logs/<app>/<datetime>.log`.
//!
//! Rust tracing and UI lines from `POST /fs/client-log` share that file.
//! Colons are illegal in Windows names, so the stamp uses hyphens:
//! `2026-10-04T17-22-01.log`. A second start in the same second is
//! `2026-10-04T17-22-01-2.log`.

use std::fs::{File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::config::config_dir;
use crate::protocol::AppId;

static LOG_FILE: OnceLock<Arc<Mutex<File>>> = OnceLock::new();

struct DateParts {
    year: i32,
    month: u32,
    day: u32,
    hour: u32,
    minute: u32,
    second: u32,
}

/// Directory that holds this app's session logs.
pub fn log_directory(app: AppId) -> PathBuf {
    config_dir().join("logs").join(app.as_str())
}

fn format_stamp(parts: DateParts) -> String {
    format!(
        "{:04}-{:02}-{:02}T{:02}-{:02}-{:02}",
        parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second
    )
}

fn session_log_path(dir: &Path, stamp: &str, attempt: u32) -> PathBuf {
    let name = if attempt == 0 {
        format!("{stamp}.log")
    } else {
        format!("{stamp}-{}.log", attempt + 1)
    };
    dir.join(name)
}

fn create_session_log(dir: &Path, stamp: &str) -> io::Result<(PathBuf, File)> {
    std::fs::create_dir_all(dir)?;
    for attempt in 0..1000 {
        let path = session_log_path(dir, stamp, attempt);
        match OpenOptions::new().create_new(true).append(true).open(&path) {
            Ok(file) => return Ok((path, file)),
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(error),
        }
    }
    Err(io::Error::new(
        io::ErrorKind::AlreadyExists,
        "could not allocate a session log name",
    ))
}

fn local_date_parts() -> DateParts {
    #[cfg(unix)]
    {
        unix_local_date_parts()
    }
    #[cfg(windows)]
    {
        windows_local_date_parts()
    }
    #[cfg(not(any(unix, windows)))]
    {
        utc_date_parts()
    }
}

#[cfg_attr(not(unix), allow(dead_code))]
fn utc_date_parts() -> DateParts {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    civil_utc(secs)
}

/// Gregorian calendar fields for a Unix timestamp. Enough for a log file name.
fn civil_utc(secs: u64) -> DateParts {
    let days = (secs / 86_400) as i64;
    let tod = (secs % 86_400) as u32;
    // Civil-from-days, Howard Hinnant. Day 0 is 1970-01-01.
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let month = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    let year = (if month <= 2 { y + 1 } else { y }) as i32;
    DateParts {
        year,
        month,
        day,
        hour: tod / 3600,
        minute: (tod / 60) % 60,
        second: tod % 60,
    }
}

#[cfg(unix)]
fn unix_local_date_parts() -> DateParts {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as libc::time_t)
        .unwrap_or(0);
    let mut tm = unsafe { std::mem::zeroed::<libc::tm>() };
    // SAFETY: `tm` is a valid out-parameter and `localtime_r` only writes it.
    let ok = unsafe { !libc::localtime_r(&secs, &mut tm).is_null() };
    if !ok {
        return utc_date_parts();
    }
    DateParts {
        year: tm.tm_year + 1900,
        month: (tm.tm_mon + 1) as u32,
        day: tm.tm_mday as u32,
        hour: tm.tm_hour as u32,
        minute: tm.tm_min as u32,
        second: tm.tm_sec as u32,
    }
}

#[cfg(windows)]
fn windows_local_date_parts() -> DateParts {
    #[repr(C)]
    struct WinSystemTime {
        year: u16,
        month: u16,
        day_of_week: u16,
        day: u16,
        hour: u16,
        minute: u16,
        second: u16,
        milliseconds: u16,
    }
    #[link(name = "kernel32")]
    extern "system" {
        fn GetLocalTime(out: *mut WinSystemTime);
    }
    let mut time = WinSystemTime {
        year: 0,
        month: 0,
        day_of_week: 0,
        day: 0,
        hour: 0,
        minute: 0,
        second: 0,
        milliseconds: 0,
    };
    // SAFETY: `time` is a valid `SYSTEMTIME` out-parameter; `GetLocalTime` only writes it.
    unsafe { GetLocalTime(&mut time) };
    DateParts {
        year: i32::from(time.year),
        month: u32::from(time.month),
        day: u32::from(time.day),
        hour: u32::from(time.hour),
        minute: u32::from(time.minute),
        second: u32::from(time.second),
    }
}

/// Open this process's session log and remember it for the tracing writer.
pub fn open_log_file(app: AppId) -> io::Result<Arc<Mutex<File>>> {
    if let Some(existing) = LOG_FILE.get() {
        return Ok(Arc::clone(existing));
    }
    let (path, mut file) =
        create_session_log(&log_directory(app), &format_stamp(local_date_parts()))?;
    let _ = writeln!(file, "---- lisca {} ----", app.as_str());
    let _ = writeln!(file, "log {}", path.display());
    let shared = Arc::new(Mutex::new(file));
    let _ = LOG_FILE.set(Arc::clone(&shared));
    Ok(shared)
}

#[derive(Clone)]
pub struct SharedFile(pub Arc<Mutex<File>>);

impl Write for SharedFile {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        self.0
            .lock()
            .unwrap_or_else(|err| err.into_inner())
            .write(buf)
    }

    fn flush(&mut self) -> io::Result<()> {
        self.0.lock().unwrap_or_else(|err| err.into_inner()).flush()
    }
}

pub struct Tee<A, B> {
    pub stderr: A,
    pub file: B,
}

impl<A: Write, B: Write> Write for Tee<A, B> {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        let _ = self.file.write_all(buf);
        self.stderr.write(buf)
    }

    fn flush(&mut self) -> io::Result<()> {
        let _ = self.file.flush();
        self.stderr.flush()
    }
}

/// UI lines from `POST /fs/client-log`. They share the tracing file.
pub fn record_client_log(lines: &[String]) {
    for line in lines.iter().take(40) {
        let message: String = line
            .chars()
            .map(|ch| match ch {
                '\n' | '\r' => ' ',
                _ => ch,
            })
            .take(2000)
            .collect();
        let message = message.trim();
        if message.is_empty() {
            continue;
        }
        tracing::info!(target: "lisca_ui", "{message}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::test_lock::TEST_CONFIG_LOCK;

    struct RestoreConfig(Option<String>);

    impl RestoreConfig {
        fn set(value: &std::path::Path) -> Self {
            let previous = std::env::var("LISCA_CONFIG_DIR").ok();
            std::env::set_var("LISCA_CONFIG_DIR", value);
            Self(previous)
        }
    }

    impl Drop for RestoreConfig {
        fn drop(&mut self) {
            match &self.0 {
                Some(value) => std::env::set_var("LISCA_CONFIG_DIR", value),
                None => std::env::remove_var("LISCA_CONFIG_DIR"),
            }
        }
    }

    #[test]
    fn studio_log_is_under_config_logs() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let dir = std::env::temp_dir().join(format!("lisca-log-dir-{}", uuid::Uuid::new_v4()));
        let _restore = RestoreConfig::set(&dir);
        assert_eq!(
            log_directory(AppId::Studio),
            dir.join("logs").join("studio")
        );
        assert_eq!(
            log_directory(AppId::Aligner),
            dir.join("logs").join("aligner")
        );
        assert_eq!(
            log_directory(AppId::Annotator),
            dir.join("logs").join("annotator")
        );
    }

    #[test]
    fn session_log_name_is_the_stamp() {
        let stamp = format_stamp(DateParts {
            year: 2026,
            month: 10,
            day: 4,
            hour: 17,
            minute: 22,
            second: 1,
        });
        assert_eq!(stamp, "2026-10-04T17-22-01");
        let dir = std::env::temp_dir().join(format!("lisca-log-session-{}", uuid::Uuid::new_v4()));
        let (first, _) = create_session_log(&dir, &stamp).unwrap();
        let (second, _) = create_session_log(&dir, &stamp).unwrap();
        assert_eq!(first, dir.join("2026-10-04T17-22-01.log"));
        assert_eq!(second, dir.join("2026-10-04T17-22-01-2.log"));
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn civil_utc_reads_unix_epoch() {
        let parts = civil_utc(0);
        assert_eq!(
            (
                parts.year,
                parts.month,
                parts.day,
                parts.hour,
                parts.minute,
                parts.second
            ),
            (1970, 1, 1, 0, 0, 0)
        );
    }
}
