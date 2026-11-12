//! Desktop-owned MCP server.
//!
//! Packaged Studio must be usable by an agent without a source checkout, Node,
//! pnpm, or a second product server. This module serves the MCP Streamable HTTP
//! protocol on loopback from inside the Tauri process and dispatches contract
//! tools to the *same* Axum router the webview uses. Tasks, in-memory inference
//! settings, and workspace mutations therefore belong to the running app.
//!
//! The listener is opt-in and bearer-token protected. Settings → Agents shows
//! the URL and a ready-to-paste Claude Code registration command.

use std::{
    collections::BTreeMap,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use axum::{
    extract::State,
    http::{header::AUTHORIZATION, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::post,
    Json, Router,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use image::{codecs::png::PngEncoder, ExtendedColorType, ImageEncoder};
use lisca::{
    aligner::{detect_grid_from_source, save_bbox, DetectOptions},
    protocol::{
        AlignGridShape, AlignerSource, AssayData, AssayJsonFile, FrameRequest, SavedAlignState,
    },
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use tauri::Manager;
use tokio::sync::oneshot;

use super::{control::ControlCenter, dispatch_request, IpcRequest};

const MCP_PATH: &str = "/mcp";
const PROTOCOL_VERSION: &str = "2025-06-18";
const OPENAPI_JSON: &str = include_str!("../../../packages/contracts/openapi.json");

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpStatus {
    pub product: String,
    pub enabled: bool,
    pub running: bool,
    pub url: String,
    pub token: String,
    pub tool_count: usize,
    pub claude_command: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Preferences {
    #[serde(default)]
    enabled: bool,
    #[serde(default)]
    port: u16,
    #[serde(default)]
    token: String,
}

struct RuntimeState {
    preferences: Preferences,
    running: bool,
    shutdown: Option<oneshot::Sender<()>>,
    error: Option<String>,
    agent_name: String,
}

#[derive(Clone)]
pub struct McpManager {
    router: Router,
    product: String,
    config_path: PathBuf,
    control: ControlCenter,
    state: Arc<Mutex<RuntimeState>>,
}

impl McpManager {
    pub fn new(
        router: Router,
        product: &str,
        config_path: PathBuf,
        control: ControlCenter,
    ) -> Self {
        let mut preferences = read_preferences(&config_path);
        if preferences.port == 0 {
            preferences.port = default_port(product);
        }
        if preferences.token.is_empty() {
            preferences.token = new_token();
        }
        Self {
            router,
            product: product.to_string(),
            config_path,
            control,
            state: Arc::new(Mutex::new(RuntimeState {
                preferences,
                running: false,
                shutdown: None,
                error: None,
                agent_name: "MCP agent".to_string(),
            })),
        }
    }

    /// Restore the persisted opt-in after the backend router exists.
    pub fn restore(&self) {
        let enabled = self.lock().preferences.enabled;
        if enabled {
            if let Err(error) = self.start() {
                self.lock().error = Some(error.clone());
                eprintln!("[lisca-mcp] could not restore the local server: {error}");
            }
        }
    }

    pub fn status(&self) -> McpStatus {
        let state = self.lock();
        let port = state.preferences.port;
        let tool_count = catalog(&self.product).map(|tools| tools.len()).unwrap_or(0);
        let url = format!("http://127.0.0.1:{port}{MCP_PATH}");
        McpStatus {
            product: self.product.clone(),
            enabled: state.preferences.enabled,
            running: state.running,
            claude_command: claude_command(&self.product, &url, &state.preferences.token),
            url,
            token: state.preferences.token.clone(),
            tool_count,
            error: state.error.clone(),
        }
    }

    pub fn set_enabled(&self, enabled: bool) -> Result<McpStatus, String> {
        if enabled {
            self.start()?;
        } else {
            self.stop();
        }
        {
            let mut state = self.lock();
            state.preferences.enabled = enabled;
            state.error = None;
        }
        self.save_preferences()?;
        Ok(self.status())
    }

    fn start(&self) -> Result<(), String> {
        if self.lock().running {
            return Ok(());
        }
        let port = self.lock().preferences.port;
        let listener = std::net::TcpListener::bind(("127.0.0.1", port)).map_err(|error| {
            format!("could not bind the MCP listener on 127.0.0.1:{port}: {error}")
        })?;
        listener
            .set_nonblocking(true)
            .map_err(|error| format!("could not configure the MCP listener: {error}"))?;
        let listener = tokio::net::TcpListener::from_std(listener)
            .map_err(|error| format!("could not start the MCP listener: {error}"))?;
        let (shutdown, receiver) = oneshot::channel();
        let app = Router::new()
            .route(MCP_PATH, post(handle_http))
            .with_state(self.clone());
        tauri::async_runtime::spawn(async move {
            if let Err(error) = axum::serve(listener, app)
                .with_graceful_shutdown(async {
                    let _ = receiver.await;
                })
                .await
            {
                eprintln!("[lisca-mcp] server stopped: {error}");
            }
        });
        let mut state = self.lock();
        state.shutdown = Some(shutdown);
        state.running = true;
        state.error = None;
        eprintln!(
            "[lisca-mcp] {} listening on http://127.0.0.1:{port}{MCP_PATH}",
            self.product
        );
        Ok(())
    }

    fn stop(&self) {
        let mut state = self.lock();
        state.running = false;
        if let Some(shutdown) = state.shutdown.take() {
            let _ = shutdown.send(());
        }
    }

    fn save_preferences(&self) -> Result<(), String> {
        let preferences = self.lock().preferences.clone();
        if let Some(parent) = self.config_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|error| format!("could not create {}: {error}", parent.display()))?;
        }
        let body = serde_json::to_vec_pretty(&preferences).map_err(|error| error.to_string())?;
        std::fs::write(&self.config_path, body).map_err(|error| {
            format!(
                "could not save MCP settings to {}: {error}",
                self.config_path.display()
            )
        })
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, RuntimeState> {
        self.state
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn token(&self) -> String {
        self.lock().preferences.token.clone()
    }

    fn agent_name(&self) -> String {
        self.lock().agent_name.clone()
    }

    fn set_agent_name(&self, name: &str) {
        let name = name.trim();
        if !name.is_empty() {
            self.lock().agent_name = name.to_string();
        }
    }
}

fn default_port(product: &str) -> u16 {
    match product {
        "aligner" => 19_768,
        "annotator" => 19_769,
        _ => 19_770,
    }
}

fn new_token() -> String {
    format!("{}{}", uuid::Uuid::new_v4(), uuid::Uuid::new_v4())
}

fn claude_command(product: &str, url: &str, token: &str) -> String {
    format!(
        "claude mcp add --transport http lisca-{product} {url} --header \"Authorization: Bearer {token}\""
    )
}

fn read_preferences(path: &Path) -> Preferences {
    std::fs::read(path)
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or(Preferences {
            enabled: false,
            port: 0,
            token: String::new(),
        })
}

pub fn preference_path<R: tauri::Runtime, M: Manager<R>>(app: &M) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|directory| directory.join("mcp.json"))
        .map_err(|error| format!("MCP settings directory is unavailable: {error}"))
}

#[tauri::command]
pub async fn mcp_status(manager: tauri::State<'_, McpManager>) -> Result<McpStatus, String> {
    Ok(manager.status())
}

#[tauri::command]
pub async fn mcp_set_enabled(
    manager: tauri::State<'_, McpManager>,
    enabled: bool,
) -> Result<McpStatus, String> {
    manager.set_enabled(enabled)
}

async fn handle_http(
    State(manager): State<McpManager>,
    headers: HeaderMap,
    Json(request): Json<RpcRequest>,
) -> Response {
    let expected = format!("Bearer {}", manager.token());
    let authorized = headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .map(|value| value == expected)
        .unwrap_or(false);
    if !authorized {
        return (
            StatusCode::UNAUTHORIZED,
            "Send Authorization: Bearer <token> from Settings → Agents.",
        )
            .into_response();
    }
    let id = request.id.clone();
    if request.method == "initialize" {
        if let Some(name) = request
            .params
            .as_ref()
            .and_then(|params| params.get("clientInfo"))
            .and_then(|client| client.get("name"))
            .and_then(Value::as_str)
        {
            manager.set_agent_name(name);
        }
    }
    let result = dispatch_rpc(
        manager.router.clone(),
        &manager.product,
        manager.control.clone(),
        manager.agent_name(),
        request,
    )
    .await;
    if id.is_none() {
        return StatusCode::ACCEPTED.into_response();
    }
    Json(result).into_response()
}

#[derive(Debug, Deserialize)]
struct RpcRequest {
    #[allow(dead_code)]
    jsonrpc: String,
    #[serde(default)]
    id: Option<Value>,
    method: String,
    #[serde(default)]
    params: Option<Value>,
}

async fn dispatch_rpc(
    router: Router,
    product: &str,
    control: ControlCenter,
    agent_name: String,
    request: RpcRequest,
) -> Value {
    let id = request.id.clone().unwrap_or(Value::Null);
    match request.method.as_str() {
        "initialize" => rpc_result(
            id,
            json!({
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": { "tools": {} },
                "serverInfo": {
                    "name": format!("lisca-{product}-desktop"),
                    "version": env!("CARGO_PKG_VERSION")
                },
                "instructions": format!(
                    "Drive the running LiSCA {product} desktop app. Contract tools use the same live backend and task state as its UI. Use align_detect_grid for Auto-detect (preview; persist with align_save_bbox), align_crop_roi to crop, annotate_* to label frames, and studio_* for inference and analysis. Changes are saved in the workspace; the UI may need a reload to show them."
                )
            }),
        ),
        "ping" => rpc_result(id, json!({})),
        "notifications/initialized" | "notifications/cancelled" => json!({}),
        "tools/list" => match catalog(product) {
            Ok(tools) => rpc_result(
                id,
                json!({
                    "tools": tools.iter().map(Tool::wire).collect::<Vec<_>>()
                }),
            ),
            Err(error) => rpc_error(id, -32603, &error),
        },
        "tools/call" => {
            let params = request.params.unwrap_or_else(|| json!({}));
            let name = params.get("name").and_then(Value::as_str).unwrap_or("");
            let arguments = params
                .get("arguments")
                .cloned()
                .unwrap_or_else(|| json!({}));
            let outcome = call_tool(router, product, control, agent_name, name, arguments).await;
            rpc_result(
                id,
                json!({
                    "content": outcome.content,
                    "isError": outcome.is_error
                }),
            )
        }
        _ => rpc_error(id, -32601, &format!("method {} not found", request.method)),
    }
}

fn rpc_result(id: Value, result: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "result": result })
}

fn rpc_error(id: Value, code: i64, message: &str) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "error": { "code": code, "message": message }
    })
}

struct ToolOutcome {
    content: Vec<Value>,
    is_error: bool,
}

impl ToolOutcome {
    fn text(text: String) -> Self {
        Self {
            content: vec![json!({ "type": "text", "text": text })],
            is_error: false,
        }
    }

    fn error(error: impl Into<String>) -> Self {
        Self {
            content: vec![json!({ "type": "text", "text": error.into() })],
            is_error: true,
        }
    }

    fn json(value: Value) -> Self {
        Self::text(serde_json::to_string_pretty(&value).unwrap_or_else(|_| value.to_string()))
    }
}

struct Tool {
    name: String,
    operation_id: String,
    method: String,
    path: String,
    description: String,
    input_schema: Value,
    query_names: Vec<String>,
    native: bool,
}

impl Tool {
    fn wire(&self) -> Value {
        json!({
            "name": self.name,
            "title": self.operation_id,
            "description": self.description,
            "inputSchema": self.input_schema
        })
    }
}

fn catalog(product: &str) -> Result<Vec<Tool>, String> {
    let document: Value = serde_json::from_str(OPENAPI_JSON)
        .map_err(|error| format!("embedded OpenAPI document is invalid: {error}"))?;
    let paths = document
        .get("paths")
        .and_then(Value::as_object)
        .ok_or_else(|| "embedded OpenAPI document has no paths".to_string())?;
    let mut tools = Vec::new();
    for (path, operations) in paths {
        let Some(operations) = operations.as_object() else {
            continue;
        };
        for (method, operation) in operations {
            if method == "parameters" {
                continue;
            }
            let Some(operation_id) = operation.get("operationId").and_then(Value::as_str) else {
                continue;
            };
            if !products_for_operation(operation_id).contains(&product) {
                continue;
            }
            tools.push(contract_tool(
                &document,
                path,
                method,
                operation,
                operation_id,
            ));
        }
    }
    tools.push(native_status_tool());
    tools.push(native_control_status_tool());
    if matches!(product, "aligner" | "studio") {
        tools.push(native_align_tool());
    }
    tools.sort_by(|left, right| left.name.cmp(&right.name));
    let mut names = std::collections::BTreeSet::new();
    for tool in &tools {
        if !names.insert(tool.name.clone()) {
            return Err(format!("duplicate MCP tool name {}", tool.name));
        }
    }
    Ok(tools)
}

fn contract_tool(document: &Value, path: &str, method: &str, operation: &Value, id: &str) -> Tool {
    let mut properties = Map::new();
    let mut required = Vec::new();
    let mut query_names = Vec::new();
    if let Some(parameters) = operation.get("parameters").and_then(Value::as_array) {
        for parameter in parameters {
            if parameter.get("in").and_then(Value::as_str) != Some("query") {
                continue;
            }
            let Some(name) = parameter.get("name").and_then(Value::as_str) else {
                continue;
            };
            query_names.push(name.to_string());
            properties.insert(
                name.to_string(),
                parameter
                    .get("schema")
                    .map(|schema| normalize_schema(schema, document, &mut Vec::new()))
                    .unwrap_or_else(|| json!({ "type": "string" })),
            );
            if parameter.get("required").and_then(Value::as_bool) == Some(true) {
                required.push(name.to_string());
            }
        }
    }
    if let Some(schema) = operation
        .get("requestBody")
        .and_then(|body| body.get("content"))
        .and_then(|content| content.get("application/json"))
        .and_then(|content| content.get("schema"))
    {
        let normalized = normalize_schema(schema, document, &mut Vec::new());
        if let Some(body_properties) = normalized.get("properties").and_then(Value::as_object) {
            for (name, value) in body_properties {
                properties.insert(name.clone(), value.clone());
            }
        }
        if let Some(names) = normalized.get("required").and_then(Value::as_array) {
            for name in names.iter().filter_map(Value::as_str) {
                if !required.iter().any(|existing| existing == name) {
                    required.push(name.to_string());
                }
            }
        }
    }
    let mut input_schema = json!({ "type": "object", "properties": properties });
    if !required.is_empty() {
        input_schema["required"] = json!(required);
    }
    Tool {
        name: tool_name(id),
        operation_id: id.to_string(),
        method: method.to_uppercase(),
        path: path.to_string(),
        description: operation
            .get("description")
            .or_else(|| operation.get("summary"))
            .and_then(Value::as_str)
            .unwrap_or(id)
            .to_string(),
        input_schema,
        query_names,
        native: false,
    }
}

fn normalize_schema(node: &Value, document: &Value, seen: &mut Vec<String>) -> Value {
    match node {
        Value::Array(items) => Value::Array(
            items
                .iter()
                .map(|item| normalize_schema(item, document, seen))
                .collect(),
        ),
        Value::Object(object) => {
            if let Some(reference) = object.get("$ref").and_then(Value::as_str) {
                if seen.iter().any(|existing| existing == reference) {
                    return json!({});
                }
                let Some(target) = resolve_ref(document, reference) else {
                    return json!({});
                };
                let mut nested = seen.clone();
                nested.push(reference.to_string());
                return normalize_schema(target, document, &mut nested);
            }
            let mut normalized = object.clone();
            if let Some(members) = normalized
                .remove("allOf")
                .and_then(|value| value.as_array().cloned())
            {
                for member in members {
                    if let Some(fields) = normalize_schema(&member, document, seen).as_object() {
                        for (key, value) in fields {
                            normalized.insert(key.clone(), value.clone());
                        }
                    }
                }
            }
            for key in [
                "anyOf",
                "oneOf",
                "not",
                "items",
                "prefixItems",
                "additionalProperties",
            ] {
                if let Some(value) = normalized.get(key).cloned() {
                    normalized.insert(key.to_string(), normalize_schema(&value, document, seen));
                }
            }
            if let Some(properties) = normalized
                .get("properties")
                .and_then(Value::as_object)
                .cloned()
            {
                let mut mapped = Map::new();
                for (name, value) in properties {
                    mapped.insert(name, normalize_schema(&value, document, seen));
                }
                normalized.insert("properties".to_string(), Value::Object(mapped));
            }
            Value::Object(normalized)
        }
        _ => node.clone(),
    }
}

fn resolve_ref<'a>(document: &'a Value, reference: &str) -> Option<&'a Value> {
    let name = reference.strip_prefix("#/components/schemas/")?;
    document.get("components")?.get("schemas")?.get(name)
}

fn tool_name(operation_id: &str) -> String {
    operation_id
        .split('.')
        .map(|part| {
            let mut output = String::new();
            let mut previous = '\0';
            for character in part.chars() {
                if character.is_uppercase() && (previous.is_lowercase() || previous.is_numeric()) {
                    output.push('_');
                }
                output.extend(character.to_lowercase());
                previous = character;
            }
            output
        })
        .collect::<Vec<_>>()
        .join("_")
}

fn products_for_operation(operation_id: &str) -> Vec<&'static str> {
    let group = operation_id.split('.').next().unwrap_or("studio");
    match group {
        "fs" => vec!["aligner", "annotator", "studio"],
        "align" => {
            if matches!(
                operation_id,
                "align.cropRoi"
                    | "align.cancelCropRoi"
                    | "align.cropRoiProgress"
                    | "align.getLatestCropProgress"
            ) {
                vec!["studio"]
            } else {
                vec!["aligner", "studio"]
            }
        }
        "annotate" | "tasks" => vec!["annotator", "studio"],
        "studio"
            if matches!(
                operation_id,
                "studio.labelFreeHealth"
                    | "studio.saveLabelFreeKey"
                    | "studio.listLabelFreeReferences"
                    | "studio.buildLabelFreeReferences"
                    | "studio.classifyLabelFree"
            ) =>
        {
            vec!["annotator", "studio"]
        }
        _ => vec!["studio"],
    }
}

fn native_status_tool() -> Tool {
    Tool {
        name: "server_status".to_string(),
        operation_id: "server_status".to_string(),
        method: String::new(),
        path: String::new(),
        description: "Report the running desktop app and its embedded MCP tool catalog."
            .to_string(),
        input_schema: json!({ "type": "object", "properties": {} }),
        query_names: Vec::new(),
        native: true,
    }
}

fn native_control_status_tool() -> Tool {
    Tool {
        name: "control_status".to_string(),
        operation_id: "control_status".to_string(),
        method: String::new(),
        path: String::new(),
        description: "Read human/agent workspace ownership, active operations, and revisions. Never changes control.".to_string(),
        input_schema: json!({ "type": "object", "properties": {} }),
        query_names: Vec::new(),
        native: true,
    }
}

fn native_align_tool() -> Tool {
    Tool {
        name: "cli_align".to_string(),
        operation_id: "cli_align".to_string(),
        method: String::new(),
        path: String::new(),
        description: "Detect a micropattern grid from one frame. apply=true writes bbox/Pos{n}.csv and align/Pos{n}.json like the Aligner Save action.".to_string(),
        input_schema: json!({
            "type": "object",
            "properties": {
                "workspace": { "type": "string" },
                "pos": { "type": "integer", "minimum": 0 },
                "source": { "type": "string" },
                "channel": { "type": "integer", "minimum": 0 },
                "time": { "type": "integer", "minimum": 0 },
                "z": { "type": "integer", "minimum": 0 },
                "shape": { "type": "string", "enum": ["rect", "square", "hex"] },
                "patternSize": { "type": "number" },
                "minSpacing": { "type": "number" },
                "maxSpacing": { "type": "number" },
                "apply": { "type": "boolean", "default": false }
            },
            "required": ["workspace", "pos"]
        }),
        query_names: Vec::new(),
        native: true,
    }
}

async fn call_tool(
    router: Router,
    product: &str,
    control: ControlCenter,
    agent_name: String,
    name: &str,
    arguments: Value,
) -> ToolOutcome {
    let tools = match catalog(product) {
        Ok(tools) => tools,
        Err(error) => return ToolOutcome::error(error),
    };
    let Some(tool) = tools.into_iter().find(|tool| tool.name == name) else {
        return ToolOutcome::error(format!("unknown tool {name}; call tools/list"));
    };
    if tool.native {
        return match name {
            "server_status" => ToolOutcome::json(json!({
                "servers": [{ "product": product, "running": true, "desktop": true }],
                "running": [product]
            })),
            "cli_align" => run_align(control, agent_name, arguments),
            "control_status" => ToolOutcome::json(json!(control.list())),
            _ => ToolOutcome::error(format!("native tool {name} is not implemented")),
        };
    }
    call_contract(router, &tool, arguments, &agent_name).await
}

async fn call_contract(
    router: Router,
    tool: &Tool,
    arguments: Value,
    agent_name: &str,
) -> ToolOutcome {
    let Some(mut fields) = arguments.as_object().cloned() else {
        return ToolOutcome::error("tool arguments must be a JSON object");
    };
    let mut query = BTreeMap::new();
    for name in &tool.query_names {
        if let Some(value) = fields.remove(name) {
            query.insert(name.clone(), value);
        }
    }
    let mut uri = tool.path.clone();
    if !query.is_empty() {
        let encoded = query
            .iter()
            .map(|(name, value)| {
                let text = value
                    .as_str()
                    .map(ToString::to_string)
                    .unwrap_or_else(|| value.to_string());
                format!("{name}={}", encode_query_component(&text))
            })
            .collect::<Vec<_>>()
            .join("&");
        uri.push('?');
        uri.push_str(&encoded);
    }
    let body = if tool.method == "GET" {
        None
    } else {
        Some(Value::Object(fields).to_string())
    };
    let request = IpcRequest {
        method: tool.method.clone(),
        uri,
        headers: BTreeMap::from([
            ("content-type".to_string(), "application/json".to_string()),
            ("x-lisca-agent".to_string(), agent_name.to_string()),
        ]),
        body,
    };
    match dispatch_request(router, request).await {
        Ok(response) if (200..300).contains(&response.status) => {
            let body = response.body.unwrap_or_default();
            match serde_json::from_str::<Value>(&body) {
                Ok(value)
                    if matches!(
                        tool.operation_id.as_str(),
                        "align.loadFrame" | "annotate.loadRoiFrame"
                    ) =>
                {
                    frame_outcome(value)
                }
                Ok(value) if tool.operation_id == "annotate.loadRoiFrameAnnotation" => {
                    mask_outcome(value)
                }
                Ok(value) => ToolOutcome::json(value),
                Err(_) => ToolOutcome::text(body),
            }
        }
        Ok(response) => ToolOutcome::error(format!(
            "{} returned HTTP {}: {}",
            tool.operation_id,
            response.status,
            response.body.unwrap_or_default()
        )),
        Err(error) => ToolOutcome::error(error),
    }
}

fn encode_query_component(value: &str) -> String {
    let mut encoded = String::new();
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            encoded.push(byte as char);
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    encoded
}

fn frame_outcome(mut frame: Value) -> ToolOutcome {
    let Some(width) = frame
        .get("width")
        .and_then(Value::as_u64)
        .map(|value| value as u32)
    else {
        return ToolOutcome::error("frame payload has no width");
    };
    let Some(height) = frame
        .get("height")
        .and_then(Value::as_u64)
        .map(|value| value as u32)
    else {
        return ToolOutcome::error("frame payload has no height");
    };
    let Some(data) = frame.get("dataBase64").and_then(Value::as_str) else {
        return ToolOutcome::error("frame payload has no dataBase64");
    };
    let pixel_type = frame
        .get("pixelType")
        .and_then(Value::as_str)
        .unwrap_or("uint8");
    if !matches!(pixel_type, "uint8" | "uint8clamped") {
        return ToolOutcome::error(format!("cannot render {pixel_type} frame pixels"));
    }
    let Ok(bytes) = BASE64.decode(data) else {
        return ToolOutcome::error("frame dataBase64 is invalid");
    };
    if bytes.len() != width as usize * height as usize {
        return ToolOutcome::error("frame pixel count does not match its dimensions");
    }
    match encode_gray_png(width, height, &bytes) {
        Ok(png) => {
            frame["dataBase64"] = json!(format!("<{} pixels omitted>", bytes.len()));
            ToolOutcome {
                content: vec![
                    json!({ "type": "text", "text": serde_json::to_string_pretty(&frame).unwrap_or_default() }),
                    json!({ "type": "image", "data": BASE64.encode(png), "mimeType": "image/png" }),
                ],
                is_error: false,
            }
        }
        Err(error) => ToolOutcome::error(error),
    }
}

fn mask_outcome(mut annotation: Value) -> ToolOutcome {
    let mask = annotation
        .get("maskBase64Png")
        .and_then(Value::as_str)
        .map(ToString::to_string);
    let Some(mask) = mask.filter(|mask| !mask.is_empty()) else {
        return ToolOutcome::json(annotation);
    };
    if BASE64.decode(&mask).is_err() {
        return ToolOutcome::error("maskBase64Png is invalid base64");
    }
    annotation["maskBase64Png"] = json!("<PNG omitted; see image block>");
    ToolOutcome {
        content: vec![
            json!({ "type": "text", "text": serde_json::to_string_pretty(&annotation).unwrap_or_default() }),
            json!({ "type": "image", "data": mask, "mimeType": "image/png" }),
        ],
        is_error: false,
    }
}

fn encode_gray_png(width: u32, height: u32, pixels: &[u8]) -> Result<Vec<u8>, String> {
    let mut bytes = std::io::Cursor::new(Vec::new());
    PngEncoder::new(&mut bytes)
        .write_image(pixels, width, height, ExtendedColorType::L8)
        .map_err(|error| format!("failed to encode frame PNG: {error}"))?;
    Ok(bytes.into_inner())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AlignArguments {
    workspace: String,
    pos: u32,
    source: Option<String>,
    #[serde(default)]
    channel: Option<u32>,
    #[serde(default)]
    time: Option<u32>,
    #[serde(default)]
    z: Option<u32>,
    shape: Option<String>,
    pattern_size: Option<f64>,
    min_spacing: Option<f64>,
    max_spacing: Option<f64>,
    #[serde(default)]
    apply: bool,
}

fn run_align(control: ControlCenter, agent_name: String, arguments: Value) -> ToolOutcome {
    let args: AlignArguments = match serde_json::from_value(arguments) {
        Ok(args) => args,
        Err(error) => return ToolOutcome::error(format!("invalid cli_align arguments: {error}")),
    };
    let result = (|| -> Result<Value, String> {
        let source = resolve_source(&args.workspace, args.source.as_deref())?;
        let options = DetectOptions {
            shape: match args.shape.as_deref() {
                None => None,
                Some("rect") => Some(AlignGridShape::Rect),
                Some("square") => Some(AlignGridShape::Square),
                Some("hex") => Some(AlignGridShape::Hex),
                Some(other) => return Err(format!("shape must be rect, square, or hex: {other}")),
            },
            pattern_width: args.pattern_size,
            pattern_height: args.pattern_size,
            min_spacing: args.min_spacing,
            max_spacing: args.max_spacing,
        };
        let detection = detect_grid_from_source(
            source,
            FrameRequest {
                pos: args.pos,
                channel: args.channel.unwrap_or(0),
                time: args.time.unwrap_or(0),
                z: args.z.unwrap_or(0),
            },
            options,
        )?;
        if args.apply {
            let permit = control
                .begin_agent(
                    &args.workspace,
                    format!("Auto-aligning Pos{}", args.pos),
                    agent_name,
                )
                .map_err(|error| error.message)?;
            let result = save_bbox(
                &args.workspace,
                args.pos,
                &detection.csv,
                &SavedAlignState {
                    grid: detection.grid.clone(),
                    excluded_patterns: Vec::new(),
                    drift: None,
                },
            );
            control.finish_agent(permit);
            result?;
        }
        Ok(json!({
            "pos": args.pos,
            "grid": detection.grid,
            "count": detection.patterns.len(),
            "islands": detection.islands,
            "confidence": detection.confidence,
            "residualPx": detection.residual_px,
            "saved": args.apply,
            "csv": detection.csv
        }))
    })();
    match result {
        Ok(value) => ToolOutcome::json(value),
        Err(error) => ToolOutcome::error(error),
    }
}

fn resolve_source(workspace: &str, explicit: Option<&str>) -> Result<AlignerSource, String> {
    if let Some(source) = explicit {
        return source_from_path(source);
    }
    let assay_path = Path::new(workspace).join("assay.json");
    if let Ok(contents) = std::fs::read_to_string(assay_path) {
        if let Ok(assay) = serde_json::from_str::<AssayJsonFile>(&contents) {
            let path_exists = match &assay.data {
                AssayData::Folder { path, .. }
                | AssayData::Nd2 { path }
                | AssayData::Czi { path } => Path::new(path).exists(),
            };
            if path_exists {
                return Ok(match assay.data {
                    AssayData::Folder { path, template } => AlignerSource::Folder {
                        path,
                        subfolder_template: template.subfolder,
                        filename_template: template.filename,
                    },
                    AssayData::Nd2 { path } => AlignerSource::Nd2 { path },
                    AssayData::Czi { path } => AlignerSource::Czi { path },
                });
            }
            if let AssayData::Folder { template, .. } = assay.data {
                return folder_source(workspace, template.subfolder, template.filename);
            }
        }
    }
    folder_source(
        workspace,
        "Pos{p}".to_string(),
        "img_channel{c}_position{p}_time{t}_z{z}.tif".to_string(),
    )
}

fn source_from_path(source: &str) -> Result<AlignerSource, String> {
    if Path::new(source).is_dir() {
        return folder_source(
            source,
            "Pos{p}".to_string(),
            "img_channel{c}_position{p}_time{t}_z{z}.tif".to_string(),
        );
    }
    let lower = source.to_ascii_lowercase();
    if lower.ends_with(".nd2") {
        Ok(AlignerSource::Nd2 {
            path: source.to_string(),
        })
    } else if lower.ends_with(".czi") {
        Ok(AlignerSource::Czi {
            path: source.to_string(),
        })
    } else {
        Err(format!(
            "source must be an ND2, CZI, or frame folder: {source}"
        ))
    }
}

fn folder_source(
    path: &str,
    subfolder_template: String,
    filename_template: String,
) -> Result<AlignerSource, String> {
    if !Path::new(path).is_dir() {
        return Err(format!("folder source is not a directory: {path}"));
    }
    Ok(AlignerSource::Folder {
        path: path.to_string(),
        subfolder_template,
        filename_template,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request, routing::get};
    use tower::ServiceExt;

    #[test]
    fn catalog_contains_studio_contract_and_native_tools() {
        let tools = catalog("studio").expect("catalog");
        let names = tools
            .iter()
            .map(|tool| tool.name.as_str())
            .collect::<Vec<_>>();
        assert!(names.contains(&"align_crop_roi"));
        assert!(names.contains(&"align_detect_grid"));
        assert!(names.contains(&"annotate_load_roi_frame"));
        assert!(names.contains(&"studio_classify_label_free"));
        assert!(names.contains(&"cli_align"));
        assert!(names.contains(&"control_status"));
        assert!(names.contains(&"server_status"));
        assert!(!names.contains(&"product"));
        let scan = tools
            .iter()
            .find(|tool| tool.name == "align_scan_source")
            .expect("scan");
        let text = serde_json::to_string(&scan.input_schema).expect("schema");
        assert!(text.contains("subfolderTemplate"));
        assert!(!text.contains("$ref"), "{text}");
    }

    #[test]
    fn aligner_catalog_does_not_offer_studio_only_routes() {
        let tools = catalog("aligner").expect("catalog");
        assert!(tools.iter().any(|tool| tool.name == "align_load_frame"));
        assert!(tools.iter().any(|tool| tool.name == "align_detect_grid"));
        assert!(!tools
            .iter()
            .any(|tool| tool.name == "studio_start_analysis"));
        assert!(!tools.iter().any(|tool| tool.name == "annotate_save_labels"));
    }

    #[test]
    fn annotator_catalog_offers_annotate_and_label_free_without_align_tools() {
        let tools = catalog("annotator").expect("catalog");
        assert!(tools
            .iter()
            .any(|tool| tool.name == "annotate_load_roi_frame"));
        assert!(tools
            .iter()
            .any(|tool| tool.name == "studio_classify_label_free"));
        assert!(!tools.iter().any(|tool| tool.name == "cli_align"));
        assert!(!tools.iter().any(|tool| tool.name == "align_load_frame"));
        assert!(!tools
            .iter()
            .any(|tool| tool.name == "studio_start_analysis"));
    }

    #[test]
    fn operation_ids_become_snake_case_tool_names() {
        assert_eq!(tool_name("align.cancelCropRoi"), "align_cancel_crop_roi");
        assert_eq!(
            tool_name("studio.labelFreeHealth"),
            "studio_label_free_health"
        );
    }

    #[tokio::test]
    async fn initialize_and_tools_list_answer_json_rpc() {
        let router = Router::new().route("/ping", get(|| async { Json(json!({"ok":true})) }));
        let initialized = dispatch_rpc(
            router.clone(),
            "studio",
            ControlCenter::default(),
            "test-agent".to_string(),
            RpcRequest {
                jsonrpc: "2.0".to_string(),
                id: Some(json!(1)),
                method: "initialize".to_string(),
                params: None,
            },
        )
        .await;
        assert_eq!(
            initialized["result"]["serverInfo"]["name"],
            "lisca-studio-desktop"
        );
        let listed = dispatch_rpc(
            router,
            "studio",
            ControlCenter::default(),
            "test-agent".to_string(),
            RpcRequest {
                jsonrpc: "2.0".to_string(),
                id: Some(json!(2)),
                method: "tools/list".to_string(),
                params: None,
            },
        )
        .await;
        assert!(listed["result"]["tools"].as_array().expect("tools").len() > 40);
    }

    #[tokio::test]
    async fn contract_calls_dispatch_into_the_live_router() {
        let router = Router::new().route("/ping", get(|| async { Json(json!({"ok":true})) }));
        // Use a tiny OpenAPI-free tool to exercise the same dispatch function.
        let tool = Tool {
            name: "test".to_string(),
            operation_id: "test".to_string(),
            method: "GET".to_string(),
            path: "/ping".to_string(),
            description: String::new(),
            input_schema: json!({"type":"object"}),
            query_names: Vec::new(),
            native: false,
        };
        let outcome = call_contract(router, &tool, json!({}), "test-agent").await;
        assert!(!outcome.is_error);
        assert!(outcome.content[0]["text"]
            .as_str()
            .expect("text")
            .contains("true"));
    }

    #[test]
    fn query_values_are_percent_encoded() {
        assert_eq!(
            encode_query_component("C:/My Data/killing pi"),
            "C%3A%2FMy%20Data%2Fkilling%20pi"
        );
    }

    #[test]
    fn png_renderer_preserves_prerendered_pixels() {
        let png = encode_gray_png(2, 1, &[0, 255]).expect("png");
        let decoded = image::load_from_memory(&png).expect("decode").to_luma8();
        assert_eq!(decoded.as_raw(), &[0, 255]);
    }

    #[test]
    fn bearer_token_is_long_and_unique() {
        assert_ne!(new_token(), new_token());
        assert!(new_token().len() >= 64);
    }

    #[test]
    fn status_exposes_a_loopback_registration_command() {
        let command = claude_command("studio", "http://127.0.0.1:19770/mcp", "secret");
        assert!(command.contains("--transport http"));
        assert!(command.contains("Authorization: Bearer secret"));
    }

    #[allow(dead_code)]
    async fn router_smoke(router: Router) {
        let _ = router.oneshot(Request::new(Body::empty())).await;
    }
}
