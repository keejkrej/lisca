use std::{
    collections::HashMap,
    path::Path,
    sync::{Arc, Mutex},
};

use lisca::protocol::AnalysisProgress;

#[derive(Clone)]
pub struct AnalysisJobState {
    pub jobs: Arc<Mutex<HashMap<String, AnalysisProgress>>>,
    pub workspace_requests: Arc<Mutex<HashMap<String, String>>>,
}

impl AnalysisJobState {
    pub fn new() -> Self {
        Self {
            jobs: Arc::new(Mutex::new(HashMap::new())),
            workspace_requests: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Default for AnalysisJobState {
    fn default() -> Self {
        Self::new()
    }
}

pub trait HasAnalysisJobs: Clone + Send + Sync + 'static {
    fn analysis_jobs(&self) -> &AnalysisJobState;
}

pub fn normalize_workspace_path(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    Path::new(trimmed)
        .canonicalize()
        .map(|path| path.to_string_lossy().into_owned())
        .unwrap_or_else(|_| trimmed.to_string())
}
