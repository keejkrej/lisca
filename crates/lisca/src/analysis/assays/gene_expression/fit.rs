use std::path::{Path, PathBuf};

use rayon::prelude::*;

use crate::analysis::array::{evaluate_kinetic_candidate, KineticFitCoeffs};
use crate::analysis::csv_io::write_csv;

use super::auc::discover_timeseries_csvs;
use super::segment::default_jobs;
use super::traces::{build_fit_tasks, FitTraceTask};

const RATE_COARSE_CANDIDATE_COUNT: usize = 24;
const RATE_REFINE_CANDIDATE_COUNT: usize = 12;
const RATE_REFINE_PASSES: usize = 2;

pub fn run_fit(workspace: &Path, interval: f64, max_onset_minutes: f64, jobs: usize) -> Result<PathBuf, String> {
    if interval <= 0.0 {
        return Err(format!("interval must be > 0, got {interval}"));
    }
    if max_onset_minutes < 0.0 {
        return Err(format!("max_onset_minutes must be >= 0, got {max_onset_minutes}"));
    }
    let csvs = discover_timeseries_csvs(&workspace.join("timeseries"))?;
    let tasks = build_fit_tasks(&csvs)?;
    let jobs = jobs.max(1);
    let first_pass = run_fit_tasks(&tasks, interval, None, max_onset_minutes, jobs);
    let pooled = pooled_protein_decay_rate(&first_pass);
    let rows = if let Some(rate) = pooled {
        run_fit_tasks(&tasks, interval, Some(rate), max_onset_minutes, jobs)
    } else {
        tasks
            .iter()
            .map(|task| failed_fit_row(task.slide_channel, task.pos, task.roi))
            .collect()
    };
    let output = workspace.join("results").join("fit.csv");
    write_fit_csv(&output, &rows)?;
    Ok(output)
}

fn run_fit_tasks(
    tasks: &[FitTraceTask],
    interval: f64,
    fixed_protein_decay_rate: Option<f64>,
    max_onset_minutes: f64,
    jobs: usize,
) -> Vec<FitCsvRow> {
    let fit = |task: &FitTraceTask| fit_task(task, interval, fixed_protein_decay_rate, max_onset_minutes);
    if jobs == 1 || tasks.len() <= 1 {
        return tasks.iter().map(fit).collect();
    }
    tasks.par_iter().map(fit).collect()
}

fn fit_task(
    task: &FitTraceTask,
    interval: f64,
    fixed_protein_decay_rate: Option<f64>,
    max_onset_minutes: f64,
) -> FitCsvRow {
    let times: Vec<f64> = task.times.iter().map(|value| value * interval).collect();
    let values = &task.values;
    match fit_trace_points(&times, values, fixed_protein_decay_rate, max_onset_minutes) {
        Some(result) => successful_fit_row(task.slide_channel, task.pos, task.roi, result),
        None => failed_fit_row(task.slide_channel, task.pos, task.roi),
    }
}

fn fit_trace_points(
    times: &[f64],
    values: &[f64],
    fixed_protein_decay_rate: Option<f64>,
    max_onset_minutes: f64,
) -> Option<KineticFitCoeffs> {
    if times.len() < 3 || values.len() < 3 {
        return None;
    }
    if !times.iter().all(|value| value.is_finite()) || !values.iter().all(|value| value.is_finite()) {
        return None;
    }
    if times.windows(2).all(|pair| (pair[0] - pair[1]).abs() <= 1e-12) {
        return None;
    }
    let min_value = values.iter().copied().fold(f64::INFINITY, f64::min);
    let max_value = values.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    if (max_value - min_value).abs() <= 1e-12 {
        return None;
    }

    let positive_diffs: Vec<f64> = times
        .windows(2)
        .map(|pair| pair[1] - pair[0])
        .filter(|value| *value > 0.0)
        .collect();
    if positive_diffs.is_empty() {
        return None;
    }
    let max_time = times
        .iter()
        .copied()
        .fold(f64::NEG_INFINITY, f64::max)
        .max(positive_diffs.iter().copied().fold(f64::INFINITY, f64::min))
        .max(1.0);
    let min_positive_dt = positive_diffs.iter().copied().fold(f64::INFINITY, f64::min);
    let min_rate = (1e-4 / max_time).max(1e-6);
    let max_rate = (min_rate * 10.0).max(10.0 / min_positive_dt);

    if let Some(fixed) = fixed_protein_decay_rate {
        return fit_trace_points_with_fixed_protein(
            times,
            values,
            fixed,
            min_rate,
            max_rate,
            max_onset_minutes,
        );
    }

    let mut protein_lower = min_rate.ln();
    let mut protein_upper = max_rate.ln();
    let mut mrna_lower = min_rate.ln();
    let mut mrna_upper = max_rate.ln();
    let mut best_result: Option<KineticFitCoeffs> = None;
    let mut best_sse: Option<f64> = None;

    for candidate_count in std::iter::once(RATE_COARSE_CANDIDATE_COUNT).chain(
        std::iter::repeat(RATE_REFINE_CANDIDATE_COUNT).take(RATE_REFINE_PASSES),
    ) {
        let protein_logs = linspace(protein_lower, protein_upper, candidate_count);
        let mrna_logs = linspace(mrna_lower, mrna_upper, candidate_count);
        let mut stage_best: Option<(f64, KineticFitCoeffs)> = None;
        let mut best_indices: Option<(usize, usize)> = None;

        for (protein_index, protein_log) in protein_logs.iter().enumerate() {
            let protein_decay_rate = protein_log.exp();
            for (mrna_index, mrna_log) in mrna_logs.iter().enumerate() {
                let mrna_decay_rate = mrna_log.exp();
                if mrna_decay_rate <= protein_decay_rate {
                    continue;
                }
                if let Some((sse, candidate)) = evaluate_kinetic_candidate(
                    times,
                    values,
                    protein_decay_rate,
                    mrna_decay_rate,
                    0.0,
                ) {
                    if stage_best.as_ref().map(|(best, _)| sse < *best).unwrap_or(true) {
                        stage_best = Some((sse, candidate));
                        best_indices = Some((protein_index, mrna_index));
                    }
                }
            }
        }

        let Some((stage_sse, stage_result)) = stage_best else {
            break;
        };
        if best_sse.map(|best| stage_sse < best).unwrap_or(true) {
            best_sse = Some(stage_sse);
            best_result = Some(stage_result);
        }
        let Some((protein_index, mrna_index)) = best_indices else {
            break;
        };
        if candidate_count <= 1 {
            break;
        }
        protein_lower = protein_logs[protein_index.saturating_sub(1)];
        protein_upper = protein_logs[protein_index.min(protein_logs.len() - 1).max(1)];
        mrna_lower = mrna_logs[mrna_index.saturating_sub(1)];
        mrna_upper = mrna_logs[mrna_index.min(mrna_logs.len() - 1).max(1)];
        if !(protein_upper > protein_lower && mrna_upper > mrna_lower) {
            break;
        }
    }

    best_result
}

fn fit_trace_points_with_fixed_protein(
    times: &[f64],
    values: &[f64],
    fixed_protein_decay_rate: f64,
    min_rate: f64,
    max_rate: f64,
    max_onset_minutes: f64,
) -> Option<KineticFitCoeffs> {
    if !fixed_protein_decay_rate.is_finite() || fixed_protein_decay_rate <= 0.0 {
        return None;
    }
    let mrna_min_rate = (min_rate).max(fixed_protein_decay_rate * 1.001);
    if mrna_min_rate >= max_rate {
        return None;
    }

    let mut best_result: Option<KineticFitCoeffs> = None;
    let mut best_sse: Option<f64> = None;
    for onset_index in candidate_onset_indices(times, max_onset_minutes) {
        let t_onset = times[onset_index];
        if times.iter().filter(|time| **time >= t_onset).count() < 2 {
            continue;
        }
        let mut mrna_lower = mrna_min_rate.ln();
        let mut mrna_upper = max_rate.ln();
        let mut onset_best: Option<(f64, KineticFitCoeffs)> = None;

        for candidate_count in std::iter::once(RATE_COARSE_CANDIDATE_COUNT).chain(
            std::iter::repeat(RATE_REFINE_CANDIDATE_COUNT).take(RATE_REFINE_PASSES),
        ) {
            let mrna_logs = linspace(mrna_lower, mrna_upper, candidate_count);
            let mut stage_best: Option<(f64, KineticFitCoeffs)> = None;
            let mut best_index: Option<usize> = None;
            for (index, mrna_log) in mrna_logs.iter().enumerate() {
                if let Some((sse, candidate)) = evaluate_kinetic_candidate(
                    times,
                    values,
                    fixed_protein_decay_rate,
                    mrna_log.exp(),
                    t_onset,
                ) {
                    if stage_best.as_ref().map(|(best, _)| sse < *best).unwrap_or(true) {
                        stage_best = Some((sse, candidate));
                        best_index = Some(index);
                    }
                }
            }
            let Some((stage_sse, stage_result)) = stage_best else {
                break;
            };
            if onset_best.as_ref().map(|(best, _)| stage_sse < *best).unwrap_or(true) {
                onset_best = Some((stage_sse, stage_result));
            }
            let Some(best_index) = best_index else {
                break;
            };
            if candidate_count <= 1 {
                break;
            }
            mrna_lower = mrna_logs[best_index.saturating_sub(1)];
            mrna_upper = mrna_logs[best_index.min(mrna_logs.len() - 1).max(1)];
            if !(mrna_upper > mrna_lower) {
                break;
            }
        }

        let Some((onset_sse, onset_result)) = onset_best else {
            continue;
        };
        if best_sse.map(|best| onset_sse < best).unwrap_or(true) {
            best_sse = Some(onset_sse);
            best_result = Some(onset_result);
        }
    }
    best_result
}

fn candidate_onset_indices(times: &[f64], max_onset_minutes: f64) -> Vec<usize> {
    if max_onset_minutes <= 0.0 {
        return vec![0];
    }
    let last_candidate_index = times.len().saturating_sub(2);
    let matching: Vec<usize> = times
        .iter()
        .enumerate()
        .filter_map(|(index, time)| (*time <= max_onset_minutes).then_some(index))
        .collect();
    if matching.is_empty() {
        return vec![0];
    }
    let end = last_candidate_index.min(*matching.last().unwrap());
    (0..=end).collect()
}

fn linspace(start: f64, end: f64, count: usize) -> Vec<f64> {
    if count <= 1 {
        return vec![start];
    }
    let step = (end - start) / (count - 1) as f64;
    (0..count).map(|index| start + step * index as f64).collect()
}

fn pooled_protein_decay_rate(rows: &[FitCsvRow]) -> Option<f64> {
    let mut rates = rows
        .iter()
        .filter(|row| row.success)
        .filter_map(|row| row.protein_decay_rate)
        .collect::<Vec<_>>();
    if rates.is_empty() {
        return None;
    }
    rates.sort_by(|left, right| left.partial_cmp(right).unwrap_or(std::cmp::Ordering::Equal));
    Some(rates[rates.len() / 2])
}

#[derive(Debug, Clone)]
struct FitCsvRow {
    slide_channel: Option<u32>,
    pos: i64,
    roi: i64,
    intensity_offset: Option<f64>,
    protein_decay_rate: Option<f64>,
    protein_lifetime: Option<f64>,
    mrna_decay_rate: Option<f64>,
    mrna_lifetime: Option<f64>,
    translation_onset: Option<f64>,
    expression_amplitude: Option<f64>,
    transfection_efficiency: Option<f64>,
    success: bool,
}

fn successful_fit_row(
    slide_channel: Option<u32>,
    pos: i64,
    roi: i64,
    result: KineticFitCoeffs,
) -> FitCsvRow {
    FitCsvRow {
        slide_channel,
        pos,
        roi,
        intensity_offset: Some(result.intensity_offset),
        protein_decay_rate: Some(result.protein_decay_rate),
        protein_lifetime: Some(1.0 / result.protein_decay_rate),
        mrna_decay_rate: Some(result.mrna_decay_rate),
        mrna_lifetime: Some(1.0 / result.mrna_decay_rate),
        translation_onset: Some(result.translation_onset),
        expression_amplitude: Some(result.expression_amplitude),
        transfection_efficiency: Some(
            result.expression_amplitude * (result.mrna_decay_rate - result.protein_decay_rate),
        ),
        success: true,
    }
}

fn failed_fit_row(slide_channel: Option<u32>, pos: i64, roi: i64) -> FitCsvRow {
    FitCsvRow {
        slide_channel,
        pos,
        roi,
        intensity_offset: None,
        protein_decay_rate: None,
        protein_lifetime: None,
        mrna_decay_rate: None,
        mrna_lifetime: None,
        translation_onset: None,
        expression_amplitude: None,
        transfection_efficiency: None,
        success: false,
    }
}

fn write_fit_csv(path: &Path, rows: &[FitCsvRow]) -> Result<(), String> {
    let headers = [
        "slide_channel",
        "pos",
        "roi",
        "intensity_offset",
        "protein_decay_rate",
        "protein_lifetime",
        "mrna_decay_rate",
        "mrna_lifetime",
        "translation_onset",
        "expression_amplitude",
        "transfection_efficiency",
        "success",
    ];
    let csv_rows = rows
        .iter()
        .map(|row| {
            vec![
                row.slide_channel
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                row.pos.to_string(),
                row.roi.to_string(),
                format_optional(row.intensity_offset),
                format_optional(row.protein_decay_rate),
                format_optional(row.protein_lifetime),
                format_optional(row.mrna_decay_rate),
                format_optional(row.mrna_lifetime),
                format_optional(row.translation_onset),
                format_optional(row.expression_amplitude),
                format_optional(row.transfection_efficiency),
                if row.success { "true" } else { "false" }.to_string(),
            ]
        })
        .collect::<Vec<_>>();
    write_csv(path, &headers, &csv_rows)
}

fn format_optional(value: Option<f64>) -> String {
    value
        .filter(|value| value.is_finite())
        .map(|value| value.to_string())
        .unwrap_or_default()
}

pub fn default_fit_jobs() -> usize {
    default_jobs()
}

#[cfg(test)]
mod tests {
    use crate::analysis::array::lstsq_affine;

    #[test]
    fn lstsq_recovers_affine_coefficients() {
        let basis = vec![0.0, 1.0, 2.0, 3.0];
        let values = vec![1.0, 3.0, 5.0, 7.0];
        let (offset, amplitude) = lstsq_affine(&basis, &values).unwrap();
        assert!((offset - 1.0).abs() < 1e-9);
        assert!((amplitude - 2.0).abs() < 1e-9);
    }
}
