use std::collections::BTreeMap;
use std::path::Path;

use crate::analysis::array::percentile;
use crate::analysis::slide::SlideMapping;
use crate::analysis::timeseries::resolve_slide_channel;

pub const DEFAULT_PLOT_COLUMNS: usize = 3;

pub fn slide_channel_labels(mapping: &SlideMapping) -> BTreeMap<u32, String> {
    mapping
        .iter()
        .map(|(channel, entry)| (*channel, entry.sample_name.clone()))
        .collect()
}

pub fn percentile_ylim(values: &[f64], pct: f64) -> (f64, f64) {
    let finite: Vec<f64> = values.iter().copied().filter(|value| value.is_finite()).collect();
    if finite.is_empty() {
        return (0.0, 1.0);
    }
    let low = percentile(&finite, pct);
    let high = percentile(&finite, 100.0 - pct);
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

pub fn grid_dimensions(count: usize, columns: usize) -> (usize, usize) {
    let columns = columns.max(1);
    let rows = count.div_ceil(columns);
    (rows.max(1), columns)
}

pub fn subplot_title(csv_path: &Path, trace_count: usize, mapping: &SlideMapping) -> String {
    let labels = slide_channel_labels(mapping);
    let label = match resolve_slide_channel(csv_path, mapping) {
        Ok(channel) => labels
            .get(&channel)
            .cloned()
            .unwrap_or_else(|| format!("slide channel {channel}")),
        Err(_) => csv_path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("timeseries")
            .to_string(),
    };
    format!("{label} ({trace_count} traces)")
}

pub fn trace_naming_haystack(csv_path: &Path, mapping: &SlideMapping) -> String {
    let labels = slide_channel_labels(mapping);
    let mut parts = vec![
        csv_path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("")
            .to_string(),
        csv_path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("")
            .to_string(),
    ];
    if let Ok(channel) = resolve_slide_channel(csv_path, mapping) {
        if let Some(label) = labels.get(&channel) {
            parts.push(label.clone());
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

pub fn boxplot_tick_label(channel: u32, count: usize, labels: &BTreeMap<u32, String>) -> String {
    let name = labels
        .get(&channel)
        .cloned()
        .unwrap_or_else(|| channel.to_string());
    // Single line so vertical tick labels stay readable when rotated.
    format!("{name} (n={count})")
}

pub fn boxplot_x_axis_label(labels: &BTreeMap<u32, String>) -> &'static str {
    if labels.is_empty() {
        "slide channel"
    } else {
        "sample"
    }
}

pub fn quartile_axis_upper(grouped_values: &[Vec<f64>]) -> f64 {
    let max_q3 = grouped_values
        .iter()
        .filter_map(|values| quartile(values, 0.75))
        .fold(0.0f64, f64::max);
    let upper = max_q3 * 1.25;
    if upper > 0.0 { upper } else { 1.0 }
}

fn quartile(values: &[f64], q: f64) -> Option<f64> {
    if values.is_empty() {
        return None;
    }
    Some(crate::analysis::array::quantile(values, q))
}
