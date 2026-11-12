mod routes;

use axum::{
    routing::{get, post},
    Router,
};
use lisca_server::{task_router, HasTaskScheduler, SchedulerConfig, TaskScheduler};

pub use routes::router;

#[derive(Clone)]
struct AnnotatorState {
    tasks: TaskScheduler,
}

impl HasTaskScheduler for AnnotatorState {
    fn task_scheduler(&self) -> &TaskScheduler {
        &self.tasks
    }
}

/// Build the transport-neutral Annotator application.
pub fn app() -> Router {
    let state = AnnotatorState {
        tasks: TaskScheduler::new(SchedulerConfig::default())
            .expect("task scheduler requires a Tokio runtime"),
    };
    Router::new()
        .merge(lisca::http::fs::router())
        .merge(router())
        .merge(task_router())
        .route("/studio/label-free/health", get(lisca::inference::health))
        .route("/studio/label-free/key", post(lisca::inference::save_key))
        .route(
            "/studio/label-free/references",
            get(lisca::inference::list_references).post(lisca::inference::build_references),
        )
        .route(
            "/studio/label-free/classify",
            post(lisca::inference::classify),
        )
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    #[test]
    fn annotator_mounts_label_free_routes() {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime");
        runtime.block_on(async {
            let response = super::app()
                .oneshot(
                    Request::builder()
                        .method("GET")
                        .uri("/studio/label-free/health")
                        .body(Body::empty())
                        .expect("request"),
                )
                .await
                .expect("response");
            assert_eq!(response.status(), StatusCode::OK);
        });
    }
}
