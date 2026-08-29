//! Shared plotting helpers used across assay pipelines.

mod mplot_config;
mod util;

// Public API surface for assay plot modules (and external crates).
#[allow(unused_imports)]
pub use mplot_config::{
    figure_builder_for_grid, figure_builder_for_panels, figure_builder_grid, figure_builder_single,
    figure_size_for_grid, save_figure, trace_line_style, FIGURE_DPI, FIGURE_GRID_HEIGHT_IN,
    FIGURE_GRID_WIDTH_IN, FIGURE_SINGLE_HEIGHT_IN, FIGURE_SINGLE_WIDTH_IN, SAVE_PAD_GRID_INCHES,
    SAVE_PAD_SINGLE_INCHES,
};
#[allow(unused_imports)] // re-exported public API for assay modules / bins
pub use util::{
    boxplot_tick_label, boxplot_x_axis_label, expand_degenerate_ylim, grid_dimensions,
    percentile_ylim, percentile_ylim_with, quartile_axis_upper, resolve_subplot_grid,
    sample_subplot_title, sample_trace_naming_haystack, slide_channel_labels, subplot_grid_shape,
    subplot_title, trace_color_alpha, trace_naming_haystack, DEFAULT_PLOT_COLUMNS,
};

use std::collections::BTreeMap;
use std::path::Path;

use mplot::prelude::{AxesStyle, FillBetweenStyle, GridPos, LegendStyle, LineDash, TickFormat};
use mplot::Color;

use super::array::quantile;
use super::slide::SlideMapping;
use super::timeseries::TracePanel;

/// Write individual-trace grids plus mean/median/IQR summary companions.
///
/// Outputs (when primary is `traces.png`):
/// `traces.png`, `traces_shared_y.png`, `traces_summary.png`, `traces_summary_shared_y.png`.
pub(crate) fn write_metric_plots(
    panels: &[TracePanel],
    output_plot: &Path,
    y_label: &str,
    interval: f64,
    columns: Option<usize>,
    mapping: &SlideMapping,
) -> Result<(), String> {
    let panel_ylims: Vec<(f64, f64)> = panels
        .iter()
        .map(|panel| percentile_ylim(&panel.y_values))
        .collect();
    let unified_low = panel_ylims
        .iter()
        .map(|(low, _)| *low)
        .fold(f64::INFINITY, f64::min);
    let unified_high = panel_ylims
        .iter()
        .map(|(_, high)| *high)
        .fold(f64::NEG_INFINITY, f64::max);
    let shared_ylim = expand_degenerate_ylim(unified_low, unified_high);
    let shared_y_plot = companion_plot_path(output_plot, "shared_y");

    write_subplot_grid(
        panels,
        output_plot,
        y_label,
        interval,
        columns,
        mapping,
        |index| panel_ylims.get(index).copied().unwrap_or((0.0, 1.0)),
    )?;
    write_subplot_grid(
        panels,
        &shared_y_plot,
        y_label,
        interval,
        columns,
        mapping,
        |_| shared_ylim,
    )?;

    let summary_plot = companion_plot_path(output_plot, "summary");
    let summary_shared_y_plot = companion_plot_path(&summary_plot, "shared_y");
    write_summary_metric_plots(
        panels,
        &summary_plot,
        &summary_shared_y_plot,
        y_label,
        interval,
        columns,
        mapping,
    )?;
    Ok(())
}

fn companion_plot_path(primary: &Path, suffix: &str) -> std::path::PathBuf {
    let stem = primary
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or("plot");
    primary.with_file_name(format!("{stem}_{suffix}.png"))
}

fn write_summary_metric_plots(
    panels: &[TracePanel],
    output_plot: &Path,
    shared_y_plot: &Path,
    y_label: &str,
    interval: f64,
    columns: Option<usize>,
    mapping: &SlideMapping,
) -> Result<(), String> {
    let summaries: Vec<Option<SampleSummary>> = panels
        .iter()
        .map(|panel| sample_summary_curves(&panel.traces, interval))
        .collect();
    let panel_ylims: Vec<(f64, f64)> = summaries
        .iter()
        .map(|summary| summary_ylim(summary.as_ref()))
        .collect();
    let unified_low = panel_ylims
        .iter()
        .map(|(low, _)| *low)
        .fold(f64::INFINITY, f64::min);
    let unified_high = panel_ylims
        .iter()
        .map(|(_, high)| *high)
        .fold(f64::NEG_INFINITY, f64::max);
    let shared_ylim = expand_degenerate_ylim(unified_low, unified_high);

    write_summary_subplot_grid(
        panels,
        &summaries,
        output_plot,
        y_label,
        columns,
        mapping,
        |index| panel_ylims.get(index).copied().unwrap_or((0.0, 1.0)),
    )?;
    write_summary_subplot_grid(
        panels,
        &summaries,
        shared_y_plot,
        y_label,
        columns,
        mapping,
        |_| shared_ylim,
    )?;
    Ok(())
}

#[derive(Debug, Clone)]
struct SampleSummary {
    t_minutes: Vec<f64>,
    mean: Vec<f64>,
    median: Vec<f64>,
    q25: Vec<f64>,
    q75: Vec<f64>,
    trace_count: usize,
}

fn sample_summary_curves(traces: &[Vec<(f64, f64)>], interval: f64) -> Option<SampleSummary> {
    // Align ROI traces on time (minutes); key microseconds so near-equal floats group.
    let mut by_time: BTreeMap<i64, Vec<f64>> = BTreeMap::new();
    let mut trace_count = 0usize;
    for trace in traces {
        let mut used = false;
        for &(t, y) in trace {
            if !t.is_finite() || !y.is_finite() {
                continue;
            }
            let minutes = t * interval;
            let key = (minutes * 1_000_000.0).round() as i64;
            by_time.entry(key).or_default().push(y);
            used = true;
        }
        if used {
            trace_count += 1;
        }
    }
    if by_time.is_empty() || trace_count == 0 {
        return None;
    }

    let mut t_minutes = Vec::with_capacity(by_time.len());
    let mut mean = Vec::with_capacity(by_time.len());
    let mut median = Vec::with_capacity(by_time.len());
    let mut q25 = Vec::with_capacity(by_time.len());
    let mut q75 = Vec::with_capacity(by_time.len());
    for (key, values) in by_time {
        t_minutes.push(key as f64 / 1_000_000.0);
        let n = values.len() as f64;
        mean.push(values.iter().sum::<f64>() / n);
        median.push(quantile(&values, 0.5));
        q25.push(quantile(&values, 0.25));
        q75.push(quantile(&values, 0.75));
    }
    Some(SampleSummary {
        t_minutes,
        mean,
        median,
        q25,
        q75,
        trace_count,
    })
}

fn summary_ylim(summary: Option<&SampleSummary>) -> (f64, f64) {
    let Some(summary) = summary else {
        return (0.0, 1.0);
    };
    let mut values = Vec::with_capacity(
        summary.mean.len() + summary.median.len() + summary.q25.len() + summary.q75.len(),
    );
    values.extend_from_slice(&summary.mean);
    values.extend_from_slice(&summary.median);
    values.extend_from_slice(&summary.q25);
    values.extend_from_slice(&summary.q75);
    percentile_ylim(&values)
}

fn write_subplot_grid(
    panels: &[TracePanel],
    output_plot: &Path,
    y_label: &str,
    interval: f64,
    columns: Option<usize>,
    mapping: &SlideMapping,
    ylim_for_panel: impl Fn(usize) -> (f64, f64),
) -> Result<(), String> {
    let (rows, cols) = resolve_subplot_grid(panels.len(), columns);
    let mut builder = figure_builder_for_grid(rows, cols);

    for (index, panel) in panels.iter().enumerate() {
        let (y_low, y_high) = ylim_for_panel(index);
        let max_t = panel
            .traces
            .iter()
            .flat_map(|trace| trace.iter().map(|point| point.0))
            .fold(0.0f64, f64::max)
            * interval;
        let (color, alpha) = trace_color_alpha(&sample_trace_naming_haystack(
            panel.slide_channel,
            &panel.paths,
            mapping,
        ));
        let title = sample_subplot_title(panel.slide_channel, panel.traces.len(), mapping);
        let traces = panel.traces.clone();
        let y_label = y_label.to_string();
        // Intensity traces (not area) use scientific y-tick labels.
        let y_scientific = y_label.contains("intensity");

        builder = builder.panel(GridPos::new(rows, cols, index + 1), move |panel| {
            for trace in &traces {
                let x: Vec<f64> = trace.iter().map(|(time, _)| time * interval).collect();
                let y: Vec<f64> = trace.iter().map(|(_, value)| *value).collect();
                panel.line(&x, &y, trace_line_style(color, alpha));
            }
            let mut axes = AxesStyle::new()
                .title(title)
                .x_label("time (min)")
                .y_label(y_label)
                .y_range(y_low, y_high)
                .x_range(0.0, max_t.max(interval));
            if y_scientific {
                axes = axes.y_tick_format(TickFormat::Scientific);
            }
            panel.axes(axes);
        });
    }

    for index in panels.len()..(rows * cols) {
        builder = builder.panel(GridPos::new(rows, cols, index + 1), |panel| {
            panel.axes(AxesStyle::new().hide(true));
        });
    }

    let figure = builder.build().map_err(|error| error.to_string())?;
    // Fixed pad for all multi-panel packs so traces/summary canvases match.
    let pad = if panels.len() <= 1 {
        SAVE_PAD_SINGLE_INCHES
    } else {
        SAVE_PAD_GRID_INCHES
    };
    save_figure(&figure, output_plot, pad)
}

fn write_summary_subplot_grid(
    panels: &[TracePanel],
    summaries: &[Option<SampleSummary>],
    output_plot: &Path,
    y_label: &str,
    columns: Option<usize>,
    mapping: &SlideMapping,
    ylim_for_panel: impl Fn(usize) -> (f64, f64),
) -> Result<(), String> {
    let (rows, cols) = resolve_subplot_grid(panels.len(), columns);
    let mut builder = figure_builder_for_grid(rows, cols);

    for (index, panel) in panels.iter().enumerate() {
        let (y_low, y_high) = ylim_for_panel(index);
        let (color, _alpha) = trace_color_alpha(&sample_trace_naming_haystack(
            panel.slide_channel,
            &panel.paths,
            mapping,
        ));
        let y_label = y_label.to_string();
        let y_scientific = y_label.contains("intensity");
        let summary = summaries.get(index).and_then(|value| value.as_ref());
        let title = sample_subplot_title(
            panel.slide_channel,
            summary.map(|s| s.trace_count).unwrap_or(0),
            mapping,
        );
        let show_legend = index == 0;

        builder = builder.panel(GridPos::new(rows, cols, index + 1), move |p| {
            let max_t = if let Some(summary) = summary {
                p.fill_between(
                    &summary.t_minutes,
                    &summary.q25,
                    &summary.q75,
                    FillBetweenStyle::new()
                        .color(Color::hex(color))
                        .alpha(0.25)
                        .label("IQR"),
                );
                p.line(
                    &summary.t_minutes,
                    &summary.median,
                    trace_line_style(color, 1.0)
                        .width(1.8)
                        .dash(LineDash::Solid)
                        .label("median"),
                );
                p.line(
                    &summary.t_minutes,
                    &summary.mean,
                    trace_line_style(color, 1.0)
                        .width(1.5)
                        .dash(LineDash::Dashed)
                        .label("mean"),
                );
                summary
                    .t_minutes
                    .iter()
                    .copied()
                    .fold(0.0f64, f64::max)
                    .max(1.0)
            } else {
                1.0
            };

            let mut axes = AxesStyle::new()
                .title(title)
                .x_label("time (min)")
                .y_label(y_label)
                .y_range(y_low, y_high)
                .x_range(0.0, max_t);
            if y_scientific {
                axes = axes.y_tick_format(TickFormat::Scientific);
            }
            if show_legend && summary.is_some() {
                axes = axes.legend(LegendStyle::show());
            }
            p.axes(axes);
        });
    }

    for index in panels.len()..(rows * cols) {
        builder = builder.panel(GridPos::new(rows, cols, index + 1), |panel| {
            panel.axes(AxesStyle::new().hide(true));
        });
    }

    let figure = builder.build().map_err(|error| error.to_string())?;
    let pad = if panels.len() <= 1 {
        SAVE_PAD_SINGLE_INCHES
    } else {
        SAVE_PAD_GRID_INCHES
    };
    save_figure(&figure, output_plot, pad)
}
