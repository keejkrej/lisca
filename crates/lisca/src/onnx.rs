//! Shared ONNX mechanics and on-demand weight caching for Smart tools.

use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use ort::session::Session;

const DEFAULT_HF_BASE_URL: &str = "https://huggingface.co";
static DOWNLOAD_LOCK: Mutex<()> = Mutex::new(());

pub(crate) const IMAGENET_MEAN: [f32; 3] = [0.485, 0.456, 0.406];
pub(crate) const IMAGENET_STD: [f32; 3] = [0.229, 0.224, 0.225];

pub(crate) fn workspace_models_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../models")
}

pub(crate) fn user_models_cache_dir() -> PathBuf {
    if let Ok(custom) = std::env::var("LISCA_MODELS_CACHE_DIR") {
        let trimmed = custom.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }
    crate::config::config_dir().join("models")
}

fn hf_base_url() -> String {
    if let Ok(custom) = std::env::var("LISCA_HF_BASE_URL") {
        let trimmed = custom.trim().trim_end_matches('/');
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    DEFAULT_HF_BASE_URL.to_string()
}

pub(crate) fn auto_download_enabled() -> bool {
    !std::env::var("LISCA_NO_MODEL_DOWNLOAD")
        .ok()
        .is_some_and(|v| matches!(v.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes"))
}

/// Download missing ONNX files from Hugging Face into `<user_models_cache_dir>/<cache_subdir>`
/// using atomic `.part` writes so interrupted downloads never leave corrupt weights.
pub(crate) fn ensure_cached_hf_files(
    cache_subdir: &str,
    repo_id: &str,
    files: &[(&str, &str)],
) -> Result<PathBuf, String> {
    let base = hf_base_url();
    ensure_cached_hf_files_in(
        &user_models_cache_dir(),
        &base,
        cache_subdir,
        repo_id,
        files,
    )
}

fn ensure_cached_hf_files_in(
    cache_root: &Path,
    base_url: &str,
    cache_subdir: &str,
    repo_id: &str,
    files: &[(&str, &str)],
) -> Result<PathBuf, String> {
    let target_dir = cache_root.join(cache_subdir);
    if files
        .iter()
        .all(|(_, local_name)| target_dir.join(local_name).is_file())
    {
        return Ok(target_dir);
    }

    let _guard = DOWNLOAD_LOCK
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    if files
        .iter()
        .all(|(_, local_name)| target_dir.join(local_name).is_file())
    {
        return Ok(target_dir);
    }

    fs::create_dir_all(&target_dir).map_err(|error| {
        format!(
            "failed to create model cache directory {}: {error}",
            target_dir.display()
        )
    })?;

    let base = base_url.trim_end_matches('/');
    for &(remote_path, local_name) in files {
        let dest = target_dir.join(local_name);
        if dest.is_file() {
            continue;
        }
        let url = format!("{base}/{repo_id}/resolve/main/{remote_path}");
        tracing::info!(
            "downloading Smart ONNX weight from {url} -> {}",
            dest.display()
        );
        let part = target_dir.join(format!("{local_name}.{}.part", std::process::id()));
        let download_result = (|| -> Result<(), String> {
            let response = ureq::get(&url)
                .config()
                .http_status_as_error(false)
                .build()
                .call()
                .map_err(|error| format!("download failed from {url}: {error}"))?;
            let status = response.status().as_u16();
            if !(200..300).contains(&status) {
                return Err(format!("download failed from {url}: HTTP {status}"));
            }
            let mut reader = response.into_body().into_reader();
            let mut out = File::create(&part)
                .map_err(|error| format!("failed to create {}: {error}", part.display()))?;
            let written = io::copy(&mut reader, &mut out)
                .map_err(|error| format!("failed while downloading {url}: {error}"))?;
            if written == 0 {
                return Err(format!("downloaded empty weight file from {url}"));
            }
            out.sync_all()
                .map_err(|error| format!("failed to flush {}: {error}", part.display()))?;
            drop(out);
            fs::rename(&part, &dest).map_err(|error| {
                format!(
                    "failed to finalize downloaded model {} -> {}: {error}",
                    part.display(),
                    dest.display()
                )
            })
        })();
        if let Err(error) = download_result {
            let _ = fs::remove_file(&part);
            return Err(error);
        }
    }

    Ok(target_dir)
}

/// Model roots next to a packaged server binary.
///
/// Desktop installers place the server at `<resource_dir>/server/<bin>`.
/// Models dropped beside the binary or under `<config_dir>/models` are also accepted.
pub(crate) fn models_dirs_near_executable(exe: &Path) -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if let Some(exe_dir) = exe.parent() {
        if let Some(resource_dir) = exe_dir.parent() {
            dirs.push(resource_dir.join("models"));
        }
        dirs.push(exe_dir.join("models"));
        dirs.push(exe_dir.join("resources").join("models"));
    }
    dirs
}

pub(crate) fn bundled_models_dirs() -> Vec<PathBuf> {
    let mut dirs = std::env::current_exe()
        .map(|exe| models_dirs_near_executable(&exe))
        .unwrap_or_default();
    dirs.push(user_models_cache_dir());
    dirs
}

pub(crate) fn commit_onnx_file(path: &Path) -> Result<Session, String> {
    Session::builder()
        .map_err(|error| error.to_string())?
        .commit_from_file(path)
        .map_err(|error| format!("failed to load ONNX model {}: {error}", path.display()))
}

pub(crate) fn resolve_model_path(
    env_var: &str,
    extra_candidates: impl IntoIterator<Item = PathBuf>,
) -> Result<PathBuf, String> {
    if let Ok(env_path) = std::env::var(env_var) {
        let path = PathBuf::from(env_path.trim());
        if path.join("model.onnx").is_file() {
            return Ok(path);
        }
        if path.file_name().is_some_and(|name| name == "model.onnx") && path.is_file() {
            return Ok(path
                .parent()
                .map(Path::to_path_buf)
                .unwrap_or_else(|| PathBuf::from(".")));
        }
        return Err(format!(
            "{env_var} is set but no model.onnx found at {}",
            path.display()
        ));
    }

    let candidates = extra_candidates.into_iter().collect::<Vec<_>>();
    for candidate in &candidates {
        if candidate.join("model.onnx").is_file() {
            return Ok(candidate.clone());
        }
    }

    let checked = candidates
        .iter()
        .map(|candidate| candidate.join("model.onnx").display().to_string())
        .collect::<Vec<_>>()
        .join(", ");
    Err(format!(
        "model.onnx not found: set {env_var} or place it at one of: {checked}"
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn models_dirs_near_packaged_server_include_resource_models() {
        let exe = Path::new("/usr/lib/lisca-studio/server/studio-server");
        let dirs = models_dirs_near_executable(exe);
        assert!(dirs.contains(&PathBuf::from("/usr/lib/lisca-studio/models")));
        assert!(dirs.contains(&PathBuf::from("/usr/lib/lisca-studio/server/models")));
        assert!(dirs.contains(&PathBuf::from(
            "/usr/lib/lisca-studio/server/resources/models"
        )));
    }

    #[test]
    fn resolve_model_path_uses_candidate_dir_with_onnx() {
        let root = std::env::temp_dir().join(format!("lisca-kill-model-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        std::fs::write(root.join("model.onnx"), b"onnx").unwrap();
        let resolved =
            resolve_model_path("LISCA_UNSET_KILL_MODEL_FOR_TEST", [root.clone()]).unwrap();
        assert_eq!(resolved, root);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn ensure_cached_hf_files_downloads_and_caches_missing_weights() {
        use std::io::{Read, Write};
        use std::net::TcpListener;

        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let server = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut buf = [0u8; 512];
            let _ = stream.read(&mut buf);
            let body = b"fake-onnx-bytes";
            let header = format!(
                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nContent-Type: application/octet-stream\r\nConnection: close\r\n\r\n",
                body.len()
            );
            stream.write_all(header.as_bytes()).unwrap();
            stream.write_all(body).unwrap();
        });

        let temp = tempfile::tempdir().unwrap();
        let dir = ensure_cached_hf_files_in(
            temp.path(),
            &format!("http://{addr}"),
            "smart-segment-slimsam/onnx",
            "Xenova/slimsam-77-uniform",
            &[("onnx/model.onnx", "model.onnx")],
        )
        .unwrap();
        server.join().unwrap();

        assert_eq!(
            std::fs::read(dir.join("model.onnx")).unwrap(),
            b"fake-onnx-bytes"
        );
    }
}
