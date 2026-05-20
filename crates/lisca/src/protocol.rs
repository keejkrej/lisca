use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
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

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Hello {
    pub app: AppId,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HostFsEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HostListDirectoryResult {
    pub path: Option<String>,
    pub parent: Option<String>,
    pub entries: Vec<HostFsEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ReadTextFileResponse {
    pub contents: String,
}

#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SaveAssayJsonRequest {
    pub save_to: String,
    pub contents: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SaveAssayJsonResponse {
    pub ok: bool,
    pub path: String,
}

#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SaveResultPdfRequest {
    pub workspace_path: String,
    pub file_name: String,
    pub contents_base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SaveResultPdfResponse {
    pub ok: bool,
    pub directory: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct WorkspaceScan {
    pub positions: Vec<u32>,
    pub channels: Vec<u32>,
    pub times: Vec<u32>,
    #[serde(rename = "zSlices")]
    pub z_slices: Vec<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum AlignerSource {
    Folder {
        path: String,
        #[serde(rename = "subfolderTemplate")]
        subfolder_template: String,
        #[serde(rename = "filenameTemplate")]
        filename_template: String,
    },
    Tif {
        path: String,
    },
    Jpg {
        path: String,
    },
    Nd2 {
        path: String,
    },
    Czi {
        path: String,
    },
}

pub type ImageSource = AlignerSource;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct FrameRequest {
    pub pos: u32,
    pub channel: u32,
    pub time: u32,
    pub z: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ContrastWindow {
    pub min: u32,
    pub max: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FramePayload {
    pub width: u32,
    pub height: u32,
    pub data_base64: String,
    #[specta(type = String)]
    pub pixel_type: &'static str,
    pub contrast_domain: ContrastWindow,
    pub suggested_contrast: ContrastWindow,
    pub applied_contrast: ContrastWindow,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum AlignGridShape {
    #[serde(alias = "square")]
    Rect,
    Hex,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
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

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AlignGridCellCoord {
    pub i: i32,
    pub j: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SavedAlignState {
    pub grid: AlignGridState,
    pub excluded_cells: Vec<AlignGridCellCoord>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludePreviewCell {
    pub i: i32,
    pub j: i32,
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludePreviewRequest {
    pub source: AlignerSource,
    pub selection: FrameRequest,
    pub cells: Vec<AutoExcludePreviewCell>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludePreviewCellScore {
    pub i: i32,
    pub j: i32,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludeHistogramBin {
    pub start: f64,
    pub end: f64,
    pub count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AutoExcludePreviewResponse {
    pub eligible_cell_count: u32,
    pub cell_scores: Vec<AutoExcludePreviewCellScore>,
    pub histogram_bins: Vec<AutoExcludeHistogramBin>,
    pub score_min: f64,
    pub score_max: f64,
    pub threshold: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SaveBboxResponse {
    pub ok: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum CropOutputFormat {
    Tiff,
}

impl Default for CropOutputFormat {
    fn default() -> Self {
        Self::Tiff
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "lowercase")]
pub enum CropRoiStatus {
    Queued,
    Running,
    Completed,
    Cancelled,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
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

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CropRoiResponse {
    pub request_id: String,
    pub status: CropRoiStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
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
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum AnalysisStatus {
    Queued,
    Running,
    Completed,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(rename_all = "lowercase")]
pub enum AnalysisStage {
    Queued,
    Preparing,
    Segment,
    Timeseries,
    Auc,
    Fit,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisCsvFile {
    pub kind: String,
    pub file_name: String,
    pub path: String,
    pub csv: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisProgress {
    pub request_id: String,
    pub status: AnalysisStatus,
    pub stage: AnalysisStage,
    pub progress: f64,
    pub message: Option<String>,
    #[serde(default)]
    pub result_files: Vec<AnalysisCsvFile>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisStartRequest {
    pub workspace_path: String,
    pub request_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RoiPosExistsResponse {
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RoiFrameRequest {
    pub pos: u32,
    pub roi: u32,
    pub channel: u32,
    pub time: u32,
    pub z: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RoiBbox {
    pub roi: u32,
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RoiIndexEntry {
    pub roi: u32,
    pub file_name: String,
    pub bbox: RoiBbox,
    pub shape: [u32; 5],
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
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

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
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

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RoiWorkspaceScan {
    pub positions: Vec<RoiPositionScan>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AnnotationLabel {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RoiFrameAnnotation {
    pub classification_label_id: Option<String>,
    pub mask_path: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RoiFrameAnnotationPayload {
    pub classification_label_id: Option<String>,
    pub mask_base64_png: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LoadedRoiFrameAnnotation {
    pub annotation: RoiFrameAnnotation,
    pub mask_base64_png: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HomeDirectoryResponse {
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AlignOutputPaths {
    pub bbox: String,
    pub align: String,
    pub roi: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CropRoiProgressMessage {
    #[serde(rename = "type")]
    pub message_type: String,
    pub progress: CropRoiProgress,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AnalysisProgressMessage {
    #[serde(rename = "type")]
    pub message_type: String,
    pub progress: AnalysisProgress,
}
