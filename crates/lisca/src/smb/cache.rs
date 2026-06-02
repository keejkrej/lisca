use std::{
    fs,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
};

use super::{path::is_smb_path, session::read_bytes};

pub fn resolve_local_path(path: &Path) -> Result<PathBuf, String> {
    let Some(path_str) = path.to_str() else {
        return Err("path is not valid UTF-8".to_string());
    };
    if !is_smb_path(path_str) {
        return Ok(path.to_path_buf());
    }

    let cache_dir = cache_file_path(path_str)?;
    if cache_dir.exists() {
        return Ok(cache_dir);
    }
    if let Some(parent) = cache_dir.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let bytes = read_bytes(path_str)?;
    fs::write(&cache_dir, bytes).map_err(|error| error.to_string())?;
    Ok(cache_dir)
}

fn cache_file_path(path: &str) -> Result<PathBuf, String> {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    path.hash(&mut hasher);
    let hash = hasher.finish();
    let file_name = path
        .rsplit('/')
        .next()
        .or_else(|| path.rsplit('\\').next())
        .unwrap_or("file");
    Ok(std::env::temp_dir()
        .join("lisca-smb-cache")
        .join(format!("{hash:016x}"))
        .join(file_name))
}
