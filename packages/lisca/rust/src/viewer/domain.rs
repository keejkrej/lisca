use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};

#[derive(Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum ParsedSourceChannel {
    Numeric(u32),
    Named(String),
}

#[derive(Clone, Debug)]
pub struct ParsedSourceImageName {
    pub channel: ParsedSourceChannel,
    pub position: u32,
    pub time: u32,
    pub z: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct WorkspaceScan {
    pub positions: Vec<u32>,
    pub channels: Vec<u32>,
    pub times: Vec<u32>,
    #[serde(rename = "zSlices")]
    pub z_slices: Vec<u32>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum ViewerSource {
    Tif { path: String },
    Jpg { path: String },
    Nd2 { path: String },
    Czi { path: String },
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct FrameRequest {
    pub pos: u32,
    pub channel: u32,
    pub time: u32,
    pub z: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum GridShape {
    Square,
    Hex,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GridState {
    pub enabled: bool,
    pub shape: GridShape,
    pub tx: f64,
    pub ty: f64,
    pub rotation: f64,
    pub spacing_a: f64,
    pub spacing_b: f64,
    pub cell_width: f64,
    pub cell_height: f64,
    pub opacity: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct GridCellCoord {
    pub i: i32,
    pub j: i32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedAlignState {
    pub grid: GridState,
    pub excluded_cells: Vec<GridCellCoord>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ContrastWindow {
    pub min: u32,
    pub max: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludePreviewCell {
    pub i: i32,
    pub j: i32,
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludePreviewRequest {
    pub source: ViewerSource,
    pub selection: FrameRequest,
    pub cells: Vec<AutoExcludePreviewCell>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludePreviewCellScore {
    pub i: i32,
    pub j: i32,
    pub score: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludeHistogramBin {
    pub start: f64,
    pub end: f64,
    pub count: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludePreviewResponse {
    pub eligible_cell_count: u32,
    pub cell_scores: Vec<AutoExcludePreviewCellScore>,
    pub histogram_bins: Vec<AutoExcludeHistogramBin>,
    pub score_min: f64,
    pub score_max: f64,
    pub threshold: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct SaveBboxResponse {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum CropOutputFormat {
    Tiff,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum CropRoiStatus {
    Success,
    Error,
    Cancelled,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct CropRoiResponse {
    pub ok: bool,
    pub status: CropRoiStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cancelled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(rename = "outputPath", skip_serializing_if = "Option::is_none")]
    pub output_path: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RoiFrameRequest {
    pub pos: u32,
    pub roi: u32,
    pub channel: u32,
    pub time: u32,
    pub z: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RawFrameRequest {
    pub pos: u32,
    pub channel: u32,
    pub time: u32,
    pub z: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RoiBbox {
    pub roi: u32,
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoiIndexEntry {
    pub roi: u32,
    pub file_name: String,
    pub bbox: RoiBbox,
    pub shape: [u32; 5],
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoiIndexFile {
    pub position: u32,
    pub axis_order: String,
    pub page_order: Vec<String>,
    pub time_count: u32,
    pub channel_count: u32,
    pub z_count: u32,
    pub source: ViewerSource,
    pub rois: Vec<RoiIndexEntry>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoiPositionScan {
    pub pos: u32,
    pub source: ViewerSource,
    pub channels: Vec<u32>,
    pub times: Vec<u32>,
    #[serde(rename = "zSlices")]
    pub z_slices: Vec<u32>,
    pub rois: Vec<RoiIndexEntry>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RoiWorkspaceScan {
    pub positions: Vec<RoiPositionScan>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct AnnotationLabel {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoiFrameAnnotation {
    pub classification_label_id: Option<String>,
    pub mask_path: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnnotationInstancePayload {
    pub id: String,
    pub label_id: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoiFrameAnnotationPayload {
    pub classification_label_id: Option<String>,
    pub mask_base64_png: Option<String>,
    #[serde(default)]
    pub instances: Option<Vec<AnnotationInstancePayload>>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedRoiFrameAnnotation {
    pub annotation: RoiFrameAnnotation,
    pub mask_base64_png: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RawFrameAnnotation {
    pub classification_label_id: Option<String>,
    pub mask_path: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RawFrameAnnotationPayload {
    pub classification_label_id: Option<String>,
    pub mask_base64_png: Option<String>,
    #[serde(default)]
    pub instances: Option<Vec<AnnotationInstancePayload>>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedRawFrameAnnotation {
    pub annotation: RawFrameAnnotation,
    pub mask_base64_png: Option<String>,
}

pub fn parse_pos_dir_name(name: &str) -> Option<u32> {
    let normalized: String = name.chars().filter(|c| !c.is_whitespace()).collect();
    if normalized.is_empty() {
        return None;
    }

    let lower = normalized.to_ascii_lowercase();
    for prefix in ["position", "pos"] {
        if let Some(rest) = lower.strip_prefix(prefix) {
            let trimmed = rest.trim_start_matches(['-', '_']);
            if !trimmed.is_empty() && trimmed.chars().all(|c| c.is_ascii_digit()) {
                return trimmed.parse().ok();
            }
        }
    }

    if lower.chars().all(|c| c.is_ascii_digit()) {
        return lower.parse().ok();
    }

    None
}

pub fn parse_bbox_csv_name(name: &str) -> Option<u32> {
    let lower = name.to_ascii_lowercase();
    let stem = lower.strip_suffix(".csv")?;
    parse_pos_dir_name(stem)
}

pub fn parse_source_image_name(
    name: &str,
    position_hint: Option<u32>,
) -> Option<ParsedSourceImageName> {
    let extension = Path::new(name)
        .extension()
        .and_then(|value| value.to_str())?
        .to_ascii_lowercase();
    if !matches!(extension.as_str(), "tif" | "tiff" | "png" | "jpg" | "jpeg") {
        return None;
    }

    let stem = Path::new(name).file_stem()?.to_str()?;
    let lower = stem.to_ascii_lowercase();

    if let Some(rest) = lower.strip_prefix("img_channel") {
        let parts: Vec<&str> = rest.split('_').collect();
        if parts.len() == 4 {
            let channel = parts[0].parse().ok()?;
            let position = parts[1].strip_prefix("position")?.parse().ok()?;
            let time = parts[2].strip_prefix("time")?.parse().ok()?;
            let z = parts[3].strip_prefix("z")?.parse().ok()?;

            return Some(ParsedSourceImageName {
                channel: ParsedSourceChannel::Numeric(channel),
                position,
                time,
                z,
            });
        }
    }

    let position = position_hint?;
    let rest = stem.strip_prefix("img_")?;
    let first_sep = rest.find('_')?;
    let last_sep = rest.rfind('_')?;
    if first_sep == last_sep {
        return None;
    }

    let time = rest[..first_sep].parse().ok()?;
    let channel = &rest[first_sep + 1..last_sep];
    if channel.is_empty() {
        return None;
    }
    let z = rest[last_sep + 1..].parse().ok()?;

    Some(ParsedSourceImageName {
        channel: ParsedSourceChannel::Named(channel.to_string()),
        position,
        time,
        z,
    })
}

pub fn workspace_bbox_csv_path(root: &str, pos: u32) -> PathBuf {
    Path::new(root).join("bbox").join(format!("Pos{pos}.csv"))
}

pub fn workspace_align_json_path(root: &str, pos: u32) -> PathBuf {
    Path::new(root).join("align").join(format!("Pos{pos}.json"))
}

pub fn workspace_roi_pos_dir_path(root: &str, pos: u32) -> PathBuf {
    Path::new(root).join("roi").join(format!("Pos{pos}"))
}

pub fn workspace_roi_tiff_path(root: &str, pos: u32, roi: u32) -> PathBuf {
    workspace_roi_pos_dir_path(root, pos).join(format!("Roi{roi}.tif"))
}

pub fn workspace_roi_index_path(root: &str, pos: u32) -> PathBuf {
    workspace_roi_pos_dir_path(root, pos).join("index.json")
}

pub fn workspace_annotations_dir_path(root: &str) -> PathBuf {
    Path::new(root).join("annotations")
}

pub fn workspace_annotation_labels_path(root: &str) -> PathBuf {
    workspace_annotations_dir_path(root).join("labels.json")
}

pub fn workspace_annotation_raw_dir_path(root: &str) -> PathBuf {
    workspace_annotations_dir_path(root).join("raw")
}

pub fn workspace_annotation_raw_source_path(root: &str) -> PathBuf {
    workspace_annotation_raw_dir_path(root).join("source.json")
}

pub fn workspace_annotation_raw_pos_dir_path(root: &str, pos: u32) -> PathBuf {
    workspace_annotation_raw_dir_path(root).join(format!("Pos{pos}"))
}

pub fn workspace_annotation_roi_dir_path(root: &str, request: &RoiFrameRequest) -> PathBuf {
    workspace_annotations_dir_path(root)
        .join("roi")
        .join(format!("Pos{}", request.pos))
        .join(format!("Roi{}", request.roi))
}

pub fn annotation_frame_stem(channel: u32, time: u32, z: u32) -> String {
    format!("C{channel}_T{time}_Z{z}")
}

pub fn annotation_roi_frame_stem(request: &RoiFrameRequest) -> String {
    annotation_frame_stem(request.channel, request.time, request.z)
}

pub fn annotation_raw_frame_stem(request: &RawFrameRequest) -> String {
    annotation_frame_stem(request.channel, request.time, request.z)
}

pub fn workspace_annotation_json_path(root: &str, request: &RoiFrameRequest) -> PathBuf {
    workspace_annotation_roi_dir_path(root, request)
        .join(format!("{}.json", annotation_roi_frame_stem(request)))
}

pub fn workspace_annotation_mask_path(root: &str, request: &RoiFrameRequest) -> PathBuf {
    workspace_annotation_roi_dir_path(root, request)
        .join(format!("{}.png", annotation_roi_frame_stem(request)))
}

pub fn workspace_raw_annotation_json_path(root: &str, request: &RawFrameRequest) -> PathBuf {
    workspace_annotation_raw_pos_dir_path(root, request.pos)
        .join(format!("{}.json", annotation_raw_frame_stem(request)))
}

pub fn workspace_raw_annotation_mask_path(root: &str, request: &RawFrameRequest) -> PathBuf {
    workspace_annotation_raw_pos_dir_path(root, request.pos)
        .join(format!("{}.png", annotation_raw_frame_stem(request)))
}

pub fn path_to_forward_slash_string(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

pub fn workspace_relative_path(root: &str, path: &Path) -> String {
    path.strip_prefix(root)
        .map(path_to_forward_slash_string)
        .unwrap_or_else(|_| path_to_forward_slash_string(path))
}

pub fn current_timestamp() -> Result<String, String> {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .map_err(|err| err.to_string())
}

pub fn roi_axis_values(count: u32) -> Vec<u32> {
    (0..count).collect()
}

pub fn dimension_size(sizes: &HashMap<String, usize>, key: &str) -> usize {
    sizes.get(key).copied().unwrap_or(1)
}

pub fn dimension_values(sizes: &HashMap<String, usize>, key: &str) -> Vec<u32> {
    (0..dimension_size(sizes, key))
        .filter_map(|value| u32::try_from(value).ok())
        .collect()
}

pub fn validate_request_index(label: &str, index: u32, size: usize) -> Result<usize, String> {
    let effective_size = size.max(1);
    let index = index as usize;
    if index >= effective_size {
        return Err(format!("{label} index {index} is out of range"));
    }
    Ok(index)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_source_image_name_supports_legacy_tiff_pattern() {
        let parsed = parse_source_image_name("img_channel1_position18_time7_z2.tif", None)
            .expect("legacy source image name");

        assert!(matches!(parsed.channel, ParsedSourceChannel::Numeric(1)));
        assert_eq!(parsed.position, 18);
        assert_eq!(parsed.time, 7);
        assert_eq!(parsed.z, 2);
    }

    #[test]
    fn parse_source_image_name_supports_named_jpg_pattern() {
        let parsed = parse_source_image_name("img_000000123_Durchlicht_007.jpg", Some(18))
            .expect("named jpg source image");

        assert!(matches!(
            parsed.channel,
            ParsedSourceChannel::Named(ref name) if name == "Durchlicht"
        ));
        assert_eq!(parsed.position, 18);
        assert_eq!(parsed.time, 123);
        assert_eq!(parsed.z, 7);
    }

    #[test]
    fn parse_source_image_name_supports_channel_names_with_underscores() {
        let parsed =
            parse_source_image_name("img_000000123_Tex_Red_007.png", Some(4)).expect("png source");

        assert!(matches!(
            parsed.channel,
            ParsedSourceChannel::Named(ref name) if name == "Tex_Red"
        ));
        assert_eq!(parsed.position, 4);
        assert_eq!(parsed.time, 123);
        assert_eq!(parsed.z, 7);
    }
}
