mod crop;
mod detect;
mod fs_retry;
mod workspace;

pub use crate::image_source::{load_frame_payload, scan_source, CachedSourceReader};
pub use crate::protocol::AlignOutputPaths;
use crate::protocol::{DetectGridRequest, DetectGridResponse, FrameRequest, ImageSource};
pub use crop::{
    crop_roi, crop_roi_position, crop_roi_position_with_progress, inspect_crop_position,
    CropPositionError, CropPositionOutput,
};
pub use detect::{detect_grid, pattern_csv, DetectOptions, GridDetection};
pub use workspace::{
    list_saved_bbox_positions, load_align_state, output_paths, roi_pos_exists, save_bbox,
};

/// Detect the micropattern lattice on one frame of a source.
pub fn detect_grid_from_source(
    source: ImageSource,
    request: FrameRequest,
    options: DetectOptions,
) -> Result<GridDetection, String> {
    let frame = crate::image_source::load_frame(source, request)?;
    detect::detect_grid(&frame, &options)
}

/// Preview the lattice for the Aligner Auto-detect control. Does not write bbox or align files.
pub fn detect_grid_preview(payload: DetectGridRequest) -> Result<DetectGridResponse, String> {
    let detection = detect_grid_from_source(
        payload.source,
        payload.request,
        DetectOptions {
            shape: payload.shape,
            pattern_width: payload.pattern_width,
            pattern_height: payload.pattern_height,
            min_spacing: payload.min_spacing,
            max_spacing: payload.max_spacing,
        },
    )?;
    Ok(DetectGridResponse {
        grid: detection.grid,
        count: u32::try_from(detection.patterns.len()).unwrap_or(u32::MAX),
        islands: detection.islands,
        confidence: detection.confidence,
        residual_px: detection.residual_px,
    })
}

#[cfg(test)]
mod detect_preview_tests {
    use super::*;
    use crate::protocol::{AlignerSource, FrameRequest};
    use image::{GrayImage, Luma};
    use std::fs;

    fn write_rect_lattice(dir: &std::path::Path) {
        fs::create_dir_all(dir.join("Pos0")).expect("source position");
        let width = 512_u32;
        let height = 512_u32;
        let pitch = 64_i32;
        let half = 25_i32;
        let mut image = GrayImage::from_pixel(width, height, Luma([200]));
        for j in -6..=6 {
            for i in -6..=6 {
                let center_x = i32::try_from(width / 2).expect("width") + i * pitch;
                let center_y = i32::try_from(height / 2).expect("height") + j * pitch;
                for dy in -half..=half {
                    for dx in -half..=half {
                        let x = center_x + dx;
                        let y = center_y + dy;
                        if x >= 0
                            && y >= 0
                            && u32::try_from(x).ok().is_some_and(|value| value < width)
                            && u32::try_from(y).ok().is_some_and(|value| value < height)
                        {
                            image.put_pixel(x as u32, y as u32, Luma([40]));
                        }
                    }
                }
            }
        }
        image
            .save(dir.join("Pos0/img_channel0_position0_time0_z0.png"))
            .expect("lattice frame");
    }

    #[test]
    fn detect_grid_preview_returns_a_lattice_and_writes_nothing() {
        let root = tempfile::tempdir().expect("temp");
        let source_path = root.path().join("source");
        let workspace = root.path().join("workspace");
        fs::create_dir_all(&workspace).expect("workspace");
        write_rect_lattice(&source_path);
        let response = detect_grid_preview(DetectGridRequest {
            max_spacing: None,
            min_spacing: None,
            pattern_height: None,
            pattern_width: None,
            request: FrameRequest {
                pos: 0,
                channel: 0,
                time: 0,
                z: 0,
            },
            shape: None,
            source: AlignerSource::Folder {
                path: source_path.to_string_lossy().into_owned(),
                subfolder_template: "Pos{p}".to_string(),
                filename_template: "img_channel{c}_position{p}_time{t}_z{z}.png".to_string(),
            },
        })
        .expect("detect");
        assert!(response.grid.enabled);
        assert!(response.count > 20, "count {}", response.count);
        assert!(response.residual_px.is_finite());
        assert!(!workspace.join("bbox").exists());
        assert!(!workspace.join("align").exists());
    }
}
