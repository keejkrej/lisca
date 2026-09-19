//! Workspace folder names, path builders, and live bbox CSV parsing.
//!
//! Assay sidecars can git-depend on this crate without taking a dependency on
//! `lisca` (which already depends on `lisca-transfection`).

mod bbox;
mod paths;

pub use bbox::{parse_bbox_csv, BboxError, RoiBbox, BBOX_COLUMNS};
pub use paths::{
    align_dir, align_json_name, align_json_path, analysis_dir, annotation_labels_path,
    annotations_dir, assay_json_path, bbox_csv_name, bbox_csv_path, bbox_dir, mask_dir,
    mask_pos_dir, pos_name, results_dir, roi_dir, roi_index_path, roi_pos_dir, roi_tiff_name,
    roi_tiff_path, sidecar_dir, sidecar_path, timeseries_dir, timeseries_pos_dir, ALIGN_DIR,
    ANALYSIS_DIR, ANNOTATIONS_DIR, ANNOTATION_LABELS_JSON, ASSAY_JSON, BBOX_DIR, INDEX_JSON,
    MASK_DIR, POS_PREFIX, RESULTS_DIR, ROI_DIR, SIDECAR_DIR, SIDECAR_ENGAGEMENTS_CSV,
    SIDECAR_EVENTS_JSON, SIDECAR_TRACES_PARQUET, SIDECAR_TRACKS_CSV, TIMESERIES_DIR,
};
