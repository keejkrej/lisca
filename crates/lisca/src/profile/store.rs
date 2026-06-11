//! JSON-backed profile and memory store under the config directory.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::config;
use crate::http::FsError;
use crate::protocol::{
    AlignerSource, MemoryAssayEntry, MemoryKind, MemoryRecentResponse, MemorySourceEntry,
    MemoryTouchResponse, MemoryWorkspaceEntry, ProfileListResponse, ProfileResponse,
    ProfileSummary,
};

const MEMORY_CAP: usize = 20;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProfilesIndex {
    profiles: Vec<ProfileSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProfileMeta {
    id: String,
    #[serde(rename = "displayName")]
    display_name: String,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct MemoryFile {
    workspaces: Vec<MemoryWorkspaceEntry>,
    sources: Vec<MemorySourceEntry>,
    assays: Vec<MemoryAssayEntry>,
}

fn now_iso8601() -> String {
    let dur = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let total_secs = dur.as_secs();
    let days = total_secs / 86_400;
    let rem = total_secs % 86_400;
    let hours = rem / 3_600;
    let minutes = (rem % 3_600) / 60;
    let seconds = rem % 60;
    let (year, month, day) = civil_from_days(days);
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hours, minutes, seconds
    )
}

fn civil_from_days(days: u64) -> (u32, u32, u32) {
    let z = days as i64 + 719_468;
    let era = if z >= 0 { z } else { z - 1_461 } / 40_600;
    let doe = z - era * 40_600;
    let yoe = (doe - doe / 1_460) / 365;
    let y = yoe + era * 400;
    let doy = doe - (yoe * 365 + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = mp + 3 - 12 * (mp / 10);
    (y as u32, m as u32, d as u32)
}

fn ensure_config_dir() -> Result<PathBuf, FsError> {
    let dir = config::config_dir();
    fs::create_dir_all(&dir).map_err(|err| FsError::new(format!("config dir: {err}")))?;
    Ok(dir)
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<T, FsError> {
    let raw = fs::read_to_string(path)
        .map_err(|err| FsError::new(format!("read {}: {err}", path.display())))?;
    serde_json::from_str(&raw)
        .map_err(|err| FsError::new(format!("parse {}: {err}", path.display())))
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), FsError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|err| FsError::new(format!("mkdir {}: {err}", parent.display())))?;
    }
    let raw = serde_json::to_string_pretty(value)
        .map_err(|err| FsError::new(format!("serialize: {err}")))?;
    fs::write(path, raw).map_err(|err| FsError::new(format!("write {}: {err}", path.display())))?;
    Ok(())
}

fn read_profiles_index(config: &Path) -> Result<ProfilesIndex, FsError> {
    let path = config::profiles_index_path(config);
    if !path.exists() {
        return Ok(ProfilesIndex {
            profiles: Vec::new(),
        });
    }
    read_json(&path)
}

fn write_profiles_index(config: &Path, index: &ProfilesIndex) -> Result<(), FsError> {
    write_json(&config::profiles_index_path(config), index)
}

fn profile_exists(config: &Path, profile_id: &str) -> bool {
    config::profile_meta_path(config, profile_id).exists()
}

pub fn list_profiles() -> Result<ProfileListResponse, FsError> {
    let config = ensure_config_dir()?;
    let index = read_profiles_index(&config)?;
    Ok(ProfileListResponse {
        profiles: index.profiles,
    })
}

pub fn create_profile(display_name: &str) -> Result<ProfileResponse, FsError> {
    let name = display_name.trim();
    if name.is_empty() {
        return Err(FsError::new("display name is required"));
    }

    let config = ensure_config_dir()?;
    let mut index = read_profiles_index(&config)?;
    if index.profiles.iter().any(|p| p.display_name == name) {
        return Err(FsError::new("profile name already exists"));
    }

    let profile_id = Uuid::new_v4().to_string();
    let created_at = now_iso8601();
    let summary = ProfileSummary {
        id: profile_id.clone(),
        display_name: name.to_string(),
        created_at: created_at.clone(),
    };

    let meta = ProfileMeta {
        id: profile_id.clone(),
        display_name: name.to_string(),
        created_at,
    };

    write_json(&config::profile_meta_path(&config, &profile_id), &meta)?;
    write_json(
        &config::profile_memory_path(&config, &profile_id),
        &MemoryFile::default(),
    )?;

    index.profiles.push(summary);
    write_profiles_index(&config, &index)?;

    Ok(ProfileResponse {
        profile_id,
        display_name: name.to_string(),
    })
}

pub fn sign_in_profile(display_name: &str) -> Result<ProfileResponse, FsError> {
    let name = display_name.trim();
    if name.is_empty() {
        return Err(FsError::new("display name is required"));
    }

    let config = ensure_config_dir()?;
    let index = read_profiles_index(&config)?;
    let found = index
        .profiles
        .iter()
        .find(|p| p.display_name == name)
        .map(|p| ProfileResponse {
            profile_id: p.id.clone(),
            display_name: p.display_name.clone(),
        });

    found.ok_or_else(|| FsError::new("profile not found"))
}

fn read_memory(config: &Path, profile_id: &str) -> Result<MemoryFile, FsError> {
    if !profile_exists(config, profile_id) {
        return Err(FsError::new("profile not found"));
    }
    let path = config::profile_memory_path(config, profile_id);
    if !path.exists() {
        return Ok(MemoryFile::default());
    }
    read_json(&path)
}

fn write_memory(config: &Path, profile_id: &str, memory: &MemoryFile) -> Result<(), FsError> {
    write_json(&config::profile_memory_path(config, profile_id), memory)
}

fn trim_cap<T>(entries: &mut Vec<T>) {
    if entries.len() > MEMORY_CAP {
        entries.truncate(MEMORY_CAP);
    }
}

fn sources_equal(a: &AlignerSource, b: &AlignerSource) -> bool {
    serde_json::to_value(a).ok() == serde_json::to_value(b).ok()
}

pub fn get_recent(profile_id: &str, kind: MemoryKind) -> Result<MemoryRecentResponse, FsError> {
    let config = ensure_config_dir()?;
    let memory = read_memory(&config, profile_id)?;

    match kind {
        MemoryKind::Workspace => Ok(MemoryRecentResponse {
            workspaces: memory.workspaces,
            sources: Vec::new(),
            assays: Vec::new(),
        }),
        MemoryKind::Source => Ok(MemoryRecentResponse {
            workspaces: Vec::new(),
            sources: memory.sources,
            assays: Vec::new(),
        }),
        MemoryKind::Assay => Ok(MemoryRecentResponse {
            workspaces: Vec::new(),
            sources: Vec::new(),
            assays: memory.assays,
        }),
    }
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum MemoryTouchBody {
    Workspace {
        profile_id: String,
        path: String,
        label: Option<String>,
    },
    Source {
        profile_id: String,
        source: AlignerSource,
        label: Option<String>,
    },
    Assay {
        profile_id: String,
        path: String,
        assay_label: Option<String>,
        workspace_path: Option<String>,
    },
}

pub fn touch_memory(body: MemoryTouchBody) -> Result<MemoryTouchResponse, FsError> {
    let config = ensure_config_dir()?;
    let now = now_iso8601();

    match body {
        MemoryTouchBody::Workspace {
            profile_id,
            path,
            label,
        } => {
            let path = path.trim();
            if path.is_empty() {
                return Err(FsError::new("path is required"));
            }
            let mut memory = read_memory(&config, &profile_id)?;
            memory.workspaces.retain(|e| e.path != path);
            memory.workspaces.insert(
                0,
                MemoryWorkspaceEntry {
                    path: path.to_string(),
                    label,
                    last_used_at: now,
                },
            );
            memory
                .workspaces
                .sort_by(|a, b| b.last_used_at.cmp(&a.last_used_at));
            trim_cap(&mut memory.workspaces);
            write_memory(&config, &profile_id, &memory)?;
        }
        MemoryTouchBody::Source {
            profile_id,
            source,
            label,
        } => {
            let mut memory = read_memory(&config, &profile_id)?;
            memory
                .sources
                .retain(|e| !sources_equal(&e.source, &source));
            memory.sources.insert(
                0,
                MemorySourceEntry {
                    source,
                    label,
                    last_used_at: now,
                },
            );
            memory
                .sources
                .sort_by(|a, b| b.last_used_at.cmp(&a.last_used_at));
            trim_cap(&mut memory.sources);
            write_memory(&config, &profile_id, &memory)?;
        }
        MemoryTouchBody::Assay {
            profile_id,
            path,
            assay_label,
            workspace_path,
        } => {
            let path = path.trim();
            if path.is_empty() {
                return Err(FsError::new("path is required"));
            }
            let mut memory = read_memory(&config, &profile_id)?;
            memory.assays.retain(|e| e.path != path);
            memory.assays.insert(
                0,
                MemoryAssayEntry {
                    path: path.to_string(),
                    assay_label,
                    workspace_path,
                    last_used_at: now,
                },
            );
            memory
                .assays
                .sort_by(|a, b| b.last_used_at.cmp(&a.last_used_at));
            trim_cap(&mut memory.assays);
            write_memory(&config, &profile_id, &memory)?;
        }
    }

    Ok(MemoryTouchResponse { ok: true })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::test_lock::TEST_CONFIG_LOCK;
    use crate::protocol::AlignerSource;

    fn set_temp_config_dir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("lisca-profile-test-{}", Uuid::new_v4()));
        std::env::set_var("LISCA_CONFIG_DIR", dir.to_string_lossy().to_string());
        dir
    }

    #[test]
    fn create_and_sign_in_profile() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let _dir = set_temp_config_dir();
        let created = create_profile("alice").unwrap();
        assert_eq!(created.display_name, "alice");
        let signed = sign_in_profile("alice").unwrap();
        assert_eq!(signed.profile_id, created.profile_id);
        assert!(create_profile("alice").is_err());
        assert!(sign_in_profile("bob").is_err());
    }

    #[test]
    fn memory_touch_dedupes_and_caps() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let _dir = set_temp_config_dir();
        let profile = create_profile("mem-user").unwrap();
        for i in 0..25 {
            touch_memory(MemoryTouchBody::Workspace {
                profile_id: profile.profile_id.clone(),
                path: format!("/workspace/run-{i}"),
                label: None,
            })
            .unwrap();
        }
        let recent = get_recent(&profile.profile_id, MemoryKind::Workspace).unwrap();
        assert_eq!(recent.workspaces.len(), MEMORY_CAP);
        touch_memory(MemoryTouchBody::Workspace {
            profile_id: profile.profile_id.clone(),
            path: "/workspace/run-0".to_string(),
            label: Some("again".to_string()),
        })
        .unwrap();
        let again = get_recent(&profile.profile_id, MemoryKind::Workspace).unwrap();
        assert_eq!(again.workspaces[0].path, "/workspace/run-0");
        assert_eq!(again.workspaces[0].label.as_deref(), Some("again"));

        touch_memory(MemoryTouchBody::Source {
            profile_id: profile.profile_id.clone(),
            source: AlignerSource::Nd2 {
                path: "/source/data.nd2".into(),
            },
            label: None,
        })
        .unwrap();
        let sources = get_recent(&profile.profile_id, MemoryKind::Source).unwrap();
        assert_eq!(sources.sources.len(), 1);
    }
}
