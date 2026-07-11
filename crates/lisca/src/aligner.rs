mod crop;
mod workspace;

pub use crate::image_source::{load_frame_payload, scan_source, CachedSourceReader};
pub use crate::protocol::AlignOutputPaths;
pub use crop::crop_roi;
pub use workspace::{
    list_saved_bbox_positions, load_align_state, output_paths, roi_pos_exists, save_bbox,
};
