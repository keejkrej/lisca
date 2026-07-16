use std::time::Duration;

use axum::{body::Body, http::Request};
use lisca_server::{
    task_router, HasTaskScheduler, OperationSpec, SchedulerConfig, TaskScheduler, TaskSpec,
};
use tower::ServiceExt;

#[derive(Clone)]
struct TestState {
    scheduler: TaskScheduler,
}

async fn response_body(response: axum::response::Response) -> String {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    String::from_utf8(body.to_vec()).unwrap()
}

impl HasTaskScheduler for TestState {
    fn task_scheduler(&self) -> &TaskScheduler {
        &self.scheduler
    }
}

#[tokio::test]
async fn list_route_projects_submitted_operations_from_shared_scheduler() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();
    let operation = scheduler
        .submit(OperationSpec::new(
            "router-test",
            "/workspace/router-test",
            true,
            vec![TaskSpec::new("pending", 1, |_context| {
                std::future::pending()
            })],
        ))
        .unwrap();
    let app = task_router::<TestState>().with_state(TestState { scheduler });

    let response = app
        .oneshot(
            Request::builder()
                .uri("/tasks/operations")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), axum::http::StatusCode::OK);
    let body = response_body(response).await;
    assert!(body.contains(&operation.operation.operation_id));
    assert!(body.contains("router-test"));
}

#[tokio::test]
async fn lifecycle_routes_return_canonical_projections_and_typed_transition_errors() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = tokio::sync::mpsc::unbounded_channel();
    let operation = scheduler
        .submit(OperationSpec::new(
            "router-lifecycle",
            "/workspace/router-lifecycle",
            true,
            vec![TaskSpec::new("pending", 1, move |_context| {
                let started = started_tx.clone();
                async move {
                    started.send(()).unwrap();
                    std::future::pending().await
                }
            })],
        ))
        .unwrap();
    tokio::time::timeout(Duration::from_secs(2), started_rx.recv())
        .await
        .unwrap()
        .unwrap();
    let task_id = operation.tasks[0].task_id.clone();
    let app = task_router::<TestState>().with_state(TestState { scheduler });

    let retry = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/tasks/task/retry")
                .header("content-type", "application/json")
                .body(Body::from(format!(r#"{{"taskId":"{task_id}"}}"#)))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(retry.status(), axum::http::StatusCode::CONFLICT);
    let retry_body = response_body(retry).await;
    assert!(retry_body.contains(r#""_tag":"TaskCommandError""#));
    assert!(retry_body.contains(r#""code":"invalid-transition""#));
    assert!(retry_body.contains(r#""currentStatus":"running""#));

    let cancel = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/tasks/operation/cancel")
                .header("content-type", "application/json")
                .body(Body::from(format!(
                    r#"{{"operationId":"{}"}}"#,
                    operation.operation.operation_id
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(cancel.status(), axum::http::StatusCode::OK);
    assert!(response_body(cancel)
        .await
        .contains("cancellation-requested"));

    let missing = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/tasks/task/cancel")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"taskId":"missing"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(missing.status(), axum::http::StatusCode::CONFLICT);
    let missing_body = response_body(missing).await;
    assert!(missing_body.contains(r#""code":"not-found""#));
    assert!(missing_body.contains(r#""entity":"task""#));
}
