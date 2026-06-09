use std::path::{Path, PathBuf};

use crate::analysis::array::trapezoidal_integral;
use crate::analysis::csv_io::{format_float, write_csv};
use crate::analysis::plot::parse_slide_channel;

use super::traces::group_timeseries_rows;

const OUTPUT_COLUMNS: [&str; 4] = ["slide_channel", "pos", "roi", "auc"];

pub fn run_auc(workspace: &Path, interval: f64) -> Result<PathBuf, String> {
    if interval <= 0.0 {
        return Err(format!("interval must be > 0, got {interval}"));
    }
    let timeseries_dir = workspace.join("timeseries");
    let csvs = discover_timeseries_csvs(&timeseries_dir)?;
    let rows = compute_auc_table(&csvs, interval)?;
    let output = workspace.join("results").join("auc.csv");
    write_auc_csv(&output, &rows)?;
    Ok(output)
}

pub fn discover_timeseries_csvs(timeseries_dir: &Path) -> Result<Vec<PathBuf>, String> {
    if !timeseries_dir.is_dir() {
        return Err(format!(
            "Expected timeseries/ directory at {}",
            timeseries_dir.display()
        ));
    }
    let mut csvs = std::fs::read_dir(timeseries_dir)
        .map_err(|error| error.to_string())?
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension().is_some_and(|ext| ext == "csv")
                && path
                    .file_stem()
                    .and_then(|stem| stem.to_str())
                    .is_some_and(|stem| {
                        stem.starts_with("sc") && stem.contains("_ch")
                    })
        })
        .collect::<Vec<_>>();
    csvs.sort_by_key(|path| path.file_name().map(|name| name.to_owned()));
    if csvs.is_empty() {
        return Err(format!(
            "No workspace metrics CSV files in {}",
            timeseries_dir.display()
        ));
    }
    Ok(csvs)
}

#[derive(Debug, Clone)]
struct AucRow {
    slide_channel: Option<u32>,
    pos: i64,
    roi: i64,
    auc: f64,
}

fn compute_auc_table(csvs: &[PathBuf], interval: f64) -> Result<Vec<AucRow>, String> {
    let mut rows = Vec::new();
    for csv_path in csvs {
        let slide_channel = parse_slide_channel(csv_path);
        let (headers, data_rows) = crate::analysis::csv_io::read_csv(csv_path)?;
        let groups = group_timeseries_rows(&headers, &data_rows, "corrected", true)?;
        for ((pos, roi), mut trace) in groups {
            trace.sort_by(|left, right| {
                left.0
                    .partial_cmp(&right.0)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            let times: Vec<f64> = trace.iter().map(|(t, _)| *t * interval).collect();
            let values: Vec<f64> = trace.iter().map(|(_, value)| *value).collect();
            rows.push(AucRow {
                slide_channel,
                pos,
                roi,
                auc: trapezoidal_integral(&times, &values),
            });
        }
    }
    if rows.is_empty() {
        return Err("No AUC rows produced".to_string());
    }
    rows.sort_by(|left, right| {
        (
            left.slide_channel,
            left.pos,
            left.roi,
        )
            .cmp(&(right.slide_channel, right.pos, right.roi))
    });
    Ok(rows)
}

fn write_auc_csv(path: &Path, rows: &[AucRow]) -> Result<(), String> {
    let csv_rows = rows
        .iter()
        .map(|row| {
            vec![
                row.slide_channel
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
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
