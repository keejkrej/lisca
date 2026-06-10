use std::path::Path;

use rayon::prelude::*;

use crate::analysis::csv_io::{format_float, write_csv};
use crate::analysis::roi_stack::{position_dir, read_position_index};
use crate::analysis::slide::SlideMapping;

use super::metrics::{compute_masked_roi_metrics, MetricRow};
use super::segment::default_jobs;

pub fn run_timeseries(workspace: &Path, mapping: &SlideMapping, jobs: usize) -> Result<(), String> {
    let _jobs = jobs.max(1);
    for (slide_channel, entry) in mapping {
        let position_rows = entry
            .positions
            .par_iter()
            .map(|position| {
                let pos_dir = match position_dir(workspace, *position) {
                    Ok(path) => path,
                    Err(_) => return Ok(None),
                };
                compute_masked_roi_metrics(
                    workspace,
                    &pos_dir,
                    &read_position_index(&pos_dir)?,
                    *slide_channel,
                    entry.signal_channel,
                    entry.mask_channel,
                )
                .map(Some)
            })
            .collect::<Result<Vec<_>, String>>()?
            .into_iter()
            .flatten()
            .collect::<Vec<_>>();
        if position_rows.is_empty() {
            continue;
        }
        let mut rows = position_rows
            .into_iter()
            .flat_map(|rows| rows.into_iter())
            .collect::<Vec<MetricRow>>();
        rows.sort_by_key(|row| (row.pos, row.roi, row.t));
        let output = workspace
            .join("timeseries")
            .join(format!("sc{slide_channel}_ch{}", entry.signal_channel));
        write_metric_csv(&output, &rows)?;
    }
    Ok(())
}

fn write_metric_csv(path: &Path, rows: &[MetricRow]) -> Result<(), String> {
    let headers = ["pos", "roi", "t", "area", "background", "intensity", "corrected"];
    let csv_rows = rows
        .iter()
        .map(|row| {
            vec![
                row.pos.to_string(),
                row.roi.to_string(),
                row.t.to_string(),
                row.area.to_string(),
                format_float(row.background),
                format_float(row.intensity),
                format_float(row.corrected),
            ]
        })
        .collect::<Vec<_>>();
    write_csv(path, &headers, &csv_rows)
}

pub fn default_timeseries_jobs() -> usize {
    default_jobs()
}
