use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use crate::analysis::csv_io::{column_index, parse_f64, read_csv};
use crate::analysis::plot::parse_slide_channel;

#[derive(Debug, Clone)]
pub struct TracePanel {
    pub path: PathBuf,
    pub traces: Vec<Vec<(f64, f64)>>,
    pub y_values: Vec<f64>,
}

#[derive(Debug, Clone)]
pub struct FitTraceTask {
    pub slide_channel: Option<u32>,
    pub pos: i64,
    pub roi: i64,
    pub times: Vec<f64>,
    pub values: Vec<f64>,
}

pub fn load_trace_panel(path: &Path, y_column: &str) -> Result<TracePanel, String> {
    let (headers, rows) = read_csv(path)?;
    let groups = group_timeseries_rows(&headers, &rows, y_column, true)?;
    let mut y_values = Vec::new();
    let traces = groups
        .into_values()
        .map(|mut points| {
            points.sort_by(|left, right| {
                left.0
                    .partial_cmp(&right.0)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            y_values.extend(points.iter().map(|(_, value)| *value));
            points
        })
        .collect();
    Ok(TracePanel {
        path: path.to_path_buf(),
        traces,
        y_values,
    })
}

type TracePointGroup = BTreeMap<(i64, i64), Vec<(f64, f64)>>;

pub fn group_timeseries_rows(
    headers: &[String],
    rows: &[Vec<String>],
    y_column: &str,
    require_pos: bool,
) -> Result<TracePointGroup, String> {
    let t_index = column_index(headers, "t").ok_or("missing t column")?;
    let y_index = column_index(headers, y_column)
        .ok_or_else(|| format!("missing {y_column} column"))?;
    let pos_index = column_index(headers, "pos");
    let roi_index = column_index(headers, "roi").ok_or("missing roi column")?;

    let mut groups: BTreeMap<(i64, i64), Vec<(f64, f64)>> = BTreeMap::new();
    for row in rows {
        let pos = if let Some(index) = pos_index {
            parse_f64(&row[index]).ok_or("invalid pos")? as i64
        } else if require_pos {
            return Err("missing pos column".to_string());
        } else {
            0
        };
        let roi = parse_f64(&row[roi_index]).ok_or("invalid roi")? as i64;
        let t = parse_f64(&row[t_index]).ok_or("invalid t")?;
        let y = parse_f64(&row[y_index]).ok_or("invalid y")?;
        groups.entry((pos, roi)).or_default().push((t, y));
    }
    Ok(groups)
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
