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
