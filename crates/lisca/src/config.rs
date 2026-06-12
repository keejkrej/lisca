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

fn user_home() -> Option<PathBuf> {
    std::env::var("HOME")
        .ok()
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
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
        std::env::set_var("LISCA_CONFIG_DIR", temp.to_string_lossy().to_string());
        assert_eq!(config_dir(), temp);
        std::env::remove_var("LISCA_CONFIG_DIR");
    }
}
