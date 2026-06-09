use crate::protocol::{AnalysisProgress, AnalysisStage, AnalysisStatus};

pub fn analysis_progress(
    request_id: &str,
    stage: AnalysisStage,
    progress: f64,
    message: &str,
) -> AnalysisProgress {
    AnalysisProgress {
        request_id: request_id.to_string(),
        status: if stage == AnalysisStage::Completed {
            AnalysisStatus::Completed
        } else {
            AnalysisStatus::Running
        },
        stage,
        progress,
        message: Some(message.to_string()),
        result_files: Vec::new(),
        error: None,
    }
}

pub async fn run_blocking<F, T>(task: F) -> Result<T, String>
where
    F: FnOnce() -> Result<T, String> + Send + 'static,
    T: Send + 'static,
{
    tokio::task::spawn_blocking(task)
        .await
        .map_err(|error| format!("analysis task join failed: {error}"))?
}
