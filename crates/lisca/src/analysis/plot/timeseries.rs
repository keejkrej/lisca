use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use plotpy::{Curve, Plot};

use super::super::auc::discover_timeseries_csvs;
use super::super::csv_io::{column_index, parse_f64, read_csv};
use super::super::slide::SlideMapping;
use super::plotpy_config::{configure_plot, save_plot};
use super::util::{
    expand_degenerate_ylim, grid_dimensions, percentile_ylim, slide_channel_labels,
    subplot_title, trace_color_alpha, trace_naming_haystack,
};

struct TimeseriesPanel {
    path: PathBuf,
    traces: Vec<Vec<(f64, f64)>>,
    y_values: Vec<f64>,
}

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
        .map(|path| load_panel(path, "corrected"))
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
            .map(|path| load_panel(path, "area"))
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

fn load_panel(path: &Path, y_column: &str) -> Result<TimeseriesPanel, String> {
    let (headers, rows) = read_csv(path)?;
    let t_index = column_index(&headers, "t").ok_or("missing t column")?;
    let y_index = column_index(&headers, y_column)
        .ok_or_else(|| format!("missing {y_column} column"))?;
    let pos_index = column_index(&headers, "pos");
    let roi_index = column_index(&headers, "roi").ok_or("missing roi column")?;

    let mut groups: BTreeMap<(i64, i64), Vec<(f64, f64)>> = BTreeMap::new();
    let mut y_values = Vec::new();
    for row in rows {
        let pos = pos_index
            .and_then(|index| parse_f64(&row[index]))
            .map(|value| value as i64)
            .unwrap_or(0);
        let roi = parse_f64(&row[roi_index]).ok_or("invalid roi")? as i64;
        let t = parse_f64(&row[t_index]).ok_or("invalid t")?;
        let y = parse_f64(&row[y_index]).ok_or("invalid y")?;
        groups.entry((pos, roi)).or_default().push((t, y));
        y_values.push(y);
    }

    let traces = groups
        .into_values()
        .map(|mut points| {
            points.sort_by(|left, right| {
                left.0
                    .partial_cmp(&right.0)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            points
        })
        .collect();

    Ok(TimeseriesPanel {
        path: path.to_path_buf(),
        traces,
        y_values,
    })
}

fn write_metric_plots(
    panels: &[TimeseriesPanel],
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
    panels: &[TimeseriesPanel],
    output_plot: &Path,
    y_label: &str,
    interval: f64,
    columns: usize,
    labels: &BTreeMap<u32, String>,
    ylim_for_panel: impl Fn(usize) -> (f64, f64),
) -> Result<(), String> {
    let (rows, cols) = grid_dimensions(panels.len(), columns);
    let mut plot = Plot::new();
    configure_plot(&mut plot);

    for (index, panel) in panels.iter().enumerate() {
        let (y_low, y_high) = ylim_for_panel(index);
        let max_t = panel
            .traces
            .iter()
            .flat_map(|trace| trace.iter().map(|point| point.0))
            .fold(0.0f64, f64::max)
            * interval;
        let (color, alpha) = trace_color_alpha(&trace_naming_haystack(&panel.path, labels));

        plot.set_subplot(rows, cols, index + 1);
        for trace in &panel.traces {
            let x: Vec<f64> = trace.iter().map(|(t, _)| t * interval).collect();
            let y: Vec<f64> = trace.iter().map(|(_, value)| *value).collect();
            let mut curve = Curve::new();
            curve
                .set_line_color(color)
                .set_line_alpha(alpha)
                .set_line_width(1.0)
                .draw(&x, &y);
            plot.add(&curve);
        }
        plot.set_title(&subplot_title(&panel.path, panel.traces.len(), labels))
            .set_labels("minutes", y_label)
            .set_yrange(y_low, y_high)
            .set_xrange(0.0, max_t.max(interval));
    }

    for index in panels.len()..(rows * cols) {
        plot.set_subplot(rows, cols, index + 1).set_hide_axes(true);
    }

    save_plot(&plot, output_plot)
}
