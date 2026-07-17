//! Assay-neutral loading and grouping for workspace timeseries CSV files.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use super::csv_io::{column_index, parse_f64, read_csv};

#[derive(Debug, Clone)]
pub(crate) struct TracePanel {
    pub path: PathBuf,
    pub traces: Vec<Vec<(f64, f64)>>,
    pub y_values: Vec<f64>,
}

pub(crate) type TracePointGroup = BTreeMap<(i64, i64), Vec<(f64, f64)>>;

pub(crate) fn discover_timeseries_csvs(timeseries_dir: &Path) -> Result<Vec<PathBuf>, String> {
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
            path.extension().is_some_and(|extension| extension == "csv")
                && path
                    .file_stem()
                    .and_then(|stem| stem.to_str())
                    .is_some_and(|stem| stem.starts_with("sc") && stem.contains("_ch"))
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

pub(crate) fn load_trace_panel(path: &Path, y_column: &str) -> Result<TracePanel, String> {
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

pub(crate) fn group_timeseries_rows(
    headers: &[String],
    rows: &[Vec<String>],
    y_column: &str,
    require_pos: bool,
) -> Result<TracePointGroup, String> {
    let t_index = column_index(headers, "t").ok_or("missing t column")?;
    let y_index =
        column_index(headers, y_column).ok_or_else(|| format!("missing {y_column} column"))?;
    let pos_index = column_index(headers, "pos");
    let roi_index = column_index(headers, "roi").ok_or("missing roi column")?;

    let mut groups: TracePointGroup = BTreeMap::new();
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
