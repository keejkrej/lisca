//! Opaque Bearer session tokens mapped to profile ids on disk.

use std::collections::HashMap;
use std::path::Path;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::config;
use crate::http::FsError;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct SessionsFile {
    sessions: HashMap<String, String>,
}

fn ensure_config_dir() -> Result<PathBuf, FsError> {
    let dir = config::config_dir();
    std::fs::create_dir_all(&dir).map_err(|err| FsError::new(format!("config dir: {err}")))?;
    Ok(dir)
}

fn read_sessions(config: &Path) -> Result<SessionsFile, FsError> {
    let path = config::sessions_path(config);
    if !path.exists() {
        return Ok(SessionsFile::default());
    }
    let raw = std::fs::read_to_string(&path)
        .map_err(|err| FsError::new(format!("read {}: {err}", path.display())))?;
    serde_json::from_str(&raw)
        .map_err(|err| FsError::new(format!("parse {}: {err}", path.display())))
}

fn write_sessions(config: &Path, file: &SessionsFile) -> Result<(), FsError> {
    let path = config::sessions_path(config);
    let raw = serde_json::to_string_pretty(file)
        .map_err(|err| FsError::new(format!("serialize sessions: {err}")))?;
    std::fs::write(&path, raw)
        .map_err(|err| FsError::new(format!("write {}: {err}", path.display())))
}

pub trait SessionStore {
    fn issue(&self, profile_id: &str) -> Result<String, FsError>;
    fn resolve(&self, token: &str) -> Result<String, FsError>;
    fn revoke(&self, token: &str) -> Result<(), FsError>;
}

#[derive(Debug, Default, Clone, Copy)]
pub struct FileSessionStore;

impl SessionStore for FileSessionStore {
    fn issue(&self, profile_id: &str) -> Result<String, FsError> {
        let config = ensure_config_dir()?;
        let mut file = read_sessions(&config)?;
        let token = Uuid::new_v4().to_string();
        file.sessions.insert(token.clone(), profile_id.to_string());
        write_sessions(&config, &file)?;
        Ok(token)
    }

    fn resolve(&self, token: &str) -> Result<String, FsError> {
        let token = token.trim();
        if token.is_empty() {
            return Err(FsError::new("missing access token"));
        }
        let config = config::config_dir();
        let file = read_sessions(&config)?;
        file.sessions
            .get(token)
            .cloned()
            .ok_or_else(|| FsError::new("invalid access token"))
    }

    fn revoke(&self, token: &str) -> Result<(), FsError> {
        let token = token.trim();
        if token.is_empty() {
            return Err(FsError::new("missing access token"));
        }
        let config = ensure_config_dir()?;
        let mut file = read_sessions(&config)?;
        if file.sessions.remove(token).is_none() {
            return Err(FsError::new("invalid access token"));
        }
        write_sessions(&config, &file)
    }
}

pub fn issue(profile_id: &str) -> Result<String, FsError> {
    FileSessionStore.issue(profile_id)
}

pub fn resolve(token: &str) -> Result<String, FsError> {
    FileSessionStore.resolve(token)
}

pub fn revoke(token: &str) -> Result<(), FsError> {
    FileSessionStore.revoke(token)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::test_lock::TEST_CONFIG_LOCK;

    fn set_temp_config_dir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("lisca-session-test-{}", Uuid::new_v4()));
        std::env::set_var("LISCA_CONFIG_DIR", dir.to_string_lossy().to_string());
        dir
    }

    #[test]
    fn issue_resolve_and_revoke_session_token() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let _dir = set_temp_config_dir();

        let token = issue("profile-1").unwrap();
        assert_eq!(resolve(&token).unwrap(), "profile-1");
        revoke(&token).unwrap();
        assert!(resolve(&token).is_err());
    }
}
