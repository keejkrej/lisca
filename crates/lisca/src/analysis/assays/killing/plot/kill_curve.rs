use std::collections::BTreeMap;
use std::path::Path;

use mplot::prelude::{AxesStyle, GridPos};

use crate::analysis::csv_io::{column_index, parse_f64, read_csv};
use crate::analysis::plot::{
    figure_builder_for_grid, grid_dimensions, save_figure, slide_channel_labels, trace_line_style,
    SAVE_PAD_GRID_INCHES,
};
use crate::analysis::slide::SlideMapping;

pub fn run_plot_kill(workspace: &Path, mapping: &SlideMapping, interval: f64) -> Result<(), String> {
    if interval <= 0.0 {
        return Err(format!("interval must be > 0, got {interval}"));
    }

    let curve_csv = workspace.join("results/kill_curve.csv");
    let (headers, rows) = read_csv(&curve_csv)?;
    let t_index = column_index(&headers, "t").ok_or("missing t in kill_curve.csv")?;
    let alive_index = column_index(&headers, "n_alive").ok_or("missing n_alive in kill_curve.csv")?;
    let slide_channel_index =
        column_index(&headers, "slide").ok_or("missing slide in kill_curve.csv")?;

    let labels = slide_channel_labels(mapping);
    let mut grouped: BTreeMap<u32, Vec<(f64, f64)>> = BTreeMap::new();
    for row in rows {
        let Some(t) = parse_f64(&row[t_index]) else {
            continue;
        };
        let Some(n_alive) = parse_f64(&row[alive_index]) else {
            continue;
        };
        let Some(slide_channel) = parse_f64(&row[slide_channel_index]).map(|value| value as u32) else {
            continue;
        };
        grouped
            .entry(slide_channel)
            .or_default()
            .push((t * interval, n_alive));
    }

    if grouped.is_empty() {
        return Err("no kill curve points to plot".to_string());
    }

    for points in grouped.values_mut() {
        points.sort_by(|left, right| left.0.partial_cmp(&right.0).unwrap_or(std::cmp::Ordering::Equal));
    }

    let channels: Vec<u32> = grouped.keys().copied().collect();
    let (rows, cols) = grid_dimensions(channels.len(), 2);
    let mut builder = figure_builder_for_grid(rows, cols);

    for (index, slide_channel) in channels.iter().enumerate() {
        let points = grouped.get(slide_channel).cloned().unwrap_or_default();
        let label = labels
            .get(slide_channel)
            .cloned()
            .unwrap_or_else(|| slide_channel.to_string());
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

    for index in channels.len()..(rows * cols) {
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
