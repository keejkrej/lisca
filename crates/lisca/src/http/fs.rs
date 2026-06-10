use std::path::{Component, Path, PathBuf};

use axum::{
    extract::Query,
    routing::get,
    Json, Router,
};
use serde::Deserialize;

use crate::protocol::{
    HomeDirectoryResponse, HostFsEntry, HostListDirectoryResult, ReadTextFileResponse,
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

fn user_home_directory() -> Option<String> {
    std::env::var("USERPROFILE")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| std::env::var("HOME").ok())
}

fn list_directory(path: Option<String>) -> Result<HostListDirectoryResult, FsError> {
    if path.as_deref().map(str::is_empty).unwrap_or(true) {
        return Ok(list_roots());
    }

    let path = PathBuf::from(path.expect("checked above"));
    ensure_local_path_allowed(&path)?;
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
        parent: list_parent_path(&path),
        path: Some(path.to_string_lossy().to_string()),
        entries,
    })
}

fn read_text_file(path: &str) -> Result<ReadTextFileResponse, FsError> {
    ensure_local_path_allowed(Path::new(path))?;
    let contents = std::fs::read_to_string(path)
        .map_err(|error| FsError::new(format!("failed to read text file: {error}")))?;
    Ok(ReadTextFileResponse { contents })
}

fn browse_roots() -> Option<Vec<PathBuf>> {
    let value = std::env::var("LISCA_FS_ROOTS").ok()?;
    let roots = value
        .split(':')
        .map(str::trim)
        .filter(|segment| !segment.is_empty())
        .map(PathBuf::from)
        .collect::<Vec<_>>();
    if roots.is_empty() {
        None
    } else {
        Some(roots)
    }
}

fn normalize_local_path(path: &Path) -> Result<PathBuf, FsError> {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Prefix(_) | Component::RootDir => normalized.push(component.as_os_str()),
            Component::CurDir => {}
            Component::ParentDir => {
                if !normalized.pop() {
                    return Err(FsError::new("path escapes above root"));
                }
            }
            Component::Normal(segment) => normalized.push(segment),
        }
    }
    Ok(normalized)
}

fn path_is_under_root(path: &Path, root: &Path) -> bool {
    path == root || path.starts_with(root)
}

fn ensure_local_path_allowed(path: &Path) -> Result<(), FsError> {
    let Some(roots) = browse_roots() else {
        return Ok(());
    };

    let normalized = normalize_local_path(path)?;
    let allowed = roots.iter().any(|root| {
        normalize_local_path(root)
            .ok()
            .is_some_and(|normalized_root| path_is_under_root(&normalized, &normalized_root))
    });
    if allowed {
        Ok(())
    } else {
        Err(FsError::new("path is outside allowed directories"))
    }
}

fn list_parent_path(path: &Path) -> Option<String> {
    let parent = path.parent()?;
    if browse_roots().is_some() && ensure_local_path_allowed(parent).is_err() {
        // Empty string means "up to synthetic roots" (loadPath(null)), not a real directory.
        return Some(String::new());
    }
    Some(parent.to_string_lossy().to_string())
}

#[cfg(not(windows))]
fn roots_from_env() -> Option<HostListDirectoryResult> {
    let roots = browse_roots()?;
    let mut entries = Vec::new();
    for root in roots {
        if !root.is_dir() {
            continue;
        }
        let name = root
            .file_name()
            .map(|segment| segment.to_string_lossy().to_string())
            .unwrap_or_else(|| root.to_string_lossy().to_string());
        entries.push(HostFsEntry {
            name,
            path: root.to_string_lossy().to_string(),
            is_directory: true,
        });
    }
    if entries.is_empty() {
        return None;
    }
    Some(HostListDirectoryResult {
        path: None,
        parent: None,
        entries,
    })
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
    if let Some(result) = roots_from_env() {
        return result;
    }

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_local_path_resolves_parent_segments() {
        let path = normalize_local_path(Path::new("/workspace/../workspace/run-1")).unwrap();
        assert_eq!(path, Path::new("/workspace/run-1"));
    }

    #[test]
    fn path_is_under_root_matches_descendants() {
        assert!(path_is_under_root(
            Path::new("/workspace/run-1"),
            Path::new("/workspace")
        ));
        assert!(!path_is_under_root(Path::new("/etc"), Path::new("/workspace")));
    }

    #[test]
    fn list_parent_path_hides_parent_outside_allowed_roots() {
        let parent = list_parent_path(Path::new("/workspace/run-1"));
        assert_eq!(parent.as_deref(), Some("/workspace"));

        std::env::set_var("LISCA_FS_ROOTS", "/workspace:/source");
        let parent = list_parent_path(Path::new("/workspace"));
        assert_eq!(parent.as_deref(), Some(""));
        std::env::remove_var("LISCA_FS_ROOTS");
    }

    #[test]
    fn ensure_local_path_allowed_rejects_paths_outside_roots() {
        std::env::set_var("LISCA_FS_ROOTS", "/workspace:/source");
        assert!(ensure_local_path_allowed(Path::new("/workspace/run-1")).is_ok());
        assert!(ensure_local_path_allowed(Path::new("/etc")).is_err());
        std::env::remove_var("LISCA_FS_ROOTS");
    }
}
