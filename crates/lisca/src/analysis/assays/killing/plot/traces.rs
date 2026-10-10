use std::path::Path;

use crate::analysis::assays::transfection::publish_sample_traces_xlsx;
use crate::analysis::plot::write_per_sample_metric_plots;
use crate::analysis::sample::{sample_pack_dirnames, SampleMapping};
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
    let _ = columns;
    let csvs = discover_trace_csvs(&workspace.join("analysis"))?;
    let panels = load_trace_panels_by_sample(&csvs, "corrected", mapping)?;
    if panels.is_empty() {
        return Err("no fluorescence trace panels to plot".to_string());
    }

    publish_sample_traces_xlsx(workspace, mapping)?;
    let dirnames = sample_pack_dirnames(mapping);
    write_per_sample_metric_plots(
        &panels,
        |sample| {
            let dirname = dirnames
                .get(&sample)
                .map(String::as_str)
                .unwrap_or("sample");
            workspace.join("results").join(dirname)
        },
        "traces",
        "fluorescence",
        interval,
        mapping,
    )
}
