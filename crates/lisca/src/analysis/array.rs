//! NumPy-style array helpers for ROI frames and masks.
//!
//! Transfection uses `numpy` for masked reductions (`frame[mask].sum()`, `frame[~mask].mean()`).
//! Gene expression metrics and future morphology/part-metrics should go through here rather
//! than hand-rolled pixel loops.

use ndarray::Array1;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MaskedRoiStats {
    pub area: u32,
    pub intensity: f64,
    pub background: f64,
    pub corrected: f64,
}

/// Masked ROI reduction matching transfection `compute_masked_roi_metrics`:
/// `foreground = frame[mask]`, `background_pixels = frame[~mask]`.
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
    fn masked_roi_stats_empty_background_is_zero() {
        let frame = [1.0, 2.0, 3.0];
        let mask = [true, true, true];
        let stats = masked_roi_stats(&frame, &mask).unwrap();
        assert_eq!(stats.area, 3);
        assert!((stats.intensity - 6.0).abs() < 1e-9);
        assert!((stats.background).abs() < 1e-9);
        assert!((stats.corrected - 6.0).abs() < 1e-9);
    }
}
