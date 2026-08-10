use std::path::{Path, PathBuf};

use rayon::prelude::*;

use crate::analysis::array::trapezoidal_integral;
use crate::analysis::csv_io::{format_float, write_csv};
use crate::analysis::slide::{load_mapping_for_workspace, SlideMapping};
use crate::analysis::timeseries::{
    discover_timeseries_csvs, group_timeseries_rows, parse_timeseries_path, resolve_slide_channel,
};

const OUTPUT_COLUMNS: [&str; 4] = ["slide", "pos", "roi", "auc"];

pub fn run_auc(workspace: &Path, interval: f64) -> Result<PathBuf, String> {
    let mapping = load_mapping_for_workspace(workspace, None)?;
    run_auc_with_mapping(workspace, interval, &mapping)
}

pub fn run_auc_with_mapping(
    workspace: &Path,
    interval: f64,
    mapping: &SlideMapping,
) -> Result<PathBuf, String> {
    if interval <= 0.0 {
        return Err(format!("interval must be > 0, got {interval}"));
    }
    let timeseries_dir = workspace.join("timeseries");
    let csvs = discover_timeseries_csvs(&timeseries_dir)?;
    let rows = compute_auc_table(&csvs, interval, mapping)?;
    let output = workspace.join("results").join("auc.csv");
    write_auc_csv(&output, &rows)?;
    Ok(output)
}

#[derive(Debug, Clone)]
struct AucRow {
    slide_channel: u32,
    pos: i64,
    roi: i64,
    auc: f64,
}

#[derive(Debug, Clone)]
struct AucTraceTask {
    slide_channel: u32,
    pos: i64,
    roi: i64,
    times: Vec<f64>,
    values: Vec<f64>,
}

fn compute_auc_table(
    csvs: &[PathBuf],
    interval: f64,
    mapping: &SlideMapping,
) -> Result<Vec<AucRow>, String> {
    let mut tasks = Vec::new();
    for csv_path in csvs {
        let slide_channel = resolve_slide_channel(csv_path, mapping)?;
        let (position, _channel) = parse_timeseries_path(csv_path)?;
        let (headers, data_rows) = crate::analysis::csv_io::read_csv(csv_path)?;
        let groups = group_timeseries_rows(&headers, &data_rows, "corrected")?;
        for (roi, mut trace) in groups {
            trace.sort_by(|left, right| {
                left.0
                    .partial_cmp(&right.0)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            tasks.push(AucTraceTask {
                slide_channel,
                pos: position as i64,
                roi,
                times: trace.iter().map(|(t, _)| *t).collect(),
                values: trace.iter().map(|(_, value)| *value).collect(),
            });
        }
    }
    if tasks.is_empty() {
        return Err("No AUC rows produced".to_string());
    }

    let mut rows = tasks
        .into_par_iter()
        .map(|task| {
            let times: Vec<f64> = task.times.iter().map(|t| t * interval).collect();
            AucRow {
                slide_channel: task.slide_channel,
                pos: task.pos,
                roi: task.roi,
                auc: trapezoidal_integral(&times, &task.values),
            }
        })
        .collect::<Vec<_>>();
    rows.sort_by(|left, right| {
        (left.slide_channel, left.pos, left.roi).cmp(&(right.slide_channel, right.pos, right.roi))
    });
    Ok(rows)
}

fn write_auc_csv(path: &Path, rows: &[AucRow]) -> Result<(), String> {
    let csv_rows = rows
        .iter()
        .map(|row| {
            vec![
                row.slide_channel.to_string(),
                row.pos.to_string(),
                row.roi.to_string(),
                format_float(row.auc),
            ]
        })
        .collect::<Vec<_>>();
    write_csv(path, &OUTPUT_COLUMNS, &csv_rows)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trapezoidal_auc_matches_reference() {
        let times = [0.0, 1.0, 2.0];
        let values = [0.0, 2.0, 4.0];
        let auc = trapezoidal_integral(&times, &values);
        assert!((auc - 4.0).abs() < 1e-9);
    }
}
