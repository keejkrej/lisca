use std::sync::Arc;

use lisca::protocol::CropRoiProgress;
use lisca_server_common::KeyedRuns;

#[derive(Clone)]
pub struct CropJob {
    pub progress: CropRoiProgress,
    pub cancel: Arc<std::sync::atomic::AtomicBool>,
}

pub type CropJobState = KeyedRuns<CropJob>;

pub trait HasCropJobs: Clone + Send + Sync + 'static {
    fn crop_jobs(&self) -> &CropJobState;
}
