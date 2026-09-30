use std::path::Path;

use crate::analysis::plot::write_metric_plots;
use crate::analysis::sample::SampleMapping;
use crate::analysis::traces::{discover_trace_csvs, load_trace_panels_by_sample};

pub fn run_plot_traces(
    workspace: &Path,
    mapping: &SampleMapping,
    interval: f64,
    columns: Option<usize>,
) -> Result<(), String> {
    if interval <= 0.0 {
        return Err(format!("interval must be > 0, got {interval}"));
    }
    let csvs = discover_trace_csvs(&workspace.join("traces"))?;
    let panels = load_trace_panels_by_sample(&csvs, "p_dead", mapping)?;
    if panels.is_empty() {
        return Err("no p_dead trace panels to plot".to_string());
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
