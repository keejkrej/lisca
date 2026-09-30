use std::collections::BTreeMap;
use std::path::Path;

use mplot::prelude::{AxesStyle, GridPos};

use crate::analysis::csv_io::{column_index, parse_f64, read_csv};
use crate::analysis::plot::{
    figure_builder_for_grid, grid_dimensions, sample_labels, save_figure, trace_line_style,
    SAVE_PAD_GRID_INCHES,
};
use crate::analysis::sample::SampleMapping;

pub fn run_plot_kill(
    workspace: &Path,
    mapping: &SampleMapping,
    interval: f64,
) -> Result<(), String> {
    if interval <= 0.0 {
        return Err(format!("interval must be > 0, got {interval}"));
    }

    let curve_csv = workspace.join("results/kill_curve.csv");
    let (headers, rows) = read_csv(&curve_csv)?;
    let t_index = column_index(&headers, "t").ok_or("missing t in kill_curve.csv")?;
    let alive_index =
        column_index(&headers, "n_alive").ok_or("missing n_alive in kill_curve.csv")?;
    let sample_index =
        column_index(&headers, "sample").ok_or("missing sample in kill_curve.csv")?;

    let labels = sample_labels(mapping);
    // Keyed by Sample index so panels follow assay order.
    let mut grouped: BTreeMap<usize, Vec<(f64, f64)>> = BTreeMap::new();
    for row in rows {
        let Some(t) = parse_f64(&row[t_index]) else {
            continue;
        };
        let Some(n_alive) = parse_f64(&row[alive_index]) else {
            continue;
        };
        let Some(sample) = mapping
            .iter()
            .position(|entry| entry.name == row[sample_index])
        else {
            continue;
        };
        grouped
            .entry(sample)
            .or_default()
            .push((t * interval, n_alive));
    }

    if grouped.is_empty() {
        return Err("no kill curve points to plot".to_string());
    }

    for points in grouped.values_mut() {
        points.sort_by(|left, right| {
            left.0
                .partial_cmp(&right.0)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }

    let samples: Vec<usize> = grouped.keys().copied().collect();
    let (rows, cols) = grid_dimensions(samples.len(), 2);
    let mut builder = figure_builder_for_grid(rows, cols);

    for (index, sample) in samples.iter().enumerate() {
        let points = grouped.get(sample).cloned().unwrap_or_default();
        let label = labels.get(sample).cloned().unwrap_or_default();
        let max_x = points.iter().map(|point| point.0).fold(0.0f64, f64::max);
        let max_y = points.iter().map(|point| point.1).fold(0.0f64, f64::max);

        builder = builder.panel(GridPos::new(rows, cols, index + 1), move |panel| {
            let x: Vec<f64> = points.iter().map(|point| point.0).collect();
            let y: Vec<f64> = points.iter().map(|point| point.1).collect();
            panel.line(&x, &y, trace_line_style("steelblue", 1.0));
            panel.axes(
                AxesStyle::new()
                    .title(label)
                    .x_label("time (min)")
                    .y_label("N(alive)")
                    .x_range(0.0, max_x.max(interval))
                    .y_range(0.0, max_y.max(1.0)),
            );
        });
    }

    for index in samples.len()..(rows * cols) {
        builder = builder.panel(GridPos::new(rows, cols, index + 1), |panel| {
            panel.axes(AxesStyle::new().hide(true));
        });
    }

    let figure = builder.build().map_err(|error| error.to_string())?;
    save_figure(
        &figure,
        &workspace.join("results/kill_curve.png"),
        SAVE_PAD_GRID_INCHES,
    )
}
