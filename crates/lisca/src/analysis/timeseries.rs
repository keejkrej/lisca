//! Assay-neutral loading and grouping for workspace timeseries CSV files.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use super::csv_io::{column_index, parse_f64, read_csv};
use super::slide::SlideMapping;

#[derive(Debug, Clone)]
pub(crate) struct TracePanel {
    /// One subplot per sample (`slide` / slide_channel), not per position CSV.
    pub slide_channel: u32,
    pub paths: Vec<PathBuf>,
    pub traces: Vec<Vec<(f64, f64)>>,
    pub y_values: Vec<f64>,
}

pub(crate) type TracePointGroup = BTreeMap<i64, Vec<(f64, f64)>>;

/// Discover `timeseries/Pos{n}/ch{n}.csv` files.
pub(crate) fn discover_timeseries_csvs(timeseries_dir: &Path) -> Result<Vec<PathBuf>, String> {
    if !timeseries_dir.is_dir() {
        return Err(format!(
            "Expected timeseries/ directory at {}",
            timeseries_dir.display()
        ));
    }
    let mut csvs = Vec::new();
    for entry in std::fs::read_dir(timeseries_dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let pos_dir = entry.path();
        if !pos_dir.is_dir() {
            continue;
        }
        let Some(pos_name) = pos_dir.file_name().and_then(|name| name.to_str()) else {
            continue;
        };
        if !pos_name.starts_with("Pos") {
            continue;
        }
        for child in std::fs::read_dir(&pos_dir).map_err(|error| error.to_string())? {
            let child = child.map_err(|error| error.to_string())?;
            let path = child.path();
            if path.extension().is_some_and(|extension| extension == "csv")
                && path
                    .file_stem()
                    .and_then(|stem| stem.to_str())
                    .is_some_and(|stem| {
                        stem.starts_with("ch") && stem[2..].chars().all(|c| c.is_ascii_digit())
                    })
            {
                csvs.push(path);
            }
        }
    }
    csvs.sort_by(|left, right| {
        (
            left.parent()
                .and_then(|p| p.file_name())
                .map(|n| n.to_owned()),
            left.file_name().map(|n| n.to_owned()),
        )
            .cmp(&(
                right
                    .parent()
                    .and_then(|p| p.file_name())
                    .map(|n| n.to_owned()),
                right.file_name().map(|n| n.to_owned()),
            ))
    });
    if csvs.is_empty() {
        return Err(format!(
            "No position metrics CSV files (expected Pos{{n}}/ch{{n}}.csv) in {}",
            timeseries_dir.display()
        ));
    }
    Ok(csvs)
}

/// Parse `(position, signal_channel)` from `…/Pos{n}/ch{n}.csv`.
pub fn parse_timeseries_path(path: &Path) -> Result<(u32, u32), String> {
    let stem = path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .ok_or_else(|| format!("invalid timeseries path {}", path.display()))?;
    let channel = stem
        .strip_prefix("ch")
        .and_then(|rest| rest.parse::<u32>().ok())
        .ok_or_else(|| {
            format!(
                "Expected timeseries path Pos{{n}}/ch{{n}}.csv, got {}",
                path.display()
            )
        })?;
    let parent = path
        .parent()
        .and_then(|parent| parent.file_name())
        .and_then(|name| name.to_str())
        .ok_or_else(|| {
            format!(
                "Expected timeseries path Pos{{n}}/ch{{n}}.csv, got {}",
                path.display()
            )
        })?;
    let position = parent
        .strip_prefix("Pos")
        .and_then(|rest| rest.parse::<u32>().ok())
        .ok_or_else(|| {
            format!(
                "Expected timeseries path Pos{{n}}/ch{{n}}.csv, got {}",
                path.display()
            )
        })?;
    Ok((position, channel))
}

/// Resolve slide channel from assay mapping for a timeseries CSV path.
pub fn resolve_slide_channel(path: &Path, mapping: &SlideMapping) -> Result<u32, String> {
    let (position, signal_channel) = parse_timeseries_path(path)?;
    let mut matches = mapping.iter().filter_map(|(slide_channel, entry)| {
        (entry.signal.contains(&signal_channel) && entry.positions.contains(&position))
            .then_some(*slide_channel)
    });
    let Some(slide_channel) = matches.next() else {
        return Err(format!(
            "No assay mapping entry for Pos{position} signal channel {signal_channel} ({})",
            path.display()
        ));
    };
    if let Some(other) = matches.next() {
        return Err(format!(
            "Ambiguous slide channel for Pos{position} signal channel {signal_channel}: {slide_channel} and {other}"
        ));
    }
    Ok(slide_channel)
}

pub(crate) fn load_trace_panel(path: &Path, y_column: &str) -> Result<TracePanel, String> {
    let (headers, rows) = read_csv(path)?;
    let groups = group_timeseries_rows(&headers, &rows, y_column)?;
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
        slide_channel: 0,
        paths: vec![path.to_path_buf()],
        traces,
        y_values,
    })
}

/// Load position CSVs and merge into one panel per sample (`slide_channel`).
pub(crate) fn load_trace_panels_by_sample(
    csvs: &[PathBuf],
    y_column: &str,
    mapping: &SlideMapping,
) -> Result<Vec<TracePanel>, String> {
    let mut grouped: BTreeMap<u32, TracePanel> = BTreeMap::new();
    for path in csvs {
        let slide_channel = resolve_slide_channel(path, mapping)?;
        let panel = load_trace_panel(path, y_column)?;
        let entry = grouped.entry(slide_channel).or_insert_with(|| TracePanel {
            slide_channel,
            paths: Vec::new(),
            traces: Vec::new(),
            y_values: Vec::new(),
        });
        entry.paths.extend(panel.paths);
        entry.traces.extend(panel.traces);
        entry.y_values.extend(panel.y_values);
    }
    Ok(grouped.into_values().collect())
}

/// Group `(t, y)` points by ROI. Timeseries CSVs are already split per
/// position (`Pos{n}/ch{n}.csv`), so no `pos` column is needed or expected;
/// callers that need the position number parse it from the file path via
/// [`parse_timeseries_path`].
pub(crate) fn group_timeseries_rows(
    headers: &[String],
    rows: &[Vec<String>],
    y_column: &str,
) -> Result<TracePointGroup, String> {
    let t_index = column_index(headers, "t").ok_or("missing t column")?;
    let y_index =
        column_index(headers, y_column).ok_or_else(|| format!("missing {y_column} column"))?;
    let roi_index = column_index(headers, "roi").ok_or("missing roi column")?;

    let mut groups: TracePointGroup = BTreeMap::new();
    for row in rows {
        let roi = parse_f64(&row[roi_index]).ok_or("invalid roi")? as i64;
        let t = parse_f64(&row[t_index]).ok_or("invalid t")?;
        let y = parse_f64(&row[y_index]).ok_or("invalid y")?;
        groups.entry(roi).or_default().push((t, y));
    }
    Ok(groups)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::analysis::slide::SlideChannelMapping;
    use std::collections::BTreeMap;

    #[test]
    fn parse_timeseries_path_reads_pos_and_channel() {
        let path = Path::new("/ws/timeseries/Pos7/ch2.csv");
        assert_eq!(parse_timeseries_path(path).unwrap(), (7, 2));
    }

    #[test]
    fn resolve_slide_channel_uses_mapping() {
        let mut mapping = BTreeMap::new();
        mapping.insert(
            3,
            SlideChannelMapping {
                positions: vec![7],
                signal: vec![2],
                mask: 0,
                sample_name: "A".into(),
            },
        );
        let path = Path::new("/ws/timeseries/Pos7/ch2.csv");
        assert_eq!(resolve_slide_channel(path, &mapping).unwrap(), 3);
    }
}
