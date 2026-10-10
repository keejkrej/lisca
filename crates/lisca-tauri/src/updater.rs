//! One update check per process, and only when the app starts.
//!
//! The check reads the release manifest. The installer is downloaded only after
//! the user chooses Install. Not now leaves the session running; the next launch
//! asks again unless Settings has turned the check off.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

use serde::{Deserialize, Serialize};
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_updater::UpdaterExt;

const PREFERENCE_FILE: &str = "update-check.json";
static CHECK_STARTED: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Deserialize, Serialize)]
struct UpdateCheckFile {
    #[serde(rename = "checkOnStartup")]
    check_on_startup: bool,
}

pub(crate) fn update_check_enabled_from_bytes(bytes: &[u8]) -> bool {
    serde_json::from_slice::<UpdateCheckFile>(bytes)
        .map(|file| file.check_on_startup)
        .unwrap_or(true)
}

fn preference_path(config_dir: &Path) -> PathBuf {
    config_dir.join(PREFERENCE_FILE)
}

fn read_check_on_startup(path: &Path) -> bool {
    match std::fs::read(path) {
        Ok(bytes) => update_check_enabled_from_bytes(&bytes),
        Err(_) => true,
    }
}

fn write_check_on_startup(path: &Path, enabled: bool) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let body = serde_json::to_vec_pretty(&UpdateCheckFile {
        check_on_startup: enabled,
    })
    .map_err(std::io::Error::other)?;
    std::fs::write(path, body)
}

fn config_file<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("update settings directory is unavailable: {error}"))?;
    Ok(preference_path(&dir))
}

#[tauri::command]
pub(crate) fn update_check_enabled<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> bool {
    config_file(&app)
        .map(|path| read_check_on_startup(&path))
        .unwrap_or(true)
}

#[tauri::command]
pub(crate) fn set_update_check_enabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    let path = config_file(&app)?;
    write_check_on_startup(&path, enabled).map_err(|error| {
        format!(
            "could not save update settings to {}: {error}",
            path.display()
        )
    })
}

/// Ask once, at startup, when a newer signed release is on this app's channel.
pub(crate) async fn offer_startup_update<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    product_name: &str,
) {
    if tauri::is_dev() || CHECK_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }
    if !update_check_enabled(app.clone()) {
        return;
    }

    let Ok(updater) = app.updater() else {
        return;
    };
    let update = match updater.check().await {
        Ok(Some(update)) => update,
        _ => return,
    };

    let version = update.version.clone();
    let prompt = format!(
        "{product_name} {version} is available.\n\n\
         Install downloads it and restarts the app. Nothing is downloaded until you choose Install. \
         Not now leaves this session running and asks again the next time the app starts. \
         Turn update checks off in Settings to stop the prompt."
    );
    let dialog_app = app.clone();
    let install = tauri::async_runtime::spawn_blocking(move || {
        let mut dialog = dialog_app
            .dialog()
            .message(prompt)
            .title("Update available")
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Install".to_string(),
                "Not now".to_string(),
            ));
        if let Some(window) = dialog_app.get_webview_window(super::MAIN_WINDOW_LABEL) {
            dialog = dialog.parent(&window);
        }
        dialog.blocking_show()
    })
    .await
    .unwrap_or(false);
    if !install {
        return;
    }

    // Windows leaves this process from inside the installer. macOS and Linux
    // return here, and the new version runs after restart.
    if let Err(error) = update.download_and_install(|_, _| {}, || {}).await {
        let dialog_app = app.clone();
        let message = format!("The update could not be installed.\n\n{error}");
        let _ = tauri::async_runtime::spawn_blocking(move || {
            dialog_app
                .dialog()
                .message(message)
                .title("Update failed")
                .blocking_show();
        })
        .await;
        return;
    }
    app.restart();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_missing_or_broken_preference_keeps_the_startup_check_on() {
        assert!(update_check_enabled_from_bytes(b""));
        assert!(update_check_enabled_from_bytes(b"{"));
        assert!(update_check_enabled_from_bytes(
            br#"{"checkOnStartup":true}"#
        ));
        assert!(!update_check_enabled_from_bytes(
            br#"{"checkOnStartup":false}"#
        ));
    }

    #[test]
    fn the_settings_switch_round_trips_through_the_preference_file() {
        let dir = std::env::temp_dir().join(format!("lisca-update-check-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let path = preference_path(&dir);
        assert!(read_check_on_startup(&path));
        write_check_on_startup(&path, false).unwrap();
        assert!(!read_check_on_startup(&path));
        write_check_on_startup(&path, true).unwrap();
        assert!(read_check_on_startup(&path));
        let _ = std::fs::remove_dir_all(&dir);
    }
}
