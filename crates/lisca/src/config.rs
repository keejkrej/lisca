//! Server-side config directory (`~/.lisca` or `LISCA_CONFIG_DIR`).

use std::path::{Path, PathBuf};

/// Resolve the Lisca config root used for profiles and memory.
pub fn config_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("LISCA_CONFIG_DIR") {
        let trimmed = dir.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }

    if let Some(home) = user_home() {
        return home.join(".lisca");
    }

    PathBuf::from("/var/lisca/config")
}

/// Home directory for `~/.lisca`.
///
/// Windows desktop processes set `USERPROFILE` (or `HOMEDRIVE`+`HOMEPATH`) and
/// often leave `HOME` unset. The directory does not have to exist yet: callers
/// create `.lisca` underneath it.
fn user_home() -> Option<PathBuf> {
    if let Some(home) = env_nonempty("HOME") {
        return Some(PathBuf::from(home));
    }
    if let Some(home) = env_nonempty("USERPROFILE") {
        return Some(PathBuf::from(home));
    }
    let drive = std::env::var("HOMEDRIVE").unwrap_or_default();
    let path = std::env::var("HOMEPATH").unwrap_or_default();
    let combined = format!("{drive}{path}");
    let trimmed = combined.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(PathBuf::from(trimmed))
    }
}

fn env_nonempty(key: &str) -> Option<String> {
    std::env::var(key)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

pub fn profiles_index_path(config: &Path) -> PathBuf {
    config.join("profiles-index.json")
}

pub fn profile_dir(config: &Path, profile_id: &str) -> PathBuf {
    config.join("profiles").join(profile_id)
}

pub fn profile_meta_path(config: &Path, profile_id: &str) -> PathBuf {
    profile_dir(config, profile_id).join("meta.json")
}

pub fn profile_memory_path(config: &Path, profile_id: &str) -> PathBuf {
    profile_dir(config, profile_id).join("memory.json")
}

pub fn sessions_path(config: &Path) -> PathBuf {
    config.join("sessions.json")
}

#[cfg(test)]
pub(crate) mod test_lock {
    use std::sync::Mutex;

    pub static TEST_CONFIG_LOCK: Mutex<()> = Mutex::new(());
}

#[cfg(test)]
mod tests {
    use super::test_lock::TEST_CONFIG_LOCK;
    use super::*;

    #[test]
    fn config_dir_prefers_env() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let temp = std::env::temp_dir().join(format!("lisca-config-test-{}", uuid::Uuid::new_v4()));
        let _restore = RestoreVar::set("LISCA_CONFIG_DIR", Some(temp.to_string_lossy().as_ref()));
        assert_eq!(config_dir(), temp);
    }

    #[test]
    fn config_dir_uses_userprofile_when_home_is_unset() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let missing =
            std::env::temp_dir().join(format!("lisca-missing-home-{}", uuid::Uuid::new_v4()));
        let _config = RestoreVar::set("LISCA_CONFIG_DIR", None);
        let _home = RestoreVar::set("HOME", None);
        let _profile = RestoreVar::set("USERPROFILE", Some(missing.to_string_lossy().as_ref()));
        assert!(!missing.exists());
        assert_eq!(config_dir(), missing.join(".lisca"));
    }

    #[test]
    fn config_dir_uses_home_drive_and_path_when_profile_vars_are_unset() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let _config = RestoreVar::set("LISCA_CONFIG_DIR", None);
        let _home = RestoreVar::set("HOME", None);
        let _profile = RestoreVar::set("USERPROFILE", None);
        let _drive = RestoreVar::set("HOMEDRIVE", Some("C:"));
        let _path = RestoreVar::set("HOMEPATH", Some(r"\Users\lisca"));
        assert_eq!(
            config_dir(),
            PathBuf::from(r"C:\Users\lisca").join(".lisca")
        );
    }
}

#[cfg(test)]
struct RestoreVar {
    key: &'static str,
    previous: Option<String>,
}

#[cfg(test)]
impl RestoreVar {
    fn set(key: &'static str, value: Option<&str>) -> Self {
        let previous = std::env::var(key).ok();
        match value {
            Some(value) => std::env::set_var(key, value),
            None => std::env::remove_var(key),
        }
        Self { key, previous }
    }
}

#[cfg(test)]
impl Drop for RestoreVar {
    fn drop(&mut self) {
        match &self.previous {
            Some(value) => std::env::set_var(self.key, value),
            None => std::env::remove_var(self.key),
        }
    }
}
