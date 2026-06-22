use std::io;
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

/// Product-specific configuration for a Lisca Tauri desktop shell.
#[derive(Clone, Debug)]
pub struct ProductConfig {
    /// Product key exposed to the renderer as `window.liscaDesktop.product`.
    pub product: &'static str,
    /// Human-readable window title.
    pub product_name: &'static str,
    /// Public port the web UI expects the server to listen on (packaged mode).
    pub port: u16,
    /// Backend port used in dev mode (Vite dev server proxies here).
    pub backend_port: u16,
    /// Name of the server binary (without extension).
    pub server_binary: &'static str,
    /// Cargo package/workspace member name for the server crate.
    pub cargo_package: &'static str,
}

/// Run the Tauri desktop shell for a product.
pub fn run(config: ProductConfig, context: tauri::Context) {
    tauri::Builder::default()
        .setup(move |app| {
            let dev_url = std::env::var("VITE_DEV_SERVER_URL").ok();
            let is_dev = dev_url.is_some();
            let rust_port = if is_dev {
                config.backend_port
            } else {
                config.port
            };

            let server_path = resolve_server_path(app, &config, is_dev)?;
            let child = spawn_server(&server_path, rust_port, &config)?;
            app.manage(Mutex::new(Some(child)));

            create_window(app, &config, dev_url.as_deref())?;
            Ok(())
        })
        .build(context)
        .expect("failed to build Tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                stop_server(app_handle);
            }
        });
}

fn resolve_server_path<R: tauri::Runtime, M: Manager<R>>(
    _app: &M,
    config: &ProductConfig,
    is_dev: bool,
) -> io::Result<PathBuf> {
    let binary_name = if cfg!(target_os = "windows") {
        format!("{}.exe", config.server_binary)
    } else {
        config.server_binary.to_string()
    };

    if is_dev {
        let current_dir = std::env::current_dir()?;
        let repo_root = current_dir.join("../../../");
        let candidates = [
            repo_root.join("target/debug").join(&binary_name),
            repo_root.join("target/release").join(&binary_name),
        ];
        for candidate in candidates.iter() {
            if candidate.exists() {
                return Ok(candidate.clone());
            }
        }
        // No pre-built binary: fall back to `cargo run` so dev can still start.
        return Ok(PathBuf::from("cargo"));
    }

    let candidates = bundled_server_candidates(&binary_name)?;
    for candidate in &candidates {
        if candidate.exists() {
            return Ok(candidate.clone());
        }
    }
    let candidate_list = candidates
        .iter()
        .map(|p| p.display().to_string())
        .collect::<Vec<_>>()
        .join(", ");
    Err(io::Error::new(
        io::ErrorKind::NotFound,
        format!(
            "bundled server binary '{}' not found; tried: {}",
            binary_name, candidate_list
        ),
    ))
}

fn bundled_server_candidates(binary_name: &str) -> io::Result<Vec<PathBuf>> {
    let exe = std::env::current_exe()?;
    let mut candidates = Vec::new();

    if cfg!(target_os = "macos") {
        // macOS bundle layout: MyApp.app/Contents/MacOS/<binary>
        // Resources live in MyApp.app/Contents/Resources.
        if let Some(contents_dir) = exe.parent().and_then(|p| p.parent()) {
            candidates.push(
                contents_dir
                    .join("Resources")
                    .join("server")
                    .join(binary_name),
            );
        }
    }

    // Cross-platform fallback: resources/server/<binary> next to the executable.
    if let Some(exe_dir) = exe.parent() {
        candidates.push(exe_dir.join("resources").join("server").join(binary_name));
    }

    Ok(candidates)
}

fn spawn_server(path: &Path, port: u16, config: &ProductConfig) -> io::Result<Child> {
    let mut command = if path.as_os_str() == "cargo" {
        let mut cmd = Command::new("cargo");
        cmd.args(["run", "-p", config.cargo_package, "--quiet"]);
        // `cargo run` needs the workspace root as CWD to resolve `-p`.
        let current_dir = std::env::current_dir()?;
        cmd.current_dir(current_dir.join("../../../"));
        cmd
    } else {
        Command::new(path)
    };

    command.env("PORT", port.to_string());
    command.stdout(std::process::Stdio::inherit());
    command.stderr(std::process::Stdio::inherit());

    let child = command.spawn()?;
    wait_for_port(port, Duration::from_secs(120))?;
    Ok(child)
}

fn wait_for_port(port: u16, timeout: Duration) -> io::Result<()> {
    let address = format!("127.0.0.1:{}", port);
    let start = Instant::now();
    loop {
        if std::net::TcpStream::connect(&address).is_ok() {
            return Ok(());
        }
        if start.elapsed() >= timeout {
            return Err(io::Error::new(
                io::ErrorKind::TimedOut,
                format!("server did not become ready on {} within {:?}", address, timeout),
            ));
        }
        std::thread::sleep(Duration::from_millis(250));
    }
}

fn create_window<R: tauri::Runtime, M: Manager<R>>(
    app: &M,
    config: &ProductConfig,
    dev_url: Option<&str>,
) -> tauri::Result<()> {
    let init_script = format!(
        "window.liscaDesktop = {{ product: \"{}\" }};",
        config.product
    );

    let url = if let Some(url) = dev_url {
        WebviewUrl::External(url.parse().map_err(|e| {
            io::Error::new(io::ErrorKind::InvalidInput, format!("invalid dev URL: {}", e))
        })?)
    } else {
        WebviewUrl::App("index.html".parse().expect("index.html is a valid app URL"))
    };

    WebviewWindowBuilder::new(app, "main", url)
        .title(config.product_name)
        .inner_size(1280.0, 800.0)
        .initialization_script(&init_script)
        .build()?;

    Ok(())
}

fn stop_server<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>) {
    if let Some(state) = app_handle.try_state::<Mutex<Option<Child>>>() {
        if let Ok(mut guard) = state.lock() {
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
            }
        }
    }
}
