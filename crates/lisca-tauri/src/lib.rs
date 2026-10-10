use std::{
    collections::BTreeMap,
    io::{self, Read, Write},
    net::TcpStream,
    path::{Path, PathBuf},
    time::Duration,
};

use axum::{
    body::{to_bytes, Body},
    http::{HeaderName, HeaderValue, Method, Request, Uri},
    Router,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use tauri::{utils::acl::ExecutionContext, Manager, WebviewUrl, WebviewWindowBuilder};

const MAIN_WINDOW_LABEL: &str = "main";
use tauri_plugin_dialog::DialogExt;
use tower::ServiceExt;

mod updater;

/// Product-specific configuration for a Lisca Tauri desktop shell.
#[derive(Clone, Debug)]
pub struct ProductConfig {
    /// Product key exposed to the renderer as `window.liscaDesktop.product`.
    pub product: &'static str,
    /// Human-readable window title.
    pub product_name: &'static str,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IpcRequest {
    method: String,
    uri: String,
    #[serde(default)]
    headers: BTreeMap<String, String>,
    body: Option<String>,
}

/// Number of ports above the configured dev URL to probe for a live Vite server.
/// A Lisca dev SPA serves HTML on `/`; an unrelated process on the preferred
/// port (another Electron app, a different Lisca product's Vite) usually does
/// not, so we only need to peek a few bytes of the body.
const DEV_URL_SCAN_PORTS: u16 = 20;
const DEV_URL_PROBE_TIMEOUT: Duration = Duration::from_millis(120);
const DEV_URL_PROBE_READ_CAP: usize = 2048;

/// Resolve the dev URL the desktop shell should actually load.
///
/// The configured `dev_url` names the *preferred* port. When Vite is bumped off
/// it (strictPort off, or another process sitting there), this probe walks the
/// candidate addresses for the same port first — IPv4 loopback then IPv6
/// loopback — then ports up to `DEV_URL_SCAN_PORTS` higher, and returns the
/// first one whose `/` is HTML carrying `data-lisca-app="<product>"`. The
/// configured URL is returned as-is when nothing matches, so production and
/// non-Vite flows are unaffected.
fn resolve_dev_url(dev_url: String, product: &str) -> String {
    let Some((host, preferred_port)) = parse_loopback_dev_url(&dev_url) else {
        return dev_url;
    };
    // Vite may bind only one address family when the other is taken (e.g. IPv6
    // wildcard when IPv4 127.0.0.1 is held by another process).
    let hosts: [&str; 2] = if host == "127.0.0.1" {
        ["127.0.0.1", "[::1]"]
    } else {
        ["[::1]", "127.0.0.1"]
    };

    for offset in 0..DEV_URL_SCAN_PORTS {
        let port = match preferred_port.checked_add(offset) {
            Some(port) => port,
            None => break,
        };
        for candidate_host in hosts {
            if looks_like_product_vite(candidate_host, port, product) {
                // Emit `localhost` so the desktop capability's remote-URL
                // pattern (`http://localhost:*`) matches regardless of which
                // address family Vite happened to bind.
                let found = format!("http://localhost:{port}");
                if found != dev_url {
                    eprintln!(
                        "[lisca-tauri] dev URL {dev_url} is not {product}'s Vite server; using {found} instead"
                    );
                }
                return found;
            }
        }
    }
    dev_url
}

/// Parse `http://127.0.0.1:PORT[/path]` or `http://localhost:PORT[/path]` into
/// `(host, port)`. Anything else is not a Lisca dev URL we can probe.
fn parse_loopback_dev_url(dev_url: &str) -> Option<(&str, u16)> {
    let without_scheme = dev_url.strip_prefix("http://")?;
    let host_port = without_scheme.split('/').next()?;
    let (host, port) = host_port.rsplit_once(':')?;
    if host != "127.0.0.1" && host != "localhost" {
        return None;
    }
    let port = port.parse().ok()?;
    Some((host, port))
}

/// Cheap "is this the right Lisca dev SPA?" check: read the first few bytes of
/// `GET /` and require both `<html` and `data-lisca-app="<product>"`. Anything
/// else (an API 404 JSON blob, a sibling product's Vite, an unrelated app,
/// connection refused) does not match.
fn looks_like_product_vite(host: &str, port: u16, product: &str) -> bool {
    // SocketAddr::from_str expects `[v6]:port` or `v4:port`, so wrap bare
    // IPv6 hosts in brackets.
    let bracketed = if host.contains(':') && !host.starts_with('[') {
        format!("[{host}]")
    } else {
        host.to_string()
    };
    let addr = format!("{bracketed}:{port}");
    let Ok(addr) = addr.parse() else {
        return false;
    };
    let Ok(mut stream) = TcpStream::connect_timeout(&addr, DEV_URL_PROBE_TIMEOUT) else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(DEV_URL_PROBE_TIMEOUT));
    let _ = stream.set_write_timeout(Some(DEV_URL_PROBE_TIMEOUT));

    let request = format!(
        "GET / HTTP/1.0\r\nHost: {host}:{port}\r\nUser-Agent: lisca-tauri\r\nAccept: text/html,*/*\r\nConnection: close\r\n\r\n"
    );
    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }

    let mut body = String::new();
    let mut buf = [0_u8; 1024];
    while body.len() < DEV_URL_PROBE_READ_CAP {
        match stream.read(&mut buf) {
            Ok(0) => break,
            Ok(read) => body.push_str(&String::from_utf8_lossy(&buf[..read])),
            Err(_) => return false,
        }
    }

    let marker = format!("data-lisca-app=\"{product}\"");
    body.contains("<html") && body.contains(&marker)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct IpcResponse {
    status: u16,
    headers: BTreeMap<String, String>,
    body: Option<String>,
    body_base64: Option<String>,
}

/// Bytes the renderer wants written wherever the user picks in a native save dialog.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveFileRequest {
    file_name: String,
    directory: Option<String>,
    filter_name: String,
    extensions: Vec<String>,
    contents_base64: String,
}

#[derive(Clone)]
struct IpcBackend {
    router: Router,
}

/// Run a Tauri shell with the product's Axum application embedded in-process.
///
/// Hosted builds run the same router through the standalone server binary. Desktop
/// builds dispatch renderer requests to it through a Tauri command, without a TCP
/// listener or a copied sidecar executable.
pub fn run<F>(config: ProductConfig, mut context: tauri::Context, backend_factory: F)
where
    F: FnOnce() -> Router + Send + 'static,
{
    // Desktop embeds the server and never calls `run_server`, so tracing has to
    // start here or installed builds write no log file.
    if let Some(app_id) = lisca::protocol::AppId::from_product(config.product) {
        lisca::http::init_tracing(app_id);
    }

    // The shell's bridge commands forward to the embedded router; they carry
    // no plugin scope of their own, so grant them on Local and on loopback dev
    // URLs explicitly. Without this, the IPC gate rejects them the moment the
    // page is loaded from Vite instead of tauri://localhost.
    {
        use tauri::utils::acl::RemoteUrlPattern;
        let authority = context.runtime_authority_mut();
        allow_bridge_commands(authority, ExecutionContext::Local);
        for url in ["http://127.0.0.1:*", "http://localhost:*"] {
            if let Ok(pattern) = url.parse::<RemoteUrlPattern>() {
                allow_bridge_commands(authority, ExecutionContext::Remote { url: pattern });
            }
        }
    }

    let reopen_config = config.clone();
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            lisca_request,
            lisca_save_file,
            lisca_pick_path,
            updater::update_check_enabled,
            updater::set_update_check_enabled
        ])
        .setup(move |app| {
            if config.product == "studio" {
                if let Some(model) = resolve_kill_model_path(app) {
                    std::env::set_var("LISCA_KILL_MODEL", model);
                }
            }

            let router = tauri::async_runtime::block_on(async move { backend_factory() });
            app.manage(IpcBackend { router });
            create_window(app, &config)?;
            Ok(())
        })
        .build(context);
    match app {
        Ok(app) => app.run(move |app_handle, event| {
            if let tauri::RunEvent::Ready = &event {
                let handle = app_handle.clone();
                let product_name = reopen_config.product_name;
                tauri::async_runtime::spawn(async move {
                    updater::offer_startup_update(handle, product_name).await;
                });
            }
            on_shell_event(app_handle, event, &reopen_config);
        }),
        Err(error) => {
            eprintln!("failed to build Tauri application: {error}");
            std::process::exit(1);
        }
    }
}

/// macOS window close (Command-W, the red button) requests exit with no code.
/// Command-Q and Dock → Quit terminate through NSApplication and never reach
/// this check, so a codeless request stays in the Dock and a coded one still quits.
fn should_quit_on_exit_request(code: Option<i32>) -> bool {
    !cfg!(target_os = "macos") || code.is_some()
}

fn allow_bridge_commands(authority: &mut tauri::ipc::RuntimeAuthority, context: ExecutionContext) {
    for command in [
        "lisca_request",
        "lisca_save_file",
        "lisca_pick_path",
        "update_check_enabled",
        "set_update_check_enabled",
    ] {
        authority.__allow_command(command.to_string(), context.clone());
    }
}

fn on_shell_event<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    event: tauri::RunEvent,
    config: &ProductConfig,
) {
    // Reopen exists only on macOS. Other platforms quit when the last window closes.
    #[cfg(not(target_os = "macos"))]
    let _ = (app, config);

    match event {
        tauri::RunEvent::ExitRequested { code, api, .. } if !should_quit_on_exit_request(code) => {
            api.prevent_exit();
        }
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen {
            has_visible_windows: false,
            ..
        } => reopen_main_window(app, config),
        _ => {}
    }
}

#[cfg(target_os = "macos")]
fn reopen_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>, config: &ProductConfig) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }

    if let Err(error) = create_window(app, config) {
        eprintln!("failed to reopen window: {error}");
    }
}

#[tauri::command]
async fn lisca_request(
    backend: tauri::State<'_, IpcBackend>,
    request: IpcRequest,
) -> Result<IpcResponse, String> {
    dispatch_request(backend.router.clone(), request).await
}

/// Native open dialog for the in-app file picker. Resolves to `None` when the user cancels.
#[tauri::command]
async fn lisca_pick_path<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    request: PickPathRequest,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || pick_native_path(&app, request))
        .await
        .map_err(|error| format!("picker worker failed: {error}"))?
}

fn pick_native_path<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    request: PickPathRequest,
) -> Result<Option<String>, String> {
    let mut dialog = app.dialog().file();
    if let Some(directory) = request.directory_path.as_deref().map(Path::new) {
        if directory.is_dir() {
            dialog = dialog.set_directory(directory);
        }
    }
    let picked = if request.directory {
        dialog.blocking_pick_folder()
    } else {
        let dialog = if request.extensions.is_empty() {
            dialog
        } else {
            let extensions: Vec<&str> = request.extensions.iter().map(String::as_str).collect();
            dialog.add_filter("Files", &extensions)
        };
        dialog.blocking_pick_file()
    };
    let Some(target) = picked else {
        return Ok(None);
    };
    let path = target
        .into_path()
        .map_err(|error| format!("invalid path: {error}"))?;
    Ok(Some(path.to_string_lossy().to_string()))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PickPathRequest {
    directory: bool,
    directory_path: Option<String>,
    #[serde(default)]
    extensions: Vec<String>,
}

/// Ask where to save, then write the file. Resolves to `None` when the user cancels.
#[tauri::command]
async fn lisca_save_file<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    request: SaveFileRequest,
) -> Result<Option<String>, String> {
    let bytes = BASE64
        .decode(request.contents_base64.trim())
        .map_err(|error| format!("failed to decode {}: {error}", request.file_name))?;
    tauri::async_runtime::spawn_blocking(move || {
        let extensions: Vec<&str> = request.extensions.iter().map(String::as_str).collect();
        let mut dialog = app
            .dialog()
            .file()
            .set_file_name(&request.file_name)
            .add_filter(&request.filter_name, &extensions);
        if let Some(directory) = request.directory.as_deref().map(Path::new) {
            if directory.is_dir() {
                dialog = dialog.set_directory(directory);
            }
        }
        let Some(target) = dialog.blocking_save_file() else {
            return Ok(None);
        };
        let target = target
            .into_path()
            .map_err(|error| format!("invalid save path: {error}"))?;
        std::fs::write(&target, bytes)
            .map_err(|error| format!("failed to save {}: {error}", target.display()))?;
        Ok(Some(target.to_string_lossy().to_string()))
    })
    .await
    .map_err(|error| format!("save worker failed: {error}"))?
}

async fn dispatch_request(router: Router, request: IpcRequest) -> Result<IpcResponse, String> {
    let method = Method::from_bytes(request.method.as_bytes())
        .map_err(|error| format!("invalid IPC request method: {error}"))?;
    let uri = request
        .uri
        .parse::<Uri>()
        .map_err(|error| format!("invalid IPC request URI: {error}"))?;
    let mut builder = Request::builder().method(method).uri(uri);
    let headers = builder
        .headers_mut()
        .ok_or_else(|| "failed to construct IPC request headers".to_string())?;
    for (name, value) in request.headers {
        let name = HeaderName::from_bytes(name.as_bytes())
            .map_err(|error| format!("invalid IPC request header name: {error}"))?;
        let value = HeaderValue::from_str(&value)
            .map_err(|error| format!("invalid IPC request header value: {error}"))?;
        headers.insert(name, value);
    }
    let request = builder
        .body(Body::from(request.body.unwrap_or_default()))
        .map_err(|error| format!("failed to build IPC request: {error}"))?;

    let response = router
        .oneshot(request)
        .await
        .map_err(|error| format!("embedded backend request failed: {error}"))?;
    let status = response.status().as_u16();
    let headers = response
        .headers()
        .iter()
        .filter_map(|(name, value)| {
            value
                .to_str()
                .ok()
                .map(|value| (name.as_str().to_string(), value.to_string()))
        })
        .collect();
    let bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .map_err(|error| format!("failed to read embedded backend response: {error}"))?;

    match String::from_utf8(bytes.to_vec()) {
        Ok(body) => Ok(IpcResponse {
            status,
            headers,
            body: Some(body),
            body_base64: None,
        }),
        Err(error) => Ok(IpcResponse {
            status,
            headers,
            body: None,
            body_base64: Some(BASE64.encode(error.into_bytes())),
        }),
    }
}

fn bundled_resource_candidates<R: tauri::Runtime, M: Manager<R>>(
    app: &M,
    relative: impl AsRef<Path>,
) -> io::Result<Vec<PathBuf>> {
    let relative = relative.as_ref();
    let mut candidates = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join(relative));
    }

    let exe = std::env::current_exe()?;
    if let Some(exe_dir) = exe.parent() {
        candidates.push(exe_dir.join(relative));
        candidates.push(exe_dir.join("resources").join(relative));
    }

    Ok(candidates)
}

fn resolve_kill_model_path<R: tauri::Runtime, M: Manager<R>>(app: &M) -> Option<PathBuf> {
    let relative = Path::new("models").join("killing-assay-resnet18");
    bundled_resource_candidates(app, &relative)
        .ok()?
        .into_iter()
        .find(|path| path.join("model.onnx").is_file())
}

fn create_window<R: tauri::Runtime, M: Manager<R>>(
    app: &M,
    config: &ProductConfig,
) -> tauri::Result<()> {
    let init_script = format!(
        r#"window.liscaDesktop = Object.freeze({{
            product: {:?},
            request: (request) => window.__TAURI_INTERNALS__.invoke("lisca_request", {{ request }}),
            saveFile: (request) => window.__TAURI_INTERNALS__.invoke("lisca_save_file", {{ request }}),
            pickPath: (request) => window.__TAURI_INTERNALS__.invoke("lisca_pick_path", {{ request }}),
            updateCheckEnabled: () => window.__TAURI_INTERNALS__.invoke("update_check_enabled"),
            setUpdateCheckEnabled: (enabled) => window.__TAURI_INTERNALS__.invoke("set_update_check_enabled", {{ enabled }})
        }});"#,
        config.product
    );

    let url = window_url(app, config.product);

    let mut builder = WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, url)
        .title(config.product_name)
        .inner_size(1280.0, 800.0)
        .initialization_script(&init_script);
    if let Some(args) = webview_browser_args() {
        builder = builder.additional_browser_args(args);
    }
    builder.build()?;

    Ok(())
}

/// WebView2 arguments for every desktop shell on Windows.
///
/// `None` on other platforms leaves the system webview alone. On Windows this
/// replaces wry's defaults, so the mini-menu and SmartScreen switches stay in
/// the string. `--force-color-profile=srgb` stops WebView2 from adopting the
/// display's advanced-color profile, which otherwise shifts the hue of the
/// whole screen. Studio, Aligner, and Annotator all present frame canvases
/// through this window.
fn webview_browser_args() -> Option<&'static str> {
    #[cfg(windows)]
    {
        Some(
            "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --force-color-profile=srgb",
        )
    }
    #[cfg(not(windows))]
    {
        None
    }
}

/// Pick the URL the desktop window loads.
///
/// Production builds always serve the bundled `frontendDist` via
/// `tauri://localhost` (`WebviewUrl::App("index.html")`). Dev builds consult
/// `tauri.conf.json > build.devUrl` and probe nearby ports: when Vite is
/// bumped off its preferred port (another Electron app, a stale dev process),
/// the desktop shell follows it instead of rendering whatever answered first.
fn window_url<R: tauri::Runtime, M: Manager<R>>(app: &M, product: &str) -> WebviewUrl {
    if tauri::is_dev() {
        if let Some(dev_url) = app.config().build.dev_url.as_ref() {
            let resolved = resolve_dev_url(dev_url.to_string(), product);
            if let Ok(url) = resolved.parse() {
                return WebviewUrl::External(url);
            }
        }
    }
    WebviewUrl::App("index.html".parse().expect("index.html is a valid path"))
}

#[cfg(test)]
mod tests {
    use axum::{
        body::Body,
        http::StatusCode,
        response::Response,
        routing::{get, post},
        Json,
    };
    use serde_json::json;

    use super::*;

    #[tokio::test]
    async fn dispatches_json_requests_through_the_embedded_router() {
        let router = Router::new().route(
            "/echo",
            post(|Json(value): Json<serde_json::Value>| async move { Json(value) }),
        );
        let response = dispatch_request(
            router,
            IpcRequest {
                method: "POST".to_string(),
                uri: "/echo".to_string(),
                headers: BTreeMap::from([(
                    "content-type".to_string(),
                    "application/json".to_string(),
                )]),
                body: Some(json!({ "transport": "ipc" }).to_string()),
            },
        )
        .await
        .unwrap();

        assert_eq!(response.status, StatusCode::OK.as_u16());
        assert_eq!(response.body.as_deref(), Some(r#"{"transport":"ipc"}"#));
        assert!(response.body_base64.is_none());
    }

    #[tokio::test]
    async fn base64_encodes_binary_responses() {
        let router = Router::new().route(
            "/binary",
            get(|| async { Response::new(Body::from(vec![0, 159, 146, 150])) }),
        );
        let response = dispatch_request(
            router,
            IpcRequest {
                method: "GET".to_string(),
                uri: "/binary".to_string(),
                headers: BTreeMap::new(),
                body: None,
            },
        )
        .await
        .unwrap();

        assert!(response.body.is_none());
        assert_eq!(response.body_base64.as_deref(), Some("AJ+Slg=="));
    }

    #[test]
    fn windows_shells_force_srgb_and_keep_wry_defaults() {
        let args = webview_browser_args();
        if cfg!(windows) {
            let args = args.expect("desktop shells set WebView2 arguments on Windows");
            assert!(args.contains("--force-color-profile=srgb"));
            assert!(args.contains("msWebOOUI"));
            assert!(args.contains("msPdfOOUI"));
            assert!(args.contains("msSmartScreenProtection"));
        } else {
            assert!(args.is_none());
        }
    }

    #[test]
    fn closing_the_window_on_macos_does_not_quit() {
        assert_eq!(
            should_quit_on_exit_request(None),
            !cfg!(target_os = "macos")
        );
    }

    #[test]
    fn a_programmatic_exit_still_quits() {
        assert!(should_quit_on_exit_request(Some(0)));
    }

    #[test]
    fn parses_loopback_dev_urls_and_rejects_everything_else() {
        assert_eq!(
            parse_loopback_dev_url("http://127.0.0.1:8767"),
            Some(("127.0.0.1", 8767))
        );
        assert_eq!(
            parse_loopback_dev_url("http://localhost:8765/foo"),
            Some(("localhost", 8765))
        );
        assert_eq!(parse_loopback_dev_url("http://127.0.0.1"), None);
        assert_eq!(parse_loopback_dev_url("http://0.0.0.0:8767"), None);
        assert_eq!(parse_loopback_dev_url("https://127.0.0.1:8767"), None);
        assert_eq!(parse_loopback_dev_url("not-a-url"), None);
    }

    #[test]
    fn vite_probe_accepts_matching_product_html_and_rejects_everything_else() {
        use std::io::{Read as _, Write as _};
        use std::net::TcpListener;
        use std::thread;

        fn serve_html(listener: TcpListener, body: &'static str) {
            thread::spawn(move || {
                for stream in listener.incoming() {
                    if let Ok(mut stream) = stream {
                        // Read the request before replying; otherwise the
                        // kernel may RST the connection on close and the
                        // client never sees the body.
                        let mut buf = [0_u8; 512];
                        let _ = stream.read(&mut buf);
                        let response = format!(
                            "HTTP/1.0 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            body.len(),
                            body
                        );
                        let _ = stream.write_all(response.as_bytes());
                        let _ = stream.shutdown(std::net::Shutdown::Both);
                    }
                }
            });
        }

        // HTML page carrying the matching data-lisca-app tag — accept.
        let html_listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let html_port = html_listener.local_addr().unwrap().port();
        serve_html(
            html_listener,
            r#"<html lang="en" data-lisca-app="aligner"></html>"#,
        );
        assert!(looks_like_product_vite("127.0.0.1", html_port, "aligner"));

        // HTML page for a different product — reject.
        let html_listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let other_port = html_listener.local_addr().unwrap().port();
        serve_html(
            html_listener,
            r#"<html lang="en" data-lisca-app="studio"></html>"#,
        );
        assert!(!looks_like_product_vite("127.0.0.1", other_port, "aligner"));

        // JSON 404 — reject.
        let json_listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let json_port = json_listener.local_addr().unwrap().port();
        thread::spawn(move || {
            for stream in json_listener.incoming() {
                if let Ok(mut stream) = stream {
                    let mut buf = [0_u8; 512];
                    let _ = stream.read(&mut buf);
                    let body = r#"{"error":"not_found"}"#;
                    let response = format!(
                        "HTTP/1.0 404 Not Found\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                        body.len(),
                        body
                    );
                    let _ = stream.write_all(response.as_bytes());
                    let _ = stream.shutdown(std::net::Shutdown::Both);
                }
            }
        });
        assert!(!looks_like_product_vite("127.0.0.1", json_port, "aligner"));

        // Connection refused — reject.
        let closed = TcpListener::bind("127.0.0.1:0").unwrap();
        let closed_port = closed.local_addr().unwrap().port();
        drop(closed);
        assert!(!looks_like_product_vite(
            "127.0.0.1",
            closed_port,
            "aligner"
        ));
    }

    #[test]
    fn resolve_dev_url_falls_back_to_the_configured_url_when_no_probe_matches() {
        // Nothing is listening on any port we'd pick in this range, so the
        // configured URL should be returned unchanged.
        let placeholder = "http://127.0.0.1:9".to_string(); // discard port (RFC 863)
        assert_eq!(resolve_dev_url(placeholder.clone(), "aligner"), placeholder);

        // Non-loopback or unparseable URLs are returned as-is without probing.
        let remote = "https://example.com:8443".to_string();
        assert_eq!(resolve_dev_url(remote.clone(), "aligner"), remote);
    }

    #[test]
    fn resolve_dev_url_picks_up_a_v6_only_vite_when_v4_is_taken() {
        use std::io::{Read as _, Write as _};
        use std::net::TcpListener;
        use std::thread;

        // Skip on hosts where IPv6 loopback is unavailable.
        let Ok(probe_v6) = TcpListener::bind("[::1]:0") else {
            return;
        };
        drop(probe_v6);

        // Occupy IPv4 127.0.0.1:base with a foreign JSON app, and bind IPv6
        // wildcard *:base with the matching Vite page — the same shape Vite
        // ends up in when IPv4 is taken (strictPort off, host: true).
        let (foreign, vite_v6, base_port) = loop {
            let foreign = TcpListener::bind("127.0.0.1:0").unwrap();
            let base = foreign.local_addr().unwrap().port();
            // Try the IPv6 wildcard on the same port; if a parallel test or
            // this run holds it, restart from a fresh v4 port.
            match TcpListener::bind(("::", base)) {
                Ok(v) => break (foreign, v, base),
                Err(_) => drop(foreign),
            }
        };

        fn serve_json(listener: TcpListener) {
            thread::spawn(move || {
                for stream in listener.incoming() {
                    if let Ok(mut stream) = stream {
                        let mut buf = [0_u8; 512];
                        let _ = stream.read(&mut buf);
                        let body = r#"{"error":"not_found"}"#;
                        let response = format!(
                            "HTTP/1.0 404 Not Found\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            body.len(),
                            body
                        );
                        let _ = stream.write_all(response.as_bytes());
                        let _ = stream.shutdown(std::net::Shutdown::Both);
                    }
                }
            });
        }
        fn serve_html(listener: TcpListener, body: &'static str) {
            thread::spawn(move || {
                for stream in listener.incoming() {
                    if let Ok(mut stream) = stream {
                        let mut buf = [0_u8; 512];
                        let _ = stream.read(&mut buf);
                        let response = format!(
                            "HTTP/1.0 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            body.len(),
                            body
                        );
                        let _ = stream.write_all(response.as_bytes());
                        let _ = stream.shutdown(std::net::Shutdown::Both);
                    }
                }
            });
        }

        serve_json(foreign);
        serve_html(
            vite_v6,
            r#"<html lang="en" data-lisca-app="aligner"></html>"#,
        );

        let configured = format!("http://127.0.0.1:{base_port}");
        // The resolver always emits `localhost` so the desktop capability's
        // remote-URL pattern matches regardless of address family.
        let expected = format!("http://localhost:{base_port}");
        assert_eq!(resolve_dev_url(configured, "aligner"), expected);
    }

    #[test]
    fn resolve_dev_url_skips_foreign_apps_and_sibling_products() {
        use std::io::{Read as _, Write as _};
        use std::net::TcpListener;
        use std::thread;

        fn bind_listener() -> TcpListener {
            TcpListener::bind("127.0.0.1:0").unwrap()
        }

        fn serve(listener: TcpListener, body: &'static str, status: &'static str) {
            thread::spawn(move || {
                for stream in listener.incoming() {
                    if let Ok(mut stream) = stream {
                        let mut buf = [0_u8; 512];
                        let _ = stream.read(&mut buf);
                        let response = format!(
                            "HTTP/1.0 {status}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            body.len(),
                            body
                        );
                        let _ = stream.write_all(response.as_bytes());
                        let _ = stream.shutdown(std::net::Shutdown::Both);
                    }
                }
            });
        }

        // Find three adjacent free ports: foreign JSON, sibling studio Vite,
        // matching aligner Vite.
        let (foreign_listener, studio_listener, aligner_listener, base_port) = loop {
            let foreign = bind_listener();
            let base = foreign.local_addr().unwrap().port();
            if base > u16::MAX - 2 {
                drop(foreign);
                continue;
            }
            let (Ok(studio), Ok(aligner)) = (
                TcpListener::bind(("127.0.0.1", base + 1)),
                TcpListener::bind(("127.0.0.1", base + 2)),
            ) else {
                drop(foreign);
                continue;
            };
            break (foreign, studio, aligner, base);
        };

        serve(
            foreign_listener,
            r#"{"error":"not_found"}"#,
            "404 Not Found",
        );
        serve(
            studio_listener,
            r#"<html lang="en" data-lisca-app="studio"></html>"#,
            "200 OK",
        );
        serve(
            aligner_listener,
            r#"<html lang="en" data-lisca-app="aligner"></html>"#,
            "200 OK",
        );

        let configured = format!("http://127.0.0.1:{base_port}");
        let expected = format!("http://localhost:{}", base_port + 2);
        assert_eq!(resolve_dev_url(configured, "aligner"), expected);
    }
}
