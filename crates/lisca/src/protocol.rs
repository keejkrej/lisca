use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AppId {
    Aligner,
    Annotator,
    Studio,
}

impl AppId {
    pub const fn as_str(self) -> &'static str {
        match self {
            AppId::Aligner => "aligner",
            AppId::Annotator => "annotator",
            AppId::Studio => "studio",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hello {
    pub app: AppId,
    pub version: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HostFsEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HostListDirectoryResult {
    pub path: Option<String>,
    pub parent: Option<String>,
    pub entries: Vec<HostFsEntry>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadTextFileResponse {
    pub contents: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveAssayJsonRequest {
    pub save_to: String,
    pub contents: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveAssayJsonResponse {
    pub ok: bool,
    pub path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct WorkspaceScan {
    pub positions: Vec<u32>,
    pub channels: Vec<u32>,
    pub times: Vec<u32>,
    #[serde(rename = "zSlices")]
    pub z_slices: Vec<u32>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum AlignerSource {
    Tif { path: String },
    Jpg { path: String },
    Nd2 { path: String },
    Czi { path: String },
}

pub type ImageSource = AlignerSource;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FrameRequest {
    pub pos: u32,
    pub channel: u32,
    pub time: u32,
    pub z: u32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ContrastWindow {
    pub min: u32,
    pub max: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FramePayload {
    pub width: u32,
    pub height: u32,
    pub data_base64: String,
    pub pixel_type: &'static str,
    pub contrast_domain: ContrastWindow,
    pub suggested_contrast: ContrastWindow,
    pub applied_contrast: ContrastWindow,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum AlignGridShape {
    #[serde(alias = "square")]
    Rect,
    Hex,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlignGridState {
    pub enabled: bool,
    pub shape: AlignGridShape,
    pub tx: f64,
    pub ty: f64,
    pub rotation: f64,
    pub spacing_a: f64,
    pub spacing_b: f64,
    pub cell_width: f64,
    pub cell_height: f64,
    pub opacity: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AlignGridCellCoord {
    pub i: i32,
    pub j: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedAlignState {
    pub grid: AlignGridState,
    pub excluded_cells: Vec<AlignGridCellCoord>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludePreviewCell {
    pub i: i32,
    pub j: i32,
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludePreviewRequest {
    pub source: AlignerSource,
    pub selection: FrameRequest,
    pub cells: Vec<AutoExcludePreviewCell>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludePreviewCellScore {
    pub i: i32,
    pub j: i32,
    pub score: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludeHistogramBin {
    pub start: f64,
    pub end: f64,
    pub count: u32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludePreviewResponse {
    pub eligible_cell_count: u32,
    pub cell_scores: Vec<AutoExcludePreviewCellScore>,
    pub histogram_bins: Vec<AutoExcludeHistogramBin>,
    pub score_min: f64,
    pub score_max: f64,
    pub threshold: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SaveBboxResponse {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum CropOutputFormat {
    Tiff,
}

impl Default for CropOutputFormat {
    fn default() -> Self {
        Self::Tiff
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CropRoiStatus {
    Queued,
    Running,
    Completed,
    Cancelled,
    Error,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CropRoiRequest {
    pub request_id: String,
    pub workspace_path: String,
    pub source: AlignerSource,
    pub positions: Vec<u32>,
    pub overwrite: bool,
    #[serde(default)]
    pub output_format: CropOutputFormat,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CropRoiResponse {
    pub request_id: String,
    pub status: CropRoiStatus,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CropRoiProgress {
    pub request_id: String,
    pub status: CropRoiStatus,
    pub position: Option<u32>,
    pub completed_positions: u32,
    pub total_positions: u32,
    pub completed_rois: u32,
    pub total_rois: u32,
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RoiPosExistsResponse {
    pub exists: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RoiFrameRequest {
    pub pos: u32,
    pub roi: u32,
    pub channel: u32,
    pub time: u32,
    pub z: u32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RoiBbox {
    pub roi: u32,
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoiIndexEntry {
    pub roi: u32,
    pub file_name: String,
    pub bbox: RoiBbox,
    pub shape: [u32; 5],
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoiIndexFile {
    pub position: u32,
    pub axis_order: String,
    pub page_order: Vec<String>,
    pub time_count: u32,
    pub channel_count: u32,
    pub z_count: u32,
    pub source: ImageSource,
    pub rois: Vec<RoiIndexEntry>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoiPositionScan {
    pub pos: u32,
    pub source: ImageSource,
    pub channels: Vec<u32>,
    pub times: Vec<u32>,
    #[serde(rename = "zSlices")]
    pub z_slices: Vec<u32>,
    pub rois: Vec<RoiIndexEntry>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RoiWorkspaceScan {
    pub positions: Vec<RoiPositionScan>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AnnotationLabel {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoiFrameAnnotation {
    pub classification_label_id: Option<String>,
    pub mask_path: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoiFrameAnnotationPayload {
    pub classification_label_id: Option<String>,
    pub mask_base64_png: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedRoiFrameAnnotation {
    pub annotation: RoiFrameAnnotation,
    pub mask_base64_png: Option<String>,
}
