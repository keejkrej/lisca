//! Shared human/agent workspace control.
//!
//! The embedded router serves both the webview and desktop MCP. This module is
//! the single ownership gate in front of it: reads stay concurrent, mutations
//! are serialized per workspace, and an agent session keeps ownership until the
//! user takes over or stops it. Long crop/analysis tasks are watched through
//! their existing progress routes; takeover and stop cancel those tasks through
//! their existing cancellation routes before control changes hands.

use std::{
    collections::{BTreeMap, HashMap},
    sync::{Arc, Mutex},
    time::Duration,
};

use axum::{
    body::{to_bytes, Body},
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::time::sleep;

use super::{dispatch_request, IpcRequest};

const AGENT_HEADER: &str = "x-lisca-agent";
const BODY_CAP: usize = 64 * 1024 * 1024;
const PROGRESS_POLL: Duration = Duration::from_millis(500);
const TAKEOVER_TIMEOUT: Duration = Duration::from_secs(60);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ControlMode {
    HumanControl,
    AgentRunning,
    AgentPaused,
    UserTakeover,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Owner {
    Human,
    Agent,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum OperationKind {
    Mutation,
    Crop,
    Analysis,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveOperation {
    request_id: String,
    kind: OperationKind,
    label: String,
    detail: Option<String>,
}

#[derive(Debug, Clone)]
pub(crate) struct Permit {
    workspace: String,
    request_id: String,
    kind: OperationKind,
}

#[derive(Debug, Clone)]
struct WorkspaceEntry {
    mode: ControlMode,
    agent_name: Option<String>,
    active: Option<ActiveOperation>,
    revision: u64,
}

impl Default for WorkspaceEntry {
    fn default() -> Self {
        Self {
            mode: ControlMode::HumanControl,
            agent_name: None,
            active: None,
            revision: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceControlStatus {
    pub workspace_path: String,
    pub mode: ControlMode,
    pub agent_name: Option<String>,
    pub operation: Option<ActiveOperation>,
    pub revision: u64,
}

#[derive(Default)]
struct Inner {
    entries: HashMap<String, WorkspaceEntry>,
    router: Option<Router>,
}

#[derive(Clone, Default)]
pub struct ControlCenter {
    inner: Arc<Mutex<Inner>>,
}

#[derive(Debug)]
pub(crate) struct ControlRejection {
    code: &'static str,
    pub(crate) message: String,
}

impl ControlRejection {
    fn response(self, workspace: &str, entry: &WorkspaceEntry) -> Response {
        (
            StatusCode::CONFLICT,
            Json(json!({
                "error": self.message,
                "code": self.code,
                "workspacePath": workspace,
                "activeOperation": entry.active,
                "agentName": entry.agent_name,
                "revision": entry.revision,
            })),
        )
            .into_response()
    }
}

impl ControlCenter {
    pub fn attach_router(&self, router: Router) {
        self.lock().router = Some(router);
    }

    pub fn wrap(&self, router: Router) -> Router {
        router.layer(axum::middleware::from_fn_with_state(
            self.clone(),
            control_middleware,
        ))
    }

    pub fn list(&self) -> Vec<WorkspaceControlStatus> {
        let mut sessions = self
            .lock()
            .entries
            .iter()
            .filter(|(_, entry)| entry.mode != ControlMode::HumanControl)
            .map(|(workspace, entry)| status(workspace, entry))
            .collect::<Vec<_>>();
        sessions.sort_by(|left, right| left.workspace_path.cmp(&right.workspace_path));
        sessions
    }

    pub fn status(&self, workspace: &str) -> WorkspaceControlStatus {
        let workspace = normalize_workspace(workspace);
        let inner = self.lock();
        status(
            &workspace,
            &inner.entries.get(&workspace).cloned().unwrap_or_default(),
        )
    }

    fn begin(
        &self,
        workspace: &str,
        owner: Owner,
        agent_name: Option<String>,
        label: String,
        kind: OperationKind,
        request_id: Option<String>,
    ) -> Result<Permit, ControlRejection> {
        let workspace = normalize_workspace(workspace);
        let mut inner = self.lock();
        let entry = inner.entries.entry(workspace.clone()).or_default();

        if entry.active.is_some() {
            return Err(ControlRejection {
                code: "workspace_busy",
                message: format!(
                    "{} is already {}.",
                    entry
                        .active
                        .as_ref()
                        .map(|operation| operation.label.clone())
                        .unwrap_or_else(|| "Another operation".to_string()),
                    match entry.mode {
                        ControlMode::AgentRunning => "being run by the agent".to_string(),
                        _ => "in progress".to_string(),
                    }
                ),
            });
        }

        match (entry.mode, owner) {
            (ControlMode::AgentRunning, Owner::Human) => {
                return Err(ControlRejection {
                    code: "agent_has_control",
                    message: "The agent controls this workspace. Choose Take over first."
                        .to_string(),
                });
            }
            (ControlMode::AgentPaused, Owner::Human) => {
                return Err(ControlRejection {
                    code: "agent_paused",
                    message: "The agent is paused. Choose Take over to edit this workspace."
                        .to_string(),
                });
            }
            (ControlMode::AgentPaused, Owner::Agent)
            | (ControlMode::UserTakeover, Owner::Agent) => {
                return Err(ControlRejection {
                    code: "control_with_user",
                    message: "The user has control. Resume only after an explicit handback."
                        .to_string(),
                });
            }
            _ => {}
        }

        if owner == Owner::Agent {
            entry.mode = ControlMode::AgentRunning;
            entry.agent_name = agent_name.or_else(|| Some("Claude Code".to_string()));
        }
        let request_id = request_id
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        entry.active = Some(ActiveOperation {
            request_id: request_id.clone(),
            kind,
            label,
            detail: None,
        });
        Ok(Permit {
            workspace,
            request_id,
            kind,
        })
    }

    fn finish(&self, permit: &Permit) {
        let mut inner = self.lock();
        if let Some(entry) = inner.entries.get_mut(&permit.workspace) {
            if entry
                .active
                .as_ref()
                .map(|active| active.request_id == permit.request_id)
                .unwrap_or(false)
            {
                entry.active = None;
                entry.revision += 1;
            }
        }
    }

    pub(crate) fn begin_agent(
        &self,
        workspace: &str,
        label: String,
        agent_name: String,
    ) -> Result<Permit, ControlRejection> {
        self.begin(
            workspace,
            Owner::Agent,
            Some(agent_name),
            label,
            OperationKind::Mutation,
            None,
        )
    }

    pub(crate) fn finish_agent(&self, permit: Permit) {
        self.finish(&permit);
    }

    fn watch(&self, router: Router, permit: Permit) {
        let center = self.clone();
        tauri::async_runtime::spawn(async move {
            let mut failures = 0_u32;
            loop {
                sleep(PROGRESS_POLL).await;
                match progress(router.clone(), &permit).await {
                    Ok(Some((detail, terminal))) => {
                        center.update_detail(&permit, Some(detail));
                        if terminal {
                            center.finish(&permit);
                            break;
                        }
                        failures = 0;
                    }
                    Ok(None) => {
                        failures += 1;
                    }
                    Err(_) => {
                        failures += 1;
                    }
                }
                // A missing history entry must not leave the workspace locked
                // forever. The task itself is still owned by the scheduler.
                if failures >= 240 {
                    center.update_detail(&permit, Some("Progress unavailable".to_string()));
                    center.finish(&permit);
                    break;
                }
            }
        });
    }

    fn update_detail(&self, permit: &Permit, detail: Option<String>) {
        let mut inner = self.lock();
        if let Some(entry) = inner.entries.get_mut(&permit.workspace) {
            if let Some(active) = entry
                .active
                .as_mut()
                .filter(|active| active.request_id == permit.request_id)
            {
                active.detail = detail;
            }
        }
    }

    async fn transition(&self, workspace: &str, target: ControlMode) -> WorkspaceControlStatus {
        let workspace = normalize_workspace(workspace);
        let active = {
            let mut inner = self.lock();
            let entry = inner.entries.entry(workspace.clone()).or_default();
            entry.mode = target;
            entry.active.clone()
        };
        if let Some(active) = active {
            self.cancel_active(&workspace, &active).await;
            self.wait_for_inactive(&workspace, &active.request_id).await;
            let mut inner = self.lock();
            if let Some(entry) = inner.entries.get_mut(&workspace) {
                if entry
                    .active
                    .as_ref()
                    .map(|current| current.request_id == active.request_id)
                    .unwrap_or(false)
                {
                    entry.active = None;
                    entry.revision += 1;
                }
            }
        }
        if target == ControlMode::HumanControl {
            self.lock()
                .entries
                .entry(workspace.clone())
                .or_default()
                .agent_name = None;
        }
        self.lock()
            .entries
            .entry(workspace.clone())
            .or_default()
            .revision += 1;
        self.status(&workspace)
    }

    pub async fn pause(&self, workspace: &str) -> WorkspaceControlStatus {
        self.transition(workspace, ControlMode::AgentPaused).await
    }

    pub async fn takeover(&self, workspace: &str) -> WorkspaceControlStatus {
        self.transition(workspace, ControlMode::UserTakeover).await
    }

    pub async fn stop(&self, workspace: &str) -> WorkspaceControlStatus {
        self.transition(workspace, ControlMode::HumanControl).await
    }

    pub fn handback(&self, workspace: &str) -> WorkspaceControlStatus {
        let workspace = normalize_workspace(workspace);
        {
            let mut inner = self.lock();
            let entry = inner.entries.entry(workspace.clone()).or_default();
            entry.mode = ControlMode::AgentRunning;
            entry.active = None;
            entry.revision += 1;
        }
        self.status(&workspace)
    }

    async fn cancel_active(&self, workspace: &str, active: &ActiveOperation) {
        let Some(router) = self.lock().router.clone() else {
            return;
        };
        match active.kind {
            OperationKind::Mutation => {}
            OperationKind::Crop => {
                let _ = call_json(
                    router,
                    "POST",
                    "/align/cancel-crop-roi",
                    json!({ "requestId": active.request_id }),
                )
                .await;
            }
            OperationKind::Analysis => {
                if let Some(tasks) = call_json(router.clone(), "GET", "/tasks", json!({})).await {
                    let task_ids = tasks
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter(|task| {
                            task.get("workspacePath")
                                .and_then(Value::as_str)
                                .map(|path| normalize_workspace(path) == workspace)
                                .unwrap_or(false)
                                && task
                                    .get("kind")
                                    .and_then(Value::as_str)
                                    .map(|kind| kind.starts_with("analysis/"))
                                    .unwrap_or(false)
                                && !matches!(
                                    task.get("status").and_then(Value::as_str),
                                    Some("completed" | "failed" | "cancelled")
                                )
                        })
                        .filter_map(|task| {
                            task.get("taskId")
                                .and_then(Value::as_str)
                                .map(ToString::to_string)
                        })
                        .collect::<Vec<_>>();
                    for task_id in task_ids {
                        let _ = call_json(
                            router.clone(),
                            "POST",
                            "/tasks/task/cancel",
                            json!({ "taskId": task_id }),
                        )
                        .await;
                    }
                }
            }
        }
    }

    async fn wait_for_inactive(&self, workspace: &str, request_id: &str) {
        let deadline = std::time::Instant::now() + TAKEOVER_TIMEOUT;
        loop {
            let active = self.lock().entries.get(workspace).and_then(|entry| {
                entry
                    .active
                    .as_ref()
                    .map(|active| active.request_id.clone())
            });
            if active.as_deref() != Some(request_id) || std::time::Instant::now() >= deadline {
                break;
            }
            sleep(Duration::from_millis(200)).await;
        }
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, Inner> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

fn status(workspace: &str, entry: &WorkspaceEntry) -> WorkspaceControlStatus {
    WorkspaceControlStatus {
        workspace_path: workspace.to_string(),
        mode: entry.mode,
        agent_name: entry.agent_name.clone(),
        operation: entry.active.clone(),
        revision: entry.revision,
    }
}

fn normalize_workspace(workspace: &str) -> String {
    let normalized = workspace.trim().replace('\\', "/");
    let normalized = normalized.trim_end_matches('/').to_string();
    #[cfg(windows)]
    {
        normalized.to_lowercase()
    }
    #[cfg(not(windows))]
    {
        normalized
    }
}

#[tauri::command]
pub async fn control_list(
    center: tauri::State<'_, ControlCenter>,
) -> Result<Vec<WorkspaceControlStatus>, String> {
    Ok(center.list())
}

#[tauri::command]
pub async fn control_pause(
    center: tauri::State<'_, ControlCenter>,
    workspace_path: String,
) -> Result<WorkspaceControlStatus, String> {
    Ok(center.pause(&workspace_path).await)
}

#[tauri::command]
pub async fn control_takeover(
    center: tauri::State<'_, ControlCenter>,
    workspace_path: String,
) -> Result<WorkspaceControlStatus, String> {
    Ok(center.takeover(&workspace_path).await)
}

#[tauri::command]
pub async fn control_handback(
    center: tauri::State<'_, ControlCenter>,
    workspace_path: String,
) -> Result<WorkspaceControlStatus, String> {
    Ok(center.handback(&workspace_path))
}

#[tauri::command]
pub async fn control_stop(
    center: tauri::State<'_, ControlCenter>,
    workspace_path: String,
) -> Result<WorkspaceControlStatus, String> {
    Ok(center.stop(&workspace_path).await)
}

async fn control_middleware(
    axum::extract::State(center): axum::extract::State<ControlCenter>,
    request: Request<Body>,
    next: Next,
) -> Response {
    if request.method() != axum::http::Method::POST {
        return next.run(request).await;
    }
    let path = request.uri().path().to_string();
    let agent_name = request
        .headers()
        .get(AGENT_HEADER)
        .and_then(|value| value.to_str().ok())
        .map(ToString::to_string);
    let owner = if agent_name.is_some() {
        Owner::Agent
    } else {
        Owner::Human
    };
    let (parts, body) = request.into_parts();
    let bytes = match to_bytes(body, BODY_CAP).await {
        Ok(bytes) => bytes,
        Err(error) => {
            return (
                StatusCode::PAYLOAD_TOO_LARGE,
                format!("could not read mutation request: {error}"),
            )
                .into_response();
        }
    };
    let payload = serde_json::from_slice::<Value>(&bytes).unwrap_or_else(|_| json!({}));
    let Some(workspace) = mutation_workspace(&path, &payload) else {
        return next
            .run(Request::from_parts(parts, Body::from(bytes)))
            .await;
    };
    let (label, kind) = mutation_description(&path, &payload);
    let request_id = payload
        .get("requestId")
        .and_then(Value::as_str)
        .map(ToString::to_string);
    let permit = match center.begin(&workspace, owner, agent_name, label, kind, request_id) {
        Ok(permit) => permit,
        Err(rejection) => {
            let entry = center.status(&workspace);
            return rejection.response(
                &workspace,
                &WorkspaceEntry {
                    mode: entry.mode,
                    agent_name: entry.agent_name,
                    active: entry.operation,
                    revision: entry.revision,
                },
            );
        }
    };
    let response = next
        .run(Request::from_parts(parts, Body::from(bytes)))
        .await;
    if response.status().is_success() && kind != OperationKind::Mutation {
        if let Some(router) = center.lock().router.clone() {
            center.watch(router, permit);
            return response;
        }
    }
    center.finish(&permit);
    response
}

fn mutation_workspace(path: &str, payload: &Value) -> Option<String> {
    if !matches!(
        path,
        "/align/save-bbox"
            | "/align/crop-roi"
            | "/annotate/save-labels"
            | "/annotate/save-roi-frame-annotation"
            | "/studio/save-assay-json"
            | "/studio/start-analysis"
            | "/studio/label-free/references"
            | "/studio/label-free/classify"
    ) {
        return None;
    }
    payload
        .get("workspacePath")
        .or_else(|| payload.get("saveTo"))
        .and_then(Value::as_str)
        .filter(|workspace| !workspace.trim().is_empty())
        .map(ToString::to_string)
}

fn mutation_description(path: &str, payload: &Value) -> (String, OperationKind) {
    match path {
        "/align/crop-roi" => {
            let positions = payload
                .get("positions")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(Value::as_u64)
                .map(|position| position.to_string())
                .collect::<Vec<_>>()
                .join(",");
            (format!("Cropping Pos{positions}"), OperationKind::Crop)
        }
        "/studio/start-analysis" => ("Running analysis".to_string(), OperationKind::Analysis),
        "/align/save-bbox" => (
            format!(
                "Saving alignment Pos{}",
                payload.get("pos").and_then(Value::as_u64).unwrap_or(0)
            ),
            OperationKind::Mutation,
        ),
        "/annotate/save-roi-frame-annotation" => (
            format!(
                "Annotating Pos{} Roi{}",
                payload
                    .get("request")
                    .and_then(|request| request.get("pos"))
                    .and_then(Value::as_u64)
                    .unwrap_or(0),
                payload
                    .get("request")
                    .and_then(|request| request.get("roi"))
                    .and_then(Value::as_u64)
                    .unwrap_or(0)
            ),
            OperationKind::Mutation,
        ),
        "/annotate/save-labels" => (
            "Saving annotation labels".to_string(),
            OperationKind::Mutation,
        ),
        "/studio/save-assay-json" => ("Saving assay metadata".to_string(), OperationKind::Mutation),
        "/studio/label-free/references" => (
            format!(
                "Building reference set {}",
                payload.get("name").and_then(Value::as_str).unwrap_or("")
            ),
            OperationKind::Mutation,
        ),
        "/studio/label-free/classify" => ("Classifying ROIs".to_string(), OperationKind::Mutation),
        _ => ("Updating workspace".to_string(), OperationKind::Mutation),
    }
}

async fn progress(router: Router, permit: &Permit) -> Result<Option<(String, bool)>, String> {
    let (uri, crop) = match permit.kind {
        OperationKind::Crop => (
            format!("/align/crop-roi-progress?requestId={}", permit.request_id),
            true,
        ),
        OperationKind::Analysis => (
            format!("/studio/analysis-progress?requestId={}", permit.request_id),
            false,
        ),
        OperationKind::Mutation => return Ok(None),
    };
    let response = dispatch_request(
        router,
        IpcRequest {
            method: "GET".to_string(),
            uri,
            headers: BTreeMap::new(),
            body: None,
        },
    )
    .await?;
    if !(200..300).contains(&response.status) {
        return Err(format!("progress returned HTTP {}", response.status));
    }
    let body = response.body.unwrap_or_else(|| "null".to_string());
    let value: Value = serde_json::from_str(&body).map_err(|error| error.to_string())?;
    if value.is_null() {
        return Ok(None);
    }
    let status = value.get("status").and_then(Value::as_str).unwrap_or("");
    let terminal = if crop {
        matches!(status, "completed" | "cancelled" | "error")
    } else {
        matches!(status, "completed" | "error")
    };
    let detail = if crop {
        let completed = value
            .get("completedRois")
            .and_then(Value::as_u64)
            .unwrap_or(0);
        let total = value.get("totalRois").and_then(Value::as_u64).unwrap_or(0);
        format!("{completed}/{total} ROI frames")
    } else {
        let fraction = value.get("progress").and_then(Value::as_f64).unwrap_or(0.0);
        // AnalysisProgress uses 0–100; tolerate a fractional producer too.
        let percent = if fraction <= 1.0 {
            fraction * 100.0
        } else {
            fraction
        };
        format!("{percent:.0}%")
    };
    Ok(Some((detail, terminal)))
}

async fn call_json(router: Router, method: &str, uri: &str, body: Value) -> Option<Value> {
    let response = dispatch_request(
        router,
        IpcRequest {
            method: method.to_string(),
            uri: uri.to_string(),
            headers: BTreeMap::from([("content-type".to_string(), "application/json".to_string())]),
            body: (method != "GET").then(|| body.to_string()),
        },
    )
    .await
    .ok()?;
    if !(200..300).contains(&response.status) {
        return None;
    }
    serde_json::from_str(&response.body?).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn permit(center: &ControlCenter, owner: Owner) -> Result<Permit, ControlRejection> {
        center.begin(
            "C:/data/demo",
            owner,
            (owner == Owner::Agent).then(|| "Claude Code".to_string()),
            "Testing".to_string(),
            OperationKind::Mutation,
            None,
        )
    }

    #[test]
    fn agent_session_blocks_human_until_takeover_and_handback() {
        let center = ControlCenter::default();
        let first = permit(&center, Owner::Agent).expect("agent starts");
        assert!(permit(&center, Owner::Human).is_err());
        center.finish(&first);
        // Finishing one operation does not silently release the agent session.
        assert!(permit(&center, Owner::Human).is_err());

        let center_clone = center.clone();
        let taken =
            tauri::async_runtime::block_on(
                async move { center_clone.takeover("C:/data/demo").await },
            );
        assert_eq!(taken.mode, ControlMode::UserTakeover);
        let human = permit(&center, Owner::Human).expect("human takes control");
        assert!(permit(&center, Owner::Agent).is_err());
        center.finish(&human);
        center.handback("C:/data/demo");
        assert!(permit(&center, Owner::Agent).is_ok());
    }

    #[test]
    fn pause_blocks_agent_writes_and_stop_releases_the_workspace() {
        let center = ControlCenter::default();
        let first = permit(&center, Owner::Agent).expect("agent starts");
        center.finish(&first);
        let clone = center.clone();
        let paused =
            tauri::async_runtime::block_on(async move { clone.pause("C:/data/demo").await });
        assert_eq!(paused.mode, ControlMode::AgentPaused);
        assert!(permit(&center, Owner::Agent).is_err());
        assert!(permit(&center, Owner::Human).is_err());
        let clone = center.clone();
        let stopped =
            tauri::async_runtime::block_on(async move { clone.stop("C:/data/demo").await });
        assert_eq!(stopped.mode, ControlMode::HumanControl);
        assert!(permit(&center, Owner::Human).is_ok());
    }

    #[test]
    fn concurrent_mutation_is_rejected_with_workspace_busy() {
        let center = ControlCenter::default();
        let first = permit(&center, Owner::Agent).expect("agent starts");
        let second = permit(&center, Owner::Agent).expect_err("one writer");
        assert_eq!(second.code, "workspace_busy");
        center.finish(&first);
        assert!(permit(&center, Owner::Agent).is_ok());
    }

    #[test]
    fn workspace_paths_are_normalized() {
        let center = ControlCenter::default();
        let first = center
            .begin(
                "C:\\data\\demo\\",
                Owner::Agent,
                None,
                "Testing".to_string(),
                OperationKind::Mutation,
                None,
            )
            .expect("first");
        assert!(permit(&center, Owner::Agent).is_err());
        center.finish(&first);
    }
}
