//! Reference numeric kernels mirroring the sibling **transfection** Python CLI.
//!
//! These are used only in tests to judge LiSCA output parity (workspace CSVs and
//! scalar metrics), not Python module structure. Tolerance constants are documented
//! in `docs/analysis/analysis.md`.

/// Relative tolerance for trapezoidal AUC and masked-intensity metrics (transfection `integrate_trace`).
pub const AUC_REL_TOL: f64 = 1e-6;
/// Relative tolerance for kinetic-fit rate/amplitude parameters after grid search.
pub const FIT_REL_TOL: f64 = 1e-5;
/// Looser tolerance when comparing LiSCA fit CSVs to the transfection Python CLI
/// (grid-search tie-breaking and `lstsq` backends can diverge slightly).
pub const FIT_CLI_REL_TOL: f64 = 2e-2;
/// Absolute floor when comparing values near zero.
pub const NUMERIC_ABS_FLOOR: f64 = 1e-12;

pub fn approx_eq(actual: f64, expected: f64, rel_tol: f64) -> bool {
    if !actual.is_finite() || !expected.is_finite() {
        return actual.is_finite() == expected.is_finite();
    }
    let scale = expected.abs().max(actual.abs()).max(NUMERIC_ABS_FLOOR);
    (actual - expected).abs() <= scale * rel_tol
}

/// transfection `compute_masked_roi_metrics` foreground/background reduction.
pub fn masked_roi_metrics(frame: &[f64], mask: &[bool]) -> (u32, f64, f64, f64) {
    assert_eq!(frame.len(), mask.len());
    let area = mask.iter().filter(|&&m| m).count() as u32;
    let intensity: f64 = frame
        .iter()
        .zip(mask.iter())
        .filter_map(|(value, &m)| m.then_some(*value))
        .sum();
    let background_pixels: Vec<f64> = frame
        .iter()
        .zip(mask.iter())
        .filter_map(|(value, &m)| (!m).then_some(*value))
        .collect();
    let background = if background_pixels.is_empty() {
        0.0
    } else {
        background_pixels.iter().sum::<f64>() / background_pixels.len() as f64
    };
    let corrected = intensity - f64::from(area) * background;
    (area, intensity, background, corrected)
}

/// transfection `integrate_trace` / `numpy.trapz` on `(t * interval, corrected)` pairs.
pub fn integrate_trace(times: &[f64], corrected: &[f64], interval: f64) -> f64 {
    if times.len() < 2 || times.len() != corrected.len() {
        return 0.0;
    }
    let mut pairs: Vec<(f64, f64)> = times
        .iter()
        .zip(corrected.iter())
        .map(|(&t, &y)| (t * interval, y))
        .collect();
    pairs.sort_by(|left, right| left.0.partial_cmp(&right.0).unwrap());
    let mut sum = 0.0;
    for window in pairs.windows(2) {
        let (t0, y0) = window[0];
        let (t1, y1) = window[1];
        sum += (t1 - t0) * (y0 + y1) * 0.5;
    }
    sum
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FitResult {
    pub intensity_offset: f64,
    pub protein_decay_rate: f64,
    pub mrna_decay_rate: f64,
    pub translation_onset: f64,
    pub expression_amplitude: f64,
}

const RATE_COARSE_CANDIDATE_COUNT: usize = 24;
const RATE_REFINE_CANDIDATE_COUNT: usize = 12;
const RATE_REFINE_PASSES: usize = 2;

fn kinetic_basis(time: f64, protein_decay_rate: f64, mrna_decay_rate: f64, translation_onset: f64) -> f64 {
    if time < translation_onset {
        return 0.0;
    }
    let dt = time - translation_onset;
    (-protein_decay_rate * dt).exp() - (-mrna_decay_rate * dt).exp()
}

fn lstsq_affine(basis: &[f64], values: &[f64]) -> Option<(f64, f64)> {
    if basis.len() != values.len() || basis.is_empty() {
        return None;
    }
    let n = basis.len() as f64;
    let sum_1 = n;
    let sum_x: f64 = basis.iter().sum();
    let sum_xx: f64 = basis.iter().map(|value| value * value).sum();
    let sum_y: f64 = values.iter().sum();
    let sum_xy: f64 = basis.iter().zip(values.iter()).map(|(x, y)| x * y).sum();
    let det = sum_1 * sum_xx - sum_x * sum_x;
    if det.abs() <= f64::EPSILON {
        return None;
    }
    let offset = (sum_y * sum_xx - sum_x * sum_xy) / det;
    let amplitude = (sum_1 * sum_xy - sum_x * sum_y) / det;
    Some((offset, amplitude))
}

fn evaluate_rate_candidate(
    times: &[f64],
    values: &[f64],
    protein_decay_rate: f64,
    mrna_decay_rate: f64,
    translation_onset: f64,
) -> Option<(f64, FitResult)> {
    let basis: Vec<f64> = times
        .iter()
        .map(|&time| kinetic_basis(time, protein_decay_rate, mrna_decay_rate, translation_onset))
        .collect();
    if !basis.iter().all(|value| value.is_finite()) {
        return None;
    }
    let (intensity_offset, expression_amplitude) = lstsq_affine(&basis, values)?;
    if !intensity_offset.is_finite()
        || !expression_amplitude.is_finite()
        || expression_amplitude <= 0.0
    {
        return None;
    }
    let sse: f64 = basis
        .iter()
        .zip(values.iter())
        .map(|(b, y)| {
            let predicted = intensity_offset + expression_amplitude * b;
            let delta = predicted - y;
            delta * delta
        })
        .sum();
    if !sse.is_finite() {
        return None;
    }
    Some((
        sse,
        FitResult {
            intensity_offset,
            protein_decay_rate,
            mrna_decay_rate,
            translation_onset,
            expression_amplitude,
        },
    ))
}

fn linspace(start: f64, end: f64, count: usize) -> Vec<f64> {
    if count <= 1 {
        return vec![start];
    }
    (0..count)
        .map(|index| start + (end - start) * index as f64 / (count - 1) as f64)
        .collect()
}

fn fit_trace_points(times: &[f64], values: &[f64], fixed_protein_decay_rate: Option<f64>) -> Option<FitResult> {
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
        return fit_with_fixed_protein(times, values, fixed, min_rate, max_rate);
    }

    let mut protein_lower = min_rate.ln();
    let mut protein_upper = max_rate.ln();
    let mut mrna_lower = min_rate.ln();
    let mut mrna_upper = max_rate.ln();
    let mut best_result: Option<FitResult> = None;
    let mut best_sse: Option<f64> = None;

    for candidate_count in std::iter::once(RATE_COARSE_CANDIDATE_COUNT).chain(std::iter::repeat_n(
        RATE_REFINE_CANDIDATE_COUNT,
        RATE_REFINE_PASSES,
    )) {
        let protein_logs = linspace(protein_lower, protein_upper, candidate_count);
        let mrna_logs = linspace(mrna_lower, mrna_upper, candidate_count);
        let mut stage_best: Option<(f64, FitResult)> = None;
        let mut best_indices: Option<(usize, usize)> = None;

        for (protein_index, protein_log) in protein_logs.iter().enumerate() {
            let protein_decay_rate = protein_log.exp();
            for (mrna_index, mrna_log) in mrna_logs.iter().enumerate() {
                let mrna_decay_rate = mrna_log.exp();
                if mrna_decay_rate <= protein_decay_rate {
                    continue;
                }
                if let Some((sse, candidate)) =
                    evaluate_rate_candidate(times, values, protein_decay_rate, mrna_decay_rate, 0.0)
                {
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
        protein_upper = protein_logs[(protein_index + 1).min(protein_logs.len() - 1)];
        mrna_lower = mrna_logs[mrna_index.saturating_sub(1)];
        mrna_upper = mrna_logs[(mrna_index + 1).min(mrna_logs.len() - 1)];
        if !(protein_upper > protein_lower && mrna_upper > mrna_lower) {
            break;
        }
    }
    best_result
}

fn fit_with_fixed_protein(
    times: &[f64],
    values: &[f64],
    fixed_protein_decay_rate: f64,
    min_rate: f64,
    max_rate: f64,
) -> Option<FitResult> {
    if !fixed_protein_decay_rate.is_finite() || fixed_protein_decay_rate <= 0.0 {
        return None;
    }
    let mrna_min_rate = min_rate.max(fixed_protein_decay_rate * 1.001);
    if mrna_min_rate >= max_rate {
        return None;
    }

    let mut best_result: Option<FitResult> = None;
    let mut best_sse: Option<f64> = None;
    for onset_index in 0..1 {
        let t_onset = times[onset_index];
        if times.iter().filter(|time| **time >= t_onset).count() < 2 {
            continue;
        }
        let mut mrna_lower = mrna_min_rate.ln();
        let mut mrna_upper = max_rate.ln();
        let mut onset_best: Option<(f64, FitResult)> = None;

        for candidate_count in std::iter::once(RATE_COARSE_CANDIDATE_COUNT).chain(std::iter::repeat_n(
            RATE_REFINE_CANDIDATE_COUNT,
            RATE_REFINE_PASSES,
        )) {
            let mrna_logs = linspace(mrna_lower, mrna_upper, candidate_count);
            let mut stage_best: Option<(f64, FitResult)> = None;
            let mut best_index: Option<usize> = None;
            for (index, mrna_log) in mrna_logs.iter().enumerate() {
                if let Some((sse, candidate)) = evaluate_rate_candidate(
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
            mrna_upper = mrna_logs[(best_index + 1).min(mrna_logs.len() - 1)];
            if mrna_upper <= mrna_lower {
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

fn pooled_protein_decay_rate(results: &[FitResult]) -> Option<f64> {
    let mut rates: Vec<f64> = results.iter().map(|row| row.protein_decay_rate).collect();
    if rates.is_empty() {
        return None;
    }
    rates.sort_by(|left, right| left.partial_cmp(right).unwrap());
    Some(rates[rates.len() / 2])
}

/// transfection two-pass pooled-protein fit (`max_onset_minutes = 0`).
pub fn fit_trace_table(times: &[f64], values: &[f64], interval: f64) -> Option<FitResult> {
    let times: Vec<f64> = times.iter().map(|value| value * interval).collect();
    let first = fit_trace_points(&times, values, None)?;
    let pooled = pooled_protein_decay_rate(&[first])?;
    fit_trace_points(&times, values, Some(pooled))
}

/// Synthetic kinetic trace from known parameters (for fixture generation).
pub fn synthetic_kinetic_trace(
    frame_indices: &[f64],
    interval_minutes: f64,
    coeffs: FitResult,
) -> Vec<f64> {
    frame_indices
        .iter()
        .map(|&t| {
            let time = t * interval_minutes;
            coeffs.intensity_offset
                + coeffs.expression_amplitude
                    * kinetic_basis(
                        time,
                        coeffs.protein_decay_rate,
                        coeffs.mrna_decay_rate,
                        coeffs.translation_onset,
                    )
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reference_trapz_matches_manual_integral() {
        let auc = integrate_trace(&[0.0, 1.0, 2.0], &[0.0, 2.0, 4.0], 1.0);
        assert!((auc - 4.0).abs() < 1e-9);
    }
}
