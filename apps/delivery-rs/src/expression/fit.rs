use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use clap::Args;
use lisca::analysis::roi::load_timeseries_csv;
use rayon::prelude::*;

pub const HELP: &str = concat!(
    "Fit each ROI trace to y=intensity_offset + expression_amplitude * ",
    "(exp(-protein_decay_rate*t) - exp(-mrna_decay_rate*t)), where t is measured in minutes from t * --interval. ",
    "expression_onset is fixed at 0 in the first pass unless a second pass runs with a shared protein_decay_rate ",
    "and an optional --max-onset-minutes cap.",
);
const RATE_COARSE_CANDIDATE_COUNT: usize = 24;
const RATE_REFINE_CANDIDATE_COUNT: usize = 12;
const RATE_REFINE_PASSES: usize = 2;
const FIXED_EXPRESSION_ONSET: f64 = 0.0;

#[derive(Clone, Debug, PartialEq)]
pub struct FitRow {
    pub slide_channel: Option<u32>,
    pub pos: Option<u32>,
    pub roi: u32,
    pub intensity_offset: Option<f64>,
    pub protein_decay_rate: Option<f64>,
    pub mrna_decay_rate: Option<f64>,
    pub expression_onset: Option<f64>,
    pub expression_amplitude: Option<f64>,
    pub success: bool,
}

#[derive(Clone, Debug, Args)]
#[command(about = HELP)]
pub struct FitArgs {
    #[arg(help = "One or more long-form ROI timeseries CSV files to fit.")]
    pub timeseries_csvs: Vec<PathBuf>,
    #[arg(
        long,
        help = "Frame interval in minutes used to convert t into time for fitting y=intensity_offset + expression_amplitude * (exp(-protein_decay_rate*t) - exp(-mrna_decay_rate*t))."
    )]
    pub interval: f64,
    #[arg(
        long,
        help = "Output CSV path. Default: derive a shared <stem>_fit.csv path."
    )]
    pub output_csv: Option<PathBuf>,
    #[arg(
        long,
        help = "Optional cap on second-pass candidate expression_onset values in minutes. Default: use only the first frame time as the onset (same as Python with max_onset_minutes None or 0).",
        value_name = "MINUTES"
    )]
    pub max_onset_minutes: Option<f64>,
    #[arg(
        long,
        help = "Number of workers for parallel trace fits. Defaults to the CPU count, minimum 1 (match Python).",
        value_name = "N"
    )]
    pub jobs: Option<usize>,
}

#[derive(Clone, Copy, Debug)]
struct FitResult {
    intensity_offset: f64,
    protein_decay_rate: f64,
    mrna_decay_rate: f64,
    expression_onset: f64,
    expression_amplitude: f64,
}

#[derive(Clone, Copy, Debug)]
struct ScoredFit {
    score: f64,
    result: FitResult,
}

pub fn run_fit(
    timeseries_csvs: &[PathBuf],
    interval: f64,
    output_csv: Option<&Path>,
) -> Result<PathBuf, String> {
    run_fit_with_options(timeseries_csvs, interval, output_csv, Some(0.0), 1)
}

/// Match Python `run_fit_with_jobs` (e.g. CLI) for interval validation, `max_onset_minutes`, and `jobs`.
pub fn run_fit_with_options(
    timeseries_csvs: &[PathBuf],
    interval: f64,
    output_csv: Option<&Path>,
    max_onset_minutes: Option<f64>,
    jobs: usize,
) -> Result<PathBuf, String> {
    if interval <= 0.0 {
        return Err(format!("--interval must be > 0, got {interval}"));
    }
    if let Some(m) = max_onset_minutes {
        if m < 0.0 {
            return Err(format!("--max-onset-minutes must be >= 0, got {m}"));
        }
    }
    if jobs < 1 {
        return Err(format!("--jobs must be >= 1, got {jobs}"));
    }
    let rows = compute_fit_table_with_options(timeseries_csvs, interval, max_onset_minutes, jobs)?;
    let output_path = default_output_csv_path(timeseries_csvs, output_csv);
    write_fit_csv(&rows, &output_path)?;
    Ok(output_path)
}

pub fn default_output_csv_path(timeseries_csvs: &[PathBuf], output_csv: Option<&Path>) -> PathBuf {
    if let Some(path) = output_csv {
        return path.to_path_buf();
    }

    let stem = super::auc::aggregate_output_stem(timeseries_csvs);
    timeseries_csvs
        .first()
        .cloned()
        .unwrap_or_else(|| PathBuf::from("timeseries.csv"))
        .with_file_name(format!("{stem}_fit.csv"))
}

/// Default `max_onset_minutes` and `jobs` match Python `compute_fit_table` (`0.0` and `1`).
pub fn compute_fit_table(timeseries_csvs: &[PathBuf], interval: f64) -> Result<Vec<FitRow>, String> {
    compute_fit_table_with_options(timeseries_csvs, interval, Some(0.0), 1)
}

pub fn compute_fit_table_with_options(
    timeseries_csvs: &[PathBuf],
    interval: f64,
    max_onset_minutes: Option<f64>,
    jobs: usize,
) -> Result<Vec<FitRow>, String> {
    if jobs < 1 {
        return Err(format!("--jobs must be >= 1, got {jobs}"));
    }
    if let Some(m) = max_onset_minutes {
        if m < 0.0 {
            return Err(format!("--max-onset-minutes must be >= 0, got {m}"));
        }
    }
    let mut csvs = timeseries_csvs.to_vec();
    csvs.sort_by(|a, b| a.file_name().cmp(&b.file_name()));

    let mut tasks = Vec::<(Option<u32>, Option<u32>, u32, Vec<(u32, f64)>)>::new();
    for csv_path in csvs {
        let slide_channel = super::auc::parse_slide_channel(&csv_path);
        let rows = load_timeseries_csv(&csv_path)?;
        let mut grouped = BTreeMap::<(Option<u32>, u32), Vec<(u32, f64)>>::new();
        for row in rows {
            grouped
                .entry((row.pos, row.roi))
                .or_default()
                .push((row.t, row.corrected));
        }
        for ((pos, roi), mut trace) in grouped {
            trace.sort_by_key(|(t, _)| *t);
            tasks.push((slide_channel, pos, roi, trace));
        }
    }

    if tasks.is_empty() {
        return Err("No fit rows produced".to_string());
    }

    // Match Python: first pass always uses default max_onset 0.0; user `max_onset_minutes` only
    // affects the second pass. Independent first-pass fit ignores this anyway.
    const FIRST_PASS_MAX_ONSET: Option<f64> = Some(0.0);
    let max_workers = std::thread::available_parallelism()
        .map(|c| c.get().max(1))
        .unwrap_or(jobs);
    let workers = jobs.min(tasks.len()).min(max_workers).max(1);
    let run_parallel = jobs > 1 && tasks.len() > 1;
    let first_pass_results: Vec<Option<FitResult>> = if run_parallel {
        let pool = rayon::ThreadPoolBuilder::new()
            .num_threads(workers)
            .build()
            .map_err(|e| e.to_string())?;
        pool.install(|| {
            tasks
                .par_iter()
                .map(|(_, _, _, trace)| {
                    fit_trace(trace, interval, None, FIRST_PASS_MAX_ONSET)
                })
                .collect()
        })
    } else {
        tasks
            .iter()
            .map(|(_, _, _, trace)| fit_trace(trace, interval, None, FIRST_PASS_MAX_ONSET))
            .collect()
    };
    let successful_protein_rates: Vec<f64> = first_pass_results
        .iter()
        .filter_map(|result| {
            result.map(|r| {
                r.protein_decay_rate
            })
        })
        .collect();

    let rows = if successful_protein_rates.is_empty() {
        tasks
            .iter()
            .map(|(slide_channel, pos, roi, _)| failed_row(*slide_channel, *pos, *roi))
            .collect::<Vec<_>>()
    } else {
        let shared_protein_decay_rate = median(&successful_protein_rates);
        if run_parallel {
            let pool = rayon::ThreadPoolBuilder::new()
                .num_threads(workers)
                .build()
                .map_err(|e| e.to_string())?;
            pool.install(|| {
                tasks
                    .par_iter()
                    .map(|(slide_channel, pos, roi, trace)| {
                        fit_trace(
                            trace,
                            interval,
                            Some(shared_protein_decay_rate),
                            max_onset_minutes,
                        )
                        .map(|result| fit_row(*slide_channel, *pos, *roi, result))
                        .unwrap_or_else(|| failed_row(*slide_channel, *pos, *roi))
                    })
                    .collect()
            })
        } else {
            tasks
                .iter()
                .map(|(slide_channel, pos, roi, trace)| {
                    fit_trace(
                        trace,
                        interval,
                        Some(shared_protein_decay_rate),
                        max_onset_minutes,
                    )
                    .map(|result| fit_row(*slide_channel, *pos, *roi, result))
                    .unwrap_or_else(|| failed_row(*slide_channel, *pos, *roi))
                })
                .collect()
        }
    };

    let mut rows = rows;
    rows.sort_by(|a, b| {
        a.slide_channel
            .cmp(&b.slide_channel)
            .then(a.pos.cmp(&b.pos))
            .then(a.roi.cmp(&b.roi))
    });
    Ok(rows)
}

pub fn write_fit_csv(rows: &[FitRow], output_csv: &Path) -> Result<(), String> {
    if let Some(parent) = output_csv.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let mut writer = csv::Writer::from_path(output_csv).map_err(|err| err.to_string())?;
    writer
        .write_record([
            "slide_channel",
            "pos",
            "roi",
            "intensity_offset",
            "protein_decay_rate",
            "mrna_decay_rate",
            "expression_onset",
            "expression_amplitude",
            "success",
        ])
        .map_err(|err| err.to_string())?;
    for row in rows {
        writer
            .write_record([
                row.slide_channel
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                row.pos.map(|value| value.to_string()).unwrap_or_default(),
                row.roi.to_string(),
                row.intensity_offset
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                row.protein_decay_rate
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                row.mrna_decay_rate
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                row.expression_onset
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                row.expression_amplitude
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                row.success.to_string(),
            ])
            .map_err(|err| err.to_string())?;
    }
    writer.flush().map_err(|err| err.to_string())
}

pub fn format_written_fit_csv_message(output_csv: &Path) -> String {
    format!("Wrote fit CSV: {}", output_csv.display())
}

fn default_job_count() -> usize {
    std::thread::available_parallelism()
        .map(|c| c.get().max(1))
        .unwrap_or(1)
}

pub fn execute(args: FitArgs) -> Result<(), String> {
    let jobs = args.jobs.unwrap_or_else(default_job_count);
    let output = run_fit_with_options(
        &args.timeseries_csvs,
        args.interval,
        args.output_csv.as_deref(),
        args.max_onset_minutes,
        jobs,
    )?;
    println!("{}", format_written_fit_csv_message(&output));
    Ok(())
}

fn fit_row(slide_channel: Option<u32>, pos: Option<u32>, roi: u32, result: FitResult) -> FitRow {
    FitRow {
        slide_channel,
        pos,
        roi,
        intensity_offset: Some(result.intensity_offset),
        protein_decay_rate: Some(result.protein_decay_rate),
        mrna_decay_rate: Some(result.mrna_decay_rate),
        expression_onset: Some(result.expression_onset),
        expression_amplitude: Some(result.expression_amplitude),
        success: true,
    }
}

fn failed_row(slide_channel: Option<u32>, pos: Option<u32>, roi: u32) -> FitRow {
    FitRow {
        slide_channel,
        pos,
        roi,
        intensity_offset: None,
        protein_decay_rate: None,
        mrna_decay_rate: None,
        expression_onset: None,
        expression_amplitude: None,
        success: false,
    }
}

fn fit_trace(
    trace: &[(u32, f64)],
    interval: f64,
    fixed_protein_decay_rate: Option<f64>,
    max_onset_minutes: Option<f64>,
) -> Option<FitResult> {
    if trace.len() < 3 {
        return None;
    }

    let points: Vec<(f64, f64)> = trace
        .iter()
        .map(|(t, value)| (*t as f64 * interval, *value))
        .collect();
    if points.iter().any(|(t, v)| !t.is_finite() || !v.is_finite()) {
        return None;
    }
    if points
        .windows(2)
        .all(|window| (window[0].0 - window[1].0).abs() <= f64::EPSILON)
    {
        return None;
    }

    let y_min = points
        .iter()
        .map(|(_, value)| *value)
        .fold(f64::INFINITY, f64::min);
    let y_max = points
        .iter()
        .map(|(_, value)| *value)
        .fold(f64::NEG_INFINITY, f64::max);
    if (y_max - y_min).abs() <= 1e-12 {
        return None;
    }

    fit_trace_points(&points, fixed_protein_decay_rate, max_onset_minutes)
}

fn fit_trace_points(
    points: &[(f64, f64)],
    fixed_protein_decay_rate: Option<f64>,
    max_onset_minutes: Option<f64>,
) -> Option<FitResult> {
    let positive_diffs = points
        .windows(2)
        .filter_map(|window| {
            let diff = window[1].0 - window[0].0;
            (diff > 0.0).then_some(diff)
        })
        .collect::<Vec<_>>();
    if positive_diffs.is_empty() {
        return None;
    }

    let min_positive_dt = positive_diffs.iter().copied().fold(f64::INFINITY, f64::min);
    let max_time = points
        .iter()
        .map(|(time, _)| *time)
        .fold(f64::NEG_INFINITY, f64::max)
        .max(min_positive_dt)
        .max(1.0);
    let min_rate = (1e-4 / max_time).max(1e-6);
    let max_rate = (min_rate * 10.0).max(10.0 / min_positive_dt);

    match fixed_protein_decay_rate {
        Some(rate) => {
            fit_trace_points_with_fixed_protein(points, rate, min_rate, max_rate, max_onset_minutes)
        }
        None => fit_trace_points_independent(points, min_rate, max_rate),
    }
}

fn fit_trace_points_independent(
    points: &[(f64, f64)],
    min_rate: f64,
    max_rate: f64,
) -> Option<FitResult> {
    let mut protein_lower = min_rate.ln();
    let mut protein_upper = max_rate.ln();
    let mut mrna_lower = min_rate.ln();
    let mut mrna_upper = max_rate.ln();
    let mut best_result = None;
    let mut best_score = None;

    let mut candidate_counts = vec![RATE_COARSE_CANDIDATE_COUNT];
    candidate_counts.extend((0..RATE_REFINE_PASSES).map(|_| RATE_REFINE_CANDIDATE_COUNT));
    for candidate_count in candidate_counts {
        let protein_logs = linspace(protein_lower, protein_upper, candidate_count);
        let mrna_logs = linspace(mrna_lower, mrna_upper, candidate_count);
        let mut stage_best = None;
        let mut best_indices = None;
        for (protein_index, protein_log) in protein_logs.iter().enumerate() {
            let protein_decay_rate = protein_log.exp();
            for (mrna_index, mrna_log) in mrna_logs.iter().enumerate() {
                let mrna_decay_rate = mrna_log.exp();
                if mrna_decay_rate <= protein_decay_rate {
                    continue;
                }
                let candidate = evaluate_rate_candidate(
                    points,
                    protein_decay_rate,
                    mrna_decay_rate,
                    FIXED_EXPRESSION_ONSET,
                );
                if let Some(candidate) = candidate {
                    if stage_best
                        .as_ref()
                        .map_or(true, |best_candidate: &ScoredFit| {
                            candidate.score < best_candidate.score
                        })
                    {
                        stage_best = Some(candidate);
                        best_indices = Some((protein_index, mrna_index));
                    }
                }
            }
        }

        let Some(candidate) = stage_best else {
            break;
        };
        if best_score.map_or(true, |best_candidate: f64| candidate.score < best_candidate) {
            best_score = Some(candidate.score);
            best_result = Some(candidate.result);
        }

        if candidate_count <= 1 {
            break;
        }
        let (protein_index, mrna_index) = best_indices.unwrap();
        protein_lower = protein_logs[protein_index.saturating_sub(1)];
        protein_upper = protein_logs[(protein_index + 1).min(protein_logs.len() - 1)];
        mrna_lower = mrna_logs[mrna_index.saturating_sub(1)];
        mrna_upper = mrna_logs[(mrna_index + 1).min(mrna_logs.len() - 1)];
        if !(protein_upper > protein_lower && mrna_upper > mrna_lower) {
            break;
        }
    }

    best_result
}

/// Match Python `_candidate_onset_indices`.
fn candidate_onset_indices(times: &[f64], max_onset_minutes: Option<f64>) -> Vec<usize> {
    if times.is_empty() {
        return vec![0];
    }
    let Some(cap) = max_onset_minutes.filter(|&m| m > 0.0) else {
        return vec![0];
    };
    let mut last_candidate = times.len().saturating_sub(2);
    if let Some(last) = (0..times.len()).rfind(|&i| times[i] <= cap) {
        last_candidate = last_candidate.min(last);
    } else {
        return vec![0];
    }
    (0..=last_candidate).collect()
}

fn fit_trace_points_with_fixed_protein(
    points: &[(f64, f64)],
    fixed_protein_decay_rate: f64,
    min_rate: f64,
    max_rate: f64,
    max_onset_minutes: Option<f64>,
) -> Option<FitResult> {
    if !fixed_protein_decay_rate.is_finite() || fixed_protein_decay_rate <= 0.0 {
        return None;
    }
    let mrna_min_rate = min_rate.max(fixed_protein_decay_rate * 1.001);
    if mrna_min_rate >= max_rate {
        return None;
    }

    let times: Vec<f64> = points.iter().map(|(t, _)| *t).collect();
    let mut best_result: Option<FitResult> = None;
    let mut best_sse: Option<f64> = None;

    for &onset_index in &candidate_onset_indices(&times, max_onset_minutes) {
        if onset_index >= times.len() {
            continue;
        }
        let t_onset = times[onset_index];
        if points.iter().filter(|(t, _)| *t >= t_onset).count() < 2 {
            continue;
        }

        let mut mrna_lower = mrna_min_rate.ln();
        let mut mrna_upper = max_rate.ln();
        let mut onset_best: Option<ScoredFit> = None;
        let mut candidate_counts = vec![RATE_COARSE_CANDIDATE_COUNT];
        candidate_counts.extend((0..RATE_REFINE_PASSES).map(|_| RATE_REFINE_CANDIDATE_COUNT));
        for candidate_count in candidate_counts {
            let mrna_logs = linspace(mrna_lower, mrna_upper, candidate_count);
            let mut stage_best = None;
            let mut best_index = None;
            for (index, mrna_log) in mrna_logs.iter().enumerate() {
                let candidate = evaluate_rate_candidate(
                    points,
                    fixed_protein_decay_rate,
                    mrna_log.exp(),
                    t_onset,
                );
                if let Some(candidate) = candidate {
                    if stage_best
                        .as_ref()
                        .map_or(true, |best_candidate: &ScoredFit| {
                            candidate.score < best_candidate.score
                        })
                    {
                        stage_best = Some(candidate);
                        best_index = Some(index);
                    }
                }
            }

            let Some(candidate) = stage_best else {
                break;
            };
            if onset_best
                .as_ref()
                .map_or(true, |b: &ScoredFit| candidate.score < b.score)
            {
                onset_best = Some(candidate);
            }

            if candidate_count <= 1 {
                break;
            }
            let Some(index) = best_index else {
                break;
            };
            mrna_lower = mrna_logs[index.saturating_sub(1)];
            mrna_upper = mrna_logs[(index + 1).min(mrna_logs.len() - 1)];
            if !(mrna_upper > mrna_lower) {
                break;
            }
        }

        if let Some(ob) = onset_best {
            if best_sse.map_or(true, |s| ob.score < s) {
                best_sse = Some(ob.score);
                best_result = Some(ob.result);
            }
        }
    }

    best_result
}

fn evaluate_rate_candidate(
    points: &[(f64, f64)],
    protein_decay_rate: f64,
    mrna_decay_rate: f64,
    expression_onset: f64,
) -> Option<ScoredFit> {
    if !(protein_decay_rate.is_finite() && mrna_decay_rate.is_finite()) {
        return None;
    }
    if mrna_decay_rate <= protein_decay_rate {
        return None;
    }

    let basis: Vec<f64> = points
        .iter()
        .map(|(time, _)| {
            let dt = (time - expression_onset).max(0.0);
            (-protein_decay_rate * dt).exp() - (-mrna_decay_rate * dt).exp()
        })
        .collect();
    if basis.iter().any(|value| !value.is_finite()) {
        return None;
    }

    let n = points.len() as f64;
    let sum_basis = basis.iter().sum::<f64>();
    let sum_basis_sq = basis.iter().map(|value| value * value).sum::<f64>();
    let sum_values = points.iter().map(|(_, value)| *value).sum::<f64>();
    let sum_basis_values = basis
        .iter()
        .zip(points.iter())
        .map(|(basis_value, (_, value))| basis_value * value)
        .sum::<f64>();
    let determinant = n * sum_basis_sq - sum_basis * sum_basis;
    if determinant.abs() <= f64::EPSILON {
        return None;
    }

    let intensity_offset = (sum_values * sum_basis_sq - sum_basis * sum_basis_values) / determinant;
    let expression_amplitude = (n * sum_basis_values - sum_basis * sum_values) / determinant;
    if !intensity_offset.is_finite() || !expression_amplitude.is_finite() {
        return None;
    }
    if expression_amplitude <= 0.0 {
        return None;
    }

    let mut sse = 0.0;
    for ((_, observed_value), basis_value) in points.iter().zip(basis.iter()) {
        let predicted = intensity_offset + expression_amplitude * basis_value;
        if !predicted.is_finite() {
            return None;
        }
        let residual = predicted - observed_value;
        sse += residual * residual;
    }
    if !sse.is_finite() {
        return None;
    }

    Some(ScoredFit {
        score: sse,
        result: FitResult {
            intensity_offset,
            protein_decay_rate,
            mrna_decay_rate,
            expression_onset,
            expression_amplitude,
        },
    })
}

fn linspace(lower: f64, upper: f64, count: usize) -> Vec<f64> {
    if count <= 1 {
        return vec![(lower + upper) * 0.5];
    }
    (0..count)
        .map(|index| {
            let fraction = index as f64 / (count.saturating_sub(1)) as f64;
            lower + (upper - lower) * fraction
        })
        .collect::<Vec<_>>()
}

fn median(values: &[f64]) -> f64 {
    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.total_cmp(b));
    if sorted.is_empty() {
        return f64::NAN;
    }
    let mid = sorted.len() / 2;
    if sorted.len() % 2 == 0 {
        (sorted[mid - 1] + sorted[mid]) * 0.5
    } else {
        sorted[mid]
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::*;

    #[test]
    fn default_output_csv_path_strips_slide_channel_segment() {
        let csv_paths = vec![
            PathBuf::from("/tmp/slide_sc0_ch001_timeseries.csv"),
            PathBuf::from("/tmp/slide_sc2_ch001_timeseries.csv"),
        ];
        let output = default_output_csv_path(&csv_paths, None);
        assert!(output.ends_with("slide_ch001_timeseries_fit.csv"));
    }

    #[test]
    fn default_output_csv_path_drops_image_channel_for_mixed_inputs() {
        let csv_paths = vec![
            PathBuf::from("/tmp/slide_sc0_ch001_timeseries.csv"),
            PathBuf::from("/tmp/slide_sc2_ch002_timeseries.csv"),
        ];
        let output = default_output_csv_path(&csv_paths, None);
        assert!(output.ends_with("slide_timeseries_fit.csv"));
    }

    #[test]
    fn compute_fit_table_recovers_batch_shared_protein_decay_rate() {
        let tempdir = tempdir().unwrap();
        let csv_path = tempdir.path().join("slide_sc2_ch001_timeseries.csv");
        let interval = 1.0;
        let mut contents = String::from("pos,roi,t,corrected\n");
        for frame in 0..25 {
            let time = frame as f64 * interval;
            let trace_a = 2.0 + 40.0 * ((-0.05 * time).exp() - (-0.35 * time).exp());
            let trace_b = 3.5 + 16.0 * ((-0.05 * time).exp() - (-0.7 * time).exp());
            contents.push_str(&format!("25,0,{frame},{trace_a}\n"));
            contents.push_str(&format!("25,1,{frame},{trace_b}\n"));
        }
        fs::write(&csv_path, contents).unwrap();

        let rows = compute_fit_table(&[csv_path], interval).unwrap();

        assert_eq!(rows.len(), 2);
        assert!(rows[0].success);
        assert!(rows[1].success);
        assert!((rows[0].intensity_offset.unwrap() - 2.0).abs() <= 0.1);
        assert!((rows[0].protein_decay_rate.unwrap() - 0.05).abs() <= 0.02);
        assert!((rows[0].mrna_decay_rate.unwrap() - 0.35).abs() <= 0.07);
        assert_eq!(rows[0].expression_onset.unwrap(), 0.0);
        assert!((rows[0].expression_amplitude.unwrap() - 40.0).abs() <= 3.0);

        assert!((rows[1].intensity_offset.unwrap() - 3.5).abs() <= 0.1);
        assert!(
            (rows[1].protein_decay_rate.unwrap() - rows[0].protein_decay_rate.unwrap()).abs()
                <= 1e-12
        );
        assert!((rows[1].mrna_decay_rate.unwrap() - 0.7).abs() <= 0.1);
        assert_eq!(rows[1].expression_onset.unwrap(), 0.0);
        assert!((rows[1].expression_amplitude.unwrap() - 16.0).abs() <= 2.0);
    }

    /// Align with `test_compute_fit_table_respects_max_onset_minutes_in_second_pass` in
    /// `apps/delivery/tests/test_fit.py`.
    #[test]
    fn compute_fit_table_respects_max_onset_minutes_in_second_pass() {
        let tempdir = tempdir().unwrap();
        let csv_path = tempdir.path().join("slide_sc2_ch001_timeseries.csv");
        let interval = 1.0;
        let onset_minutes = 5.0;
        let mut contents = String::from("pos,roi,t,corrected\n");
        for frame in 0..25 {
            let t = frame as f64 * interval;
            let trace_a = 2.0 + 40.0 * ((-0.05 * t).exp() - (-0.35 * t).exp());
            let trace_b = if t < onset_minutes {
                3.5
            } else {
                3.5
                    + 16.0 * ((-0.05 * (t - onset_minutes)).exp()
                        - (-0.7 * (t - onset_minutes)).exp())
            };
            contents.push_str(&format!("25,0,{frame},{trace_a}\n"));
            contents.push_str(&format!("25,1,{frame},{trace_b}\n"));
        }
        fs::write(&csv_path, contents).unwrap();

        let unconstrained =
            compute_fit_table_with_options(&[csv_path.clone()], interval, Some(12.0), 1).unwrap();
        let clamped = compute_fit_table_with_options(&[csv_path], interval, Some(4.0), 1).unwrap();

        let delayed_unconstrained = &unconstrained[1];
        let delayed_clamped = &clamped[1];
        assert!((delayed_unconstrained.expression_onset.unwrap() - onset_minutes).abs() < 1e-5);
        assert!(delayed_clamped.expression_onset.unwrap() <= 4.0);
        assert!(
            (delayed_unconstrained.protein_decay_rate.unwrap() - unconstrained[0].protein_decay_rate.unwrap())
                .abs() < 1e-9
        );
        assert!(delayed_unconstrained.success);
    }

    #[test]
    fn write_fit_csv_preserves_failed_rows_with_blank_coefficients() {
        let tempdir = tempdir().unwrap();
        let output_csv = tempdir.path().join("fit.csv");
        let rows = vec![FitRow {
            slide_channel: Some(0),
            pos: Some(12),
            roi: 1,
            intensity_offset: None,
            protein_decay_rate: None,
            mrna_decay_rate: None,
            expression_onset: None,
            expression_amplitude: None,
            success: false,
        }];

        write_fit_csv(&rows, &output_csv).unwrap();

        let contents = fs::read_to_string(output_csv).unwrap();
        assert!(contents.contains("slide_channel,pos,roi,intensity_offset,protein_decay_rate,mrna_decay_rate,expression_onset,expression_amplitude,success"));
        assert!(contents.contains("0,12,1,,,,,,false"));
    }
}
