use std::path::PathBuf;

use axum::{
    extract::Query,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;

use crate::{
    protocol::{
        HomeDirectoryResponse, HostFsEntry, HostListDirectoryResult, ReadTextFileResponse,
        SmbConnectRequest, SmbConnectResponse, SmbDisconnectRequest,
    },
    smb::{self, is_smb_path},
};

use super::error::FsError;

#[derive(Debug, Deserialize)]
struct ListDirectoryQuery {
    path: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ReadTextFileQuery {
    path: String,
}

pub fn router<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    Router::new()
        .route("/fs/list", get(list_directory_handler))
        .route("/fs/home", get(home_directory_handler))
        .route("/fs/read-text", get(read_text_file_handler))
        .route("/fs/smb/connect", post(smb_connect_handler))
        .route("/fs/smb/disconnect", post(smb_disconnect_handler))
}

async fn list_directory_handler(
    Query(query): Query<ListDirectoryQuery>,
) -> Result<Json<HostListDirectoryResult>, FsError> {
    list_directory(query.path).map(Json)
}

async fn home_directory_handler() -> Result<Json<HomeDirectoryResponse>, FsError> {
    let home = user_home_directory().ok_or_else(|| FsError::new("home directory not found"))?;
    Ok(Json(HomeDirectoryResponse { path: home }))
}

async fn read_text_file_handler(
    Query(query): Query<ReadTextFileQuery>,
) -> Result<Json<ReadTextFileResponse>, FsError> {
    read_text_file(&query.path).map(Json)
}

async fn smb_connect_handler(
    Json(request): Json<SmbConnectRequest>,
) -> Result<Json<SmbConnectResponse>, FsError> {
    smb::connect(&request.url, &request.username, &request.password)
        .map(Json)
        .map_err(FsError::new)
}

async fn smb_disconnect_handler(
    Json(request): Json<SmbDisconnectRequest>,
) -> Result<Json<serde_json::Value>, FsError> {
    smb::disconnect(&request.session_id)
        .map(|_| Json(serde_json::json!({ "ok": true })))
        .map_err(FsError::new)
}

fn user_home_directory() -> Option<String> {
    std::env::var("USERPROFILE")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| std::env::var("HOME").ok())
}

fn list_directory(path: Option<String>) -> Result<HostListDirectoryResult, FsError> {
    if path.as_deref().is_some_and(is_smb_path) {
        return smb::list_directory(path.as_deref().expect("checked above"))
            .map_err(FsError::new);
    }

    if path.as_deref().map(str::is_empty).unwrap_or(true) {
        return Ok(list_roots());
    }

    let path = PathBuf::from(path.expect("checked above"));
    let metadata = std::fs::metadata(&path)
        .map_err(|error| FsError::new(format!("failed to read directory: {error}")))?;
    if !metadata.is_dir() {
        return Err(FsError::new("path is not a directory"));
    }

    let mut entries = Vec::new();
    let read_dir = std::fs::read_dir(&path)
        .map_err(|error| FsError::new(format!("failed to list directory: {error}")))?;

    for entry in read_dir.flatten() {
        let entry_path = entry.path();
        let Ok(entry_type) = entry.file_type() else {
            continue;
        };
        let name = entry.file_name().to_string_lossy().to_string();
        entries.push(HostFsEntry {
            name,
            path: entry_path.to_string_lossy().to_string(),
            is_directory: entry_type.is_dir(),
        });
    }

    entries.sort_by(|left, right| {
        right
            .is_directory
            .cmp(&left.is_directory)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });

    Ok(HostListDirectoryResult {
        parent: path
            .parent()
            .map(|parent| parent.to_string_lossy().to_string()),
        path: Some(path.to_string_lossy().to_string()),
        entries,
    })
}

fn read_text_file(path: &str) -> Result<ReadTextFileResponse, FsError> {
    if is_smb_path(path) {
        const MAX_TEXT_BYTES: u64 = 64 * 1024 * 1024;
        let contents = String::from_utf8(smb::read_bytes_bounded(path, MAX_TEXT_BYTES).map_err(FsError::new)?)
            .map_err(|error| FsError::new(format!("SMB text file is not valid UTF-8: {error}")))?;
        return Ok(ReadTextFileResponse { contents });
    }

    let contents = std::fs::read_to_string(path)
        .map_err(|error| FsError::new(format!("failed to read text file: {error}")))?;
    Ok(ReadTextFileResponse { contents })
}

#[cfg(windows)]
fn list_roots() -> HostListDirectoryResult {
    let mut entries = Vec::new();
    for letter in b'A'..=b'Z' {
        let path = format!("{}:\\", letter as char);
        if std::path::Path::new(&path).exists() {
            entries.push(HostFsEntry {
                name: path.clone(),
                path,
                is_directory: true,
            });
        }
    }

    HostListDirectoryResult {
        path: None,
        parent: None,
        entries,
    }
}

#[cfg(not(windows))]
fn list_roots() -> HostListDirectoryResult {
    let mut entries = Vec::new();
    for (name, path) in [("workspace", "/workspace"), ("source", "/source")] {
        if std::path::Path::new(path).is_dir() {
            entries.push(HostFsEntry {
                name: name.to_string(),
                path: path.to_string(),
                is_directory: true,
            });
        }
    }
    if entries.is_empty() {
        entries.push(HostFsEntry {
            name: "/".to_string(),
            path: "/".to_string(),
            is_directory: true,
        });
    }
    HostListDirectoryResult {
        path: None,
        parent: None,
        entries,
    }
}
