use std::{
    collections::HashMap,
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
    pub events: broadcast::Sender<CropRoiProgress>,
}

impl CropJobState {
    pub fn new() -> Self {
        Self {
            jobs: Arc::new(Mutex::new(HashMap::new())),
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
