use std::{
    collections::BTreeMap,
    io,
    path::{Path, PathBuf},
};

use axum::{
    body::{to_bytes, Body},
    http::{HeaderName, HeaderValue, Method, Request, Uri},
    Router,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tower::ServiceExt;

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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct IpcResponse {
    status: u16,
    headers: BTreeMap<String, String>,
    body: Option<String>,
    body_base64: Option<String>,
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
pub fn run<F>(config: ProductConfig, context: tauri::Context, backend_factory: F)
where
    F: FnOnce() -> Router + Send + 'static,
{
    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![lisca_request])
        .setup(move |app| {
            if config.product == "studio" {
                if let Some(model) = resolve_kill_model_path(app) {
                    std::env::set_var("LISCA_KILL_MODEL", model);
                }
            }

            let router = tauri::async_runtime::block_on(async move { backend_factory() });
            app.manage(IpcBackend { router });
            create_window(
                app,
                &config,
                std::env::var("VITE_DEV_SERVER_URL").ok().as_deref(),
            )?;
            Ok(())
        })
        .build(context);
    match app {
        Ok(app) => app.run(|_, _| {}),
        Err(error) => {
            eprintln!("failed to build Tauri application: {error}");
            std::process::exit(1);
        }
    }
}

#[tauri::command]
async fn lisca_request(
    backend: tauri::State<'_, IpcBackend>,
    request: IpcRequest,
) -> Result<IpcResponse, String> {
    dispatch_request(backend.router.clone(), request).await
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
    dev_url: Option<&str>,
) -> tauri::Result<()> {
    let init_script = format!(
        r#"window.liscaDesktop = Object.freeze({{
            product: {:?},
            request: (request) => window.__TAURI_INTERNALS__.invoke("lisca_request", {{ request }})
        }});"#,
        config.product
    );

    let url = if let Some(url) = dev_url {
        WebviewUrl::External(url.parse().map_err(|error| {
            io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("invalid dev URL: {error}"),
            )
        })?)
    } else {
        WebviewUrl::App("index.html".parse().map_err(|error| {
            io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("invalid bundled app URL: {error}"),
            )
        })?)
    };

    WebviewWindowBuilder::new(app, "main", url)
        .title(config.product_name)
        .inner_size(1280.0, 800.0)
        .initialization_script(&init_script)
        .build()?;

    Ok(())
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
}
