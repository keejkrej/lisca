use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicBool, Ordering as AtomicOrdering},
        Arc, Mutex, MutexGuard,
    },
};

use lisca::protocol::{CropRoiProgress, CropRoiStatus};
use lisca_server_common::normalize_workspace_path;

#[derive(Clone)]
pub struct CropJob {
    pub progress: CropRoiProgress,
    pub cancel: Arc<AtomicBool>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum CropJobStateError {
    Poisoned,
    RequestIdConflict,
}

#[derive(Clone)]
pub struct CropJobState {
    inner: Arc<Mutex<CropJobBook>>,
}

struct CropJobBook {
    jobs: HashMap<String, CropJobRecord>,
    latest_by_workspace: HashMap<String, String>,
}

struct CropJobRecord {
    workspace_path: String,
    worker_running: bool,
    job: CropJob,
}

pub enum CropSubmission {
    Started(CropJob),
    Attached(CropJob),
}

impl CropSubmission {
    pub fn job(&self) -> &CropJob {
        match self {
            Self::Started(job) | Self::Attached(job) => job,
        }
    }
}

impl CropJobState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(CropJobBook {
                jobs: HashMap::new(),
                latest_by_workspace: HashMap::new(),
            })),
        }
    }

    fn lock(&self) -> Result<MutexGuard<'_, CropJobBook>, CropJobStateError> {
        self.inner.lock().map_err(|_| CropJobStateError::Poisoned)
    }

    pub fn submit_or_attach(
        &self,
        workspace_path: &str,
        request_id: String,
        job: CropJob,
    ) -> Result<CropSubmission, CropJobStateError> {
        let workspace_path = normalize_workspace_path(workspace_path);
        let mut book = self.lock()?;

        if let Some(active) = book
            .latest_by_workspace
            .get(&workspace_path)
            .and_then(|request_id| book.jobs.get(request_id))
            .filter(|record| {
                record.worker_running || crop_progress_is_active(record.job.progress.status)
            })
            .map(|record| record.job.clone())
        {
            return Ok(CropSubmission::Attached(active));
        }

        // A same-workspace retry is idempotent. The same identifier on another
        // workspace is a conflict and must never attach to unrelated output.
        if let Some(existing) = book.jobs.get(&request_id) {
            return if existing.workspace_path == workspace_path {
                Ok(CropSubmission::Attached(existing.job.clone()))
            } else {
                Err(CropJobStateError::RequestIdConflict)
            };
        }

        book.latest_by_workspace
            .insert(workspace_path.clone(), request_id.clone());
        book.jobs.insert(
            request_id,
            CropJobRecord {
                workspace_path,
                worker_running: true,
                job: job.clone(),
            },
        );
        Ok(CropSubmission::Started(job))
    }

    pub fn get(&self, request_id: &str) -> Result<Option<CropJob>, CropJobStateError> {
        Ok(self
            .lock()?
            .jobs
            .get(request_id)
            .map(|record| record.job.clone()))
    }

    pub fn latest(&self, workspace_path: &str) -> Result<Option<CropJob>, CropJobStateError> {
        let workspace_path = normalize_workspace_path(workspace_path);
        let book = self.lock()?;
        Ok(book
            .latest_by_workspace
            .get(&workspace_path)
            .and_then(|request_id| book.jobs.get(request_id))
            .map(|record| record.job.clone()))
    }

    pub fn update_progress(
        &self,
        request_id: &str,
        mut progress: CropRoiProgress,
    ) -> Result<bool, CropJobStateError> {
        let mut book = self.lock()?;
        let Some(record) = book.jobs.get_mut(request_id) else {
            return Ok(false);
        };
        let job = &mut record.job;
        if !crop_progress_is_terminal(job.progress.status)
            && !matches!(
                (job.progress.status, progress.status),
                (CropRoiStatus::Running, CropRoiStatus::Queued)
            )
        {
            progress.total_positions = progress.total_positions.max(job.progress.total_positions);
            progress.total_rois = progress.total_rois.max(job.progress.total_rois);
            progress.completed_positions = progress
                .completed_positions
                .max(job.progress.completed_positions)
                .min(progress.total_positions);
            progress.completed_rois = progress
                .completed_rois
                .max(job.progress.completed_rois)
                .min(progress.total_rois);
            job.progress = progress;
        }
        Ok(true)
    }

    pub fn mark_error(&self, request_id: &str, error: String) -> Result<bool, CropJobStateError> {
        let mut book = self.lock()?;
        let Some(record) = book.jobs.get_mut(request_id) else {
            return Ok(false);
        };
        let job = &mut record.job;
        if !crop_progress_is_terminal(job.progress.status) {
            job.progress.status = CropRoiStatus::Error;
            job.progress.error = Some(error);
            job.progress.message = Some("Crop failed".to_string());
        }
        Ok(true)
    }

    pub fn cancel(&self, request_id: &str) -> Result<Option<CropJob>, CropJobStateError> {
        let mut book = self.lock()?;
        let Some(record) = book.jobs.get_mut(request_id) else {
            return Ok(None);
        };
        let job = &mut record.job;
        job.cancel.store(true, AtomicOrdering::SeqCst);
        if crop_progress_is_active(job.progress.status) {
            job.progress.status = CropRoiStatus::Cancelled;
            job.progress.message = Some("Crop cancellation requested".to_string());
        }
        Ok(Some(job.clone()))
    }

    pub fn mark_worker_finished(&self, request_id: &str) -> Result<bool, CropJobStateError> {
        let mut book = self.lock()?;
        let Some(record) = book.jobs.get_mut(request_id) else {
            return Ok(false);
        };
        record.worker_running = false;
        Ok(true)
    }
}

impl Default for CropJobState {
    fn default() -> Self {
        Self::new()
    }
}

pub fn crop_progress_is_active(status: CropRoiStatus) -> bool {
    matches!(status, CropRoiStatus::Queued | CropRoiStatus::Running)
}

fn crop_progress_is_terminal(status: CropRoiStatus) -> bool {
    matches!(
        status,
        CropRoiStatus::Completed | CropRoiStatus::Cancelled | CropRoiStatus::Error
    )
}

pub trait HasCropJobs: Clone + Send + Sync + 'static {
    fn crop_jobs(&self) -> &CropJobState;
}

#[cfg(test)]
mod tests {
    use super::*;

    fn progress(request_id: &str, status: CropRoiStatus) -> CropRoiProgress {
        CropRoiProgress {
            request_id: request_id.to_string(),
            status,
            position: None,
            completed_positions: 0,
            total_positions: 1,
            completed_rois: 0,
            total_rois: 1,
            message: None,
            error: None,
            skipped_positions: Vec::new(),
        }
    }

    fn job(request_id: &str, status: CropRoiStatus) -> CropJob {
        CropJob {
            progress: progress(request_id, status),
            cancel: Arc::new(AtomicBool::new(false)),
        }
    }

    #[test]
    fn active_workspace_submission_attaches_atomically() {
        let state = CropJobState::new();
        assert!(matches!(
            state
                .submit_or_attach(
                    "/workspace",
                    "one".into(),
                    job("one", CropRoiStatus::Queued)
                )
                .unwrap(),
            CropSubmission::Started(_)
        ));
        let attached = state
            .submit_or_attach(
                "/workspace",
                "two".into(),
                job("two", CropRoiStatus::Queued),
            )
            .unwrap();
        assert!(matches!(attached, CropSubmission::Attached(_)));
        assert_eq!(attached.job().progress.request_id, "one");
        assert!(state.get("two").unwrap().is_none());
    }

    #[test]
    fn terminal_job_allows_new_submission_and_remains_latest() {
        let state = CropJobState::new();
        state
            .submit_or_attach(
                "/workspace",
                "one".into(),
                job("one", CropRoiStatus::Queued),
            )
            .unwrap();
        state
            .update_progress("one", progress("one", CropRoiStatus::Completed))
            .unwrap();
        state.mark_worker_finished("one").unwrap();
        assert!(matches!(
            state
                .submit_or_attach(
                    "/workspace",
                    "two".into(),
                    job("two", CropRoiStatus::Queued)
                )
                .unwrap(),
            CropSubmission::Started(_)
        ));
        assert_eq!(
            state
                .latest("/workspace")
                .unwrap()
                .unwrap()
                .progress
                .request_id,
            "two"
        );
    }

    #[test]
    fn different_workspaces_are_independent() {
        let state = CropJobState::new();
        assert!(matches!(
            state
                .submit_or_attach("/one", "one".into(), job("one", CropRoiStatus::Queued))
                .unwrap(),
            CropSubmission::Started(_)
        ));
        assert!(matches!(
            state
                .submit_or_attach("/two", "two".into(), job("two", CropRoiStatus::Queued))
                .unwrap(),
            CropSubmission::Started(_)
        ));
    }

    #[test]
    fn equivalent_workspace_paths_attach_to_the_same_job() {
        let workspace = std::env::temp_dir().join(format!(
            "lisca-crop-registry-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&workspace).unwrap();
        let alias = workspace.join(".");
        let state = CropJobState::new();
        state
            .submit_or_attach(
                workspace.to_str().unwrap(),
                "one".into(),
                job("one", CropRoiStatus::Queued),
            )
            .unwrap();
        let attached = state
            .submit_or_attach(
                alias.to_str().unwrap(),
                "two".into(),
                job("two", CropRoiStatus::Queued),
            )
            .unwrap();
        assert_eq!(attached.job().progress.request_id, "one");
        std::fs::remove_dir_all(workspace).unwrap();
    }

    #[test]
    fn cancellation_is_terminal_against_worker_updates() {
        let state = CropJobState::new();
        state
            .submit_or_attach(
                "/workspace",
                "one".into(),
                job("one", CropRoiStatus::Running),
            )
            .unwrap();
        state.cancel("one").unwrap();
        state
            .update_progress("one", progress("one", CropRoiStatus::Completed))
            .unwrap();
        state.mark_error("one", "late failure".into()).unwrap();
        let current = state.get("one").unwrap().unwrap();
        assert_eq!(current.progress.status, CropRoiStatus::Cancelled);
        assert!(current.cancel.load(AtomicOrdering::SeqCst));
    }

    #[test]
    fn cancelled_workspace_stays_occupied_until_worker_finishes() {
        let state = CropJobState::new();
        state
            .submit_or_attach(
                "/workspace",
                "one".into(),
                job("one", CropRoiStatus::Running),
            )
            .unwrap();
        state.cancel("one").unwrap();

        let while_running = state
            .submit_or_attach(
                "/workspace",
                "two".into(),
                job("two", CropRoiStatus::Queued),
            )
            .unwrap();
        assert!(matches!(while_running, CropSubmission::Attached(_)));
        assert_eq!(while_running.job().progress.request_id, "one");
        assert!(state.get("two").unwrap().is_none());

        state.mark_worker_finished("one").unwrap();
        assert!(matches!(
            state
                .submit_or_attach(
                    "/workspace",
                    "three".into(),
                    job("three", CropRoiStatus::Queued)
                )
                .unwrap(),
            CropSubmission::Started(_)
        ));
    }

    #[test]
    fn duplicate_request_id_from_another_workspace_is_rejected() {
        let state = CropJobState::new();
        state
            .submit_or_attach("/one", "same".into(), job("same", CropRoiStatus::Queued))
            .unwrap();
        let conflict =
            state.submit_or_attach("/two", "same".into(), job("same", CropRoiStatus::Queued));
        assert!(matches!(
            conflict,
            Err(CropJobStateError::RequestIdConflict)
        ));
        assert!(state.latest("/two").unwrap().is_none());
    }

    #[test]
    fn progress_counters_and_status_do_not_regress() {
        let state = CropJobState::new();
        state
            .submit_or_attach(
                "/workspace",
                "one".into(),
                job("one", CropRoiStatus::Running),
            )
            .unwrap();
        let mut advanced = progress("one", CropRoiStatus::Running);
        advanced.completed_positions = 1;
        advanced.completed_rois = 1;
        state.update_progress("one", advanced).unwrap();
        state
            .update_progress("one", progress("one", CropRoiStatus::Queued))
            .unwrap();
        let current = state.get("one").unwrap().unwrap().progress;
        assert_eq!(current.status, CropRoiStatus::Running);
        assert_eq!(current.completed_positions, 1);
        assert_eq!(current.completed_rois, 1);
    }

    #[test]
    fn terminal_progress_is_returned_by_latest() {
        let state = CropJobState::new();
        state
            .submit_or_attach(
                "/workspace",
                "one".into(),
                job("one", CropRoiStatus::Queued),
            )
            .unwrap();
        state
            .update_progress("one", progress("one", CropRoiStatus::Completed))
            .unwrap();
        assert_eq!(
            state.latest("/workspace").unwrap().unwrap().progress.status,
            CropRoiStatus::Completed
        );
    }
}
