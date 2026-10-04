use std::{
    fs,
    path::{Path, PathBuf},
    sync::Arc,
};

use axum::{
    extract::{Query, State},
    routing::{get, post},
    Json, Router,
};
use lisca::http::FsError;
use lisca::{
    analysis,
    protocol::{
        AnalysisProgress, AnalysisProgressQuery, AnalysisStartRequest, AssayJsonFile, AssayType,
        LatestAnalysisQuery, SaveAssayJsonRequest, SaveAssayJsonResponse,
    },
};
use lisca_server::{normalize_workspace_path, HasTaskScheduler, StepFailure, StepSpec, TaskSpec};

use crate::analysis::HasAnalysisTasks;

pub fn router<S>() -> Router<S>
where
    S: HasAnalysisTasks + HasTaskScheduler + Clone + Send + Sync + 'static,
{
    Router::new()
        .route("/studio/save-assay-json", post(save_assay_json_handler))
        .route("/studio/start-analysis", post(start_analysis_handler::<S>))
        .route(
            "/studio/analysis-progress",
            get(analysis_progress_handler::<S>),
        )
        .route(
            "/studio/latest-analysis",
            get(analysis_latest_progress_handler::<S>),
        )
        .route("/studio/analysis-results", get(analysis_results_handler))
}

async fn save_assay_json_handler(
    Json(payload): Json<SaveAssayJsonRequest>,
) -> Result<Json<SaveAssayJsonResponse>, FsError> {
    let save_to = payload.save_to.trim();
    if save_to.is_empty() {
        return Err(FsError::new("saveTo is required"));
    }

    let target = PathBuf::from(save_to).join("assay.json");
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| FsError::new(format!("failed to create assay folder: {error}")))?;
    }
    std::fs::write(&target, payload.contents)
        .map_err(|error| FsError::new(format!("failed to save assay.json: {error}")))?;

    Ok(Json(SaveAssayJsonResponse {
        ok: true,
        path: target.to_string_lossy().to_string(),
    }))
}

fn load_assay_json(workspace: &Path) -> Result<AssayJsonFile, FsError> {
    if !workspace.is_dir() {
        return Err(FsError::new("workspace path does not exist"));
    }
    // Rewrite old on-disk names (samples by slide channel, killing
    // `timeseries/`) before the strict parse.
    lisca::migrations::migrate_workspace(workspace)
        .map_err(|error| FsError::new(format!("workspace migration failed: {error}")))?;
    let path = workspace.join("assay.json");
    let contents = fs::read_to_string(&path)
        .map_err(|error| FsError::new(format!("failed to read {}: {error}", path.display())))?;
    serde_json::from_str(&contents)
        .map_err(|error| FsError::new(format!("invalid assay.json: {error}")))
}

type AnalysisStepRun = Arc<dyn Fn() -> Result<(), String> + Send + Sync>;

fn analysis_step(
    kind: impl Into<String>,
    dependencies: Vec<String>,
    run: AnalysisStepRun,
) -> StepSpec {
    StepSpec::new(kind, 1, move |context| {
        let run = run.clone();
        async move {
            context.checkpoint()?;
            let result = tokio::task::spawn_blocking(move || run())
                .await
                .map_err(|error| StepFailure::new("analysis_worker_failed", error.to_string()))?;
            context.checkpoint()?;
            result.map_err(|error| StepFailure::new("analysis_stage_failed", error))
        }
    })
    .with_dependencies(dependencies)
}

fn build_analysis_task(
    scheduler: &lisca_server::TaskScheduler,
    workspace: PathBuf,
    assay: AssayJsonFile,
    request_id: &str,
) -> Result<lisca::protocol::TaskDetail, lisca_server::SchedulerError> {
    match assay.type_ {
        AssayType::Transfection => build_transfection_task(scheduler, workspace, assay),
        AssayType::Killing => build_killing_task(scheduler, workspace, assay, request_id),
        assay_id => {
            let step = analysis_step(
                format!("analysis/unsupported/{assay_id}"),
                Vec::new(),
                Arc::new(move || Err(format!("unsupported assay id '{assay_id}'"))),
            );
            scheduler.submit(TaskSpec::new(
                format!("analysis/{assay_id}"),
                workspace.to_string_lossy(),
                true,
                vec![step],
            ))
        }
    }
}

fn build_transfection_task(
    scheduler: &lisca_server::TaskScheduler,
    workspace: PathBuf,
    assay: AssayJsonFile,
) -> Result<lisca::protocol::TaskDetail, lisca_server::SchedulerError> {
    use lisca::analysis::{assays::transfection, sample::build_sample_mapping};

    let mapping = match build_sample_mapping(&assay) {
        Ok(mapping) => Arc::new(mapping),
        Err(message) => {
            let step = analysis_step(
                "analysis/transfection/prepare",
                Vec::new(),
                Arc::new(move || Err(message.clone())),
            );
            return scheduler.submit(TaskSpec::new(
                "analysis/transfection",
                workspace.to_string_lossy(),
                true,
                vec![step],
            ));
        }
    };
    let interval = lisca::analysis::assays::transfection::interval_minutes(&assay)
        .unwrap_or(lisca::analysis::assays::transfection::DEFAULT_INTERVAL_MINUTES);
    let max_onset = lisca::analysis::assays::transfection::max_onset_minutes(&assay);
    // `analysis.skipSegment` measures every pixel of the ROI. That area is the
    // crop size, so it stays constant across time. The masked path segments first.
    let full_frame = transfection::skip_segment(&assay);
    let backend = transfection::segment_backend(&assay);
    let mut steps = Vec::new();

    // Prepare validates the sample mapping only (no side files).
    let prepare = analysis_step(
        "analysis/transfection/prepare",
        Vec::new(),
        Arc::new(move || Ok(())),
    );
    let prepare_id = prepare.step_id().to_string();
    steps.push(prepare);

    // One segment Step and one traces Step per Position; traces for a
    // Position waits only on that Position's masks.
    let mut trace_ids = Vec::new();
    for position in mapping.positions() {
        let shard = Arc::new(mapping.for_position(position));
        let dependencies = if full_frame {
            vec![prepare_id.clone()]
        } else {
            let segment_workspace = workspace.clone();
            let segment_shard = shard.clone();
            let segment_backend = backend;
            let segment = analysis_step(
                format!("analysis/transfection/segment/Pos{position}"),
                vec![prepare_id.clone()],
                Arc::new(move || {
                    transfection::run_segment(
                        &segment_workspace,
                        &segment_shard,
                        &transfection::SegmentOptions {
                            jobs: 1,
                            backend: segment_backend,
                            ..transfection::SegmentOptions::default()
                        },
                    )
                }),
            );
            let segment_id = segment.step_id().to_string();
            steps.push(segment);
            vec![segment_id]
        };
        let traces_workspace = workspace.clone();
        let traces = analysis_step(
            format!("analysis/transfection/traces/Pos{position}"),
            dependencies,
            Arc::new(move || {
                transfection::run_position_traces(&traces_workspace, &shard, position, full_frame)
            }),
        );
        trace_ids.push(traces.step_id().to_string());
        steps.push(traces);
    }

    let plot_traces_workspace = workspace.clone();
    let plot_traces_mapping = mapping.clone();
    let plot_traces = analysis_step(
        "analysis/transfection/plot-traces",
        trace_ids.clone(),
        Arc::new(move || {
            transfection::run_plot_traces(
                &plot_traces_workspace,
                &plot_traces_mapping,
                interval,
                Some(transfection::DEFAULT_PLOT_COLUMNS),
            )
        }),
    );
    let plot_traces_id = plot_traces.step_id().to_string();
    steps.push(plot_traces);

    let auc_workspace = workspace.clone();
    let auc = analysis_step(
        "analysis/transfection/auc",
        trace_ids,
        Arc::new(move || transfection::run_auc(&auc_workspace, interval).map(|_| ())),
    );
    let auc_id = auc.step_id().to_string();
    steps.push(auc);

    let plot_auc_workspace = workspace.clone();
    let plot_auc_mapping = mapping.clone();
    let plot_auc = analysis_step(
        "analysis/transfection/plot-auc",
        vec![auc_id.clone()],
        Arc::new(move || transfection::run_plot_auc(&plot_auc_workspace, &plot_auc_mapping)),
    );
    let plot_auc_id = plot_auc.step_id().to_string();
    steps.push(plot_auc);

    let fit_workspace = workspace.clone();
    let fit = analysis_step(
        "analysis/transfection/fit",
        vec![auc_id],
        Arc::new(move || {
            transfection::run_fit(
                &fit_workspace,
                interval,
                max_onset,
                transfection::default_fit_jobs(),
            )
            .map(|_| ())
        }),
    );
    let fit_id = fit.step_id().to_string();
    steps.push(fit);

    let plot_fit_workspace = workspace.clone();
    let plot_fit_mapping = mapping;
    let plot_fit = analysis_step(
        "analysis/transfection/plot-fit",
        vec![fit_id],
        Arc::new(move || {
            transfection::run_plot_fit(
                &plot_fit_workspace,
                &plot_fit_mapping,
                interval,
                Some(transfection::DEFAULT_PLOT_COLUMNS),
            )
        }),
    );
    let plot_fit_id = plot_fit.step_id().to_string();
    steps.push(plot_fit);

    let finalize_workspace = workspace.clone();
    steps.push(analysis_step(
        "analysis/transfection/finalize",
        vec![plot_traces_id, plot_auc_id, plot_fit_id],
        Arc::new(move || analysis::workspace_analysis_manifest(&finalize_workspace).map(|_| ())),
    ));

    scheduler.submit(TaskSpec::new(
        "analysis/transfection",
        workspace.to_string_lossy(),
        true,
        steps,
    ))
}

fn build_killing_task(
    scheduler: &lisca_server::TaskScheduler,
    workspace: PathBuf,
    assay: AssayJsonFile,
    request_id: &str,
) -> Result<lisca::protocol::TaskDetail, lisca_server::SchedulerError> {
    use lisca::analysis::{
        assays::killing,
        sample::{build_sample_mapping, parse_interval_minutes},
    };

    let mapping = match build_sample_mapping(&assay) {
        Ok(mapping) => Arc::new(mapping),
        Err(message) => {
            let step = analysis_step(
                "analysis/killing/prepare",
                Vec::new(),
                Arc::new(move || Err(message.clone())),
            );
            return scheduler.submit(TaskSpec::new(
                "analysis/killing",
                workspace.to_string_lossy(),
                true,
                vec![step],
            ));
        }
    };
    let interval = parse_interval_minutes(assay.interval.value, Some(assay.interval.unit.as_str()))
        .unwrap_or(1.0);
    let safe_request_id = request_id
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') {
                character
            } else {
                '_'
            }
        })
        .collect::<String>();
    let staging_root = workspace
        .join(".analysis-staging")
        .join(format!("killing-{safe_request_id}"));
    let mut steps = Vec::new();

    let prepare = analysis_step(
        "analysis/killing/prepare",
        Vec::new(),
        Arc::new(move || Ok(())),
    );
    let prepare_id = prepare.step_id().to_string();
    steps.push(prepare);

    let mut predict_ids = Vec::new();
    let mut shard_paths = Vec::new();
    // A predict step owns an ONNX session and a decoded batch. Weight equal to
    // the scheduler capacity keeps the next position queued until this one
    // drops both. Running one position per core stalled an 8 GB machine.
    let predict_weight = scheduler.capacity();
    for position in mapping.positions() {
        let shard_mapping = Arc::new(mapping.for_position(position));
        let shard_path = staging_root.join(format!("Pos{position}"));
        shard_paths.push(shard_path.clone());
        let step_workspace = workspace.clone();
        let step_shard = shard_path;
        let step = StepSpec::new(
            format!("analysis/killing/predict/Pos{position}"),
            predict_weight,
            move |context| {
                let step_workspace = step_workspace.clone();
                let step_shard = step_shard.clone();
                let shard_mapping = shard_mapping.clone();
                async move {
                    context.checkpoint()?;
                    let cancel_context = context.clone();
                    let progress_context = context.clone();
                    let outcome = tokio::task::spawn_blocking(move || {
                        // spawn_blocking keeps running after the task is cancelled,
                        // so the batch loop has to observe the flag and return.
                        let is_cancelled = || cancel_context.is_cancellation_requested();
                        let on_frames = |completed, total| {
                            let _ = progress_context.report_work_progress(
                                "frame",
                                completed,
                                total,
                                Some("predict".to_string()),
                                None,
                            );
                        };
                        let model = killing::resolve_model_path(&step_workspace)?;
                        killing::run_predict_shard_controlled(
                            &step_workspace,
                            &step_shard,
                            &shard_mapping,
                            &model,
                            &killing::PredictControl {
                                is_cancelled: &is_cancelled,
                                on_frames: &on_frames,
                            },
                        )
                    })
                    .await
                    .map_err(|error| {
                        StepFailure::new("analysis_worker_failed", error.to_string())
                    })?;
                    match outcome {
                        Err(killing::PredictFailure::Cancelled) => Err(StepFailure::cancelled()),
                        Err(killing::PredictFailure::Failed(message)) => {
                            context.checkpoint()?;
                            Err(StepFailure::new("analysis_stage_failed", message))
                        }
                        Ok(()) => context.checkpoint(),
                    }
                }
            },
        )
        .with_dependencies([prepare_id.clone()]);
        predict_ids.push(step.step_id().to_string());
        steps.push(step);
    }

    let merge_workspace = workspace.clone();
    let merge_shards = shard_paths.clone();
    let merge = analysis_step(
        "analysis/killing/merge-predictions",
        predict_ids,
        Arc::new(move || killing::merge_prediction_shards(&merge_workspace, &merge_shards)),
    );
    let merge_id = merge.step_id().to_string();
    steps.push(merge);

    let plot_traces_workspace = workspace.clone();
    let plot_traces_mapping = mapping.clone();
    let plot_traces = analysis_step(
        "analysis/killing/plot-traces",
        vec![merge_id.clone()],
        Arc::new(move || {
            killing::run_plot_traces_stage(&plot_traces_workspace, &plot_traces_mapping, interval)
        }),
    );
    let plot_traces_id = plot_traces.step_id().to_string();
    steps.push(plot_traces);

    let clean_workspace = workspace.clone();
    let clean_mapping = mapping.clone();
    let clean = analysis_step(
        "analysis/killing/clean",
        vec![merge_id],
        Arc::new(move || killing::run_clean_stage(&clean_workspace, &clean_mapping)),
    );
    let clean_id = clean.step_id().to_string();
    steps.push(clean);

    let kill_workspace = workspace.clone();
    let kill_mapping = mapping.clone();
    let plot_kill = analysis_step(
        "analysis/killing/plot-kill",
        vec![clean_id.clone()],
        Arc::new(move || killing::run_plot_kill_stage(&kill_workspace, &kill_mapping, interval)),
    );
    let plot_kill_id = plot_kill.step_id().to_string();
    steps.push(plot_kill);

    let death_workspace = workspace.clone();
    let death_mapping = mapping;
    let plot_death = analysis_step(
        "analysis/killing/plot-death-times",
        vec![clean_id],
        Arc::new(move || {
            killing::run_plot_death_times_stage(&death_workspace, &death_mapping, interval)
        }),
    );
    let plot_death_id = plot_death.step_id().to_string();
    steps.push(plot_death);

    let finalize_workspace = workspace.clone();
    let finalize_staging = staging_root;
    steps.push(analysis_step(
        "analysis/killing/finalize",
        vec![plot_traces_id, plot_kill_id, plot_death_id],
        Arc::new(move || {
            analysis::workspace_analysis_manifest(&finalize_workspace)?;
            if finalize_staging.exists() {
                fs::remove_dir_all(&finalize_staging).map_err(|error| error.to_string())?;
            }
            Ok(())
        }),
    ));

    scheduler.submit(TaskSpec::new(
        "analysis/killing",
        workspace.to_string_lossy(),
        true,
        steps,
    ))
}

async fn start_analysis_handler<S: HasAnalysisTasks + HasTaskScheduler>(
    State(state): State<S>,
    Json(payload): Json<AnalysisStartRequest>,
) -> Result<Json<AnalysisProgress>, FsError> {
    let request_id = payload.request_id.trim();
    if request_id.is_empty() {
        return Err(FsError::new("analysis request id is required"));
    }

    let workspace_path = normalize_workspace_path(&payload.workspace_path);
    if workspace_path.is_empty() {
        return Err(FsError::new("analysis workspace path is required"));
    }

    let request_id = request_id.to_string();
    let workspace = PathBuf::from(&workspace_path);
    let workspace_for_load = workspace.clone();
    let assay_json = tokio::task::spawn_blocking(move || load_assay_json(&workspace_for_load))
        .await
        .map_err(|error| FsError::internal(format!("assay load worker failed: {error}")))??;
    let initial = state
        .analysis_tasks()
        .submit(&request_id, &workspace_path, || {
            build_analysis_task(state.task_scheduler(), workspace, assay_json, &request_id)
        })
        .map_err(FsError::new)?;
    Ok(Json(initial))
}

async fn analysis_progress_handler<S: HasAnalysisTasks + HasTaskScheduler>(
    State(state): State<S>,
    Query(query): Query<AnalysisProgressQuery>,
) -> Result<Json<AnalysisProgress>, FsError> {
    let progress = tokio::task::spawn_blocking(move || {
        state
            .analysis_tasks()
            .progress(state.task_scheduler(), &query.request_id)
    })
    .await
    .map_err(|error| FsError::internal(format!("analysis progress worker failed: {error}")))?
    .map_err(FsError::internal)?;
    progress
        .map(Json)
        .ok_or_else(|| FsError::new("analysis task not found"))
}

async fn analysis_latest_progress_handler<S: HasAnalysisTasks + HasTaskScheduler>(
    State(state): State<S>,
    Query(query): Query<LatestAnalysisQuery>,
) -> Result<Json<Option<AnalysisProgress>>, FsError> {
    let workspace_path = normalize_workspace_path(&query.workspace_path);
    if workspace_path.is_empty() {
        return Err(FsError::new("analysis workspace path is required"));
    }

    let progress_workspace_path = workspace_path.clone();
    let latest = tokio::task::spawn_blocking(move || {
        state
            .analysis_tasks()
            .latest(state.task_scheduler(), &progress_workspace_path)
    })
    .await
    .map_err(|error| FsError::internal(format!("latest analysis worker failed: {error}")))?
    .map_err(FsError::internal)?;
    let Some(progress) = latest else {
        let manifest_workspace = PathBuf::from(&workspace_path);
        let result_files = tokio::task::spawn_blocking(move || {
            analysis::workspace_analysis_manifest(&manifest_workspace)
        })
        .await
        .map_err(|error| FsError::internal(format!("analysis manifest worker failed: {error}")))?
        .map_err(FsError::internal)?;
        if result_files.is_empty() {
            return Ok(Json(None));
        }

        let synthetic = AnalysisProgress {
            request_id: workspace_path.clone(),
            status: lisca::protocol::AnalysisStatus::Completed,
            stage: lisca::protocol::AnalysisStage::Completed,
            progress: 100.0,
            message: Some("Using existing workspace results".to_string()),
            result_files,
            error: None,
        };
        return Ok(Json(Some(synthetic)));
    };
    Ok(Json(Some(progress)))
}

async fn analysis_results_handler(
    Query(query): Query<LatestAnalysisQuery>,
) -> Result<Json<Option<AnalysisProgress>>, FsError> {
    let workspace_path = normalize_workspace_path(&query.workspace_path);
    if workspace_path.is_empty() {
        return Err(FsError::new("analysis workspace path is required"));
    }
    let workspace = Path::new(&workspace_path);
    if !workspace.is_dir() {
        return Ok(Json(None));
    }

    let result_files = match analysis::workspace_analysis_manifest(workspace) {
        Ok(result_files) if !result_files.is_empty() => result_files,
        Ok(_) => return Ok(Json(None)),
        Err(_) => return Ok(Json(None)),
    };

    let synthetic = AnalysisProgress {
        request_id: workspace_path,
        status: lisca::protocol::AnalysisStatus::Completed,
        stage: lisca::protocol::AnalysisStage::Completed,
        progress: 100.0,
        message: Some("Loaded workspace results".to_string()),
        result_files,
        error: None,
    };
    Ok(Json(Some(synthetic)))
}

#[cfg(test)]
mod tests {
    use std::{
        fs,
        path::PathBuf,
        time::{Duration, SystemTime, UNIX_EPOCH},
    };

    use axum::extract::State;
    use lisca::protocol::{AnalysisProgress, AnalysisStartRequest, AnalysisStatus, AssayType};

    use super::{build_analysis_task, load_assay_json, start_analysis_handler};
    use crate::analysis::{AnalysisTaskState, HasAnalysisTasks};
    use lisca_server::{HasTaskScheduler, SchedulerConfig, TaskScheduler};

    #[derive(Clone)]
    struct TestState {
        analysis: AnalysisTaskState,
        tasks: TaskScheduler,
    }

    impl TestState {
        fn new() -> Self {
            Self {
                analysis: AnalysisTaskState::new(),
                tasks: TaskScheduler::new(SchedulerConfig {
                    capacity: 2,
                    history_cap: 20,
                })
                .unwrap(),
            }
        }
    }

    impl HasAnalysisTasks for TestState {
        fn analysis_tasks(&self) -> &AnalysisTaskState {
            &self.analysis
        }
    }

    impl HasTaskScheduler for TestState {
        fn task_scheduler(&self) -> &TaskScheduler {
            &self.tasks
        }
    }

    fn test_workspace(assay_id: AssayType) -> PathBuf {
        // Tests run in parallel and the clock may be coarse, so a counter keeps
        // each workspace distinct.
        static NEXT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
        let counter = NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after the Unix epoch")
            .as_nanos();
        let workspace = std::env::temp_dir().join(format!(
            "lisca-studio-test-assay-{}-{nonce}-{counter}",
            std::process::id()
        ));
        fs::create_dir_all(&workspace).expect("test workspace should be created");

        let assay = format!(
            r#"{{
                "type": "{assay_id}",
                "name": "Unsupported assay",
                "workspace": {{ "path": "" }},
                "data": {{ "type": "folder", "path": "", "template": {{ "subfolder": "", "filename": "" }} }},
                "interval": {{ "value": 1.0, "unit": "minute" }},
                "samples": []
            }}"#
        );
        fs::write(workspace.join("assay.json"), assay).expect("assay fixture should be written");
        workspace
    }

    async fn wait_for_terminal_progress(state: &TestState, request_id: &str) -> AnalysisProgress {
        for _ in 0..100 {
            let progress = state
                .analysis
                .progress(&state.tasks, request_id)
                .expect("analysis task state should not be poisoned")
                .expect("analysis task should exist");
            if progress.status == AnalysisStatus::Error {
                return progress;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
        panic!("analysis did not reach an error state");
    }

    #[tokio::test]
    async fn unsupported_assays_surface_their_ids_in_analysis_progress() {
        for assay_id in [AssayType::LnpBinding] {
            let state = TestState::new();
            let workspace = test_workspace(assay_id);
            let request_id = format!("unsupported-{assay_id}");
            let request = AnalysisStartRequest {
                request_id: request_id.clone(),
                workspace_path: workspace.to_string_lossy().into_owned(),
            };

            let _ = start_analysis_handler(State(state.clone()), axum::Json(request))
                .await
                .expect("analysis request should be accepted");

            let progress = wait_for_terminal_progress(&state, &request_id).await;
            let error = progress.error.expect("analysis error should be visible");
            assert!(error.contains("unsupported assay id"));
            assert!(error.contains(&assay_id.to_string()));

            fs::remove_dir_all(workspace).expect("test workspace should be removed");
        }
    }

    fn graph_workspace(assay_id: AssayType) -> PathBuf {
        let workspace = test_workspace(assay_id);
        let assay = format!(
            r#"{{
                "type": "{assay_id}",
                "name": "Graph fixture",
                "workspace": {{ "path": "" }},
                "data": {{ "type": "folder", "path": "", "template": {{ "subfolder": "", "filename": "" }} }},
                "interval": {{ "value": 1.0, "unit": "minute" }},
                "samples": [{{
                    "name": "sample",
                    "positions": "0,1"
                }}],
                "analysis": {{
                    "channels": {{ "segmentation": 0, "signal": [1] }}
                }}
            }}"#
        );
        fs::write(workspace.join("assay.json"), assay).unwrap();
        workspace
    }

    #[tokio::test]
    async fn assay_tasks_expose_real_fan_out_and_fan_in_graphs() {
        for assay_id in [AssayType::Transfection, AssayType::Killing] {
            let state = TestState::new();
            let workspace = graph_workspace(assay_id);
            let assay = load_assay_json(&workspace).unwrap();
            let detail =
                build_analysis_task(&state.tasks, workspace.clone(), assay, "graph-fixture")
                    .unwrap();
            let prefix = match assay_id {
                AssayType::Transfection => "analysis/transfection",
                AssayType::Killing => "analysis/killing",
                _ => unreachable!(),
            };
            let position_step_count = detail
                .steps
                .iter()
                .filter(|step| {
                    step.step_kind.starts_with(&format!("{prefix}/segment/Pos"))
                        || step.step_kind.starts_with(&format!("{prefix}/predict/Pos"))
                })
                .count();
            assert_eq!(position_step_count, 2);
            let fan_in = detail
                .steps
                .iter()
                .find(|step| {
                    step.step_kind == "analysis/transfection/auc"
                        || step.step_kind.ends_with("/merge-predictions")
                })
                .unwrap();
            assert_eq!(fan_in.dependencies.len(), 2);
            if assay_id == AssayType::Transfection {
                // Traces fan out per Position, each waiting on its own segment Step.
                for position in [0, 1] {
                    let segment = detail
                        .steps
                        .iter()
                        .find(|step| step.step_kind == format!("{prefix}/segment/Pos{position}"))
                        .unwrap();
                    let traces = detail
                        .steps
                        .iter()
                        .find(|step| step.step_kind == format!("{prefix}/traces/Pos{position}"))
                        .unwrap();
                    assert_eq!(traces.dependencies, vec![segment.step_id.clone()]);
                }
            }
            assert!(detail
                .steps
                .iter()
                .any(|step| step.step_kind.ends_with("/finalize")));
            let _ = state.tasks.cancel_task(&detail.task.task_id);
            fs::remove_dir_all(workspace).unwrap();
        }
    }

    #[test]
    fn load_assay_json_migrates_samples_keyed_by_slide_channel() {
        let workspace = test_workspace(AssayType::Transfection);
        fs::write(
            workspace.join("assay.json"),
            r#"{
                "type": "transfection",
                "name": "Old fixture",
                "workspace": { "path": "" },
                "data": { "type": "nd2", "path": "" },
                "interval": { "value": 1.0, "unit": "minute" },
                "samples": [{ "slideChannel": 2, "name": "", "positions": "0" }],
                "analysis": {
                    "channels": { "mask": 0, "signal": [1] },
                    "sampleChannels": [{ "slideChannel": 2, "mask": 1, "signal": [1] }]
                }
            }"#,
        )
        .unwrap();

        let assay = load_assay_json(&workspace).unwrap();
        assert_eq!(assay.samples[0].name, "Sample 2");
        let analysis = assay.analysis.unwrap();
        assert_eq!(analysis.channels.unwrap().segmentation, 0);
        assert_eq!(analysis.sample_channels[0].sample, "Sample 2");
        assert_eq!(analysis.sample_channels[0].segmentation, 1);
        fs::remove_dir_all(workspace).unwrap();
    }

    #[tokio::test]
    async fn transfection_skip_segment_measures_the_full_roi_without_masks() {
        let state = TestState::new();
        let workspace = graph_workspace(AssayType::Transfection);
        let assay_path = workspace.join("assay.json");
        let mut assay: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(&assay_path).unwrap()).unwrap();
        assay["analysis"]["skipSegment"] = serde_json::json!(true);
        fs::write(&assay_path, serde_json::to_string(&assay).unwrap()).unwrap();

        let assay = load_assay_json(&workspace).unwrap();
        let detail =
            build_analysis_task(&state.tasks, workspace.clone(), assay, "skip-segment").unwrap();

        assert!(detail
            .steps
            .iter()
            .all(|step| !step.step_kind.contains("/segment/")));
        let prepare = detail
            .steps
            .iter()
            .find(|step| step.step_kind.ends_with("/prepare"))
            .unwrap();
        let traces: Vec<_> = detail
            .steps
            .iter()
            .filter(|step| step.step_kind.contains("/traces/Pos"))
            .collect();
        assert_eq!(traces.len(), 2);
        for step in traces {
            assert_eq!(step.dependencies, vec![prepare.step_id.clone()]);
        }

        let _ = state.tasks.cancel_task(&detail.task.task_id);
        fs::remove_dir_all(workspace).unwrap();
    }
}
