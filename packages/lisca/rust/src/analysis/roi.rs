use std::collections::BTreeMap;
use std::path::Path;

use csv::{ReaderBuilder, WriterBuilder};
use serde::{Deserialize, Serialize};

use crate::data::roi::{read_roi_stack_2d, roi_frame_from_stack, PositionIndex};

pub const DEFAULT_QUARTILES: &str = "0.10,0.25,0.50,0.75,0.90";

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct RoiMetricsRow {
    pub pos: u32,
    pub channel: u32,
    pub t: u32,
    pub roi: u32,
    pub x: Option<u32>,
    pub y: Option<u32>,
    pub w: Option<u32>,
    pub h: Option<u32>,
    pub area: u64,
    pub sum: u64,
    pub quartiles: BTreeMap<String, f64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TimeseriesRow {
    pub pos: Option<u32>,
    pub roi: u32,
    pub t: u32,
    pub corrected: f64,
}

pub fn quantile_column_name(quartile: f64) -> Result<String, String> {
    let percentage = quartile * 100.0;
    if (percentage - percentage.round()).abs() > 1e-9 {
        return Err(format!(
            "Quartiles must map to integer percentage column names, got {quartile}"
        ));
    }
    Ok(format!("q{}", percentage.round() as i64))
}

pub fn parse_quartiles(quartiles: &str) -> Result<Vec<f64>, String> {
    let mut values = Vec::new();
    for raw in quartiles.split(',') {
        let value: f64 = raw
            .trim()
            .parse()
            .map_err(|_| format!("Invalid quartile {raw:?}"))?;
        if !(0.0..=1.0).contains(&value) {
            return Err(format!("Quartiles must be between 0 and 1, got {value}"));
        }
        quantile_column_name(value)?;
        values.push(value);
    }
    if values.is_empty() {
        return Err("At least one quartile is required".to_string());
    }
    let mut sorted = values.clone();
    sorted.sort_by(|a, b| a.total_cmp(b));
    sorted.dedup_by(|a, b| (*a - *b).abs() < 1e-12);
    if sorted.len() != values.len() {
        return Err(format!("Quartiles must be unique, got {quartiles}"));
    }
    Ok(sorted)
}

pub fn compute_roi_metrics(
    pos_dir: &Path,
    index: &PositionIndex,
    channel: u32,
    quartiles: &[f64],
) -> Result<Vec<RoiMetricsRow>, String> {
    let quartile_pairs = quartiles
        .iter()
        .copied()
        .map(|quartile| quantile_column_name(quartile).map(|name| (quartile, name)))
        .collect::<Result<Vec<_>, _>>()?;

    let mut rows = Vec::new();
    for roi in &index.rois {
        let stack = read_roi_stack_2d(pos_dir, index, roi)?;
        for timepoint in 0..index.time_count {
            let frame = roi_frame_from_stack(&stack, index, roi, timepoint, channel, 0)?;
            let mut sorted = frame
                .pixels
                .iter()
                .copied()
                .map(f64::from)
                .collect::<Vec<_>>();
            sorted.sort_by(|a, b| a.total_cmp(b));
            let quartile_values = quartile_pairs
                .iter()
                .map(|(quartile, name)| (name.clone(), linear_quantile(&sorted, *quartile)))
                .collect::<BTreeMap<_, _>>();
            let sum = frame
                .pixels
                .iter()
                .fold(0_u64, |acc, value| acc.saturating_add(u64::from(*value)));
            rows.push(RoiMetricsRow {
                pos: index.position,
                channel,
                t: timepoint,
                roi: roi.roi,
                x: roi.x,
                y: roi.y,
                w: roi.w,
                h: roi.h,
                area: frame.pixels.len() as u64,
                sum,
                quartiles: quartile_values,
            });
        }
    }

    if rows.is_empty() {
        return Err("No rows produced".to_string());
    }

    rows.sort_by_key(|row| (row.roi, row.t));
    Ok(rows)
}

pub fn write_metrics_csv(rows: &[RoiMetricsRow], output_csv: &Path) -> Result<(), String> {
    if rows.is_empty() {
        return Err("No rows to write".to_string());
    }

    if let Some(parent) = output_csv.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let mut quartile_headers = rows
        .iter()
        .flat_map(|row| row.quartiles.keys().cloned())
        .collect::<Vec<_>>();
    quartile_headers.sort();
    quartile_headers.dedup();

    let mut writer = WriterBuilder::new()
        .has_headers(true)
        .from_path(output_csv)
        .map_err(|err| err.to_string())?;
    let mut headers = vec![
        "pos".to_string(),
        "channel".to_string(),
        "t".to_string(),
        "roi".to_string(),
        "x".to_string(),
        "y".to_string(),
        "w".to_string(),
        "h".to_string(),
        "area".to_string(),
        "sum".to_string(),
    ];
    headers.extend(quartile_headers.iter().cloned());
    writer
        .write_record(&headers)
        .map_err(|err| err.to_string())?;

    for row in rows {
        let mut record = vec![
            row.pos.to_string(),
            row.channel.to_string(),
            row.t.to_string(),
            row.roi.to_string(),
            row.x.map(|v| v.to_string()).unwrap_or_default(),
            row.y.map(|v| v.to_string()).unwrap_or_default(),
            row.w.map(|v| v.to_string()).unwrap_or_default(),
            row.h.map(|v| v.to_string()).unwrap_or_default(),
            row.area.to_string(),
            row.sum.to_string(),
        ];
        for header in &quartile_headers {
            record.push(
                row.quartiles
                    .get(header)
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
            );
        }
        writer.write_record(record).map_err(|err| err.to_string())?;
    }
    writer.flush().map_err(|err| err.to_string())
}

pub fn write_timeseries_csv(rows: &[TimeseriesRow], output_csv: &Path) -> Result<(), String> {
    if rows.is_empty() {
        return Err("No rows to write".to_string());
    }
    if let Some(parent) = output_csv.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let mut writer = WriterBuilder::new()
        .has_headers(true)
        .from_path(output_csv)
        .map_err(|err| err.to_string())?;
    writer
        .write_record(["pos", "roi", "t", "corrected"])
        .map_err(|err| err.to_string())?;
    for row in rows {
        writer
            .write_record([
                row.pos.map(|value| value.to_string()).unwrap_or_default(),
                row.roi.to_string(),
                row.t.to_string(),
                row.corrected.to_string(),
            ])
            .map_err(|err| err.to_string())?;
    }
    writer.flush().map_err(|err| err.to_string())
}

pub fn load_timeseries_csv(csv_path: &Path) -> Result<Vec<TimeseriesRow>, String> {
    let mut reader = ReaderBuilder::new()
        .from_path(csv_path)
        .map_err(|err| err.to_string())?;
    let headers = reader.headers().map_err(|err| err.to_string())?.clone();
    let roi_idx = header_index(&headers, "roi");
    let t_idx = header_index(&headers, "t");
    let corrected_idx = header_index(&headers, "corrected");
    let pos_idx = header_index(&headers, "pos");

    let missing = [("roi", roi_idx), ("t", t_idx), ("corrected", corrected_idx)]
        .into_iter()
        .filter_map(|(name, index)| index.is_none().then_some(name.to_string()))
        .collect::<Vec<_>>();
    if !missing.is_empty() {
        return Err(format!(
            "{} is missing required columns for plotting: {:?}",
            csv_path.display(),
            missing
        ));
    }

    let mut rows = Vec::new();
    for record in reader.records() {
        let record = record.map_err(|err| err.to_string())?;
        let pos = pos_idx
            .and_then(|idx| record.get(idx))
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(|value| {
                value
                    .parse::<u32>()
                    .map_err(|_| format!("Invalid pos value {value:?}"))
            })
            .transpose()?;
        rows.push(TimeseriesRow {
            pos,
            roi: parse_required_u32(&record, roi_idx.unwrap(), "roi")?,
            t: parse_required_u32(&record, t_idx.unwrap(), "t")?,
            corrected: parse_required_f64(&record, corrected_idx.unwrap(), "corrected")?,
        });
    }

    rows.sort_by_key(|row| (row.pos.unwrap_or(0), row.roi, row.t));
    Ok(rows)
}

fn header_index(headers: &csv::StringRecord, name: &str) -> Option<usize> {
    headers.iter().position(|header| header == name)
}

fn parse_required_u32(record: &csv::StringRecord, index: usize, name: &str) -> Result<u32, String> {
    record
        .get(index)
        .unwrap_or_default()
        .parse::<u32>()
        .map_err(|_| format!("Invalid {name} value"))
}

fn parse_required_f64(record: &csv::StringRecord, index: usize, name: &str) -> Result<f64, String> {
    record
        .get(index)
        .unwrap_or_default()
        .parse::<f64>()
        .map_err(|_| format!("Invalid {name} value"))
}

fn linear_quantile(sorted: &[f64], quartile: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    if sorted.len() == 1 {
        return sorted[0];
    }

    let position = quartile * (sorted.len() - 1) as f64;
    let lower = position.floor() as usize;
    let upper = position.ceil() as usize;
    if lower == upper {
        sorted[lower]
    } else {
        let weight = position - lower as f64;
        sorted[lower] + (sorted[upper] - sorted[lower]) * weight
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quantile_column_name_requires_integer_percentages() {
        assert_eq!(quantile_column_name(0.25).unwrap(), "q25");
        assert!(quantile_column_name(0.255)
            .unwrap_err()
            .contains("integer percentage"));
    }

    #[test]
    fn parse_quartiles_sorts_and_deduplicates() {
        assert!(parse_quartiles("0.75,0.25,0.25")
            .unwrap_err()
            .contains("Quartiles must be unique"));
    }

    #[test]
    fn linear_quantile_matches_linear_interpolation() {
        let values = vec![1.0, 3.0, 5.0, 7.0];
        assert_eq!(linear_quantile(&values, 0.25), 2.5);
    }
}
