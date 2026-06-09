use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};

use serde::Deserialize;
use tiff::decoder::{Decoder, DecodingResult};

use crate::analysis::array::Frame2D;

#[derive(Debug, Clone)]
pub struct RoiCrop {
    pub roi: u32,
    pub file_name: String,
    pub shape: [u32; 5],
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct PositionIndex {
    pub position: u32,
    pub axis_order: String,
    pub time_count: u32,
    pub channel_count: u32,
    #[allow(dead_code)]
    pub z_count: u32,
    pub rois: Vec<RoiCrop>,
}

#[derive(Debug, Deserialize)]
struct IndexJson {
    position: u32,
    #[serde(rename = "axisOrder")]
    axis_order: String,
    #[serde(rename = "timeCount")]
    time_count: u32,
    #[serde(rename = "channelCount")]
    channel_count: u32,
    #[serde(rename = "zCount")]
    z_count: u32,
    rois: Vec<IndexRoiJson>,
}

#[derive(Debug, Deserialize)]
struct IndexRoiJson {
    roi: u32,
    #[serde(rename = "fileName")]
    file_name: String,
    shape: [u32; 5],
}

pub fn position_dir(workspace: &Path, pos: u32) -> Result<PathBuf, String> {
    let pos_dir = workspace.join("roi").join(format!("Pos{pos}"));
    if !pos_dir.is_dir() {
        return Err(format!("No ROI directory found for position {pos}: {}", pos_dir.display()));
    }
    Ok(pos_dir)
}

pub fn read_position_index(pos_dir: &Path) -> Result<PositionIndex, String> {
    let index_path = pos_dir.join("index.json");
    let bytes = std::fs::read(&index_path)
        .map_err(|error| format!("failed to read {}: {error}", index_path.display()))?;
    let raw: IndexJson = serde_json::from_slice(&bytes)
        .map_err(|error| format!("{}: {error}", index_path.display()))?;
    let axis_order = raw.axis_order.to_uppercase();
    if axis_order.is_empty() {
        return Err(format!("{index_path:?} is missing axisOrder"));
    }
    let rois = raw
        .rois
        .into_iter()
        .map(|entry| RoiCrop {
            roi: entry.roi,
            file_name: entry.file_name,
            shape: entry.shape,
        })
        .collect::<Vec<_>>();
    if rois.is_empty() {
        return Err(format!("No ROI entries found in {}", index_path.display()));
    }
    Ok(PositionIndex {
        position: raw.position,
        axis_order,
        time_count: raw.time_count,
        channel_count: raw.channel_count,
        z_count: raw.z_count,
        rois,
    })
}

pub fn validate_channel_index(index: &PositionIndex, channel: u32) -> Result<(), String> {
    if channel >= index.channel_count {
        return Err(format!(
            "channel must be between 0 and {}, got {channel}",
            index.channel_count.saturating_sub(1)
        ));
    }
    Ok(())
}

pub struct RoiStack {
    pub data: Vec<f64>,
    pub shape: [usize; 5],
}

impl RoiStack {
    pub fn load(path: &Path, expected_shape: [u32; 5]) -> Result<Self, String> {
        let expected: [usize; 5] = [
            expected_shape[0] as usize,
            expected_shape[1] as usize,
            expected_shape[2] as usize,
            expected_shape[3] as usize,
            expected_shape[4] as usize,
        ];
        let expected_pages = expected.iter().product::<usize>();
        let file = File::open(path).map_err(|error| error.to_string())?;
        let mut decoder = Decoder::new(BufReader::new(file)).map_err(|error| error.to_string())?;
        let mut pages = Vec::with_capacity(expected_pages);
        loop {
            let dimensions = decoder.dimensions().map_err(|error| error.to_string())?;
            let width = dimensions.0 as usize;
            let height = dimensions.1 as usize;
            let data = decoder.read_image().map_err(|error| error.to_string())?;
            let pixels = decode_page_to_f64(data, width, height)?;
            pages.push(pixels);
            if !decoder.more_images() {
                break;
            }
            decoder.next_image().map_err(|error| error.to_string())?;
        }
        if pages.len() != expected_pages {
            return Err(format!(
                "{} page count mismatch: expected {expected_pages}, got {}",
                path.display(),
                pages.len()
            ));
        }
        let plane_size = expected[3] * expected[4];
        let mut data = vec![0.0; expected_pages * plane_size];
        for (page_index, page) in pages.into_iter().enumerate() {
            if page.len() != plane_size {
                return Err(format!(
                    "{} page {page_index} size mismatch",
                    path.display()
                ));
            }
            let offset = page_index * plane_size;
            data[offset..offset + plane_size].copy_from_slice(&page);
        }
        Ok(Self { data, shape: expected })
    }
}

fn decode_page_to_f64(data: DecodingResult, width: usize, height: usize) -> Result<Vec<f64>, String> {
    let expected_len = width * height;
    let to_f64 = |values: Vec<u16>| -> Result<Vec<f64>, String> {
        if values.len() != expected_len {
            return Err("unexpected TIFF page dimensions".to_string());
        }
        Ok(values.into_iter().map(f64::from).collect())
    };
    match data {
        DecodingResult::U8(values) => {
            if values.len() != expected_len {
                return Err("unexpected TIFF page dimensions".to_string());
            }
            Ok(values.into_iter().map(|value| f64::from(value)).collect())
        }
        DecodingResult::U16(values) => to_f64(values),
        _ => Err("unsupported TIFF pixel type for ROI stack".to_string()),
    }
}

pub fn roi_frame_2d(
    stack: &RoiStack,
    axis_order: &str,
    timepoint: u32,
    channel: u32,
    z_index: u32,
) -> Result<Frame2D, String> {
    if axis_order.len() != stack.shape.len() {
        return Err(format!(
            "Axis order {axis_order:?} does not match ROI stack ndim={}",
            stack.shape.len()
        ));
    }

    let y_axis = axis_order.find('Y').ok_or("missing Y axis")?;
    let x_axis = axis_order.find('X').ok_or("missing X axis")?;
    let height = stack.shape[y_axis];
    let width = stack.shape[x_axis];
    let mut fixed_indices = vec![0usize; stack.shape.len()];

    for (axis_index, axis) in axis_order.chars().enumerate() {
        let size = stack.shape[axis_index];
        match axis {
            'T' => {
                if timepoint as usize >= size {
                    return Err(format!(
                        "Time index {timepoint} out of range for axis size {size}"
                    ));
                }
                fixed_indices[axis_index] = timepoint as usize;
            }
            'C' => {
                if channel as usize >= size {
                    return Err(format!(
                        "Channel index {channel} out of range for axis size {size}"
                    ));
                }
                fixed_indices[axis_index] = channel as usize;
            }
            'Z' => {
                if z_index as usize >= size {
                    return Err(format!(
                        "Z index {z_index} out of range for axis size {size}"
                    ));
                }
                fixed_indices[axis_index] = z_index as usize;
            }
            'Y' | 'X' => {}
            _ => {
                if size != 1 {
                    return Err(format!(
                        "Unsupported non-singleton axis {axis:?} in ROI stack with shape {:?}",
                        stack.shape
                    ));
                }
                fixed_indices[axis_index] = 0;
            }
        }
    }

    let mut frame = vec![0.0; height * width];
    for y in 0..height {
        for x in 0..width {
            fixed_indices[y_axis] = y;
            fixed_indices[x_axis] = x;
            frame[y * width + x] = stack_value(stack, &fixed_indices)?;
        }
    }
    Frame2D::from_vec(frame, width, height)
}

fn stack_value(stack: &RoiStack, indices: &[usize]) -> Result<f64, String> {
    let mut stride = 1usize;
    let mut offset = 0usize;
    for (axis_index, &index) in indices.iter().enumerate().rev() {
        offset += index * stride;
        stride *= stack.shape[axis_index];
    }
    stack
        .data
        .get(offset)
        .copied()
        .ok_or_else(|| "ROI stack index out of bounds".to_string())
}

pub fn default_mask_path(workspace: &Path, position: u32, roi_file_name: &str) -> PathBuf {
    workspace
        .join("mask")
        .join(format!("Pos{position}"))
        .join(roi_file_name)
}

pub struct MaskStack {
    pub masks: Vec<Vec<bool>>,
    #[allow(dead_code)]
    pub height: usize,
    #[allow(dead_code)]
    pub width: usize,
}

impl MaskStack {
    pub fn load(path: &Path, time_count: u32, height: usize, width: usize) -> Result<Self, String> {
        let file = File::open(path).map_err(|error| error.to_string())?;
        let mut decoder = Decoder::new(BufReader::new(file)).map_err(|error| error.to_string())?;
        let mut masks = Vec::new();
        loop {
            let dimensions = decoder.dimensions().map_err(|error| error.to_string())?;
            if dimensions.0 as usize != width || dimensions.1 as usize != height {
                return Err(format!(
                    "{} shape mismatch: expected ({width}, {height}), got ({}, {})",
                    path.display(),
                    dimensions.0,
                    dimensions.1
                ));
            }
            let data = decoder.read_image().map_err(|error| error.to_string())?;
            let plane = decode_page_to_bool(data, width, height)?;
            masks.push(plane);
            if !decoder.more_images() {
                break;
            }
            decoder.next_image().map_err(|error| error.to_string())?;
        }
        let expected = time_count as usize;
        if masks.len() == 1 && expected == 1 {
            return Ok(Self {
                masks,
                height,
                width,
            });
        }
        if masks.len() != expected {
            return Err(format!(
                "{} shape mismatch: expected {expected} frames, got {}",
                path.display(),
                masks.len()
            ));
        }
        Ok(Self {
            masks,
            height,
            width,
        })
    }
}

fn decode_page_to_bool(data: DecodingResult, width: usize, height: usize) -> Result<Vec<bool>, String> {
    let expected_len = width * height;
    let to_bool = |values: Vec<u8>| -> Result<Vec<bool>, String> {
        if values.len() != expected_len {
            return Err("unexpected mask page dimensions".to_string());
        }
        Ok(values.into_iter().map(|value| value > 0).collect())
    };
    match data {
        DecodingResult::U8(values) => to_bool(values),
        DecodingResult::U16(values) => {
            if values.len() != expected_len {
                return Err("unexpected mask page dimensions".to_string());
            }
            Ok(values.into_iter().map(|value| value > 0).collect())
        }
        _ => Err("unsupported TIFF pixel type for mask stack".to_string()),
    }
}
