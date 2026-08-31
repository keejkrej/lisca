use std::path::{Path, PathBuf};

pub const BBOX_DIR: &str = "bbox";
pub const ROI_DIR: &str = "roi";
pub const ALIGN_DIR: &str = "align";
pub const MASK_DIR: &str = "mask";
pub const ANALYSIS_DIR: &str = "analysis";
pub const RESULTS_DIR: &str = "results";
pub const ASSAY_JSON: &str = "assay.json";
pub const INDEX_JSON: &str = "index.json";
pub const POS_PREFIX: &str = "Pos";

pub fn pos_name(pos: u32) -> String {
    format!("{POS_PREFIX}{pos}")
}

pub fn bbox_csv_name(pos: u32) -> String {
    format!("{}.csv", pos_name(pos))
}

pub fn roi_tiff_name(roi: u32) -> String {
    format!("Roi{roi}.tif")
}

pub fn align_json_name(pos: u32) -> String {
    format!("{}.json", pos_name(pos))
}

pub fn bbox_dir(workspace: impl AsRef<Path>) -> PathBuf {
    workspace.as_ref().join(BBOX_DIR)
}

pub fn bbox_csv_path(workspace: impl AsRef<Path>, pos: u32) -> PathBuf {
    bbox_dir(workspace).join(bbox_csv_name(pos))
}

pub fn roi_dir(workspace: impl AsRef<Path>) -> PathBuf {
    workspace.as_ref().join(ROI_DIR)
}

pub fn roi_pos_dir(workspace: impl AsRef<Path>, pos: u32) -> PathBuf {
    roi_dir(workspace).join(pos_name(pos))
}

pub fn roi_index_path(workspace: impl AsRef<Path>, pos: u32) -> PathBuf {
    roi_pos_dir(workspace, pos).join(INDEX_JSON)
}

pub fn roi_tiff_path(workspace: impl AsRef<Path>, pos: u32, file_name: &str) -> PathBuf {
    roi_pos_dir(workspace, pos).join(file_name)
}

pub fn align_dir(workspace: impl AsRef<Path>) -> PathBuf {
    workspace.as_ref().join(ALIGN_DIR)
}

pub fn align_json_path(workspace: impl AsRef<Path>, pos: u32) -> PathBuf {
    align_dir(workspace).join(align_json_name(pos))
}

pub fn mask_dir(workspace: impl AsRef<Path>) -> PathBuf {
    workspace.as_ref().join(MASK_DIR)
}

pub fn mask_pos_dir(workspace: impl AsRef<Path>, pos: u32) -> PathBuf {
    mask_dir(workspace).join(pos_name(pos))
}

pub fn analysis_dir(workspace: impl AsRef<Path>) -> PathBuf {
    workspace.as_ref().join(ANALYSIS_DIR)
}

pub fn results_dir(workspace: impl AsRef<Path>) -> PathBuf {
    workspace.as_ref().join(RESULTS_DIR)
}

pub fn assay_json_path(workspace: impl AsRef<Path>) -> PathBuf {
    workspace.as_ref().join(ASSAY_JSON)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn path_builders_use_canonical_folder_names() {
        let root = Path::new("/tmp/ws");
        assert_eq!(bbox_csv_path(root, 3), Path::new("/tmp/ws/bbox/Pos3.csv"));
        assert_eq!(
            roi_index_path(root, 3),
            Path::new("/tmp/ws/roi/Pos3/index.json")
        );
        assert_eq!(
            align_json_path(root, 3),
            Path::new("/tmp/ws/align/Pos3.json")
        );
        assert_eq!(assay_json_path(root), Path::new("/tmp/ws/assay.json"));
    }
}
