mod analysis;
mod routes;

use aligner_server::{CropTaskState, HasCropTasks};
use axum::Router;
use lisca_server::{task_router, HasTaskScheduler, SchedulerConfig, TaskScheduler};

pub use analysis::{AnalysisTaskState, HasAnalysisTasks};
pub use routes::router;

#[derive(Clone)]
struct StudioState {
    crop: CropTaskState,
    analysis: AnalysisTaskState,
    tasks: TaskScheduler,
}

impl HasTaskScheduler for StudioState {
    fn task_scheduler(&self) -> &TaskScheduler {
        &self.tasks
    }
}

impl HasCropTasks for StudioState {
    fn crop_tasks(&self) -> &CropTaskState {
        &self.crop
    }
}

impl HasAnalysisTasks for StudioState {
    fn analysis_tasks(&self) -> &AnalysisTaskState {
        &self.analysis
    }
}

/// Build the transport-neutral Studio application.
pub fn app() -> Router {
    let state = StudioState {
        crop: CropTaskState::new(),
        analysis: AnalysisTaskState::new(),
        tasks: TaskScheduler::new(SchedulerConfig::default())
            .expect("task scheduler requires a Tokio runtime"),
    };
    Router::new()
        .merge(lisca::http::fs::router())
        .merge(lisca::http::profile::router())
        .merge(aligner_server::router())
        .merge(aligner_server::crop_router())
        .merge(router())
        .merge(annotator_server::router())
        .merge(task_router())
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    #[test]
    fn studio_mounts_openrouter_label_free_routes_and_saves_key() {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime");
        runtime.block_on(async {
            let save = super::app()
                .oneshot(
                    Request::builder()
                        .method("POST")
                        .uri("/studio/label-free/key")
                        .header("content-type", "application/json")
                        .body(Body::from(r#"{"apiKey":"sk-or-v1-test"}"#))
                        .expect("request"),
                )
                .await
                .expect("response");
            assert_eq!(save.status(), StatusCode::OK);
            let bytes = axum::body::to_bytes(save.into_body(), 8 * 1024)
                .await
                .expect("save body");
            let value: serde_json::Value = serde_json::from_slice(&bytes).expect("save json");
            assert_eq!(value["provider"], "openrouter");
            assert_eq!(value["configured"], true);
            assert_eq!(value["modelId"], "google/gemini-embedding-2");
        });
    }
}
