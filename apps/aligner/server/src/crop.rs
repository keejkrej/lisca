use std::{
    collections::HashMap,
    path::Path,
    sync::{Arc, Mutex},
};

use lisca::protocol::CropRoiProgress;
use tokio::sync::broadcast;

#[derive(Clone)]
pub struct CropJob {
    pub progress: CropRoiProgress,
    pub cancel: Arc<std::sync::atomic::AtomicBool>,
}

#[derive(Clone)]
pub struct CropJobState {
    pub jobs: Arc<Mutex<HashMap<String, CropJob>>>,
    pub workspace_requests: Arc<Mutex<HashMap<String, String>>>,
    pub events: broadcast::Sender<CropRoiProgress>,
}

impl CropJobState {
    pub fn new() -> Self {
        Self {
            jobs: Arc::new(Mutex::new(HashMap::new())),
            workspace_requests: Arc::new(Mutex::new(HashMap::new())),
            events: broadcast::channel(128).0,
        }
    }
}

impl Default for CropJobState {
    fn default() -> Self {
        Self::new()
    }
}

pub trait HasCropJobs: Clone + Send + Sync + 'static {
    fn crop_jobs(&self) -> &CropJobState;
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
