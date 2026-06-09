use std::collections::BTreeMap;
use std::path::Path;

use mplot::prelude::{AxesStyle, GridPos};

use crate::analysis::assays::gene_expression::auc::discover_timeseries_csvs;
use crate::analysis::assays::gene_expression::traces::{load_trace_panel, TracePanel};
use crate::analysis::csv_io::{column_index, read_csv};
use crate::analysis::plot::{
    default_figure_builder, expand_degenerate_ylim, grid_dimensions, percentile_ylim,
    save_figure, slide_channel_labels, subplot_title, trace_color_alpha, trace_line_style,
    trace_naming_haystack,
};
use crate::analysis::slide::SlideMapping;

pub fn run_plot_timeseries(
    workspace: &Path,
    mapping: &SlideMapping,
    interval: f64,
    columns: usize,
) -> Result<(), String> {
    if interval <= 0.0 {
        return Err(format!("interval must be > 0, got {interval}"));
    }
    let labels = slide_channel_labels(mapping);
    let csvs = discover_timeseries_csvs(&workspace.join("timeseries"))?;
    let corrected_panels = csvs
        .iter()
        .map(|path| load_trace_panel(path, "corrected"))
        .collect::<Result<Vec<_>, String>>()?;
    if corrected_panels.is_empty() {
        return Err("no timeseries panels to plot".to_string());
    }

    let results_dir = workspace.join("results");
    std::fs::create_dir_all(&results_dir).map_err(|error| error.to_string())?;

    write_metric_plots(
        &corrected_panels,
        &results_dir.join("traces.png"),
        "corrected intensity",
        interval,
        columns,
        &labels,
    )?;

    if corrected_panels
        .iter()
        .all(|panel| panel_has_column(&panel.path, "area"))
    {
        let area_panels = csvs
            .iter()
            .map(|path| load_trace_panel(path, "area"))
            .collect::<Result<Vec<_>, String>>()?;
        write_metric_plots(
            &area_panels,
            &results_dir.join("area.png"),
            "mask area",
            interval,
            columns,
            &labels,
        )?;
    }
    Ok(())
}

fn panel_has_column(path: &Path, column: &str) -> bool {
    read_csv(path)
        .ok()
        .and_then(|(headers, _)| column_index(&headers, column))
        .is_some()
}

fn write_metric_plots(
    panels: &[TracePanel],
    output_plot: &Path,
    y_label: &str,
    interval: f64,
    columns: usize,
    labels: &BTreeMap<u32, String>,
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
        labels,
        |index| panel_ylims.get(index).copied().unwrap_or((0.0, 1.0)),
    )?;
    write_subplot_grid(
        panels,
        &shared_y_plot,
        y_label,
        interval,
        columns,
        labels,
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
    labels: &BTreeMap<u32, String>,
    ylim_for_panel: impl Fn(usize) -> (f64, f64),
) -> Result<(), String> {
    let (rows, cols) = grid_dimensions(panels.len(), columns);
    let mut builder = default_figure_builder();

    for (index, panel) in panels.iter().enumerate() {
        let (y_low, y_high) = ylim_for_panel(index);
        let max_t = panel
            .traces
            .iter()
            .flat_map(|trace| trace.iter().map(|point| point.0))
            .fold(0.0f64, f64::max)
            * interval;
        let (color, alpha) = trace_color_alpha(&trace_naming_haystack(&panel.path, labels));
        let title = subplot_title(&panel.path, panel.traces.len(), labels);
        let traces = panel.traces.clone();
        let y_label = y_label.to_string();

        builder = builder.panel(GridPos::new(rows, cols, index + 1), move |p| {
            for trace in &traces {
                let x: Vec<f64> = trace.iter().map(|(t, _)| t * interval).collect();
                let y: Vec<f64> = trace.iter().map(|(_, value)| *value).collect();
                p.line(&x, &y, trace_line_style(color, alpha));
            }
            p.axes(
                AxesStyle::new()
                    .title(title)
                    .x_label("minutes")
                    .y_label(y_label)
                    .y_range(y_low, y_high)
                    .x_range(0.0, max_t.max(interval)),
            );
        });
    }

    for index in panels.len()..(rows * cols) {
        builder = builder.panel(GridPos::new(rows, cols, index + 1), |p| {
            p.axes(AxesStyle::new().hide(true));
        });
    }

    let figure = builder.build().map_err(|error| error.to_string())?;
    save_figure(&figure, output_plot)
}
