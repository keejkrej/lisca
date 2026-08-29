//! Build a tiny transfection workspace (4×4 ROI, 4 timepoints, 2 channels).

use std::fs::{self, File};
use std::path::{Path, PathBuf};

use tiff::encoder::{colortype, TiffEncoder};

use super::transfection_reference::{masked_roi_metrics, synthetic_kinetic_trace, FitResult};

const WIDTH: usize = 4;
const HEIGHT: usize = 4;
const TIME_COUNT: u32 = 4;
const CHANNEL_COUNT: u32 = 2;
const Z_COUNT: u32 = 1;
const POSITION: u32 = 1;
const ROI_ID: u32 = 1;
const SIGNAL_CHANNEL: u32 = 1;
const MASK_CHANNEL: u32 = 0;
const SLIDE_CHANNEL: u32 = 0;
pub const INTERVAL_MINUTES: f64 = 10.0;

pub struct SyntheticWorkspace {
    pub root: PathBuf,
}

impl SyntheticWorkspace {
    pub fn build(parent: &Path) -> Self {
        let root = parent.join("transfection_fixture");
        if root.exists() {
            fs::remove_dir_all(&root).expect("clean fixture root");
        }
        fs::create_dir_all(root.join("roi").join(format!("Pos{POSITION}"))).expect("roi dir");
        fs::create_dir_all(root.join("mask").join(format!("Pos{POSITION}"))).expect("mask dir");
        fs::create_dir_all(root.join("timeseries")).expect("timeseries dir");
        fs::create_dir_all(root.join("results")).expect("results dir");

        let kinetic_truth = FitResult {
            baseline_intensity: 10.0,
            protein_decay_rate: 0.1,
            mrna_decay_rate: 0.5,
            onset_time: 0.0,
            expression_amplitude: 100.0,
        };

        write_assay_json(&root);
        write_index_json(&root);
        write_roi_stack(&root, &kinetic_truth);
        write_mask_stack(&root);

        Self { root }
    }

    pub fn expected_timeseries_rows(&self) -> Vec<(u32, u32, u32, f64, f64, f64)> {
        (0..TIME_COUNT)
            .map(|t| {
                let (area, intensity, background, corrected_value) = quantized_frame_metrics(t);
                (ROI_ID, t, area, background, intensity, corrected_value)
            })
            .collect()
    }
}

fn write_assay_json(root: &Path) {
    let assay = serde_json::json!({
        "type": "transfection",
        "name": "fixture",
        "workspace": { "path": root.to_string_lossy() },
        "data": {
            "type": "folder",
            "path": "",
            "template": { "subfolder": "", "filename": "" }
        },
        "interval": { "value": INTERVAL_MINUTES, "unit": "minute" },
        "samples": [{
            "slideChannel": SLIDE_CHANNEL,
            "name": "condA",
            "positions": POSITION.to_string()
        }],
        "analysis": {
            "channels": {
                "mask": MASK_CHANNEL,
                "signal": [SIGNAL_CHANNEL]
            }
        }
    });
    fs::write(root.join("assay.json"), format!("{assay}\n")).expect("assay.json");
}

fn write_index_json(root: &Path) {
    let index = serde_json::json!({
        "position": POSITION,
        "axisOrder": "TCZYX",
        "timeCount": TIME_COUNT,
        "channelCount": CHANNEL_COUNT,
        "zCount": Z_COUNT,
        "rois": [{
            "roi": ROI_ID,
            "fileName": "roi_001.tif",
            "bbox": {
                "roi": ROI_ID,
                "x": 0,
                "y": 0,
                "w": WIDTH as u32,
                "h": HEIGHT as u32
            }
        }]
    });
    let path = root
        .join("roi")
        .join(format!("Pos{POSITION}"))
        .join("index.json");
    fs::write(path, format!("{index}\n")).expect("index.json");
}

fn center_mask() -> Vec<bool> {
    let mut mask = vec![false; WIDTH * HEIGHT];
    for y in 1..3 {
        for x in 1..3 {
            mask[y * WIDTH + x] = true;
        }
    }
    mask
}

fn quantized_frame_metrics(timepoint: u32) -> (u32, f64, f64, f64) {
    let frame_indices: Vec<f64> = (0..TIME_COUNT).map(f64::from).collect();
    let kinetic_truth = FitResult {
        baseline_intensity: 10.0,
        protein_decay_rate: 0.1,
        mrna_decay_rate: 0.5,
        onset_time: 0.0,
        expression_amplitude: 100.0,
    };
    let corrected = synthetic_kinetic_trace(&frame_indices, INTERVAL_MINUTES, kinetic_truth);
    let foreground = (corrected[timepoint as usize] / 4.0 + 10.0) as u8;
    let mut frame = vec![10.0; WIDTH * HEIGHT];
    for y in 1..3 {
        for x in 1..3 {
            frame[y * WIDTH + x] = f64::from(foreground);
        }
    }
    let (area, intensity, background, corrected_value) = masked_roi_metrics(&frame, &center_mask());
    (area, intensity, background, corrected_value)
}

fn write_roi_stack(root: &Path, kinetic_truth: &FitResult) {
    let path = root
        .join("roi")
        .join(format!("Pos{POSITION}"))
        .join("roi_001.tif");
    let frame_indices: Vec<f64> = (0..TIME_COUNT).map(f64::from).collect();
    let corrected = synthetic_kinetic_trace(&frame_indices, INTERVAL_MINUTES, *kinetic_truth);
    let mut pages = Vec::new();
    for timepoint in 0..TIME_COUNT {
        for channel in 0..CHANNEL_COUNT {
            for _z in 0..Z_COUNT {
                let mut page = vec![10u8; WIDTH * HEIGHT];
                if channel == MASK_CHANNEL {
                    for (index, value) in center_mask().into_iter().enumerate() {
                        page[index] = if value { 200 } else { 20 };
                    }
                } else if channel == SIGNAL_CHANNEL {
                    let foreground = (corrected[timepoint as usize] / 4.0 + 10.0) as u8;
                    for y in 1..3 {
                        for x in 1..3 {
                            page[y * WIDTH + x] = foreground;
                        }
                    }
                }
                pages.push(page);
            }
        }
    }
    write_u8_stack(&path, pages);
}

fn write_mask_stack(root: &Path) {
    let path = root
        .join("mask")
        .join(format!("Pos{POSITION}"))
        .join("roi_001.tif");
    let page: Vec<u8> = center_mask().into_iter().map(u8::from).collect();
    let pages = std::iter::repeat_n(page, TIME_COUNT as usize).collect();
    write_u8_stack(&path, pages);
}

fn write_u8_stack(path: &Path, pages: Vec<Vec<u8>>) {
    let file = File::create(path).expect("create tiff");
    let mut encoder = TiffEncoder::new(file).expect("tiff encoder");
    for page in pages {
        let image = encoder
            .new_image::<colortype::Gray8>(WIDTH as u32, HEIGHT as u32)
            .expect("new image");
        image.write_data(&page).expect("write page");
    }
}
