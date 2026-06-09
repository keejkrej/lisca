//! NumPy-style array helpers for ROI frames, masks, and shared numeric kernels.
//!
//! Transfection describes **goals** for masked reductions and morphology metrics; implementations
//! belong here (`ndarray`) rather than hand-rolled pixel loops.

use ndarray::{Array1, ArrayView2};

#[derive(Debug, Clone)]
pub struct Frame2D {
    pub width: usize,
    pub height: usize,
    data: Vec<f64>,
}

impl Frame2D {
    pub fn from_vec(data: Vec<f64>, width: usize, height: usize) -> Result<Self, String> {
        if width == 0 || height == 0 {
            return Err("frame dimensions must be positive".to_string());
        }
        if data.len() != width * height {
            return Err(format!(
                "frame length {} does not match {width}x{height}",
                data.len()
            ));
        }
        Ok(Self {
            width,
            height,
            data,
        })
    }

    pub fn as_slice(&self) -> &[f64] {
        &self.data
    }

    pub fn as_view(&self) -> ArrayView2<'_, f64> {
        ArrayView2::from_shape((self.height, self.width), &self.data)
            .expect("frame shape matches backing storage")
    }

    pub fn into_vec(self) -> Vec<f64> {
        self.data
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MaskedRoiStats {
    pub area: u32,
    pub intensity: f64,
    pub background: f64,
    pub corrected: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RoiStats {
    pub masked: MaskedRoiStats,
    pub foreground_q25: f64,
    pub foreground_q75: f64,
    pub unmasked_mean: f64,
    pub unmasked_q25: f64,
    pub unmasked_q75: f64,
}

/// Masked ROI reduction matching transfection `compute_masked_roi_metrics`.
pub fn masked_roi_stats(frame: &[f64], mask: &[bool]) -> Result<MaskedRoiStats, String> {
    if frame.len() != mask.len() {
        return Err(format!(
            "frame/mask length mismatch: {} vs {}",
            frame.len(),
            mask.len()
        ));
    }
    if frame.is_empty() {
        return Ok(MaskedRoiStats {
            area: 0,
            intensity: 0.0,
            background: 0.0,
            corrected: 0.0,
        });
    }

    let values = Array1::from_iter(frame.iter().copied());
    let foreground_weight = Array1::from_iter(mask.iter().map(|&masked| f64::from(masked)));
    let background_weight = 1.0 - &foreground_weight;

    let area = foreground_weight.sum() as u32;
    let intensity = (&values * &foreground_weight).sum();
    let background_count = background_weight.sum();
    let background = if background_count > 0.0 {
        (&values * &background_weight).sum() / background_count
    } else {
        0.0
    };
    let corrected = intensity - f64::from(area) * background;

    Ok(MaskedRoiStats {
        area,
        intensity,
        background,
        corrected,
    })
}

/// Masked metrics plus foreground/unmasked quartiles (`np.quantile` parity for morphology).
pub fn roi_stats(frame: &[f64], mask: &[bool]) -> Result<RoiStats, String> {
    let masked = masked_roi_stats(frame, mask)?;
    let foreground: Vec<f64> = frame
        .iter()
        .zip(mask.iter())
        .filter_map(|(value, &masked)| masked.then_some(*value))
        .collect();
    let unmasked_mean = if frame.is_empty() {
        0.0
    } else {
        frame.iter().sum::<f64>() / frame.len() as f64
    };
    Ok(RoiStats {
        masked,
        foreground_q25: quantile(&foreground, 0.25),
        foreground_q75: quantile(&foreground, 0.75),
        unmasked_mean,
        unmasked_q25: quantile(frame, 0.25),
        unmasked_q75: quantile(frame, 0.75),
    })
}

/// Linear interpolation quantile on unsorted values (matches `numpy.quantile` default).
pub fn quantile(values: &[f64], q: f64) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    if values.len() == 1 {
        return values[0];
    }
    let mut sorted = values.to_vec();
    sorted.sort_by(|left, right| left.partial_cmp(right).unwrap_or(std::cmp::Ordering::Equal));
    let position = q.clamp(0.0, 1.0) * (sorted.len() - 1) as f64;
    let lower = position.floor() as usize;
    let upper = position.ceil() as usize;
    if lower == upper {
        sorted[lower]
    } else {
        let weight = position - lower as f64;
        sorted[lower] * (1.0 - weight) + sorted[upper] * weight
    }
}

/// Otsu threshold from histogram bin counts and bin centers.
pub fn otsu_on_histogram(counts: &[f64], centers: &[f64]) -> f64 {
    if counts.is_empty() || centers.is_empty() {
        return 0.0;
    }
    let total: f64 = counts.iter().sum();
    if total <= 0.0 {
        return 0.0;
    }
    let total_intensity: f64 = counts
        .iter()
        .zip(centers.iter())
        .map(|(count, center)| count * center)
        .sum();

    let mut weight_background = 0.0;
    let mut sum_background = 0.0;
    let mut best_variance = f64::NEG_INFINITY;
    let mut best_threshold = centers[0];

    for (count, center) in counts.iter().zip(centers.iter()) {
        weight_background += count;
        if weight_background <= 0.0 || weight_background >= total {
            continue;
        }
        sum_background += center * count;
        let weight_foreground = total - weight_background;
        if weight_foreground <= 0.0 {
            continue;
        }
        let mean_background = sum_background / weight_background;
        let mean_foreground = (total_intensity - sum_background) / weight_foreground;
        let variance = weight_background
            * weight_foreground
            * (mean_background - mean_foreground).powi(2);
        if variance > best_variance {
            best_variance = variance;
            best_threshold = *center;
        }
    }
    best_threshold
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct KineticFitCoeffs {
    pub intensity_offset: f64,
    pub protein_decay_rate: f64,
    pub mrna_decay_rate: f64,
    pub translation_onset: f64,
    pub expression_amplitude: f64,
}

pub fn kinetic_basis_value(
    time: f64,
    protein_decay_rate: f64,
    mrna_decay_rate: f64,
    translation_onset: f64,
) -> f64 {
    if time < translation_onset {
        return 0.0;
    }
    let dt = time - translation_onset;
    (-protein_decay_rate * dt).exp() - (-mrna_decay_rate * dt).exp()
}

pub fn fitted_trace_value(time: f64, coeffs: &KineticFitCoeffs) -> f64 {
    coeffs.intensity_offset
        + coeffs.expression_amplitude
            * kinetic_basis_value(
                time,
                coeffs.protein_decay_rate,
                coeffs.mrna_decay_rate,
                coeffs.translation_onset,
            )
}

pub fn evaluate_kinetic_candidate(
    times: &[f64],
    values: &[f64],
    protein_decay_rate: f64,
    mrna_decay_rate: f64,
    translation_onset: f64,
) -> Option<(f64, KineticFitCoeffs)> {
    if times.len() != values.len() || times.is_empty() {
        return None;
    }
    let times = Array1::from_iter(times.iter().copied());
    let values = Array1::from_iter(values.iter().copied());
    let basis = times.mapv(|time| {
        kinetic_basis_value(time, protein_decay_rate, mrna_decay_rate, translation_onset)
    });
    if !basis.iter().all(|value| value.is_finite()) {
        return None;
    }
    let (intensity_offset, expression_amplitude) =
        lstsq_affine(basis.as_slice().unwrap_or(&[]), values.as_slice().unwrap_or(&[]))?;
    if !intensity_offset.is_finite()
        || !expression_amplitude.is_finite()
        || expression_amplitude <= 0.0
    {
        return None;
    }
    let predicted = &basis * expression_amplitude + intensity_offset;
    let residuals = &predicted - &values;
    let sse = residuals.mapv(|delta| delta * delta).sum();
    if !sse.is_finite() {
        return None;
    }
    Some((
        sse,
        KineticFitCoeffs {
            intensity_offset,
            protein_decay_rate,
            mrna_decay_rate,
            translation_onset,
            expression_amplitude,
        },
    ))
}

pub fn lstsq_affine(basis: &[f64], values: &[f64]) -> Option<(f64, f64)> {
    if basis.len() != values.len() || basis.is_empty() {
        return None;
    }
    let basis = Array1::from_iter(basis.iter().copied());
    let values = Array1::from_iter(values.iter().copied());
    let n = basis.len() as f64;
    let sum_1 = n;
    let sum_x = basis.sum();
    let sum_xx = basis.mapv(|value| value * value).sum();
    let sum_y = values.sum();
    let sum_xy = (&basis * &values).sum();

    let det = sum_1 * sum_xx - sum_x * sum_x;
    if det.abs() <= f64::EPSILON {
        return None;
    }
    let offset = (sum_y * sum_xx - sum_x * sum_xy) / det;
    let amplitude = (sum_1 * sum_xy - sum_x * sum_y) / det;
    Some((offset, amplitude))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn masked_roi_stats_matches_transfection_formula() {
        let frame = [10.0, 20.0, 30.0, 40.0];
        let mask = [true, true, false, false];
        let stats = masked_roi_stats(&frame, &mask).unwrap();
        assert_eq!(stats.area, 2);
        assert!((stats.intensity - 30.0).abs() < 1e-9);
        assert!((stats.background - 35.0).abs() < 1e-9);
        assert!((stats.corrected - (-40.0)).abs() < 1e-9);
    }

    #[test]
    fn roi_stats_includes_quartiles() {
        let frame = [1.0, 2.0, 3.0, 100.0];
        let mask = [true, true, true, false];
        let stats = roi_stats(&frame, &mask).unwrap();
        assert!((stats.foreground_q25 - 1.5).abs() < 1e-9);
        assert!((stats.foreground_q75 - 2.5).abs() < 1e-9);
        assert!((stats.unmasked_q25 - 1.75).abs() < 1e-9);
    }

    #[test]
    fn kinetic_candidate_matches_scalar_formula() {
        let times = [0.0, 1.0, 2.0, 3.0];
        let values = [1.0, 2.0, 2.5, 2.0];
        let result = evaluate_kinetic_candidate(&times, &values, 0.5, 1.0, 0.0).unwrap();
        let predicted = times
            .iter()
            .map(|time| fitted_trace_value(*time, &result.1))
            .collect::<Vec<_>>();
        for (actual, expected) in values.iter().zip(predicted.iter()) {
            assert!((actual - expected).abs() < 0.5);
        }
    }

    #[test]
    fn otsu_on_histogram_splits_bimodal() {
        let counts = vec![25.0, 25.0, 25.0, 25.0];
        let centers = vec![5.0, 15.0, 185.0, 205.0];
        let threshold = otsu_on_histogram(&counts, &centers);
        assert!(threshold >= 15.0 && threshold <= 185.0);
    }

    #[test]
    fn lstsq_recovers_affine_coefficients() {
        let basis = vec![0.0, 1.0, 2.0, 3.0];
        let values = vec![1.0, 3.0, 5.0, 7.0];
        let (offset, amplitude) = lstsq_affine(&basis, &values).unwrap();
        assert!((offset - 1.0).abs() < 1e-9);
        assert!((amplitude - 2.0).abs() < 1e-9);
    }
}
