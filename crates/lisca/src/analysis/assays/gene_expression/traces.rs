use std::path::PathBuf;

use crate::analysis::csv_io::read_csv;
use crate::analysis::plot::parse_slide_channel;
use crate::analysis::timeseries::group_timeseries_rows;

#[derive(Debug, Clone)]
pub struct FitTraceTask {
    pub slide_channel: Option<u32>,
    pub pos: i64,
    pub roi: i64,
    pub times: Vec<f64>,
    pub values: Vec<f64>,
}

pub fn build_fit_tasks(csvs: &[PathBuf]) -> Result<Vec<FitTraceTask>, String> {
    let mut tasks = Vec::new();
    for csv_path in csvs {
        let slide_channel = parse_slide_channel(csv_path);
        let (headers, rows) = read_csv(csv_path)?;
        let groups = group_timeseries_rows(&headers, &rows, "corrected", true)?;
        for ((pos, roi), mut trace) in groups {
            trace.sort_by(|left, right| {
                left.0
                    .partial_cmp(&right.0)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            tasks.push(FitTraceTask {
                slide_channel,
                pos,
                roi,
                times: trace.iter().map(|point| point.0).collect(),
                values: trace.iter().map(|point| point.1).collect(),
            });
        }
    }
    if tasks.is_empty() {
        return Err("No fit rows produced".to_string());
    }
    Ok(tasks)
}
