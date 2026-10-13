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
    fn light_build_reports_itself_and_hides_classify() {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime");
        runtime.block_on(async {
            let health = super::app()
                .oneshot(
                    Request::builder()
                        .uri("/studio/label-free/health")
                        .body(Body::empty())
                        .expect("request"),
                )
                .await
                .expect("response");
            assert_eq!(health.status(), StatusCode::OK);
            let bytes = axum::body::to_bytes(health.into_body(), 8 * 1024)
                .await
                .expect("health body");
            let value: serde_json::Value = serde_json::from_slice(&bytes).expect("health json");
            assert_eq!(value["build"], "light");
            assert_eq!(value["runtime"], "embedded");

            let classify = super::app()
                .oneshot(
                    Request::builder()
                        .method("POST")
                        .uri("/studio/label-free/classify")
                        .header("content-type", "application/json")
                        .body(Body::from(
                            r#"{"workspacePath":"C:/assay","name":"annotations","limit":32}"#,
                        ))
                        .expect("request"),
                )
                .await
                .expect("response");
            assert_eq!(classify.status(), StatusCode::NOT_FOUND);
        });
    }
}
