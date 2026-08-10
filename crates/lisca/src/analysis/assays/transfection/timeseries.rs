use std::collections::BTreeMap;
use std::path::Path;
use std::sync::Mutex;

use rayon::prelude::*;

use crate::analysis::csv_io::{format_float, write_csv};
use crate::analysis::roi_stack::{position_dir, read_position_index};
use crate::analysis::slide::SlideMapping;

use super::metrics::{
    compute_full_frame_roi_metrics, compute_masked_roi_metrics, MetricRow,
};
use super::segment::default_jobs;

pub fn run_timeseries(
    workspace: &Path,
    mapping: &SlideMapping,
    jobs: usize,
) -> Result<(), String> {
    run_timeseries_with_mode(workspace, mapping, jobs, false)
}

pub fn run_timeseries_with_mode(
    workspace: &Path,
    mapping: &SlideMapping,
    jobs: usize,
    full_frame: bool,
) -> Result<(), String> {
    let tasks = mapping
        .iter()
        .flat_map(|(slide_channel, entry)| {
            entry.signal.iter().flat_map(move |&signal_channel| {
                entry
                    .positions
                    .iter()
                    .copied()
                    .map(move |position| (*slide_channel, signal_channel, position))
            })
        })
        .collect::<Vec<_>>();

    if tasks.is_empty() {
        return Err("slide mapping defines no valid positions".to_string());
    }

    let skipped_positions = Mutex::new(BTreeMap::<u32, Vec<u32>>::new());
    let csvs_written = Mutex::new(0usize);

    let pool = rayon::ThreadPoolBuilder::new()
        .num_threads(jobs.max(1))
        .build()
        .map_err(|error| error.to_string())?;

    pool.install(|| {
        tasks.par_iter().try_for_each(|&(slide_channel, signal_channel, position)| {
            let pos_dir = match position_dir(workspace, position) {
                Ok(path) => path,
                Err(_) => {
                    skipped_positions
                        .lock()
                        .map_err(|_| "timeseries skipped_positions lock poisoned".to_string())?
                        .entry(slide_channel)
                        .or_default()
                        .push(position);
                    return Ok::<(), String>(());
                }
            };
            let index = read_position_index(&pos_dir)?;
            let mut rows = if full_frame {
                compute_full_frame_roi_metrics(&pos_dir, &index, signal_channel)?
            } else {
                compute_masked_roi_metrics(workspace, &pos_dir, &index, signal_channel)?
            };
            rows.sort_by_key(|row| (row.pos, row.roi, row.t));
            let output = workspace
                .join("timeseries")
                .join(format!("Pos{position}"))
                .join(format!("ch{signal_channel}.csv"));
            write_metric_csv(&output, &rows)?;
            *csvs_written
                .lock()
                .map_err(|_| "timeseries csvs_written lock poisoned".to_string())? += 1;
            Ok::<(), String>(())
        })
    })?;

    let csvs_written = *csvs_written
        .lock()
        .map_err(|_| "timeseries csvs_written lock poisoned".to_string())?;
    let skipped_positions = skipped_positions
        .into_inner()
        .map_err(|_| "timeseries skipped_positions lock poisoned".to_string())?;

    if csvs_written == 0 {
        if !skipped_positions.is_empty() {
            let skipped_summary = format_skipped_positions(&skipped_positions);
            return Err(format!(
                "No timeseries CSVs written. Skipped positions: {skipped_summary}"
            ));
        }
        return Err("slide mapping defines no valid positions".to_string());
    }

    Ok(())
}

fn write_metric_csv(path: &Path, rows: &[MetricRow]) -> Result<(), String> {
    let headers = ["roi", "t", "area", "background", "sum", "corrected"];
    let csv_rows = rows
        .iter()
        .map(|row| {
            vec![
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

fn format_skipped_positions(skipped_positions: &BTreeMap<u32, Vec<u32>>) -> String {
    skipped_positions
        .iter()
        .map(|(slide_channel, positions)| {
            let listed = positions
                .iter()
                .map(|position| position.to_string())
                .collect::<Vec<_>>()
                .join(", ");
            format!("slide channel {slide_channel} -> {listed}")
        })
        .collect::<Vec<_>>()
        .join("; ")
}

pub fn default_timeseries_jobs() -> usize {
    default_jobs()
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;
    use crate::analysis::slide::{SlideChannelMapping, SlideMapping};

    fn test_mapping(positions: Vec<u32>) -> SlideMapping {
        let mut mapping = BTreeMap::new();
        mapping.insert(
            0,
            SlideChannelMapping {
                positions,
                signal: vec![1],
                mask: 0,
                sample_name: "test".to_string(),
            },
        );
        mapping
    }

    fn test_workspace(label: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!("lisca-ts-{label}-{}", std::process::id()))
    }

    #[test]
    fn timeseries_errors_on_empty_mapping() {
        let workspace = test_workspace("empty");
        let _ = std::fs::remove_dir_all(&workspace);
        std::fs::create_dir_all(&workspace).unwrap();
        let mapping = SlideMapping::new();
        let err = run_timeseries(&workspace, &mapping, 1).unwrap_err();
        assert!(err.contains("no valid positions"));
        let _ = std::fs::remove_dir_all(&workspace);
    }

    #[test]
    fn timeseries_errors_when_all_positions_missing() {
        let workspace = test_workspace("missing");
        let _ = std::fs::remove_dir_all(&workspace);
        std::fs::create_dir_all(&workspace).unwrap();
        let mapping = test_mapping(vec![1, 2]);
        let err = run_timeseries(&workspace, &mapping, 1).unwrap_err();
        assert!(err.contains("No timeseries CSVs written"));
        assert!(err.contains("Skipped positions"));
        assert!(err.contains("slide channel 0 -> 1, 2"));
        let _ = std::fs::remove_dir_all(&workspace);
    }
}
