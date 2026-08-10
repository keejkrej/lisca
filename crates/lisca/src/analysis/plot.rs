//! Shared plotting helpers used across assay pipelines.

mod mplot_config;
mod util;

// Public API surface for assay plot modules (and external crates).
#[allow(unused_imports)]
pub use mplot_config::{
    figure_builder_for_panels, figure_builder_grid, figure_builder_single, save_figure,
    trace_line_style, FIGURE_DPI, FIGURE_GRID_HEIGHT_IN, FIGURE_GRID_WIDTH_IN,
    FIGURE_SINGLE_HEIGHT_IN, FIGURE_SINGLE_WIDTH_IN, SAVE_PAD_GRID_INCHES,
    SAVE_PAD_SINGLE_INCHES,
};
pub use util::{
    boxplot_tick_label, boxplot_x_axis_label, expand_degenerate_ylim, grid_dimensions,
    percentile_ylim, quartile_axis_upper, sample_subplot_title, sample_trace_naming_haystack,
    slide_channel_labels, subplot_title, trace_color_alpha, trace_naming_haystack,
    DEFAULT_PLOT_COLUMNS,
};

use std::path::Path;

use mplot::prelude::{AxesStyle, GridPos, TickFormat};

use super::slide::SlideMapping;
use super::timeseries::TracePanel;

pub(crate) fn write_metric_plots(
    panels: &[TracePanel],
    output_plot: &Path,
    y_label: &str,
    interval: f64,
    columns: usize,
    mapping: &SlideMapping,
) -> Result<(), String> {
    let panel_ylims: Vec<(f64, f64)> = panels
        .iter()
        // Match transfection plot_timeseries default (5th–95th percentile).
        .map(|panel| percentile_ylim(&panel.y_values, 5.0))
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
    let shared_y_plot = output_plot.with_file_name(format!(
        "{}_shared_y.png",
        output_plot
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("plot")
    ));

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
    Ok(())
}

fn write_subplot_grid(
    panels: &[TracePanel],
    output_plot: &Path,
    y_label: &str,
    interval: f64,
    columns: usize,
    mapping: &SlideMapping,
    ylim_for_panel: impl Fn(usize) -> (f64, f64),
) -> Result<(), String> {
    let (rows, cols) = grid_dimensions(panels.len(), columns);
    let mut builder = figure_builder_for_panels(panels.len());

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
                .x_label("minutes")
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
    let pad = if panels.len() <= 1 {
        SAVE_PAD_SINGLE_INCHES
    } else {
        SAVE_PAD_GRID_INCHES
    };
    save_figure(&figure, output_plot, pad)
}
