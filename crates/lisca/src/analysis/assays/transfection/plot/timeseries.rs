use std::path::Path;

use crate::analysis::csv_io::{column_index, read_csv};
use crate::analysis::plot::write_metric_plots;
use crate::analysis::slide::SlideMapping;
use crate::analysis::timeseries::{discover_timeseries_csvs, load_trace_panels_by_sample};

pub fn run_plot_timeseries(
    workspace: &Path,
    mapping: &SlideMapping,
    interval: f64,
    columns: Option<usize>,
) -> Result<(), String> {
    if interval <= 0.0 {
        return Err(format!("interval must be > 0, got {interval}"));
    }
    let csvs = discover_timeseries_csvs(&workspace.join("timeseries"))?;
    let corrected_panels = load_trace_panels_by_sample(&csvs, "corrected", mapping)?;
    if corrected_panels.is_empty() {
        return Err("no timeseries panels to plot".to_string());
    }

    let results_dir = workspace.join("results");
    std::fs::create_dir_all(&results_dir).map_err(|error| error.to_string())?;

    write_metric_plots(
        &corrected_panels,
        &results_dir.join("traces.png"),
        "intensity",
        interval,
        columns,
        mapping,
    )?;

    if corrected_panels.iter().all(|panel| {
        panel
            .paths
            .iter()
            .all(|path| panel_has_column(path, "area"))
    }) {
        let area_panels = load_trace_panels_by_sample(&csvs, "area", mapping)?;
        write_metric_plots(
            &area_panels,
            &results_dir.join("area.png"),
            "mask area",
            interval,
            columns,
            mapping,
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
