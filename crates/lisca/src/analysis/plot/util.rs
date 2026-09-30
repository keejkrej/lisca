use std::collections::BTreeMap;
use std::path::PathBuf;

use crate::analysis::array::percentile;
use crate::analysis::sample::SampleMapping;

/// Historical CLI default when callers force an explicit column count.
/// Auto layout (`columns = None`) prefers [`subplot_grid_shape`] instead.
pub const DEFAULT_PLOT_COLUMNS: usize = 3;

/// Sample names keyed by Sample index (assay order).
pub fn sample_labels(mapping: &SampleMapping) -> BTreeMap<usize, String> {
    mapping
        .iter()
        .enumerate()
        .map(|(index, sample)| (index, sample.name.clone()))
        .collect()
}

fn sample_label(sample: usize, mapping: &SampleMapping) -> String {
    mapping
        .get(sample)
        .map(|entry| entry.name.clone())
        .unwrap_or_else(|| format!("sample {sample}"))
}

/// Y-limits: ``low_margin * p_lo`` … ``p_hi / high_margin``.
///
/// Default matches transfection Python: ``0.1 * p1`` … ``p99 / 0.9``.
pub fn percentile_ylim(values: &[f64]) -> (f64, f64) {
    percentile_ylim_with(values, 1.0, 99.0, 0.1, 0.9)
}

pub fn percentile_ylim_with(
    values: &[f64],
    low_percentile: f64,
    high_percentile: f64,
    low_margin: f64,
    high_margin: f64,
) -> (f64, f64) {
    let finite: Vec<f64> = values
        .iter()
        .copied()
        .filter(|value| value.is_finite())
        .collect();
    if finite.is_empty() {
        return (0.0, 1.0);
    }
    if !(0.0 < low_margin && low_margin <= 1.0) || !(0.0 < high_margin && high_margin <= 1.0) {
        return (0.0, 1.0);
    }
    if !(0.0 <= low_percentile && low_percentile < high_percentile && high_percentile <= 100.0) {
        return (0.0, 1.0);
    }
    let low = percentile(&finite, low_percentile) * low_margin;
    let high = percentile(&finite, high_percentile) / high_margin;
    expand_degenerate_ylim(low, high)
}

pub fn expand_degenerate_ylim(low: f64, high: f64) -> (f64, f64) {
    if !low.is_finite() || !high.is_finite() {
        return (0.0, 1.0);
    }
    if low < high {
        return (low, high);
    }
    let pad = if low == 0.0 { 1.0 } else { low.abs() * 0.05 };
    (low - pad, high + pad)
}

/// Sample-count-aware multi-panel layout (transfection Python parity, 1–12 samples):
/// 1→1×1, 2→1×2, 3–4→2×2, 5–6→2×3, 7–9→3×3, 10–12→3×4, else near-square.
pub fn subplot_grid_shape(panel_count: usize) -> (usize, usize) {
    let n = panel_count.max(1);
    match n {
        1 => (1, 1),
        2 => (1, 2),
        3 | 4 => (2, 2),
        5 | 6 => (2, 3),
        7..=9 => (3, 3),
        10..=12 => (3, 4),
        _ => {
            let cols = (n as f64).sqrt().ceil() as usize;
            let rows = n.div_ceil(cols);
            (rows.max(1), cols.max(1))
        }
    }
}

/// Resolve ``(nrows, ncols)``; ``columns = None`` uses [`subplot_grid_shape`].
pub fn resolve_subplot_grid(panel_count: usize, columns: Option<usize>) -> (usize, usize) {
    match columns {
        None => {
            if panel_count == 0 {
                (1, 1)
            } else {
                subplot_grid_shape(panel_count)
            }
        }
        Some(cols) => {
            let cols = cols.max(1);
            if panel_count == 0 {
                (1, cols)
            } else {
                (panel_count.div_ceil(cols).max(1), cols)
            }
        }
    }
}

/// Explicit column count (kill-curve style fixed grids).
pub fn grid_dimensions(count: usize, columns: usize) -> (usize, usize) {
    resolve_subplot_grid(count, Some(columns))
}

pub fn sample_subplot_title(sample: usize, trace_count: usize, mapping: &SampleMapping) -> String {
    let label = sample_label(sample, mapping);
    format!("{label} ({trace_count} traces)")
}

pub fn sample_trace_naming_haystack(
    sample: usize,
    paths: &[PathBuf],
    mapping: &SampleMapping,
) -> String {
    let mut parts = vec![sample_label(sample, mapping)];
    for path in paths {
        if let Some(name) = path.file_name().and_then(|value| value.to_str()) {
            parts.push(name.to_string());
        }
    }
    parts.join(" ")
}

pub fn trace_color_alpha(haystack: &str) -> (&'static str, f64) {
    let lower = haystack.to_lowercase();
    let color = if lower.contains("egfp") || lower.contains("gfp") {
        "green"
    } else if lower.contains("mcherry") {
        "red"
    } else if lower.contains("yfp") {
        "yellow"
    } else if lower.contains("bfp") {
        "blue"
    } else {
        "gray"
    };
    (color, 0.1)
}

#[allow(dead_code)] // transfection boxplots moved to lisca-transfection
pub fn quartile_axis_upper(grouped_values: &[Vec<f64>]) -> f64 {
    let max_q3 = grouped_values
        .iter()
        .filter_map(|values| quartile(values, 0.75))
        .fold(0.0f64, f64::max);
    let upper = max_q3 * 1.25;
    if upper > 0.0 {
        upper
    } else {
        1.0
    }
}

#[allow(dead_code)]
fn quartile(values: &[f64], q: f64) -> Option<f64> {
    if values.is_empty() {
        return None;
    }
    Some(crate::analysis::array::quantile(values, q))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sample_labels_follow_assay_order() {
        use crate::analysis::sample::SampleAnalysis;
        let sample = |name: &str| SampleAnalysis {
            name: name.to_string(),
            positions: vec![1],
            signal: vec![1],
            segmentation: 0,
        };
        let mapping = SampleMapping(vec![sample("zeta"), sample("alpha")]);
        let labels = sample_labels(&mapping);
        assert_eq!(labels.get(&0), Some(&"zeta".to_string()));
        assert_eq!(labels.get(&1), Some(&"alpha".to_string()));
        assert_eq!(sample_subplot_title(1, 4, &mapping), "alpha (4 traces)");
    }

    #[test]
    fn subplot_grid_shape_one_to_twelve() {
        assert_eq!(subplot_grid_shape(1), (1, 1));
        assert_eq!(subplot_grid_shape(2), (1, 2));
        assert_eq!(subplot_grid_shape(3), (2, 2));
        assert_eq!(subplot_grid_shape(4), (2, 2));
        assert_eq!(subplot_grid_shape(5), (2, 3));
        assert_eq!(subplot_grid_shape(6), (2, 3));
        assert_eq!(subplot_grid_shape(7), (3, 3));
        assert_eq!(subplot_grid_shape(9), (3, 3));
        assert_eq!(subplot_grid_shape(10), (3, 4));
        assert_eq!(subplot_grid_shape(12), (3, 4));
    }

    #[test]
    fn percentile_ylim_uses_p1_p99_with_margins() {
        let values: Vec<f64> = (0..=100).map(|v| v as f64).collect();
        let (low, high) = percentile_ylim(&values);
        assert!((low - 0.1).abs() < 1e-9);
        assert!((high - 110.0).abs() < 1e-9);
    }
}
