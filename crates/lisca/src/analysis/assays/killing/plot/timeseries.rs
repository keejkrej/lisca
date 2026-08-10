use std::path::Path;

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
    let panels = load_trace_panels_by_sample(&csvs, "p_dead", mapping)?;
    if panels.is_empty() {
        return Err("no p_dead timeseries panels to plot".to_string());
    }

    let results_dir = workspace.join("results");
    std::fs::create_dir_all(&results_dir).map_err(|error| error.to_string())?;

    write_metric_plots(
        &panels,
        &results_dir.join("traces.png"),
        "P(dead)",
        interval,
        columns,
        mapping,
    )
}
