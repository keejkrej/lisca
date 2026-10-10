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
    expand_degenerate_ylim, grid_dimensions, percentile_ylim, percentile_ylim_with,
    quartile_axis_upper, resolve_subplot_grid, sample_labels, sample_subplot_title,
    sample_trace_naming_haystack, subplot_grid_shape, trace_color_alpha, DEFAULT_PLOT_COLUMNS,
};

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use mplot::prelude::{AxesStyle, FillBetweenStyle, GridPos, LegendStyle, LineDash, TickFormat};
use mplot::Color;

use super::array::quantile;
use super::sample::SampleMapping;
use super::traces::TracePanel;

/// One figure per sample. `sample_dir(sample index)` receives
/// `{file_stem}.png`, `{file_stem}_shared_y.png`, `{file_stem}_summary.png`,
/// and `{file_stem}_summary_shared_y.png`. Shared scales pool every sample
/// the way transfection does. The app composes the files.
pub(crate) fn write_per_sample_metric_plots(
    panels: &[TracePanel],
    sample_dir: impl Fn(usize) -> PathBuf,
    file_stem: &str,
    y_label: &str,
    interval: f64,
    mapping: &SampleMapping,
) -> Result<(), String> {
    if panels.is_empty() {
        return Err("no panels to plot".to_string());
    }
    let mut all_y = Vec::new();
    for panel in panels {
        all_y.extend_from_slice(&panel.y_values);
    }
    let shared_ylim = percentile_ylim(&all_y);
    let summaries: Vec<Option<SampleSummary>> = panels
        .iter()
        .map(|panel| sample_summary_curves(&panel.traces, interval))
        .collect();
    let mut summary_values = Vec::new();
    for summary in summaries.iter().flatten() {
        summary_values.extend_from_slice(&summary.mean);
        summary_values.extend_from_slice(&summary.median);
        summary_values.extend_from_slice(&summary.q25);
        summary_values.extend_from_slice(&summary.q75);
    }
    let shared_summary = percentile_ylim(&summary_values);

    for (index, panel) in panels.iter().enumerate() {
        let dir = sample_dir(panel.sample);
        std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
        let primary = dir.join(format!("{file_stem}.png"));
        let own = percentile_ylim(&panel.y_values);
        let one = std::slice::from_ref(panel);
        let summary = summaries.get(index).unwrap_or(&None);
        let own_summary = summary_ylim(summary.as_ref());
        write_subplot_grid(one, &primary, y_label, interval, None, mapping, |_| own)?;
        write_subplot_grid(
            one,
            &companion_plot_path(&primary, "shared_y"),
            y_label,
            interval,
            None,
            mapping,
            |_| shared_ylim,
        )?;
        let summary_plot = companion_plot_path(&primary, "summary");
        write_summary_subplot_grid(
            one,
            std::slice::from_ref(summary),
            &summary_plot,
            y_label,
            None,
            mapping,
            |_| own_summary,
        )?;
        write_summary_subplot_grid(
            one,
            std::slice::from_ref(summary),
            &companion_plot_path(&summary_plot, "shared_y"),
            y_label,
            None,
            mapping,
            |_| shared_summary,
        )?;
    }
    Ok(())
}

fn companion_plot_path(primary: &Path, suffix: &str) -> PathBuf {
    let stem = primary
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or("plot");
    primary.with_file_name(format!("{stem}_{suffix}.png"))
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
    mapping: &SampleMapping,
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
            panel.sample,
            &panel.paths,
            mapping,
        ));
        let title = sample_subplot_title(panel.sample, panel.traces.len(), mapping);
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
    mapping: &SampleMapping,
    ylim_for_panel: impl Fn(usize) -> (f64, f64),
) -> Result<(), String> {
    let (rows, cols) = resolve_subplot_grid(panels.len(), columns);
    let mut builder = figure_builder_for_grid(rows, cols);

    for (index, panel) in panels.iter().enumerate() {
        let (y_low, y_high) = ylim_for_panel(index);
        let (color, _alpha) = trace_color_alpha(&sample_trace_naming_haystack(
            panel.sample,
            &panel.paths,
            mapping,
        ));
        let y_label = y_label.to_string();
        let y_scientific = y_label.contains("intensity");
        let summary = summaries.get(index).and_then(|value| value.as_ref());
        let title = sample_subplot_title(
            panel.sample,
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
