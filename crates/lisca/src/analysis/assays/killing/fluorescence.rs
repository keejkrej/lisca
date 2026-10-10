//! Death-reporter fluorescence dispatch into `lisca-killing`.
//!
//! Each existing ROI crop is one cell. The signal channel is measured at z=0
//! with the same full-frame reduction transfection uses when segmentation is
//! skipped. The measurement lives in the killing-assay crate. Plotting stays
//! here with the shared figure composer.

use std::path::Path;

use crate::analysis::sample::SampleMapping;

use super::to_killing_mapping;

/// Fluorescence series for every Position in `mapping`.
pub fn run_traces(workspace: &Path, mapping: &SampleMapping) -> Result<(), String> {
    lisca_killing::run_fluorescence(workspace, &to_killing_mapping(mapping))
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
    lisca_killing::run_position_fluorescence(
        workspace,
        &to_killing_mapping(&mapping.for_position(position)),
        position,
    )
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
