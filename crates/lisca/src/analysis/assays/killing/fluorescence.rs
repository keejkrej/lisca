//! Death-reporter fluorescence. Each existing ROI crop is one cell. The signal
//! channel is measured at z=0 with the same full-frame reduction transfection
//! uses when segmentation is skipped. No detection and no classifier.

use std::collections::HashSet;
use std::path::Path;

use crate::analysis::array::full_frame_roi_stats;
use crate::analysis::csv_io::{format_float, write_csv_only};
use crate::analysis::roi_stack::{
    position_dir, read_position_index, roi_frame_2d, validate_channel_index, PositionIndex,
    RoiStack,
};
use crate::analysis::sample::SampleMapping;

struct MetricRow {
    roi: u32,
    t: u32,
    area: u32,
    background: f64,
    intensity: f64,
    corrected: f64,
}

/// Fluorescence series for every Position in `mapping`.
pub fn run_traces(workspace: &Path, mapping: &SampleMapping) -> Result<(), String> {
    let positions = mapping.positions();
    if positions.is_empty() {
        return Err("sample mapping defines no positions".to_string());
    }
    for position in positions {
        run_position_traces(workspace, mapping, position)?;
    }
    Ok(())
}

/// One Position (the Studio `analysis/killing/traces/Pos{n}` step).
///
/// Writes `analysis/Pos{n}/ch{m}.csv` for each signal channel on that Position.
/// The segmentation channel is not read.
pub fn run_position_traces(
    workspace: &Path,
    mapping: &SampleMapping,
    position: u32,
) -> Result<(), String> {
    let shard = mapping.for_position(position);
    if shard.is_empty() {
        return Err(format!("no sample in assay.json lists Pos{position}"));
    }
    let pos_dir = position_dir(workspace, position)?;
    let index = read_position_index(&pos_dir)?;
    let mut seen = HashSet::new();
    let mut wrote = false;
    for sample in shard.iter() {
        for &signal_channel in &sample.signal {
            if !seen.insert(signal_channel) {
                continue;
            }
            validate_channel_index(&index, signal_channel)?;
            let rows = measure_signal(&pos_dir, &index, signal_channel)?;
            let output = workspace
                .join("analysis")
                .join(format!("Pos{position}"))
                .join(format!("ch{signal_channel}.csv"));
            write_metric_csv(&output, &rows)?;
            wrote = true;
        }
    }
    if !wrote {
        return Err(format!("Pos{position} has no signal channel"));
    }
    Ok(())
}

fn measure_signal(
    pos_dir: &Path,
    index: &PositionIndex,
    signal_channel: u32,
) -> Result<Vec<MetricRow>, String> {
    let mut rows = Vec::new();
    for roi in &index.rois {
        let roi_path = pos_dir.join(&roi.file_name);
        if !roi_path.is_file() {
            return Err(format!(
                "Missing ROI TIFF referenced by index.json: {}",
                roi_path.display()
            ));
        }
        let stack = RoiStack::load(&roi_path, roi.shape)?;
        for stack_t in 0..index.time_count {
            let frame = roi_frame_2d(&stack, &index.axis_order, stack_t, signal_channel, 0)?;
            let stats = full_frame_roi_stats(frame.as_slice());
            let source_t = index.time_indices[stack_t as usize];
            rows.push(MetricRow {
                roi: roi.roi,
                t: source_t,
                area: stats.area,
                background: stats.background,
                intensity: stats.intensity,
                corrected: stats.corrected,
            });
        }
    }
    if rows.is_empty() {
        return Err(format!("No fluorescence rows for Pos{}", index.position));
    }
    rows.sort_by_key(|row| (row.roi, row.t));
    Ok(rows)
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
    write_csv_only(path, &headers, &csv_rows)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::analysis::array::full_frame_roi_stats;
    use crate::analysis::csv_io::{format_float, read_csv};
    use crate::analysis::sample::SampleAnalysis;
    use crate::protocol::AssayJsonFile;

    use tiff::encoder::{colortype, TiffEncoder};

    fn write_pages(path: &std::path::Path, pages: &[Vec<u8>]) {
        let file = std::fs::File::create(path).expect("create tiff");
        let mut encoder = TiffEncoder::new(file).expect("encoder");
        for page in pages {
            let image = encoder
                .new_image::<colortype::Gray8>(2, 2)
                .expect("gray image");
            image.write_data(page).expect("write page");
        }
    }

    /// TCZYX pages: for each time, channel 0 then channel 1. Channel 0 is bright
    /// so a reader that used the segmentation plane would not match channel 1.
    fn stack_pages(signal_t0: [u8; 4], signal_t1: [u8; 4]) -> Vec<Vec<u8>> {
        vec![
            vec![255; 4],
            signal_t0.to_vec(),
            vec![255; 4],
            signal_t1.to_vec(),
        ]
    }

    fn write_position(workspace: &std::path::Path, position: u32, signal: [u8; 4]) {
        let pos_dir = workspace.join(format!("roi/Pos{position}"));
        std::fs::create_dir_all(&pos_dir).unwrap();
        write_pages(
            &pos_dir.join("Roi0.tif"),
            &stack_pages(signal, [10, 10, 10, 10]),
        );
        let index = serde_json::json!({
            "position": position,
            "axisOrder": "TCZYX",
            "channelCount": 2,
            "timeCount": 2,
            "zCount": 1,
            "rois": [{
                "roi": 0,
                "fileName": "Roi0.tif",
                "bbox": { "roi": 0, "x": 0, "y": 0, "w": 2, "h": 2 }
            }]
        });
        std::fs::write(
            pos_dir.join("index.json"),
            serde_json::to_string(&index).unwrap(),
        )
        .unwrap();
    }

    fn assay_json() -> String {
        r#"{
            "type": "killing",
            "name": "fluorescence",
            "workspace": { "path": "" },
            "data": { "type": "folder", "path": "", "template": { "subfolder": "", "filename": "" } },
            "interval": { "value": 2.75, "unit": "minute" },
            "samples": [
                { "name": "low", "positions": "1" },
                { "name": "high", "positions": "2" }
            ],
            "analysis": { "channels": { "segmentation": 0, "signal": [1] } }
        }"#
        .to_string()
    }

    #[test]
    fn signal_channel_fluorescence_is_the_full_crop_and_ignores_phase() {
        let workspace = tempfile::tempdir().unwrap();
        let root = workspace.path();
        let signal = [1_u8, 2, 3, 40];
        write_position(root, 1, signal);
        let mapping = SampleMapping(vec![SampleAnalysis {
            name: "low".into(),
            positions: vec![1],
            signal: vec![1],
            segmentation: 0,
        }]);

        run_position_traces(root, &mapping, 1).unwrap();

        let csv_path = root.join("analysis/Pos1/ch1.csv");
        let (headers, rows) = read_csv(&csv_path).unwrap();
        assert_eq!(
            headers,
            ["roi", "t", "area", "background", "sum", "corrected"]
        );
        assert!(!root.join("analysis/Pos1/ch0.csv").exists());
        assert!(!root.join("analysis/Pos1/ch1.xlsx").exists());
        let expected = full_frame_roi_stats(&[1.0, 2.0, 3.0, 40.0]);
        assert_eq!(rows[0][0], "0");
        assert_eq!(rows[0][1], "0");
        assert_eq!(rows[0][2], expected.area.to_string());
        assert_eq!(rows[0][5], format_float(expected.corrected));
        let flat = full_frame_roi_stats(&[10.0, 10.0, 10.0, 10.0]);
        assert_eq!(rows[1][1], "1");
        assert_eq!(rows[1][5], format_float(flat.corrected));
        assert!(expected.corrected > flat.corrected);
    }

    #[test]
    fn run_sync_plots_sample_means_without_a_model() {
        let workspace = tempfile::tempdir().unwrap();
        let root = workspace.path();
        write_position(root, 1, [1, 2, 3, 40]);
        write_position(root, 2, [20, 30, 40, 80]);
        std::fs::write(root.join("assay.json"), assay_json()).unwrap();
        let assay: AssayJsonFile = serde_json::from_str(&assay_json()).unwrap();

        super::super::run_sync(root, &assay).unwrap();

        assert!(root.join("analysis/Pos1/ch1.csv").is_file());
        assert!(root.join("analysis/Pos2/ch1.csv").is_file());
        assert!(root.join("results/low/traces.png").is_file());
        assert!(root.join("results/low/traces_summary.png").is_file());
        assert!(root
            .join("results/low/traces_summary_shared_y.png")
            .is_file());
        assert!(root.join("results/high/traces.png").is_file());
        assert!(root.join("results/low/traces.xlsx").is_file());
        assert!(root.join("results/high/traces.xlsx").is_file());
        assert!(!root.join("results/traces.png").exists());
        assert!(!root.join("results/low/area.png").exists());
        assert!(!root.join("traces").exists());
        assert!(!root.join("results/predictions.csv").exists());
        assert!(!root.join("results/kill_curve.csv").exists());
        assert!(!root.join("results/death_times.csv").exists());
        assert!(!root.join("models").exists());
    }
}
