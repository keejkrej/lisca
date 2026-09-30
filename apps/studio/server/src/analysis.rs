use std::{
    collections::HashMap,
    path::Path,
    sync::{Arc, Mutex},
};

use lisca::{
    analysis,
    protocol::{
        AnalysisProgress, AnalysisStage, AnalysisStatus, StepStatus, TaskDetail, TaskStatus,
    },
};
use lisca_server::{normalize_workspace_path, SchedulerError, TaskScheduler};

#[derive(Clone)]
pub struct AnalysisTaskState {
    inner: Arc<Mutex<AnalysisBook>>,
}

#[derive(Default)]
struct AnalysisBook {
    by_request: HashMap<String, AnalysisRecord>,
    latest_by_workspace: HashMap<String, String>,
}

#[derive(Clone)]
struct AnalysisRecord {
    request_id: String,
    workspace_path: String,
    task_id: String,
}

impl AnalysisTaskState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(AnalysisBook::default())),
        }
    }

    pub fn submit<F>(
        &self,
        request_id: &str,
        workspace_path: &str,
        create: F,
    ) -> Result<AnalysisProgress, String>
    where
        F: FnOnce() -> Result<TaskDetail, SchedulerError>,
    {
        let workspace_path = normalize_workspace_path(workspace_path);
        let mut book = self
            .inner
            .lock()
            .map_err(|_| "analysis task index is poisoned".to_string())?;
        if book.by_request.contains_key(request_id) {
            return Err("analysis request id already exists".to_string());
        }
        let detail = create().map_err(|error| error.to_string())?;
        let record = AnalysisRecord {
            request_id: request_id.to_string(),
            workspace_path: workspace_path.clone(),
            task_id: detail.task.task_id.clone(),
        };
        book.latest_by_workspace
            .insert(workspace_path, request_id.to_string());
        book.by_request
            .insert(request_id.to_string(), record.clone());
        project_progress(&record, &detail)
    }

    pub fn progress(
        &self,
        scheduler: &TaskScheduler,
        request_id: &str,
    ) -> Result<Option<AnalysisProgress>, String> {
        let record = self
            .inner
            .lock()
            .map_err(|_| "analysis task index is poisoned".to_string())?
            .by_request
            .get(request_id)
            .cloned();
        record
            .map(|record| {
                scheduler
                    .task(&record.task_id)
                    .map_err(|error| error.to_string())
                    .and_then(|detail| project_progress(&record, &detail))
            })
            .transpose()
    }

    pub fn latest(
        &self,
        scheduler: &TaskScheduler,
        workspace_path: &str,
    ) -> Result<Option<AnalysisProgress>, String> {
        let workspace_path = normalize_workspace_path(workspace_path);
        let record = {
            let book = self
                .inner
                .lock()
                .map_err(|_| "analysis task index is poisoned".to_string())?;
            book.latest_by_workspace
                .get(&workspace_path)
                .and_then(|request_id| book.by_request.get(request_id))
                .cloned()
        };
        record
            .map(|record| {
                scheduler
                    .task(&record.task_id)
                    .map_err(|error| error.to_string())
                    .and_then(|detail| project_progress(&record, &detail))
            })
            .transpose()
    }
}

impl Default for AnalysisTaskState {
    fn default() -> Self {
        Self::new()
    }
}

fn project_progress(
    record: &AnalysisRecord,
    detail: &TaskDetail,
) -> Result<AnalysisProgress, String> {
    let total = detail.task.progress.total.max(1);
    let settled = detail
        .task
        .progress
        .completed
        .saturating_add(detail.task.progress.failed)
        .saturating_add(detail.task.progress.cancelled);
    let active_kind = detail
        .steps
        .iter()
        .find(|step| {
            matches!(
                step.status,
                StepStatus::Running | StepStatus::CancellationRequested
            )
        })
        .map(|step| step.step_kind.as_str());
    let error = detail.steps.iter().find_map(|step| {
        step.attempts
            .last()
            .and_then(|attempt| attempt.error.as_ref())
            .map(|error| format!("{}: {}", step.step_kind, error.message))
    });
    let status = match detail.task.status {
        TaskStatus::Queued => AnalysisStatus::Queued,
        TaskStatus::Running | TaskStatus::CancellationRequested => AnalysisStatus::Running,
        TaskStatus::Completed => AnalysisStatus::Completed,
        TaskStatus::Failed | TaskStatus::PartiallyComplete => AnalysisStatus::Error,
        TaskStatus::Cancelled => AnalysisStatus::Error,
    };
    let stage = stage_for_kind(active_kind, status);
    let result_files = if status == AnalysisStatus::Completed {
        analysis::workspace_analysis_manifest(Path::new(&record.workspace_path))?
    } else {
        Vec::new()
    };
    Ok(AnalysisProgress {
        request_id: record.request_id.clone(),
        status,
        stage,
        progress: if status == AnalysisStatus::Completed {
            100.0
        } else {
            (settled as f64 / total as f64) * 100.0
        },
        message: Some(
            active_kind
                .map(|kind| kind.replace('-', " "))
                .unwrap_or_else(|| format!("{status:?}")),
        ),
        result_files,
        error,
    })
}

fn stage_for_kind(kind: Option<&str>, status: AnalysisStatus) -> AnalysisStage {
    if status == AnalysisStatus::Completed {
        return AnalysisStage::Completed;
    }
    let kind = kind.unwrap_or_default();
    if kind.contains("segment") || kind.contains("predict") {
        AnalysisStage::Segment
    } else if kind.contains("timeseries") || kind.contains("clean") {
        AnalysisStage::Timeseries
    } else if kind.contains("auc") || kind.contains("death") || kind.contains("kill") {
        AnalysisStage::Auc
    } else if kind.contains("fit") || kind.contains("plot") {
        AnalysisStage::Fit
    } else {
        AnalysisStage::Preparing
    }
}

pub trait HasAnalysisTasks: Clone + Send + Sync + 'static {
    fn analysis_tasks(&self) -> &AnalysisTaskState;
}
