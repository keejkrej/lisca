mod crop;
mod detect;
mod fs_retry;
mod workspace;

pub use crate::image_source::{load_frame_payload, scan_source, CachedSourceReader};
pub use crate::protocol::AlignOutputPaths;
use crate::protocol::{FrameRequest, ImageSource};
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
