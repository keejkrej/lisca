//! JSON-backed profile and memory store under the config directory.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::config;
use crate::http::FsError;
use crate::profile::session;
use crate::protocol::{
    AlignerSource, MemoryAssayEntry, MemoryKind, MemoryRecentResponse, MemorySourceEntry,
    MemoryTouchResponse, MemoryWorkspaceEntry, ProfileListResponse, ProfileSessionResponse,
    ProfileSignOutResponse, ProfileSummary,
};

const MEMORY_CAP: usize = 20;
const MAX_SAFE_EPOCH_MILLIS: u64 = 9_007_199_254_740_991;
const MILLIS_PER_DAY: u64 = 86_400_000;

#[derive(Debug, Clone, Serialize)]
struct ProfilesIndex {
    profiles: Vec<ProfileSummary>,
}

#[derive(Debug, Deserialize)]
struct StoredProfilesIndex {
    profiles: Vec<StoredProfileSummary>,
}

#[derive(Debug, Deserialize)]
struct StoredProfileSummary {
    id: String,
    #[serde(rename = "displayName")]
    display_name: String,
    #[serde(rename = "createdAt")]
    created_at: StoredTimestamp,
}

#[derive(Debug, Clone, Serialize)]
struct ProfileMeta {
    id: String,
    #[serde(rename = "displayName")]
    display_name: String,
    #[serde(rename = "createdAt")]
    created_at: u64,
}

#[derive(Debug, Clone, Default, Serialize)]
struct MemoryFile {
    workspaces: Vec<MemoryWorkspaceEntry>,
    sources: Vec<MemorySourceEntry>,
    assays: Vec<MemoryAssayEntry>,
}

#[derive(Debug, Deserialize)]
struct StoredMemoryFile {
    workspaces: Vec<StoredMemoryWorkspaceEntry>,
    sources: Vec<StoredMemorySourceEntry>,
    assays: Vec<StoredMemoryAssayEntry>,
}

#[derive(Debug, Deserialize)]
struct StoredMemoryWorkspaceEntry {
    path: String,
    label: Option<String>,
    #[serde(rename = "lastUsedAt")]
    last_used_at: StoredTimestamp,
}

#[derive(Debug, Deserialize)]
struct StoredMemorySourceEntry {
    source: AlignerSource,
    label: Option<String>,
    #[serde(rename = "lastUsedAt")]
    last_used_at: StoredTimestamp,
}

#[derive(Debug, Deserialize)]
struct StoredMemoryAssayEntry {
    path: String,
    #[serde(rename = "assayLabel")]
    assay_label: Option<String>,
    #[serde(rename = "workspacePath")]
    workspace_path: Option<String>,
    #[serde(rename = "lastUsedAt")]
    last_used_at: StoredTimestamp,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum StoredTimestamp {
    EpochMillis(u64),
    LegacyIso(String),
}

impl StoredTimestamp {
    fn into_epoch_millis(self) -> Result<u64, String> {
        match self {
            Self::EpochMillis(value) => ensure_safe_epoch_millis(value),
            Self::LegacyIso(value) => legacy_iso_to_epoch_millis(&value)
                .ok_or_else(|| format!("invalid legacy timestamp {value:?}")),
        }
    }
}

impl StoredMemoryFile {
    fn into_memory_file(self) -> Result<MemoryFile, String> {
        let mut workspaces = Vec::with_capacity(self.workspaces.len());
        for entry in self.workspaces {
            let last_used_at = entry.last_used_at.into_epoch_millis()?;
            workspaces.push(MemoryWorkspaceEntry {
                path: entry.path,
                label: entry.label,
                last_used_at,
            });
        }

        let mut sources = Vec::with_capacity(self.sources.len());
        for entry in self.sources {
            let last_used_at = entry.last_used_at.into_epoch_millis()?;
            sources.push(MemorySourceEntry {
                source: entry.source,
                label: entry.label,
                last_used_at,
            });
        }

        let mut assays = Vec::with_capacity(self.assays.len());
        for entry in self.assays {
            let last_used_at = entry.last_used_at.into_epoch_millis()?;
            assays.push(MemoryAssayEntry {
                path: entry.path,
                assay_label: entry.assay_label,
                workspace_path: entry.workspace_path,
                last_used_at,
            });
        }

        Ok(MemoryFile {
            workspaces,
            sources,
            assays,
        })
    }
}

fn epoch_millis(time: SystemTime) -> u64 {
    time.duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .try_into()
        .unwrap_or(u64::MAX)
}

fn ensure_safe_epoch_millis(value: u64) -> Result<u64, String> {
    if value <= MAX_SAFE_EPOCH_MILLIS {
        Ok(value)
    } else {
        Err(format!(
            "timestamp {value} exceeds the JavaScript safe-integer ceiling"
        ))
    }
}

fn now_epoch_millis() -> Result<u64, FsError> {
    ensure_safe_epoch_millis(epoch_millis(SystemTime::now())).map_err(FsError::new)
}

fn legacy_iso_to_epoch_millis(value: &str) -> Option<u64> {
    let value = value.strip_suffix('Z')?;
    let (date, time) = value.split_once('T')?;
    let [year, month, day] = parse_timestamp_parts(date, '-')?;
    let [hour, minute, second] = parse_timestamp_parts(time, ':')?;
    if !(1..=12).contains(&month)
        || !(1..=31).contains(&day)
        || hour > 23
        || minute > 59
        || second > 59
    {
        return None;
    }

    // The deleted formatter used `era = (days + 719_468) / 40_600` and then
    // emitted `year = era * 400 + yoe`. Deriving the era from the stored year
    // narrows inversion to at most one 40,600-day block. Matching the complete
    // emitted date recovers the original Unix day without treating the wrong
    // year as a real Gregorian year.
    let era = year / 400;
    let start_z = era.checked_mul(40_600)?;
    let end_z = era.checked_add(1)?.checked_mul(40_600)?;
    let start_day = start_z.saturating_sub(719_468);
    let max_safe_day = MAX_SAFE_EPOCH_MILLIS / MILLIS_PER_DAY;
    if start_day > max_safe_day {
        return None;
    }
    let end_day = end_z
        .checked_sub(719_468)?
        .min(max_safe_day.checked_add(1)?);
    let mut matching_days = (start_day..end_day)
        .filter(|candidate| legacy_civil_from_days(*candidate) == (year, month, day));
    let days = matching_days.next()?;
    if matching_days.next().is_some() {
        return None;
    }

    let millis = days
        .checked_mul(86_400)?
        .checked_add(hour.checked_mul(3_600)?)?
        .checked_add(minute.checked_mul(60)?)?
        .checked_add(second)?
        .checked_mul(1_000)?;
    (millis <= MAX_SAFE_EPOCH_MILLIS).then_some(millis)
}

fn parse_timestamp_parts<const N: usize>(value: &str, separator: char) -> Option<[u64; N]> {
    let parts = value
        .split(separator)
        .map(str::parse::<u64>)
        .collect::<Result<Vec<_>, _>>()
        .ok()?;
    parts.try_into().ok()
}

fn legacy_civil_from_days(days: u64) -> (u64, u64, u64) {
    let z = days as i64 + 719_468;
    let era = if z >= 0 { z } else { z - 1_461 } / 40_600;
    let doe = z - era * 40_600;
    let yoe = (doe - doe / 1_460) / 365;
    let y = yoe + era * 400;
    let doy = doe - (yoe * 365 + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = mp + 3 - 12 * (mp / 10);
    (y as u64, m as u64, d as u64)
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
    let stored: StoredProfilesIndex = read_json(&path)?;
    let profiles = stored
        .profiles
        .into_iter()
        .map(|profile| {
            let created_at = profile
                .created_at
                .into_epoch_millis()
                .map_err(|error| FsError::new(format!("parse {}: {error}", path.display())))?;
            Ok(ProfileSummary {
                id: profile.id,
                display_name: profile.display_name,
                created_at,
            })
        })
        .collect::<Result<Vec<_>, FsError>>()?;
    Ok(ProfilesIndex { profiles })
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

pub fn create_profile(display_name: &str) -> Result<ProfileSessionResponse, FsError> {
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
    let created_at = now_epoch_millis()?;
    let summary = ProfileSummary {
        id: profile_id.clone(),
        display_name: name.to_string(),
        created_at,
    };

    let meta = ProfileMeta {
        id: profile_id.clone(),
        display_name: name.to_string(),
        created_at: summary.created_at,
    };

    write_json(&config::profile_meta_path(&config, &profile_id), &meta)?;
    write_json(
        &config::profile_memory_path(&config, &profile_id),
        &MemoryFile::default(),
    )?;

    index.profiles.push(summary);
    write_profiles_index(&config, &index)?;

    let access_token = session::issue(&profile_id)?;

    Ok(ProfileSessionResponse {
        profile_id,
        display_name: name.to_string(),
        access_token,
    })
}

pub fn sign_in_profile(display_name: &str) -> Result<ProfileSessionResponse, FsError> {
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
        .map(|p| p.id.clone());

    let profile_id = found.ok_or_else(|| FsError::new("profile not found"))?;
    let access_token = session::issue(&profile_id)?;

    Ok(ProfileSessionResponse {
        profile_id,
        display_name: name.to_string(),
        access_token,
    })
}

pub fn sign_out_profile(token: &str) -> Result<ProfileSignOutResponse, FsError> {
    session::revoke(token)?;
    Ok(ProfileSignOutResponse { ok: true })
}

fn read_memory(config: &Path, profile_id: &str) -> Result<MemoryFile, FsError> {
    if !profile_exists(config, profile_id) {
        return Err(FsError::new("profile not found"));
    }
    let path = config::profile_memory_path(config, profile_id);
    if !path.exists() {
        return Ok(MemoryFile::default());
    }
    let stored: StoredMemoryFile = read_json(&path)?;
    stored
        .into_memory_file()
        .map_err(|error| FsError::new(format!("parse {}: {error}", path.display())))
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

pub fn touch_memory(
    profile_id: &str,
    body: crate::protocol::MemoryTouchRequest,
) -> Result<MemoryTouchResponse, FsError> {
    touch_memory_at(profile_id, body, now_epoch_millis()?)
}

fn touch_memory_at(
    profile_id: &str,
    body: crate::protocol::MemoryTouchRequest,
    now: u64,
) -> Result<MemoryTouchResponse, FsError> {
    let config = ensure_config_dir()?;
    let now = ensure_safe_epoch_millis(now).map_err(FsError::new)?;

    match body {
        crate::protocol::MemoryTouchRequest::Workspace { path, label } => {
            let path = path.trim();
            if path.is_empty() {
                return Err(FsError::new("path is required"));
            }
            let mut memory = read_memory(&config, profile_id)?;
            memory.workspaces.retain(|e| e.path != path);
            memory.workspaces.insert(
                0,
                MemoryWorkspaceEntry {
                    path: path.to_string(),
                    label,
                    last_used_at: now,
                },
            );
            trim_cap(&mut memory.workspaces);
            write_memory(&config, profile_id, &memory)?;
        }
        crate::protocol::MemoryTouchRequest::Source { source, label } => {
            let mut memory = read_memory(&config, profile_id)?;
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
            trim_cap(&mut memory.sources);
            write_memory(&config, profile_id, &memory)?;
        }
        crate::protocol::MemoryTouchRequest::Assay {
            path,
            assay_label,
            workspace_path,
        } => {
            let path = path.trim();
            if path.is_empty() {
                return Err(FsError::new("path is required"));
            }
            let mut memory = read_memory(&config, profile_id)?;
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
            trim_cap(&mut memory.assays);
            write_memory(&config, profile_id, &memory)?;
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
        assert!(!created.access_token.is_empty());
        let signed = sign_in_profile("alice").unwrap();
        assert_eq!(signed.profile_id, created.profile_id);
        assert!(!signed.access_token.is_empty());
        assert!(create_profile("alice").is_err());
        assert!(sign_in_profile("bob").is_err());
    }

    #[test]
    fn sign_out_revokes_access_token() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let _dir = set_temp_config_dir();
        let created = create_profile("bob").unwrap();
        sign_out_profile(&created.access_token).unwrap();
        assert!(session::resolve(&created.access_token).is_err());
    }

    #[test]
    fn memory_touch_dedupes_and_caps() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let _dir = set_temp_config_dir();
        let profile = create_profile("mem-user").unwrap();
        for i in 0..25 {
            touch_memory(
                &profile.profile_id,
                crate::protocol::MemoryTouchRequest::Workspace {
                    path: format!("/workspace/run-{i}"),
                    label: None,
                },
            )
            .unwrap();
        }
        let recent = get_recent(&profile.profile_id, MemoryKind::Workspace).unwrap();
        assert_eq!(recent.workspaces.len(), MEMORY_CAP);
        touch_memory(
            &profile.profile_id,
            crate::protocol::MemoryTouchRequest::Workspace {
                path: "/workspace/run-0".to_string(),
                label: Some("again".to_string()),
            },
        )
        .unwrap();
        let again = get_recent(&profile.profile_id, MemoryKind::Workspace).unwrap();
        assert_eq!(again.workspaces[0].path, "/workspace/run-0");
        assert_eq!(again.workspaces[0].label.as_deref(), Some("again"));

        touch_memory(
            &profile.profile_id,
            crate::protocol::MemoryTouchRequest::Source {
                source: AlignerSource::Nd2 {
                    path: "/source/data.nd2".into(),
                },
                label: None,
            },
        )
        .unwrap();
        let sources = get_recent(&profile.profile_id, MemoryKind::Source).unwrap();
        assert_eq!(sources.sources.len(), 1);
    }

    #[test]
    fn memory_touch_preserves_recency_across_month_and_year_boundaries() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let _dir = set_temp_config_dir();
        let profile = create_profile("boundary-user").unwrap();
        let touches = [
            ("/workspace/january", 1_706_745_599_000),
            ("/workspace/february", 1_706_745_600_000),
            ("/workspace/december", 1_735_689_599_000),
            ("/workspace/new-year", 1_735_689_600_000),
        ];

        for (path, timestamp) in touches {
            touch_memory_at(
                &profile.profile_id,
                crate::protocol::MemoryTouchRequest::Workspace {
                    path: path.to_string(),
                    label: None,
                },
                timestamp,
            )
            .unwrap();
        }

        let recent = get_recent(&profile.profile_id, MemoryKind::Workspace).unwrap();
        let paths = recent
            .workspaces
            .iter()
            .map(|entry| entry.path.as_str())
            .collect::<Vec<_>>();
        assert_eq!(
            paths,
            [
                "/workspace/new-year",
                "/workspace/december",
                "/workspace/february",
                "/workspace/january",
            ]
        );
        assert_eq!(recent.workspaces[0].last_used_at, 1_735_689_600_000);
    }

    #[test]
    fn legacy_profiles_are_read_without_rewrite_then_create_canonicalizes() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let config = set_temp_config_dir();
        fs::create_dir_all(config.join("profiles/legacy-profile")).unwrap();
        let legacy_index = r#"{
            "profiles": [
                {
                    "id": "legacy-profile",
                    "displayName": "legacy",
                    "createdAt": "7225-09-04T12:34:56Z"
                }
            ]
        }"#;
        fs::write(config::profiles_index_path(&config), legacy_index).unwrap();
        let legacy_meta = r#"{
                "id": "legacy-profile",
                "displayName": "legacy",
                "createdAt": "7225-09-04T12:34:56Z"
            }"#;
        fs::write(
            config::profile_meta_path(&config, "legacy-profile"),
            legacy_meta,
        )
        .unwrap();

        let expected = ((20_650_u64 * 86_400) + (12 * 3_600) + (34 * 60) + 56) * 1_000;
        let listed = list_profiles().unwrap();
        assert_eq!(listed.profiles.len(), 1);
        assert_eq!(listed.profiles[0].created_at, expected);
        assert_eq!(
            sign_in_profile("legacy").unwrap().profile_id,
            "legacy-profile"
        );
        assert_eq!(
            fs::read_to_string(config::profiles_index_path(&config)).unwrap(),
            legacy_index
        );
        assert_eq!(
            fs::read_to_string(config::profile_meta_path(&config, "legacy-profile")).unwrap(),
            legacy_meta
        );

        assert_eq!(
            create_profile("new-profile").unwrap().display_name,
            "new-profile"
        );

        let persisted: serde_json::Value =
            read_json(&config::profiles_index_path(&config)).unwrap();
        assert_eq!(
            persisted["profiles"][0]["createdAt"].as_u64(),
            Some(expected)
        );
        assert!(persisted["profiles"][1]["createdAt"].is_u64());
        assert_eq!(
            fs::read_to_string(config::profile_meta_path(&config, "legacy-profile")).unwrap(),
            legacy_meta
        );
    }

    #[test]
    fn legacy_memory_is_read_without_rewrite_then_touch_canonicalizes() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let config = set_temp_config_dir();
        let profile = create_profile("legacy-memory").unwrap();
        let legacy_memory = r#"{
            "workspaces": [
                {
                    "path": "/workspace/recent",
                    "label": "recent",
                    "lastUsedAt": "7225-09-04T12:34:56Z"
                },
                {
                    "path": "/workspace/older",
                    "lastUsedAt": "7223-04-20T01:02:03Z"
                }
            ],
            "sources": [
                {
                    "source": { "kind": "nd2", "path": "/source/legacy.nd2" },
                    "label": "source label",
                    "lastUsedAt": "7225-09-04T12:34:56Z"
                }
            ],
            "assays": [
                {
                    "path": "/assays/legacy.json",
                    "assayLabel": "legacy assay",
                    "workspacePath": "/workspace/recent",
                    "lastUsedAt": "7225-09-04T12:34:56Z"
                }
            ]
        }"#;
        fs::write(
            config::profile_memory_path(&config, &profile.profile_id),
            legacy_memory,
        )
        .unwrap();

        let expected_recent = ((20_650_u64 * 86_400) + (12 * 3_600) + (34 * 60) + 56) * 1_000;
        let expected_older = ((19_782_u64 * 86_400) + 3_723) * 1_000;
        let recent = get_recent(&profile.profile_id, MemoryKind::Workspace).unwrap();
        assert_eq!(
            recent
                .workspaces
                .iter()
                .map(|entry| entry.path.as_str())
                .collect::<Vec<_>>(),
            ["/workspace/recent", "/workspace/older"]
        );
        assert_eq!(recent.workspaces[0].label.as_deref(), Some("recent"));
        assert_eq!(recent.workspaces[0].last_used_at, expected_recent);
        assert_eq!(recent.workspaces[1].last_used_at, expected_older);
        let recent_sources = get_recent(&profile.profile_id, MemoryKind::Source).unwrap();
        assert_eq!(recent_sources.sources.len(), 1);
        assert_eq!(
            recent_sources.sources[0].label.as_deref(),
            Some("source label")
        );
        assert_eq!(recent_sources.sources[0].last_used_at, expected_recent);
        let recent_assays = get_recent(&profile.profile_id, MemoryKind::Assay).unwrap();
        assert_eq!(recent_assays.assays.len(), 1);
        assert_eq!(
            recent_assays.assays[0].assay_label.as_deref(),
            Some("legacy assay")
        );
        assert_eq!(recent_assays.assays[0].last_used_at, expected_recent);
        assert_eq!(
            fs::read_to_string(config::profile_memory_path(&config, &profile.profile_id)).unwrap(),
            legacy_memory
        );

        touch_memory_at(
            &profile.profile_id,
            crate::protocol::MemoryTouchRequest::Workspace {
                path: "/workspace/new".to_string(),
                label: Some("new".to_string()),
            },
            expected_recent + 1_000,
        )
        .unwrap();

        let persisted: serde_json::Value =
            read_json(&config::profile_memory_path(&config, &profile.profile_id)).unwrap();
        assert_eq!(persisted["workspaces"][0]["path"], "/workspace/new");
        assert_eq!(persisted["workspaces"][1]["path"], "/workspace/recent");
        assert_eq!(persisted["workspaces"][2]["path"], "/workspace/older");
        for collection in ["workspaces", "sources", "assays"] {
            assert!(persisted[collection]
                .as_array()
                .unwrap()
                .iter()
                .all(|entry| entry["lastUsedAt"].is_u64()));
        }
        assert_eq!(persisted["sources"][0]["label"], "source label");
        assert_eq!(persisted["assays"][0]["assayLabel"], "legacy assay");
        assert_eq!(persisted["assays"][0]["workspacePath"], "/workspace/recent");
    }

    #[test]
    fn malformed_legacy_timestamp_returns_an_error_without_rewriting() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let config = set_temp_config_dir();
        let profile = create_profile("malformed-memory").unwrap();
        let malformed = r#"{
            "workspaces": [
                {
                    "path": "/workspace/bad",
                    "lastUsedAt": "not-a-legacy-timestamp"
                }
            ],
            "sources": [],
            "assays": []
        }"#;
        let path = config::profile_memory_path(&config, &profile.profile_id);
        fs::write(&path, malformed).unwrap();

        let error = get_recent(&profile.profile_id, MemoryKind::Workspace).unwrap_err();
        assert!(error.message().contains("invalid legacy timestamp"));
        assert_eq!(fs::read_to_string(path).unwrap(), malformed);

        let malformed_profiles = r#"{
            "profiles": [
                {
                    "id": "bad-profile",
                    "displayName": "bad",
                    "createdAt": "not-a-legacy-timestamp"
                }
            ]
        }"#;
        let profiles_path = config::profiles_index_path(&config);
        fs::write(&profiles_path, malformed_profiles).unwrap();
        let error = list_profiles().unwrap_err();
        assert!(error.message().contains("invalid legacy timestamp"));
        assert_eq!(
            fs::read_to_string(profiles_path).unwrap(),
            malformed_profiles
        );
    }

    #[test]
    fn unsafe_or_extreme_timestamps_error_without_rewriting_or_panicking() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let config = set_temp_config_dir();
        let profile = create_profile("unsafe-timestamps").unwrap();

        let unsafe_profiles = format!(
            r#"{{
                "profiles": [
                    {{
                        "id": "{}",
                        "displayName": "unsafe-timestamps",
                        "createdAt": {}
                    }}
                ]
            }}"#,
            profile.profile_id,
            MAX_SAFE_EPOCH_MILLIS + 1
        );
        let profiles_path = config::profiles_index_path(&config);
        fs::write(&profiles_path, &unsafe_profiles).unwrap();
        let error = list_profiles().unwrap_err();
        assert!(error.message().contains("safe-integer ceiling"));
        assert_eq!(fs::read_to_string(&profiles_path).unwrap(), unsafe_profiles);

        let memory_path = config::profile_memory_path(&config, &profile.profile_id);
        let unsafe_memory = format!(
            r#"{{
                "workspaces": [
                    {{ "path": "/workspace/unsafe", "lastUsedAt": {} }}
                ],
                "sources": [],
                "assays": []
            }}"#,
            MAX_SAFE_EPOCH_MILLIS + 1
        );
        fs::write(&memory_path, &unsafe_memory).unwrap();
        let error = get_recent(&profile.profile_id, MemoryKind::Workspace).unwrap_err();
        assert!(error.message().contains("safe-integer ceiling"));
        assert_eq!(fs::read_to_string(&memory_path).unwrap(), unsafe_memory);

        let above_ceiling_day = MAX_SAFE_EPOCH_MILLIS / MILLIS_PER_DAY + 1;
        let (year, month, day) = legacy_civil_from_days(above_ceiling_day);
        let above_ceiling_legacy = format!("{year:04}-{month:02}-{day:02}T00:00:00Z");
        for timestamp in [
            above_ceiling_legacy,
            "18446744073709551615-01-01T00:00:00Z".to_string(),
            "7225-00-04T00:00:00Z".to_string(),
            "7225-09-00T00:00:00Z".to_string(),
        ] {
            let legacy_memory = format!(
                r#"{{
                    "workspaces": [
                        {{ "path": "/workspace/extreme", "lastUsedAt": "{timestamp}" }}
                    ],
                    "sources": [],
                    "assays": []
                }}"#
            );
            fs::write(&memory_path, &legacy_memory).unwrap();
            let error = get_recent(&profile.profile_id, MemoryKind::Workspace).unwrap_err();
            assert!(error.message().contains("invalid legacy timestamp"));
            assert_eq!(fs::read_to_string(&memory_path).unwrap(), legacy_memory);
        }
    }
}
