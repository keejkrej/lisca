use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SummaryChannel {
    pub index: usize,
    pub name: Option<String>,
    pub color: Option<String>,
    pub pixel_type: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SummaryScaling {
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub z: Option<f64>,
    pub unit: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DatasetSummary {
    pub version_major: u32,
    pub version_minor: u32,
    pub sizes: BTreeMap<String, usize>,
    pub logical_frame_count: usize,
    pub channels: Vec<SummaryChannel>,
    pub pixel_type: Option<String>,
    pub scaling: Option<SummaryScaling>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Attributes {
    #[serde(alias = "uiBpcInMemory", alias = "uiBitsPerComp")]
    pub bits_per_component_in_memory: u32,
    #[serde(alias = "uiBpcSignificant")]
    pub bits_per_component_significant: Option<u32>,
    #[serde(alias = "uiComp")]
    pub component_count: u32,
    #[serde(alias = "uiHeight")]
    pub height_px: u32,
    #[serde(alias = "uiSequenceCount")]
    pub sequence_count: Option<u32>,
    #[serde(alias = "uiWidthBytes")]
    pub width_bytes: Option<u64>,
    #[serde(alias = "uiWidth")]
    pub width_px: u32,
    #[serde(default, alias = "ePixelType")]
    pub pixel_data_type: Option<String>,
    #[serde(default, alias = "uiChannelCount")]
    pub channel_count: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Metadata {
    pub contents: Option<Contents>,
    pub channels: Option<Vec<MetadataChannel>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Contents {
    pub channel_count: Option<u32>,
    pub frame_count: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MetadataChannel {
    pub channel: Option<ChannelInfo>,
    pub volume: Option<VolumeInfo>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ChannelInfo {
    pub name: Option<String>,
    pub color_rgb: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct VolumeInfo {
    pub axes_calibrated: Option<[bool; 3]>,
    pub axes_calibration: Option<[f64; 3]>,
    pub bits_per_component_in_memory: Option<u32>,
    pub component_data_type: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExperimentLoop {
    #[serde(rename = "type")]
    pub type_: Option<String>,
    pub count: Option<u32>,
}

pub(crate) fn color_rgb_to_hex(value: u32) -> String {
    let r = (value & 0xff) as u8;
    let g = ((value >> 8) & 0xff) as u8;
    let b = ((value >> 16) & 0xff) as u8;
    format!("#{r:02x}{g:02x}{b:02x}")
}
