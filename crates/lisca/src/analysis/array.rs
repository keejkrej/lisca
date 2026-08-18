//! NumPy-style array helpers for ROI frames, masks, and shared numeric kernels.
//!
//! Transfection describes **goals** for masked reductions and morphology metrics; implementations
//! use the `ndarray` ecosystem (`ndarray-stats`, `ndarray-ndimage`) rather than hand-rolled loops.

use ndarray::{s, Array1, ArrayView2};
use ndarray_stats::{interpolate::Linear, Quantile1dExt};
use noisy_float::types::{n64, N64};

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

/// Full-frame ROI reduction: whole crop as foreground; bg = 10th percentile.
pub const FULL_FRAME_BACKGROUND_QUANTILE: f64 = 0.1;

/// Masked ROI reduction matching transfection `compute_masked_roi_metrics`
/// (background = median of non-mask pixels).
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

    let mut background_pixels = Vec::new();
    let mut intensity = 0.0;
    let mut area = 0u32;
    for (value, &is_fg) in frame.iter().zip(mask.iter()) {
        if is_fg {
            intensity += *value;
            area += 1;
        } else {
            background_pixels.push(*value);
        }
    }
    let background = if background_pixels.is_empty() {
        0.0
    } else {
        quantile(&background_pixels, 0.5)
    };
    let corrected = intensity - f64::from(area) * background;

    Ok(MaskedRoiStats {
        area,
        intensity,
        background,
        corrected,
    })
}

/// Full-frame ROI reduction matching transfection `analysis.skipSegment`.
pub fn full_frame_roi_stats(frame: &[f64]) -> MaskedRoiStats {
    if frame.is_empty() {
        return MaskedRoiStats {
            area: 0,
            intensity: 0.0,
            background: 0.0,
            corrected: 0.0,
        };
    }
    let area = frame.len() as u32;
    let intensity: f64 = frame.iter().sum();
    let background = quantile(frame, FULL_FRAME_BACKGROUND_QUANTILE);
    MaskedRoiStats {
        area,
        intensity,
        background,
        corrected: intensity - f64::from(area) * background,
    }
}

/// Linear interpolation quantile on unsorted `f64` values (`numpy.quantile` default).
pub fn quantile(values: &[f64], q: f64) -> f64 {
    quantile_linear(values, q)
}

/// Linear interpolation quantile on unsorted `f64` values via `ndarray-stats`.
pub fn quantile_linear(values: &[f64], q: f64) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    if values.len() == 1 {
        return values[0];
    }
    let mut arr = Array1::from_iter(
        values
            .iter()
            .copied()
            .filter(|value| value.is_finite())
            .map(N64::new),
    );
    if arr.is_empty() {
        return 0.0;
    }
    if arr.len() == 1 {
        return arr[0].raw();
    }
    arr.quantile_mut(n64(q.clamp(0.0, 1.0)), &Linear)
        .map(|value| value.raw())
        .unwrap_or(0.0)
}

/// Linear interpolation quantile on a pre-sorted slice (`q` in `[0, 1]`).
pub fn quantile_linear_sorted(sorted: &[f64], q: f64) -> f64 {
    quantile_linear(sorted, q)
}

/// Percentile on unsorted `f64` values (`pct` in `[0, 100]`, linear interpolation).
pub fn percentile(values: &[f64], pct: f64) -> f64 {
    quantile(values, pct / 100.0)
}

/// Floor-index quantile on pre-sorted data (viewer contrast semantics).
pub fn quantile_floor_sorted(sorted: &[f64], q: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let clamped = q.clamp(0.0, 1.0);
    let index = (clamped * (sorted.len().saturating_sub(1)) as f64).floor() as usize;
    sorted[index.min(sorted.len() - 1)]
}

/// Trapezoidal integration of `(times, values)` pairs (`numpy.trapz` parity).
pub fn trapezoidal_integral(times: &[f64], values: &[f64]) -> f64 {
    if times.len() < 2 || times.len() != values.len() {
        return 0.0;
    }
    let t = Array1::from_iter(times.iter().copied());
    let y = Array1::from_iter(values.iter().copied());
    let dt = (&t.slice(s![1..]) - &t.slice(s![..t.len() - 1])) * 0.5;
    let heights = &y.slice(s![..y.len() - 1]) + &y.slice(s![1..]);
    (dt * heights).sum()
}

/// Coefficients for the basic translation–degradation model (Müller et al. 2024
/// Eq. 3; **no** protein maturation):
/// `I(t) = baseline_intensity + expression_amplitude * (e^{-β Δt} − e^{-δ Δt})`
/// for `t ≥ onset_time` (`t0`), else `baseline_intensity`.
///
/// Paper terms: `onset_time` = onset time \(t_0\);
/// `expression_rate = expression_amplitude * (δ − β)` = \(m_0 k_{TL}\);
/// `1/δ` = mRNA lifetime; `1/β` = protein lifetime.
/// `baseline_intensity` is a baseline nuisance, not a kinetic rate.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct KineticFitCoeffs {
    pub baseline_intensity: f64,
    pub protein_decay_rate: f64,
    pub mrna_decay_rate: f64,
    pub onset_time: f64,
    pub expression_amplitude: f64,
}

pub fn kinetic_basis_value(
    time: f64,
    protein_decay_rate: f64,
    mrna_decay_rate: f64,
    onset_time: f64,
) -> f64 {
    if time < onset_time {
        return 0.0;
    }
    let dt = time - onset_time;
    (-protein_decay_rate * dt).exp() - (-mrna_decay_rate * dt).exp()
}

pub fn fitted_trace_value(time: f64, coeffs: &KineticFitCoeffs) -> f64 {
    coeffs.baseline_intensity
        + coeffs.expression_amplitude
            * kinetic_basis_value(
                time,
                coeffs.protein_decay_rate,
                coeffs.mrna_decay_rate,
                coeffs.onset_time,
            )
}

pub fn evaluate_kinetic_candidate(
    times: &[f64],
    values: &[f64],
    protein_decay_rate: f64,
    mrna_decay_rate: f64,
    onset_time: f64,
) -> Option<(f64, KineticFitCoeffs)> {
    if times.len() != values.len() || times.is_empty() {
        return None;
    }
    let times = Array1::from_iter(times.iter().copied());
    let values = Array1::from_iter(values.iter().copied());
    let basis = times
        .mapv(|time| kinetic_basis_value(time, protein_decay_rate, mrna_decay_rate, onset_time));
    if !basis.iter().all(|value| value.is_finite()) {
        return None;
    }
    let (baseline_intensity, expression_amplitude) = lstsq_affine(
        basis.as_slice().unwrap_or(&[]),
        values.as_slice().unwrap_or(&[]),
    )?;
    if !baseline_intensity.is_finite()
        || !expression_amplitude.is_finite()
        || expression_amplitude <= 0.0
    {
        return None;
    }
    let predicted = &basis * expression_amplitude + baseline_intensity;
    let residuals = &predicted - &values;
    let sse = residuals.mapv(|delta| delta * delta).sum();
    if !sse.is_finite() {
        return None;
    }
    Some((
        sse,
        KineticFitCoeffs {
            baseline_intensity,
            protein_decay_rate,
            mrna_decay_rate,
            onset_time,
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
    fn masked_roi_stats_uses_background_median() {
        // bg pixels [20, 100, 40] → median 40 (mean would be ~53.33)
        let frame = [10.0, 20.0, 100.0, 40.0];
        let mask = [true, false, false, false];
        let stats = masked_roi_stats(&frame, &mask).unwrap();
        assert_eq!(stats.area, 1);
        assert!((stats.intensity - 10.0).abs() < 1e-9);
        assert!((stats.background - 40.0).abs() < 1e-9);
        assert!((stats.corrected - (10.0 - 40.0)).abs() < 1e-9);
    }

    #[test]
    fn full_frame_roi_stats_uses_tenth_percentile_background() {
        let frame = [0.0, 10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0];
        let stats = full_frame_roi_stats(&frame);
        assert_eq!(stats.area, 10);
        assert!((stats.intensity - 450.0).abs() < 1e-9);
        assert!((stats.background - quantile(&frame, 0.1)).abs() < 1e-9);
    }

    #[test]
    fn percentile_matches_quantile_scale() {
        let values = [1.0, 2.0, 3.0, 4.0];
        assert!((percentile(&values, 50.0) - quantile(&values, 0.5)).abs() < 1e-9);
    }

    #[test]
    fn quantile_floor_uses_lower_index() {
        let sorted = [1.0, 2.0, 3.0, 4.0];
        assert_eq!(quantile_floor_sorted(&sorted, 0.75), 3.0);
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
    fn trapezoidal_integral_matches_reference() {
        let times = [0.0, 1.0, 2.0];
        let values = [0.0, 2.0, 4.0];
        assert!((trapezoidal_integral(&times, &values) - 4.0).abs() < 1e-9);
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
