use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use tokio::process::Command;

use crate::protocol::{
    AnalysisCsvFile, AnalysisProgress, AnalysisStage, AnalysisStatus, AssayBasicInfoStep3,
    AssayJsonFile,
};

#[derive(Debug, Clone)]
enum TransfectionRunner {
    UvRun {
        workdir: Option<PathBuf>,
    },
    PythonModule {
        workdir: PathBuf,
    },
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SlideSampleEntry {
    positions: Vec<u32>,
    signal_channel: u32,
    mask_channel: u32,
    sample_name: String,
}

pub async fn run_analysis_pipeline<F>(
    workspace_path: PathBuf,
    request_id: String,
    update_progress: F,
) -> Result<Vec<AnalysisCsvFile>, String>
where
    F: Fn(AnalysisProgress) + Send + Sync + 'static,
{
    let workspace_path = workspace_path;
    if !workspace_path.exists() {
        return Err("workspace path does not exist".to_string());
    }

    if !workspace_path.is_dir() {
        return Err("workspace path is not a directory".to_string());
    }

    let assay_path = workspace_path.join("assay.json");
    if !assay_path.is_file() {
        return Err(format!("missing assay.json at {}", assay_path.display()));
    }

    let assay_contents = fs::read_to_string(&assay_path)
        .map_err(|error| format!("failed to read assay.json: {error}"))?;
    let assay_json: AssayJsonFile = serde_json::from_str(&assay_contents)
        .map_err(|error| format!("invalid assay.json: {error}"))?;

    let interval = parse_interval_minutes(
        assay_json.info2.timelapse_amount,
        Some(assay_json.info2.timelapse_unit.as_str()),
    )
    .ok_or_else(|| "invalid timelapseAmount/timelapseUnit in assay.json".to_string())?;

    let sample_mapping = build_slide_mapping(&assay_json.info3)?;

    let sample_path = temp_sample_path(&request_id);
    fs::write(&sample_path, serde_json::to_string_pretty(&sample_mapping).map_err(|error| error.to_string())?)
        .map_err(|error| format!("failed to write temporary sample map: {error}"))?;
    let cleanup_sample_path = sample_path.clone();
    let runner = discover_transfection_runner()
        .await
        .map_err(|error| format!("failed to prepare transfection runner: {error}"))?;

    let make_progress = |stage: AnalysisStage, progress: f64, message: &str| AnalysisProgress {
        request_id: request_id.clone(),
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
    };

    update_progress(make_progress(AnalysisStage::Preparing, 5.0, "Building transfection slide mapping"));

    let command_result: Result<Vec<AnalysisCsvFile>, String> = (async {
        run_transfection_command(
            &runner,
            &workspace_path,
            [
                "segment".to_string(),
                workspace_path.to_string_lossy().to_string(),
                "--sample".to_string(),
                sample_path.to_string_lossy().to_string(),
            ],
        )
        .await
        .map_err(|error| format!("segment step failed: {error}"))?;
        update_progress(make_progress(AnalysisStage::Segment, 30.0, "Completed segmentation"));

        run_transfection_command(
            &runner,
            &workspace_path,
            [
                "timeseries".to_string(),
                workspace_path.to_string_lossy().to_string(),
                "--sample".to_string(),
                sample_path.to_string_lossy().to_string(),
            ],
        )
        .await
        .map_err(|error| format!("timeseries step failed: {error}"))?;
        update_progress(make_progress(AnalysisStage::Timeseries, 60.0, "Computed timeseries metrics"));

        run_transfection_command(
            &runner,
            &workspace_path,
            [
                "auc".to_string(),
                workspace_path.to_string_lossy().to_string(),
                "--interval".to_string(),
                format!("{interval}"),
            ],
        )
        .await
        .map_err(|error| format!("auc step failed: {error}"))?;
        update_progress(make_progress(AnalysisStage::Auc, 85.0, "Computed AUC table"));

        run_transfection_command(
            &runner,
            &workspace_path,
            [
                "fit".to_string(),
                workspace_path.to_string_lossy().to_string(),
                "--interval".to_string(),
                format!("{interval}"),
            ],
        )
        .await
        .map_err(|error| format!("fit step failed: {error}"))?;
        update_progress(make_progress(AnalysisStage::Fit, 98.0, "Computed fit table"));

        collect_csv_outputs(&workspace_path)
    })
    .await;

    let _ = fs::remove_file(cleanup_sample_path);

    match command_result {
        Ok(result_files) => {
            update_progress(make_progress(
                AnalysisStage::Completed,
                100.0,
                "Analysis pipeline completed",
            ));
            Ok(result_files)
        }
        Err(error) => Err(error),
    }
}

fn temp_sample_path(request_id: &str) -> PathBuf {
    let suffix = request_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .take(10)
        .collect::<String>();
    let fallback = "analysis";
    let stem = if suffix.is_empty() { fallback.to_string() } else { suffix };
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|time| time.as_nanos())
        .unwrap_or(0);
    std::env::temp_dir().join(format!("lisca-transfection-{stem}-{nanos}.json"))
}

fn parse_positions(raw: &str) -> Result<Vec<u32>, String> {
    let mut collected = Vec::new();
    let mut seen = HashSet::new();

    for token in raw.split(',') {
        let token = token.trim();
        if token.is_empty() {
            continue;
        }

        let range_parts = token.split(':').collect::<Vec<_>>();
        if range_parts.is_empty() {
            continue;
        }
        if range_parts.len() == 1 {
            let position = parse_position(range_parts[0])?;
            if seen.insert(position) {
                collected.push(position);
            }
            continue;
        }

        if !(2..=3).contains(&range_parts.len()) {
            return Err(format!("invalid position range: {token}"));
        }
        let start = parse_position(range_parts[0])?;
        let stop = parse_position(range_parts[1])?;
        let step = if range_parts.len() == 3 {
            parse_position(range_parts[2])?
        } else {
            1
        };
        if step == 0 {
            return Err(format!("step cannot be 0: {token}"));
        }
        if stop < start {
            return Err(format!("invalid empty position range: {token}"));
        }

        let mut current = start;
        while current <= stop {
            if seen.insert(current) {
                collected.push(current);
            }
            current = current
                .checked_add(step)
                .ok_or_else(|| "position range overflow".to_string())?;
        }
    }

    if collected.is_empty() {
        return Err("no valid positions in sample row".to_string());
    }

    Ok(collected)
}

fn parse_position(raw: &str) -> Result<u32, String> {
    raw.trim()
        .parse::<u32>()
        .map_err(|_| format!("invalid position token: {raw}"))
}

fn parse_u32(raw: &str, field_name: &str) -> Result<u32, String> {
    parse_position(raw).map_err(|error| format!("invalid {field_name}: {error}"))
}

fn build_slide_mapping(info3: &AssayBasicInfoStep3) -> Result<BTreeMap<u32, SlideSampleEntry>, String> {
    let rows = info3.samples_by_slide.rows_for(info3.selected_slide_id);

    let mut mapping = BTreeMap::new();
    for row in rows {
        let sample_name = row.name.trim().to_string();
        if sample_name.is_empty() {
            continue;
        }
        let signal_channel = parse_u32(&row.signal_channel, "signalChannel")?;
        let mask_channel = parse_u32(&row.mask_channel, "maskChannel")?;
        let channel = parse_u32(&row.channel, "channel")?;
        let positions = parse_positions(&row.positions)?;
        mapping.insert(
            channel,
            SlideSampleEntry {
                positions,
                signal_channel,
                mask_channel,
                sample_name,
            },
        );
    }

    if mapping.is_empty() {
        return Err("no samples for selected slide".to_string());
    }
    Ok(mapping)
}

fn parse_interval_minutes(amount: Option<f64>, unit: Option<&str>) -> Option<f64> {
    let amount = amount?;
    if amount <= 0.0 {
        return None;
    }
    let factor = match unit {
        Some("second") => 1.0 / 60.0,
        Some("minute") | None => 1.0,
        Some("hour") => 60.0,
        Some(_) => return None,
    };
    Some(amount * factor)
}

fn collect_csv_outputs(workspace: &Path) -> Result<Vec<AnalysisCsvFile>, String> {
    let mut files = Vec::new();
    collect_csv_dir(&workspace.join("timeseries"), "timeseries", &mut files)?;
    collect_csv_dir(&workspace.join("results"), "results", &mut files)?;
    files.sort_by_key(|entry| entry.file_name.clone());
    Ok(files)
}

pub fn workspace_analysis_outputs(workspace: &Path) -> Result<Vec<AnalysisCsvFile>, String> {
    collect_csv_outputs(workspace)
}

pub fn workspace_analysis_manifest(workspace: &Path) -> Result<Vec<AnalysisCsvFile>, String> {
    let mut files = collect_csv_outputs(workspace)?;
    for file in &mut files {
        file.csv.clear();
    }
    Ok(files)
}

fn collect_csv_dir(
    directory: &Path,
    kind: &str,
    out: &mut Vec<AnalysisCsvFile>,
) -> Result<(), String> {
    let Ok(entries) = fs::read_dir(directory) else {
        return Ok(());
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let is_csv = path.extension().is_some_and(|ext| ext == "csv");
        if !is_csv {
            continue;
        }

        let file_name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("")
            .to_string();
        if file_name.is_empty() {
            continue;
        }

        let csv = fs::read_to_string(&path)
            .map_err(|error| format!("failed to read {path:?}: {error}"))?;
        out.push(AnalysisCsvFile {
            kind: kind.to_string(),
            file_name,
            path: path.to_string_lossy().to_string(),
            csv,
        });
    }
    Ok(())
}

async fn discover_transfection_runner() -> Result<TransfectionRunner, String> {
    if can_execute_uv_run().await {
        return Ok(TransfectionRunner::UvRun { workdir: None });
    }

    let candidate_dirs = fallback_transfection_dirs();
    for directory in candidate_dirs {
        if directory.join("src/transfection").is_dir() {
            return Ok(TransfectionRunner::PythonModule { workdir: directory });
        }
    }

    Err("could not locate transfection command. Install with uv or set LISCA_TRANFECTION_DIR.".to_string())
}

async fn can_execute_uv_run() -> bool {
    Command::new("uv")
        .arg("run")
        .arg("transfection")
        .arg("--help")
        .output()
        .await
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn fallback_transfection_dirs() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(path) = std::env::var("LISCA_TRANFECTION_DIR") {
        candidates.push(PathBuf::from(path));
    }
    if let Ok(current) = std::env::current_dir() {
        candidates.push(current.join("../transfection"));
        candidates.push(current.join("../../transfection"));
    }
    if let Ok(executable) = std::env::current_exe() {
        if let Some(parent) = executable.parent() {
            candidates.push(parent.join("../../transfection"));
            candidates.push(parent.join("../../../transfection"));
        }
    }
    candidates.into_iter().map(|entry| entry).collect()
}

async fn run_transfection_command(
    runner: &TransfectionRunner,
    workspace: &Path,
    args: impl IntoIterator<Item = String>,
) -> Result<String, String> {
    let args: Vec<String> = args.into_iter().collect();
    let command = match runner {
        TransfectionRunner::UvRun { workdir } => {
            let mut command = Command::new("uv");
            command.arg("run").arg("transfection").args(args);
            command.current_dir(workspace);
            if let Some(workdir) = workdir {
                command.current_dir(workdir);
            }
            command
        }
        TransfectionRunner::PythonModule { workdir } => {
            let mut command = Command::new("python3");
            command
                .arg("-m")
                .arg("transfection")
                .args(args)
                .current_dir(workdir)
                .env("PYTHONPATH", workdir.join("src"));
            command
        }
    }
    .output()
    .await
    .map_err(|error| format!("failed to invoke transfection: {error}"))?;

    let stdout = String::from_utf8_lossy(&command.stdout).to_string();
    let stderr = String::from_utf8_lossy(&command.stderr).to_string();
    if !command.status.success() {
        let detail = if stderr.is_empty() { stdout } else { format!("{stdout}\n{stderr}") };
        return Err(format!("transfection command failed: {detail}"));
    }

    Ok(stdout)
}
