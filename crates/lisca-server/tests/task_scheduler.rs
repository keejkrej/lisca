use std::time::Duration;

use lisca_server::{
    SchedulerConfig, SchedulerError, StepFailure, StepSpec, TaskScheduler, TaskSpec,
};
use tokio::sync::{mpsc, oneshot};

struct StartedStep {
    label: &'static str,
    weight: u32,
    finish: oneshot::Sender<Result<(), StepFailure>>,
}

fn controlled_step(
    label: &'static str,
    weight: u32,
    started: mpsc::UnboundedSender<StartedStep>,
) -> StepSpec {
    StepSpec::new(label, weight, move |_context| {
        let started = started.clone();
        async move {
            let (finish, wait) = oneshot::channel();
            started
                .send(StartedStep {
                    label,
                    weight,
                    finish,
                })
                .map_err(|_| StepFailure::new("harness_closed", "test harness closed"))?;
            wait.await
                .map_err(|_| StepFailure::new("harness_closed", "test completion dropped"))?
        }
    })
}

async fn next_started(rx: &mut mpsc::UnboundedReceiver<StartedStep>) -> StartedStep {
    tokio::time::timeout(Duration::from_secs(2), rx.recv())
        .await
        .expect("step should start without a scheduling sleep")
        .expect("scheduler should retain the step")
}

fn cancellable_step(label: &'static str, started: mpsc::UnboundedSender<&'static str>) -> StepSpec {
    StepSpec::new(label, 1, move |mut context| {
        let started = started.clone();
        async move {
            started
                .send(label)
                .map_err(|_| StepFailure::new("harness_closed", "test harness closed"))?;
            context.cancelled().await;
            context.checkpoint()
        }
    })
}

async fn next_cancellable_started(rx: &mut mpsc::UnboundedReceiver<&'static str>) -> &'static str {
    tokio::time::timeout(Duration::from_secs(2), rx.recv())
        .await
        .expect("cancellable step should start")
        .expect("scheduler should retain the cancellable step")
}

#[tokio::test]
async fn running_steps_publish_fine_grained_progress_to_detail_and_summary() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();
    let (reported_tx, mut reported_rx) = mpsc::unbounded_channel();
    let (finish_tx, finish_rx) = oneshot::channel();
    let finish = std::sync::Arc::new(std::sync::Mutex::new(Some(finish_rx)));
    let step = StepSpec::new("crop-roi/Pos4", 1, move |context| {
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
                .map_err(|_| StepFailure::new("harness_closed", "finish dropped"))?
        }
    });
    let task = scheduler
        .submit(TaskSpec::new(
            "crop-roi",
            "/workspace/progress",
            true,
            vec![step],
        ))
        .unwrap();

    reported_rx.recv().await.unwrap();
    let running = scheduler.task(&task.task.task_id).unwrap();
    assert_eq!(running.task.progress.completed, 0);
    assert_eq!(running.task.progress.running, 1);
    assert_eq!(
        running.task.active_step_kind.as_deref(),
        Some("crop-roi/Pos4")
    );
    let progress = running.task.work_progress.as_ref().unwrap();
    assert_eq!(progress.completed, 1200);
    assert_eq!(progress.total, 1800);
    assert_eq!(
        running.steps[0].work_progress.as_ref().unwrap().completed,
        progress.completed
    );

    finish_tx.send(Ok(())).unwrap();
    scheduler
        .wait_for_task_terminal(&task.task.task_id)
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

    let zero = scheduler.submit(TaskSpec::new(
        "invalid",
        "/workspace/zero",
        true,
        vec![controlled_step("zero", 0, started_tx.clone())],
    ));
    assert!(matches!(zero, Err(SchedulerError::InvalidWeight { .. })));

    let oversized = scheduler.submit(TaskSpec::new(
        "invalid",
        "/workspace/oversized",
        true,
        vec![controlled_step("oversized", 4, started_tx.clone())],
    ));
    assert!(matches!(
        oversized,
        Err(SchedulerError::InvalidWeight { .. })
    ));

    let task = scheduler
        .submit(TaskSpec::new(
            "weighted",
            "/workspace/weighted",
            true,
            vec![
                controlled_step("two", 2, started_tx.clone()),
                controlled_step("one", 1, started_tx.clone()),
                controlled_step("queued", 1, started_tx),
            ],
        ))
        .unwrap();

    let first = next_started(&mut started_rx).await;
    let second = next_started(&mut started_rx).await;
    assert_eq!(first.weight + second.weight, 3);
    let detail = scheduler.task(&task.task.task_id).unwrap();
    assert_eq!(detail.task.progress.running, 2);
    assert_eq!(detail.task.progress.queued, 1);

    second.finish.send(Ok(())).unwrap();
    let third = next_started(&mut started_rx).await;
    assert_eq!(third.label, "queued");
    first.finish.send(Ok(())).unwrap();
    third.finish.send(Ok(())).unwrap();
    scheduler
        .wait_for_task_terminal(&task.task.task_id)
        .await
        .unwrap();
}

#[tokio::test]
async fn tasks_are_round_robin_and_steps_are_fifo() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    let first_task = scheduler
        .submit(TaskSpec::new(
            "first",
            "/workspace/first",
            true,
            vec![
                controlled_step("first-1", 1, started_tx.clone()),
                controlled_step("first-2", 1, started_tx.clone()),
            ],
        ))
        .unwrap();
    let first = next_started(&mut started_rx).await;
    assert_eq!(first.label, "first-1");

    scheduler
        .submit(TaskSpec::new(
            "second",
            "/workspace/second",
            true,
            vec![controlled_step("second-1", 1, started_tx)],
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
        .wait_for_task_terminal(&first_task.task.task_id)
        .await
        .unwrap();
}

#[tokio::test]
async fn a_lighter_later_step_does_not_bypass_fifo_when_capacity_is_fragmented() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 3,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    scheduler
        .submit(TaskSpec::new(
            "blocker",
            "/workspace/blocker",
            true,
            vec![controlled_step("blocker", 2, started_tx.clone())],
        ))
        .unwrap();
    let blocker = next_started(&mut started_rx).await;

    scheduler
        .submit(TaskSpec::new(
            "fifo",
            "/workspace/fifo",
            true,
            vec![
                controlled_step("fifo-heavy", 2, started_tx.clone()),
                controlled_step("fifo-light", 1, started_tx.clone()),
            ],
        ))
        .unwrap();
    scheduler
        .submit(TaskSpec::new(
            "other",
            "/workspace/other-light",
            true,
            vec![controlled_step("other-light", 1, started_tx)],
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
async fn a_workspace_admits_one_mutating_task_while_other_workspaces_progress() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 2,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    let first = scheduler
        .submit(TaskSpec::new(
            "same-first",
            " /workspace/same ",
            true,
            vec![controlled_step("same-first", 1, started_tx.clone())],
        ))
        .unwrap();
    let first_started = next_started(&mut started_rx).await;

    scheduler
        .submit(TaskSpec::new(
            "same-second",
            "/workspace/same",
            true,
            vec![controlled_step("same-second", 1, started_tx.clone())],
        ))
        .unwrap();
    scheduler
        .submit(TaskSpec::new(
            "other",
            "/workspace/other",
            true,
            vec![controlled_step("other", 1, started_tx)],
        ))
        .unwrap();

    let other = next_started(&mut started_rx).await;
    assert_eq!(other.label, "other");
    first_started.finish.send(Ok(())).unwrap();
    scheduler
        .wait_for_task_terminal(&first.task.task_id)
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
        .submit(TaskSpec::new(
            "alias-first",
            format!("./{unique}/positions"),
            true,
            vec![controlled_step("alias-first", 1, started_tx.clone())],
        ))
        .unwrap();
    let first_started = next_started(&mut started_rx).await;

    scheduler
        .submit(TaskSpec::new(
            "alias-second",
            format!("{unique}/discarded/../positions"),
            true,
            vec![controlled_step("alias-second", 1, started_tx.clone())],
        ))
        .unwrap();
    scheduler
        .submit(TaskSpec::new(
            "other",
            format!("./{unique}-other"),
            true,
            vec![controlled_step("other", 1, started_tx)],
        ))
        .unwrap();

    let other = next_started(&mut started_rx).await;
    assert_eq!(other.label, "other");
    first_started.finish.send(Ok(())).unwrap();
    scheduler
        .wait_for_task_terminal(&first.task.task_id)
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
        .submit(TaskSpec::new(
            "panicking",
            &workspace,
            true,
            vec![StepSpec::new("panic", 1, |_context| async move {
                panic!("private panic payload must not escape");
            })],
        ))
        .unwrap();
    scheduler
        .submit(TaskSpec::new(
            "after-panic",
            format!("/workspace/./{unique}"),
            true,
            vec![controlled_step("after-panic", 1, started_tx)],
        ))
        .unwrap();

    let failed = tokio::time::timeout(
        Duration::from_secs(2),
        scheduler.wait_for_task_terminal(&panicking.task.task_id),
    )
    .await
    .expect("panicking task should settle")
    .unwrap();
    assert_eq!(failed.task.status, lisca::protocol::TaskStatus::Failed);
    assert_eq!(failed.steps[0].status, lisca::protocol::StepStatus::Failed);
    let attempt = &failed.steps[0].attempts[0];
    assert_eq!(attempt.status, lisca::protocol::StepStatus::Failed);
    assert!(attempt.finished_at_ms.is_some());
    let error = attempt.error.as_ref().expect("panic should be structured");
    assert_eq!(error.code, "step_panicked");
    assert!(!error.message.contains("private panic payload"));

    let after_panic = next_started(&mut started_rx).await;
    assert_eq!(after_panic.label, "after-panic");
    after_panic.finish.send(Ok(())).unwrap();
}

#[tokio::test]
async fn terminal_history_is_capped_without_evicting_active_tasks() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 1,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    for label in ["old", "recent"] {
        let task = scheduler
            .submit(TaskSpec::new(
                label,
                format!("/workspace/{label}"),
                true,
                vec![controlled_step(label, 1, started_tx.clone())],
            ))
            .unwrap();
        let step = next_started(&mut started_rx).await;
        step.finish.send(Ok(())).unwrap();
        scheduler
            .wait_for_task_terminal(&task.task.task_id)
            .await
            .unwrap();
    }

    let active = scheduler
        .submit(TaskSpec::new(
            "active",
            "/workspace/active",
            true,
            vec![controlled_step("active", 1, started_tx)],
        ))
        .unwrap();
    let active_step = next_started(&mut started_rx).await;
    let listed = scheduler.list_tasks().unwrap();
    assert_eq!(listed.len(), 2);
    assert_eq!(listed[0].task_id, active.task.task_id);
    assert_eq!(listed[1].kind, "recent");
    assert!(listed.iter().all(|task| task.kind != "old"));
    active_step.finish.send(Ok(())).unwrap();
}

#[tokio::test]
async fn invalid_dependency_graphs_are_rejected_before_dispatch() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();

    let missing = StepSpec::new("missing-dependent", 1, |_context| async { Ok(()) })
        .with_dependencies(["does-not-exist"]);
    assert!(matches!(
        scheduler.submit(TaskSpec::new(
            "missing",
            "/workspace/missing",
            true,
            vec![missing]
        )),
        Err(SchedulerError::MissingDependency { .. })
    ));

    let first = StepSpec::new("cycle-first", 1, |_context| async { Ok(()) });
    let second = StepSpec::new("cycle-second", 1, |_context| async { Ok(()) });
    let first_id = first.step_id().to_string();
    let second_id = second.step_id().to_string();
    let first = first.with_dependencies([second_id]);
    let second = second.with_dependencies([first_id]);
    assert!(matches!(
        scheduler.submit(TaskSpec::new(
            "cycle",
            "/workspace/cycle",
            true,
            vec![first, second]
        )),
        Err(SchedulerError::CyclicDependency { .. })
    ));

    let (started_tx, mut started_rx) = mpsc::unbounded_channel();
    let owned = controlled_step("owned", 1, started_tx);
    let owned_id = owned.step_id().to_string();
    scheduler
        .submit(TaskSpec::new(
            "owner",
            "/workspace/owner",
            true,
            vec![owned],
        ))
        .unwrap();
    let running = next_started(&mut started_rx).await;
    let foreign = StepSpec::new("foreign-dependent", 1, |_context| async { Ok(()) })
        .with_dependencies([owned_id]);
    assert!(matches!(
        scheduler.submit(TaskSpec::new(
            "foreign",
            "/workspace/foreign",
            true,
            vec![foreign]
        )),
        Err(SchedulerError::CrossTaskDependency { .. })
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

    let root = controlled_step("root", 1, started_tx.clone());
    let root_id = root.step_id().to_string();
    let branch_first =
        controlled_step("branch-first", 1, started_tx.clone()).with_dependencies([root_id.clone()]);
    let branch_first_id = branch_first.step_id().to_string();
    let branch_second =
        controlled_step("branch-second", 1, started_tx.clone()).with_dependencies([root_id]);
    let branch_second_id = branch_second.step_id().to_string();
    let aggregate = controlled_step("aggregate", 1, started_tx)
        .with_dependencies([branch_first_id, branch_second_id]);
    let task = scheduler
        .submit(TaskSpec::new(
            "fan-out-in",
            "/workspace/fan-out-in",
            true,
            vec![root, branch_first, branch_second, aggregate],
        ))
        .unwrap();

    let root = next_started(&mut started_rx).await;
    assert_eq!(root.label, "root");
    let waiting = scheduler.task(&task.task.task_id).unwrap();
    assert_eq!(waiting.task.progress.running, 1);
    assert_eq!(waiting.task.progress.blocked, 3);
    root.finish.send(Ok(())).unwrap();

    let first = next_started(&mut started_rx).await;
    let second = next_started(&mut started_rx).await;
    assert_eq!(
        (first.label, second.label),
        ("branch-first", "branch-second")
    );
    let still_waiting = scheduler.task(&task.task.task_id).unwrap();
    assert_eq!(still_waiting.task.progress.blocked, 1);
    assert_eq!(still_waiting.task.progress.completed, 1);
    assert_eq!(still_waiting.task.progress.running, 2);
    second.finish.send(Ok(())).unwrap();
    first.finish.send(Ok(())).unwrap();

    let aggregate = next_started(&mut started_rx).await;
    assert_eq!(aggregate.label, "aggregate");
    aggregate.finish.send(Ok(())).unwrap();
    let completed = scheduler
        .wait_for_task_terminal(&task.task.task_id)
        .await
        .unwrap();
    assert_eq!(
        completed.task.status,
        lisca::protocol::TaskStatus::Completed
    );
    assert_eq!(completed.task.progress.completed, 4);
}

#[tokio::test]
async fn failed_branch_blocks_descendants_while_siblings_continue_with_partial_progress() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 2,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    let failing = controlled_step("failing", 1, started_tx.clone());
    let failing_id = failing.step_id().to_string();
    let sibling = controlled_step("sibling", 1, started_tx.clone());
    let sibling_id = sibling.step_id().to_string();
    let blocked_child = controlled_step("blocked-child", 1, started_tx.clone())
        .with_dependencies([failing_id.clone()]);
    let blocked_child_id = blocked_child.step_id().to_string();
    let blocked_descendant = controlled_step("blocked-descendant", 1, started_tx.clone())
        .with_dependencies([blocked_child_id]);
    let sibling_child =
        controlled_step("sibling-child", 1, started_tx).with_dependencies([sibling_id]);
    let task = scheduler
        .submit(TaskSpec::new(
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
        .send(Err(StepFailure::new(
            "bad_input",
            "branch input is invalid",
        )))
        .unwrap();
    sibling.finish.send(Ok(())).unwrap();

    let sibling_child = next_started(&mut started_rx).await;
    assert_eq!(sibling_child.label, "sibling-child");
    sibling_child.finish.send(Ok(())).unwrap();
    let partial = scheduler
        .wait_for_task_terminal(&task.task.task_id)
        .await
        .unwrap();

    assert_eq!(
        partial.task.status,
        lisca::protocol::TaskStatus::PartiallyComplete
    );
    assert_eq!(partial.task.progress.completed, 2);
    assert_eq!(partial.task.progress.failed, 1);
    assert_eq!(partial.task.progress.blocked, 2);
    assert_eq!(partial.task.progress.total, 5);

    let child = partial
        .steps
        .iter()
        .find(|step| step.step_kind == "blocked-child")
        .unwrap();
    assert_eq!(child.status, lisca::protocol::StepStatus::Blocked);
    assert_eq!(child.blocked_by.len(), 1);
    assert_eq!(child.blocked_by[0].step_id, failing_id);
    assert_eq!(
        child.blocked_by[0].status,
        lisca::protocol::StepStatus::Failed
    );
    assert_eq!(
        child.blocked_by[0].error.as_ref().unwrap().code,
        "bad_input"
    );

    let descendant = partial
        .steps
        .iter()
        .find(|step| step.step_kind == "blocked-descendant")
        .unwrap();
    assert_eq!(descendant.status, lisca::protocol::StepStatus::Blocked);
    assert_eq!(descendant.blocked_by.len(), 1);
    assert_eq!(descendant.blocked_by[0].step_id, failing_id);
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

    let running = controlled_step("running-sibling", 1, started_tx.clone());
    let queued = controlled_step("cancel-queued", 1, started_tx.clone());
    let queued_id = queued.step_id().to_string();
    let task = scheduler
        .submit(TaskSpec::new(
            "queued-cancel",
            "/workspace/queued-cancel",
            true,
            vec![running, queued],
        ))
        .unwrap();
    let running = next_started(&mut started_rx).await;

    let cancelled = scheduler.cancel_step(&queued_id).unwrap();
    let queued = cancelled
        .steps
        .iter()
        .find(|step| step.step_id == queued_id)
        .unwrap();
    assert_eq!(queued.status, lisca::protocol::StepStatus::Cancelled);
    assert!(queued.attempts[0].finished_at_ms.is_some());
    let again = scheduler.cancel_step(&queued_id).unwrap();
    assert_eq!(
        again.steps[1].status,
        lisca::protocol::StepStatus::Cancelled
    );

    running.finish.send(Ok(())).unwrap();
    let terminal = scheduler
        .wait_for_task_terminal(&task.task.task_id)
        .await
        .unwrap();
    assert_eq!(terminal.task.progress.completed, 1);
    assert_eq!(terminal.task.progress.cancelled, 1);
    assert!(started_rx.try_recv().is_err());

    let root = controlled_step("root", 1, started_tx.clone());
    let root_id = root.step_id().to_string();
    let blocked = controlled_step("cancel-blocked", 1, started_tx).with_dependencies([root_id]);
    let blocked_id = blocked.step_id().to_string();
    let task = scheduler
        .submit(TaskSpec::new(
            "blocked-cancel",
            "/workspace/blocked-cancel",
            true,
            vec![root, blocked],
        ))
        .unwrap();
    let root = next_started(&mut started_rx).await;
    let cancelled = scheduler.cancel_step(&blocked_id).unwrap();
    assert_eq!(
        cancelled.steps[1].status,
        lisca::protocol::StepStatus::Cancelled
    );
    root.finish.send(Ok(())).unwrap();
    let terminal = scheduler
        .wait_for_task_terminal(&task.task.task_id)
        .await
        .unwrap();
    assert_eq!(terminal.task.progress.completed, 1);
    assert_eq!(terminal.task.progress.cancelled, 1);
    assert!(started_rx.try_recv().is_err());
}

#[tokio::test]
async fn running_and_task_wide_cancellation_is_cooperative() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 2,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();

    let individual = cancellable_step("individual", started_tx.clone());
    let individual_id = individual.step_id().to_string();
    let individual_task = scheduler
        .submit(TaskSpec::new(
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
    let requested = scheduler.cancel_step(&individual_id).unwrap();
    assert_eq!(
        requested.steps[0].status,
        lisca::protocol::StepStatus::CancellationRequested
    );
    assert_eq!(
        requested.task.status,
        lisca::protocol::TaskStatus::CancellationRequested
    );
    let individual_terminal = scheduler
        .wait_for_task_terminal(&individual_task.task.task_id)
        .await
        .unwrap();
    assert_eq!(
        individual_terminal.steps[0].status,
        lisca::protocol::StepStatus::Cancelled
    );

    let first = cancellable_step("first", started_tx.clone());
    let second = cancellable_step("second", started_tx.clone());
    let queued = cancellable_step("queued", started_tx);
    let task = scheduler
        .submit(TaskSpec::new(
            "task-cancel",
            "/workspace/task-cancel",
            true,
            vec![first, second, queued],
        ))
        .unwrap();
    assert_eq!(next_cancellable_started(&mut started_rx).await, "first");
    assert_eq!(next_cancellable_started(&mut started_rx).await, "second");

    let requested = scheduler.cancel_task(&task.task.task_id).unwrap();
    assert_eq!(requested.task.progress.cancellation_requested, 2);
    assert_eq!(requested.task.progress.cancelled, 1);

    let terminal = scheduler
        .wait_for_task_terminal(&task.task.task_id)
        .await
        .unwrap();
    assert_eq!(terminal.task.status, lisca::protocol::TaskStatus::Cancelled);
    assert_eq!(terminal.task.progress.cancelled, 3);
    assert!(terminal
        .steps
        .iter()
        .flat_map(|step| &step.attempts)
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
    let root = controlled_step("retry-root", 1, started_tx.clone());
    let root_id = root.step_id().to_string();
    let dependent =
        controlled_step("dependent", 1, started_tx).with_dependencies([root_id.clone()]);
    let task = scheduler
        .submit(TaskSpec::new(
            "retry-graph",
            "/workspace/retry-graph",
            true,
            vec![root, dependent],
        ))
        .unwrap();

    let first = next_started(&mut started_rx).await;
    first
        .finish
        .send(Err(StepFailure::new("transient", "try again")))
        .unwrap();
    let failed = scheduler
        .wait_for_task_terminal(&task.task.task_id)
        .await
        .unwrap();
    assert_eq!(failed.task.progress.failed, 1);
    assert_eq!(failed.task.progress.blocked, 1);
    let first_attempt_id = failed.steps[0].attempts[0].attempt_id.clone();
    assert_eq!(
        failed.steps[0].attempts[0].error.as_ref().unwrap().code,
        "transient"
    );

    let retried = scheduler.retry_step(&root_id).unwrap();
    assert_eq!(retried.task.progress.total, 2);
    assert_eq!(retried.task.progress.queued, 1);
    assert_eq!(retried.task.progress.blocked, 1);
    assert_eq!(retried.task.progress.failed, 0);
    assert_eq!(retried.steps[0].attempts.len(), 2);
    assert_ne!(retried.steps[0].attempts[1].attempt_id, first_attempt_id);
    assert!(retried.steps[0].attempts[0].finished_at_ms.is_some());

    let retry = next_started(&mut started_rx).await;
    assert_eq!(retry.label, "retry-root");
    retry.finish.send(Ok(())).unwrap();
    let dependent = next_started(&mut started_rx).await;
    assert_eq!(dependent.label, "dependent");
    dependent.finish.send(Ok(())).unwrap();
    let completed = scheduler
        .wait_for_task_terminal(&task.task.task_id)
        .await
        .unwrap();
    assert_eq!(completed.task.progress.total, 2);
    assert_eq!(completed.task.progress.completed, 2);
    assert_eq!(completed.steps[0].attempts.len(), 2);
    assert_eq!(
        completed.steps[0].attempts[0].status,
        lisca::protocol::StepStatus::Failed
    );
    assert_eq!(
        completed.steps[0].attempts[1].status,
        lisca::protocol::StepStatus::Completed
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
    let step = controlled_step("race", 1, started_tx);
    let step_id = step.step_id().to_string();
    let task = scheduler
        .submit(TaskSpec::new("race", "/workspace/race", true, vec![step]))
        .unwrap();
    let running = next_started(&mut started_rx).await;

    let requested = scheduler.cancel_step(&step_id).unwrap();
    assert_eq!(
        requested.steps[0].status,
        lisca::protocol::StepStatus::CancellationRequested
    );
    running.finish.send(Ok(())).unwrap();
    let completed = scheduler
        .wait_for_task_terminal(&task.task.task_id)
        .await
        .unwrap();
    assert_eq!(
        completed.steps[0].status,
        lisca::protocol::StepStatus::Completed
    );
    assert!(matches!(
        scheduler.cancel_step(&step_id),
        Err(SchedulerError::InvalidTransition { .. })
    ));
    assert!(matches!(
        scheduler.retry_step(&step_id),
        Err(SchedulerError::InvalidTransition { .. })
    ));
    assert!(matches!(
        scheduler.cancel_task(&task.task.task_id),
        Err(SchedulerError::InvalidTransition { .. })
    ));
    assert!(matches!(
        scheduler.cancel_step("missing"),
        Err(SchedulerError::NotFound { .. })
    ));
}

#[tokio::test]
async fn task_update_timestamps_advance_strictly_for_rapid_mutations() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();
    let first = controlled_step("monotonic-first", 1, started_tx.clone());
    let second = controlled_step("monotonic-second", 1, started_tx);
    let second_id = second.step_id().to_string();
    let submitted = scheduler
        .submit(TaskSpec::new(
            "monotonic",
            "/workspace/monotonic",
            true,
            vec![first, second],
        ))
        .unwrap();
    let running = next_started(&mut started_rx).await;
    let after_dispatch = scheduler.task(&submitted.task.task_id).unwrap();
    let cancelled = scheduler.cancel_step(&second_id).unwrap();
    let retried = scheduler.retry_step(&second_id).unwrap();

    assert!(after_dispatch.task.updated_at_ms > submitted.task.updated_at_ms);
    assert!(cancelled.task.updated_at_ms > after_dispatch.task.updated_at_ms);
    assert!(retried.task.updated_at_ms > cancelled.task.updated_at_ms);

    running.finish.send(Ok(())).unwrap();
    let second = next_started(&mut started_rx).await;
    second.finish.send(Ok(())).unwrap();
}

#[tokio::test]
async fn retry_with_incomplete_dependencies_is_rejected_without_reactivating_the_task() {
    let scheduler = TaskScheduler::new(SchedulerConfig {
        capacity: 1,
        history_cap: 10,
    })
    .unwrap();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();
    let root = controlled_step("failed-root", 1, started_tx.clone());
    let root_id = root.step_id().to_string();
    let dependent =
        controlled_step("cancelled-dependent", 1, started_tx.clone()).with_dependencies([root_id]);
    let dependent_id = dependent.step_id().to_string();
    let task = scheduler
        .submit(TaskSpec::new(
            "dependency-retry-repro",
            "/workspace/dependency-retry-repro",
            true,
            vec![root, dependent],
        ))
        .unwrap();

    let root = next_started(&mut started_rx).await;
    root.finish
        .send(Err(StepFailure::new("root_failed", "root failed")))
        .unwrap();
    scheduler
        .wait_for_task_terminal(&task.task.task_id)
        .await
        .unwrap();
    scheduler.cancel_step(&dependent_id).unwrap();

    let error = scheduler.retry_step(&dependent_id).unwrap_err();
    assert!(matches!(error, SchedulerError::InvalidTransition { .. }));
    assert!(error
        .to_string()
        .contains("dependencies must complete successfully before retry"));

    let unchanged = scheduler.task(&task.task.task_id).unwrap();
    assert_eq!(unchanged.task.status, lisca::protocol::TaskStatus::Failed);
    assert_eq!(
        unchanged.steps[1].status,
        lisca::protocol::StepStatus::Cancelled
    );
    assert_eq!(unchanged.steps[1].attempts.len(), 1);
    assert!(scheduler
        .list_tasks()
        .unwrap()
        .iter()
        .any(|listed| listed.task_id == task.task.task_id));

    scheduler
        .submit(TaskSpec::new(
            "same-workspace-next",
            "/workspace/dependency-retry-repro",
            true,
            vec![controlled_step("same-workspace-next", 1, started_tx)],
        ))
        .unwrap();
    let next = next_started(&mut started_rx).await;
    assert_eq!(next.label, "same-workspace-next");
    next.finish.send(Ok(())).unwrap();
}
