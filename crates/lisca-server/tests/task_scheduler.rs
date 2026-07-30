use std::time::Duration;

use lisca_server::{
    OperationSpec, SchedulerConfig, SchedulerError, TaskFailure, TaskScheduler, TaskSpec,
};
use tokio::sync::{mpsc, oneshot};

struct StartedTask {
    label: &'static str,
    weight: u32,
    finish: oneshot::Sender<Result<(), TaskFailure>>,
}

fn controlled_task(
    label: &'static str,
    weight: u32,
    started: mpsc::UnboundedSender<StartedTask>,
) -> TaskSpec {
    TaskSpec::new(label, weight, move |_context| {
        let started = started.clone();
        async move {
            let (finish, wait) = oneshot::channel();
            started
                .send(StartedTask {
                    label,
                    weight,
                    finish,
                })
                .map_err(|_| TaskFailure::new("harness_closed", "test harness closed"))?;
            wait.await
                .map_err(|_| TaskFailure::new("harness_closed", "test completion dropped"))?
        }
    })
}

async fn next_started(rx: &mut mpsc::UnboundedReceiver<StartedTask>) -> StartedTask {
    tokio::time::timeout(Duration::from_secs(2), rx.recv())
        .await
        .expect("task should start without a scheduling sleep")
        .expect("scheduler should retain the task")
}

fn cancellable_task(label: &'static str, started: mpsc::UnboundedSender<&'static str>) -> TaskSpec {
    TaskSpec::new(label, 1, move |mut context| {
        let started = started.clone();
        async move {
            started
                .send(label)
                .map_err(|_| TaskFailure::new("harness_closed", "test harness closed"))?;
            context.cancelled().await;
            context.checkpoint()
        }
    })
}

async fn next_cancellable_started(rx: &mut mpsc::UnboundedReceiver<&'static str>) -> &'static str {
    tokio::time::timeout(Duration::from_secs(2), rx.recv())
        .await
        .expect("cancellable task should start")
        .expect("scheduler should retain the cancellable task")
}

#[tokio::test]
async fn running_tasks_publish_fine_grained_progress_to_detail_and_summary() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();
    let (reported_tx, mut reported_rx) = mpsc::unbounded_channel();
    let (finish_tx, finish_rx) = oneshot::channel();
    let finish = std::sync::Arc::new(std::sync::Mutex::new(Some(finish_rx)));
    let task = TaskSpec::new("crop-roi/Pos4", 1, move |context| {
        let reported = reported_tx.clone();
        let finish = finish.lock().unwrap().take().unwrap();
        async move {
            context.report_work_progress(
                "roiframe",
                1200,
                1800,
                Some("writing".to_string()),
                Some("Writing Pos4".to_string()),
            )?;
            reported.send(()).unwrap();
            finish
                .await
                .map_err(|_| TaskFailure::new("harness_closed", "finish dropped"))?
        }
    });
    let operation = scheduler
        .submit(OperationSpec::new(
            "crop-roi",
            "/workspace/progress",
            true,
            vec![task],
        ))
        .unwrap();

    reported_rx.recv().await.unwrap();
    let running = scheduler
        .operation(&operation.operation.operation_id)
        .unwrap();
    assert_eq!(running.operation.progress.completed, 0);
    assert_eq!(running.operation.progress.running, 1);
    assert_eq!(
        running.operation.active_task_kind.as_deref(),
        Some("crop-roi/Pos4")
    );
    let progress = running.operation.work_progress.as_ref().unwrap();
    assert_eq!(progress.completed, 1200);
    assert_eq!(progress.total, 1800);
    assert_eq!(
        running.tasks[0].work_progress.as_ref().unwrap().completed,
        progress.completed
    );

    finish_tx.send(Ok(())).unwrap();
    scheduler
        .wait_for_operation_terminal(&operation.operation.operation_id)
        .await
        .unwrap();
}

#[tokio::test]
async fn weighted_capacity_rejects_invalid_work_and_never_overcommits() {
    assert!(matches!(
        TaskScheduler::new(SchedulerConfig {
            capacity: 1,
            history_cap: 0,
        }),
        Err(SchedulerError::InvalidHistoryCap)
    ));

    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 3,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    let zero = scheduler.submit(OperationSpec::new(
        "invalid",
        "/workspace/zero",
        true,
        vec![controlled_task("zero", 0, started_tx.clone())],
    ));
    assert!(matches!(zero, Err(SchedulerError::InvalidWeight { .. })));

    let oversized = scheduler.submit(OperationSpec::new(
        "invalid",
        "/workspace/oversized",
        true,
        vec![controlled_task("oversized", 4, started_tx.clone())],
    ));
    assert!(matches!(
        oversized,
        Err(SchedulerError::InvalidWeight { .. })
    ));

    let operation = scheduler
        .submit(OperationSpec::new(
            "weighted",
            "/workspace/weighted",
            true,
            vec![
                controlled_task("two", 2, started_tx.clone()),
                controlled_task("one", 1, started_tx.clone()),
                controlled_task("queued", 1, started_tx),
            ],
        ))
        .unwrap();

    let first = next_started(&mut started_rx).await;
    let second = next_started(&mut started_rx).await;
    assert_eq!(first.weight + second.weight, 3);
    let detail = scheduler
        .operation(&operation.operation.operation_id)
        .unwrap();
    assert_eq!(detail.operation.progress.running, 2);
    assert_eq!(detail.operation.progress.queued, 1);

    second.finish.send(Ok(())).unwrap();
    let third = next_started(&mut started_rx).await;
    assert_eq!(third.label, "queued");
    first.finish.send(Ok(())).unwrap();
    third.finish.send(Ok(())).unwrap();
    scheduler
        .wait_for_operation_terminal(&operation.operation.operation_id)
        .await
        .unwrap();
}

#[tokio::test]
async fn operations_are_round_robin_and_tasks_are_fifo() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    let first_operation = scheduler
        .submit(OperationSpec::new(
            "first",
            "/workspace/first",
            true,
            vec![
                controlled_task("first-1", 1, started_tx.clone()),
                controlled_task("first-2", 1, started_tx.clone()),
            ],
        ))
        .unwrap();
    let first = next_started(&mut started_rx).await;
    assert_eq!(first.label, "first-1");

    scheduler
        .submit(OperationSpec::new(
            "second",
            "/workspace/second",
            true,
            vec![controlled_task("second-1", 1, started_tx)],
        ))
        .unwrap();

    first.finish.send(Ok(())).unwrap();
    let second = next_started(&mut started_rx).await;
    assert_eq!(second.label, "second-1");
    second.finish.send(Ok(())).unwrap();
    let third = next_started(&mut started_rx).await;
    assert_eq!(third.label, "first-2");
    third.finish.send(Ok(())).unwrap();
    scheduler
        .wait_for_operation_terminal(&first_operation.operation.operation_id)
        .await
        .unwrap();
}

#[tokio::test]
async fn a_lighter_later_task_does_not_bypass_fifo_when_capacity_is_fragmented() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 3,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    scheduler
        .submit(OperationSpec::new(
            "blocker",
            "/workspace/blocker",
            true,
            vec![controlled_task("blocker", 2, started_tx.clone())],
        ))
        .unwrap();
    let blocker = next_started(&mut started_rx).await;

    scheduler
        .submit(OperationSpec::new(
            "fifo",
            "/workspace/fifo",
            true,
            vec![
                controlled_task("fifo-heavy", 2, started_tx.clone()),
                controlled_task("fifo-light", 1, started_tx.clone()),
            ],
        ))
        .unwrap();
    scheduler
        .submit(OperationSpec::new(
            "other",
            "/workspace/other-light",
            true,
            vec![controlled_task("other-light", 1, started_tx)],
        ))
        .unwrap();
    let other = next_started(&mut started_rx).await;
    assert_eq!(other.label, "other-light");

    blocker.finish.send(Ok(())).unwrap();
    let heavy = next_started(&mut started_rx).await;
    assert_eq!(heavy.label, "fifo-heavy");
    other.finish.send(Ok(())).unwrap();
    let light = next_started(&mut started_rx).await;
    assert_eq!(light.label, "fifo-light");
    heavy.finish.send(Ok(())).unwrap();
    light.finish.send(Ok(())).unwrap();
}

#[tokio::test]
async fn a_workspace_admits_one_mutating_operation_while_other_workspaces_progress() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 2,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    let first = scheduler
        .submit(OperationSpec::new(
            "same-first",
            " /workspace/same ",
            true,
            vec![controlled_task("same-first", 1, started_tx.clone())],
        ))
        .unwrap();
    let first_started = next_started(&mut started_rx).await;

    scheduler
        .submit(OperationSpec::new(
            "same-second",
            "/workspace/same",
            true,
            vec![controlled_task("same-second", 1, started_tx.clone())],
        ))
        .unwrap();
    scheduler
        .submit(OperationSpec::new(
            "other",
            "/workspace/other",
            true,
            vec![controlled_task("other", 1, started_tx)],
        ))
        .unwrap();

    let other = next_started(&mut started_rx).await;
    assert_eq!(other.label, "other");
    first_started.finish.send(Ok(())).unwrap();
    scheduler
        .wait_for_operation_terminal(&first.operation.operation_id)
        .await
        .unwrap();
    let same_second = next_started(&mut started_rx).await;
    assert_eq!(same_second.label, "same-second");
    other.finish.send(Ok(())).unwrap();
    same_second.finish.send(Ok(())).unwrap();
}

#[tokio::test]
async fn nonexistent_workspace_aliases_share_one_admission_key() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 2,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();
    let unique = format!("lisca-missing-scheduler-workspace-{}", uuid::Uuid::new_v4());

    let first = scheduler
        .submit(OperationSpec::new(
            "alias-first",
            format!("./{unique}/positions"),
            true,
            vec![controlled_task("alias-first", 1, started_tx.clone())],
        ))
        .unwrap();
    let first_started = next_started(&mut started_rx).await;

    scheduler
        .submit(OperationSpec::new(
            "alias-second",
            format!("{unique}/discarded/../positions"),
            true,
            vec![controlled_task("alias-second", 1, started_tx.clone())],
        ))
        .unwrap();
    scheduler
        .submit(OperationSpec::new(
            "other",
            format!("./{unique}-other"),
            true,
            vec![controlled_task("other", 1, started_tx)],
        ))
        .unwrap();

    let other = next_started(&mut started_rx).await;
    assert_eq!(other.label, "other");
    first_started.finish.send(Ok(())).unwrap();
    scheduler
        .wait_for_operation_terminal(&first.operation.operation_id)
        .await
        .unwrap();
    let second = next_started(&mut started_rx).await;
    assert_eq!(second.label, "alias-second");
    other.finish.send(Ok(())).unwrap();
    second.finish.send(Ok(())).unwrap();
}

#[tokio::test]
async fn panicking_handler_fails_its_attempt_and_releases_capacity_and_workspace() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();
    let unique = format!("panic-{}", uuid::Uuid::new_v4());
    let workspace = format!("/workspace/{unique}");

    let panicking = scheduler
        .submit(OperationSpec::new(
            "panicking",
            &workspace,
            true,
            vec![TaskSpec::new("panic", 1, |_context| async move {
                panic!("private panic payload must not escape");
            })],
        ))
        .unwrap();
    scheduler
        .submit(OperationSpec::new(
            "after-panic",
            format!("/workspace/./{unique}"),
            true,
            vec![controlled_task("after-panic", 1, started_tx)],
        ))
        .unwrap();

    let failed = tokio::time::timeout(
        Duration::from_secs(2),
        scheduler.wait_for_operation_terminal(&panicking.operation.operation_id),
    )
    .await
    .expect("panicking operation should settle")
    .unwrap();
    assert_eq!(
        failed.operation.status,
        lisca::protocol::OperationStatus::Failed
    );
    assert_eq!(failed.tasks[0].status, lisca::protocol::TaskStatus::Failed);
    let attempt = &failed.tasks[0].attempts[0];
    assert_eq!(attempt.status, lisca::protocol::TaskStatus::Failed);
    assert!(attempt.finished_at_ms.is_some());
    let error = attempt.error.as_ref().expect("panic should be structured");
    assert_eq!(error.code, "task_panicked");
    assert!(!error.message.contains("private panic payload"));

    let after_panic = next_started(&mut started_rx).await;
    assert_eq!(after_panic.label, "after-panic");
    after_panic.finish.send(Ok(())).unwrap();
}

#[tokio::test]
async fn terminal_history_is_capped_without_evicting_active_operations() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 1,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    for label in ["old", "recent"] {
        let operation = scheduler
            .submit(OperationSpec::new(
                label,
                format!("/workspace/{label}"),
                true,
                vec![controlled_task(label, 1, started_tx.clone())],
            ))
            .unwrap();
        let task = next_started(&mut started_rx).await;
        task.finish.send(Ok(())).unwrap();
        scheduler
            .wait_for_operation_terminal(&operation.operation.operation_id)
            .await
            .unwrap();
    }

    let active = scheduler
        .submit(OperationSpec::new(
            "active",
            "/workspace/active",
            true,
            vec![controlled_task("active", 1, started_tx)],
        ))
        .unwrap();
    let active_task = next_started(&mut started_rx).await;
    let listed = scheduler.list_operations().unwrap();
    assert_eq!(listed.len(), 2);
    assert_eq!(listed[0].operation_id, active.operation.operation_id);
    assert_eq!(listed[1].kind, "recent");
    assert!(listed.iter().all(|operation| operation.kind != "old"));
    active_task.finish.send(Ok(())).unwrap();
}

#[tokio::test]
async fn invalid_dependency_graphs_are_rejected_before_dispatch() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();

    let missing = TaskSpec::new("missing-dependent", 1, |_context| async { Ok(()) })
        .with_dependencies(["does-not-exist"]);
    assert!(matches!(
        scheduler.submit(OperationSpec::new(
            "missing",
            "/workspace/missing",
            true,
            vec![missing]
        )),
        Err(SchedulerError::MissingDependency { .. })
    ));

    let first = TaskSpec::new("cycle-first", 1, |_context| async { Ok(()) });
    let second = TaskSpec::new("cycle-second", 1, |_context| async { Ok(()) });
    let first_id = first.task_id().to_string();
    let second_id = second.task_id().to_string();
    let first = first.with_dependencies([second_id]);
    let second = second.with_dependencies([first_id]);
    assert!(matches!(
        scheduler.submit(OperationSpec::new(
            "cycle",
            "/workspace/cycle",
            true,
            vec![first, second]
        )),
        Err(SchedulerError::CyclicDependency { .. })
    ));

    let (started_tx, mut started_rx) = mpsc::unbounded_channel();
    let owned = controlled_task("owned", 1, started_tx);
    let owned_id = owned.task_id().to_string();
    scheduler
        .submit(OperationSpec::new(
            "owner",
            "/workspace/owner",
            true,
            vec![owned],
        ))
        .unwrap();
    let running = next_started(&mut started_rx).await;
    let foreign = TaskSpec::new("foreign-dependent", 1, |_context| async { Ok(()) })
        .with_dependencies([owned_id]);
    assert!(matches!(
        scheduler.submit(OperationSpec::new(
            "foreign",
            "/workspace/foreign",
            true,
            vec![foreign]
        )),
        Err(SchedulerError::CrossOperationDependency { .. })
    ));
    running.finish.send(Ok(())).unwrap();
}

#[tokio::test]
async fn fan_out_and_fan_in_wait_for_success_and_preserve_ready_fifo() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 2,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    let root = controlled_task("root", 1, started_tx.clone());
    let root_id = root.task_id().to_string();
    let branch_first =
        controlled_task("branch-first", 1, started_tx.clone()).with_dependencies([root_id.clone()]);
    let branch_first_id = branch_first.task_id().to_string();
    let branch_second =
        controlled_task("branch-second", 1, started_tx.clone()).with_dependencies([root_id]);
    let branch_second_id = branch_second.task_id().to_string();
    let aggregate = controlled_task("aggregate", 1, started_tx)
        .with_dependencies([branch_first_id, branch_second_id]);
    let operation = scheduler
        .submit(OperationSpec::new(
            "fan-out-in",
            "/workspace/fan-out-in",
            true,
            vec![root, branch_first, branch_second, aggregate],
        ))
        .unwrap();

    let root = next_started(&mut started_rx).await;
    assert_eq!(root.label, "root");
    let waiting = scheduler
        .operation(&operation.operation.operation_id)
        .unwrap();
    assert_eq!(waiting.operation.progress.running, 1);
    assert_eq!(waiting.operation.progress.blocked, 3);
    root.finish.send(Ok(())).unwrap();

    let first = next_started(&mut started_rx).await;
    let second = next_started(&mut started_rx).await;
    assert_eq!(
        (first.label, second.label),
        ("branch-first", "branch-second")
    );
    let still_waiting = scheduler
        .operation(&operation.operation.operation_id)
        .unwrap();
    assert_eq!(still_waiting.operation.progress.blocked, 1);
    assert_eq!(still_waiting.operation.progress.completed, 1);
    assert_eq!(still_waiting.operation.progress.running, 2);
    second.finish.send(Ok(())).unwrap();
    first.finish.send(Ok(())).unwrap();

    let aggregate = next_started(&mut started_rx).await;
    assert_eq!(aggregate.label, "aggregate");
    aggregate.finish.send(Ok(())).unwrap();
    let completed = scheduler
        .wait_for_operation_terminal(&operation.operation.operation_id)
        .await
        .unwrap();
    assert_eq!(
        completed.operation.status,
        lisca::protocol::OperationStatus::Completed
    );
    assert_eq!(completed.operation.progress.completed, 4);
}

#[tokio::test]
async fn failed_branch_blocks_descendants_while_siblings_continue_with_partial_progress() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 2,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    let failing = controlled_task("failing", 1, started_tx.clone());
    let failing_id = failing.task_id().to_string();
    let sibling = controlled_task("sibling", 1, started_tx.clone());
    let sibling_id = sibling.task_id().to_string();
    let blocked_child = controlled_task("blocked-child", 1, started_tx.clone())
        .with_dependencies([failing_id.clone()]);
    let blocked_child_id = blocked_child.task_id().to_string();
    let blocked_descendant = controlled_task("blocked-descendant", 1, started_tx.clone())
        .with_dependencies([blocked_child_id]);
    let sibling_child =
        controlled_task("sibling-child", 1, started_tx).with_dependencies([sibling_id]);
    let operation = scheduler
        .submit(OperationSpec::new(
            "partial",
            "/workspace/partial",
            true,
            vec![
                failing,
                sibling,
                blocked_child,
                blocked_descendant,
                sibling_child,
            ],
        ))
        .unwrap();

    let failing = next_started(&mut started_rx).await;
    let sibling = next_started(&mut started_rx).await;
    assert_eq!((failing.label, sibling.label), ("failing", "sibling"));
    failing
        .finish
        .send(Err(TaskFailure::new(
            "bad_input",
            "branch input is invalid",
        )))
        .unwrap();
    sibling.finish.send(Ok(())).unwrap();

    let sibling_child = next_started(&mut started_rx).await;
    assert_eq!(sibling_child.label, "sibling-child");
    sibling_child.finish.send(Ok(())).unwrap();
    let partial = scheduler
        .wait_for_operation_terminal(&operation.operation.operation_id)
        .await
        .unwrap();

    assert_eq!(
        partial.operation.status,
        lisca::protocol::OperationStatus::PartiallyComplete
    );
    assert_eq!(partial.operation.progress.completed, 2);
    assert_eq!(partial.operation.progress.failed, 1);
    assert_eq!(partial.operation.progress.blocked, 2);
    assert_eq!(partial.operation.progress.total, 5);

    let child = partial
        .tasks
        .iter()
        .find(|task| task.task_kind == "blocked-child")
        .unwrap();
    assert_eq!(child.status, lisca::protocol::TaskStatus::Blocked);
    assert_eq!(child.blocked_by.len(), 1);
    assert_eq!(child.blocked_by[0].task_id, failing_id);
    assert_eq!(
        child.blocked_by[0].status,
        lisca::protocol::TaskStatus::Failed
    );
    assert_eq!(
        child.blocked_by[0].error.as_ref().unwrap().code,
        "bad_input"
    );

    let descendant = partial
        .tasks
        .iter()
        .find(|task| task.task_kind == "blocked-descendant")
        .unwrap();
    assert_eq!(descendant.status, lisca::protocol::TaskStatus::Blocked);
    assert_eq!(descendant.blocked_by.len(), 1);
    assert_eq!(descendant.blocked_by[0].task_id, failing_id);
    assert!(started_rx.try_recv().is_err());
}

#[tokio::test]
async fn queued_and_blocked_cancellation_is_immediate_and_preserves_siblings() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    let running = controlled_task("running-sibling", 1, started_tx.clone());
    let queued = controlled_task("cancel-queued", 1, started_tx.clone());
    let queued_id = queued.task_id().to_string();
    let operation = scheduler
        .submit(OperationSpec::new(
            "queued-cancel",
            "/workspace/queued-cancel",
            true,
            vec![running, queued],
        ))
        .unwrap();
    let running = next_started(&mut started_rx).await;

    let cancelled = scheduler.cancel_task(&queued_id).unwrap();
    let queued = cancelled
        .tasks
        .iter()
        .find(|task| task.task_id == queued_id)
        .unwrap();
    assert_eq!(queued.status, lisca::protocol::TaskStatus::Cancelled);
    assert!(queued.attempts[0].finished_at_ms.is_some());
    let again = scheduler.cancel_task(&queued_id).unwrap();
    assert_eq!(
        again.tasks[1].status,
        lisca::protocol::TaskStatus::Cancelled
    );

    running.finish.send(Ok(())).unwrap();
    let terminal = scheduler
        .wait_for_operation_terminal(&operation.operation.operation_id)
        .await
        .unwrap();
    assert_eq!(terminal.operation.progress.completed, 1);
    assert_eq!(terminal.operation.progress.cancelled, 1);
    assert!(started_rx.try_recv().is_err());

    let root = controlled_task("root", 1, started_tx.clone());
    let root_id = root.task_id().to_string();
    let blocked = controlled_task("cancel-blocked", 1, started_tx).with_dependencies([root_id]);
    let blocked_id = blocked.task_id().to_string();
    let operation = scheduler
        .submit(OperationSpec::new(
            "blocked-cancel",
            "/workspace/blocked-cancel",
            true,
            vec![root, blocked],
        ))
        .unwrap();
    let root = next_started(&mut started_rx).await;
    let cancelled = scheduler.cancel_task(&blocked_id).unwrap();
    assert_eq!(
        cancelled.tasks[1].status,
        lisca::protocol::TaskStatus::Cancelled
    );
    root.finish.send(Ok(())).unwrap();
    let terminal = scheduler
        .wait_for_operation_terminal(&operation.operation.operation_id)
        .await
        .unwrap();
    assert_eq!(terminal.operation.progress.completed, 1);
    assert_eq!(terminal.operation.progress.cancelled, 1);
    assert!(started_rx.try_recv().is_err());
}

#[tokio::test]
async fn running_and_operation_wide_cancellation_is_cooperative() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 2,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    let individual = cancellable_task("individual", started_tx.clone());
    let individual_id = individual.task_id().to_string();
    let individual_operation = scheduler
        .submit(OperationSpec::new(
            "individual-cancel",
            "/workspace/individual-cancel",
            true,
            vec![individual],
        ))
        .unwrap();
    assert_eq!(
        next_cancellable_started(&mut started_rx).await,
        "individual"
    );
    let requested = scheduler.cancel_task(&individual_id).unwrap();
    assert_eq!(
        requested.tasks[0].status,
        lisca::protocol::TaskStatus::CancellationRequested
    );
    assert_eq!(
        requested.operation.status,
        lisca::protocol::OperationStatus::CancellationRequested
    );
    let individual_terminal = scheduler
        .wait_for_operation_terminal(&individual_operation.operation.operation_id)
        .await
        .unwrap();
    assert_eq!(
        individual_terminal.tasks[0].status,
        lisca::protocol::TaskStatus::Cancelled
    );

    let first = cancellable_task("first", started_tx.clone());
    let second = cancellable_task("second", started_tx.clone());
    let queued = cancellable_task("queued", started_tx);
    let operation = scheduler
        .submit(OperationSpec::new(
            "operation-cancel",
            "/workspace/operation-cancel",
            true,
            vec![first, second, queued],
        ))
        .unwrap();
    assert_eq!(next_cancellable_started(&mut started_rx).await, "first");
    assert_eq!(next_cancellable_started(&mut started_rx).await, "second");

    let requested = scheduler
        .cancel_operation(&operation.operation.operation_id)
        .unwrap();
    assert_eq!(requested.operation.progress.cancellation_requested, 2);
    assert_eq!(requested.operation.progress.cancelled, 1);

    let terminal = scheduler
        .wait_for_operation_terminal(&operation.operation.operation_id)
        .await
        .unwrap();
    assert_eq!(
        terminal.operation.status,
        lisca::protocol::OperationStatus::Cancelled
    );
    assert_eq!(terminal.operation.progress.cancelled, 3);
    assert!(terminal
        .tasks
        .iter()
        .flat_map(|task| &task.attempts)
        .all(|attempt| attempt.finished_at_ms.is_some()));
    assert!(started_rx.try_recv().is_err());
}

#[tokio::test]
async fn retry_preserves_attempt_history_and_unblocks_dependencies_without_double_counting() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();
    let root = controlled_task("retry-root", 1, started_tx.clone());
    let root_id = root.task_id().to_string();
    let dependent =
        controlled_task("dependent", 1, started_tx).with_dependencies([root_id.clone()]);
    let operation = scheduler
        .submit(OperationSpec::new(
            "retry-graph",
            "/workspace/retry-graph",
            true,
            vec![root, dependent],
        ))
        .unwrap();

    let first = next_started(&mut started_rx).await;
    first
        .finish
        .send(Err(TaskFailure::new("transient", "try again")))
        .unwrap();
    let failed = scheduler
        .wait_for_operation_terminal(&operation.operation.operation_id)
        .await
        .unwrap();
    assert_eq!(failed.operation.progress.failed, 1);
    assert_eq!(failed.operation.progress.blocked, 1);
    let first_attempt_id = failed.tasks[0].attempts[0].attempt_id.clone();
    assert_eq!(
        failed.tasks[0].attempts[0].error.as_ref().unwrap().code,
        "transient"
    );

    let retried = scheduler.retry_task(&root_id).unwrap();
    assert_eq!(retried.operation.progress.total, 2);
    assert_eq!(retried.operation.progress.queued, 1);
    assert_eq!(retried.operation.progress.blocked, 1);
    assert_eq!(retried.operation.progress.failed, 0);
    assert_eq!(retried.tasks[0].attempts.len(), 2);
    assert_ne!(retried.tasks[0].attempts[1].attempt_id, first_attempt_id);
    assert!(retried.tasks[0].attempts[0].finished_at_ms.is_some());

    let retry = next_started(&mut started_rx).await;
    assert_eq!(retry.label, "retry-root");
    retry.finish.send(Ok(())).unwrap();
    let dependent = next_started(&mut started_rx).await;
    assert_eq!(dependent.label, "dependent");
    dependent.finish.send(Ok(())).unwrap();
    let completed = scheduler
        .wait_for_operation_terminal(&operation.operation.operation_id)
        .await
        .unwrap();
    assert_eq!(completed.operation.progress.total, 2);
    assert_eq!(completed.operation.progress.completed, 2);
    assert_eq!(completed.tasks[0].attempts.len(), 2);
    assert_eq!(
        completed.tasks[0].attempts[0].status,
        lisca::protocol::TaskStatus::Failed
    );
    assert_eq!(
        completed.tasks[0].attempts[1].status,
        lisca::protocol::TaskStatus::Completed
    );
}

#[tokio::test]
async fn cancellation_completion_races_and_invalid_transitions_settle_canonically() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();
    let task = controlled_task("race", 1, started_tx);
    let task_id = task.task_id().to_string();
    let operation = scheduler
        .submit(OperationSpec::new(
            "race",
            "/workspace/race",
            true,
            vec![task],
        ))
        .unwrap();
    let running = next_started(&mut started_rx).await;

    let requested = scheduler.cancel_task(&task_id).unwrap();
    assert_eq!(
        requested.tasks[0].status,
        lisca::protocol::TaskStatus::CancellationRequested
    );
    running.finish.send(Ok(())).unwrap();
    let completed = scheduler
        .wait_for_operation_terminal(&operation.operation.operation_id)
        .await
        .unwrap();
    assert_eq!(
        completed.tasks[0].status,
        lisca::protocol::TaskStatus::Completed
    );
    assert!(matches!(
        scheduler.cancel_task(&task_id),
        Err(SchedulerError::InvalidTransition { .. })
    ));
    assert!(matches!(
        scheduler.retry_task(&task_id),
        Err(SchedulerError::InvalidTransition { .. })
    ));
    assert!(matches!(
        scheduler.cancel_operation(&operation.operation.operation_id),
        Err(SchedulerError::InvalidTransition { .. })
    ));
    assert!(matches!(
        scheduler.cancel_task("missing"),
        Err(SchedulerError::NotFound { .. })
    ));
}

#[tokio::test]
async fn operation_update_timestamps_advance_strictly_for_rapid_mutations() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();
    let first = controlled_task("monotonic-first", 1, started_tx.clone());
    let second = controlled_task("monotonic-second", 1, started_tx);
    let second_id = second.task_id().to_string();
    let submitted = scheduler
        .submit(OperationSpec::new(
            "monotonic",
            "/workspace/monotonic",
            true,
            vec![first, second],
        ))
        .unwrap();
    let running = next_started(&mut started_rx).await;
    let after_dispatch = scheduler
        .operation(&submitted.operation.operation_id)
        .unwrap();
    let cancelled = scheduler.cancel_task(&second_id).unwrap();
    let retried = scheduler.retry_task(&second_id).unwrap();

    assert!(after_dispatch.operation.updated_at_ms > submitted.operation.updated_at_ms);
    assert!(cancelled.operation.updated_at_ms > after_dispatch.operation.updated_at_ms);
    assert!(retried.operation.updated_at_ms > cancelled.operation.updated_at_ms);

    running.finish.send(Ok(())).unwrap();
    let second = next_started(&mut started_rx).await;
    second.finish.send(Ok(())).unwrap();
}

#[tokio::test]
async fn retry_with_incomplete_dependencies_is_rejected_without_reactivating_the_operation() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();
    let root = controlled_task("failed-root", 1, started_tx.clone());
    let root_id = root.task_id().to_string();
    let dependent =
        controlled_task("cancelled-dependent", 1, started_tx.clone()).with_dependencies([root_id]);
    let dependent_id = dependent.task_id().to_string();
    let operation = scheduler
        .submit(OperationSpec::new(
            "dependency-retry-repro",
            "/workspace/dependency-retry-repro",
            true,
            vec![root, dependent],
        ))
        .unwrap();

    let root = next_started(&mut started_rx).await;
    root.finish
        .send(Err(TaskFailure::new("root_failed", "root failed")))
        .unwrap();
    scheduler
        .wait_for_operation_terminal(&operation.operation.operation_id)
        .await
        .unwrap();
    scheduler.cancel_task(&dependent_id).unwrap();

    let error = scheduler.retry_task(&dependent_id).unwrap_err();
    assert!(matches!(error, SchedulerError::InvalidTransition { .. }));
    assert!(error
        .to_string()
        .contains("dependencies must complete successfully before retry"));

    let unchanged = scheduler
        .operation(&operation.operation.operation_id)
        .unwrap();
    assert_eq!(
        unchanged.operation.status,
        lisca::protocol::OperationStatus::Failed
    );
    assert_eq!(
        unchanged.tasks[1].status,
        lisca::protocol::TaskStatus::Cancelled
    );
    assert_eq!(unchanged.tasks[1].attempts.len(), 1);
    assert!(scheduler
        .list_operations()
        .unwrap()
        .iter()
        .any(|listed| listed.operation_id == operation.operation.operation_id));

    scheduler
        .submit(OperationSpec::new(
            "same-workspace-next",
            "/workspace/dependency-retry-repro",
            true,
            vec![controlled_task("same-workspace-next", 1, started_tx)],
        ))
        .unwrap();
    let next = next_started(&mut started_rx).await;
    assert_eq!(next.label, "same-workspace-next");
    next.finish.send(Ok(())).unwrap();
}
