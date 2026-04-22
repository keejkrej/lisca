use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::data::tiff::{load_tiff_frame_page, load_tiff_frames};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct RoiCrop {
    pub roi: u32,
    pub file_name: String,
    pub shape: Vec<usize>,
    pub x: Option<u32>,
    pub y: Option<u32>,
    pub w: Option<u32>,
    pub h: Option<u32>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct PositionIndex {
    pub position: u32,
    pub axis_order: String,
    pub time_count: u32,
    pub channel_count: u32,
    pub z_count: u32,
    pub rois: Vec<RoiCrop>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RoiFrame2D {
    pub width: u32,
    pub height: u32,
    pub pixels: Vec<u16>,
}

pub fn position_dir(dataset_root: &Path, pos: u32) -> Result<PathBuf, String> {
    let path = dataset_root.join("roi").join(format!("Pos{pos}"));
    if !path.is_dir() {
        return Err(format!(
            "No ROI directory found for --pos={pos}: {}",
            path.display()
        ));
    }
    Ok(path)
}

pub fn read_position_index(pos_dir: &Path) -> Result<PositionIndex, String> {
    let index_path = pos_dir.join("index.json");
    let content = std::fs::read_to_string(&index_path)
        .map_err(|_| format!("Missing ROI index: {}", index_path.display()))?;
    let raw = serde_json::from_str::<serde_json::Value>(&content).map_err(|err| err.to_string())?;
    let axis_order = raw
        .get("axisOrder")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("")
        .to_ascii_uppercase();
    if axis_order.is_empty() {
        return Err(format!("{} is missing axisOrder", index_path.display()));
    }

    let rois = raw
        .get("rois")
        .and_then(serde_json::Value::as_array)
        .unwrap_or(&Vec::new())
        .iter()
        .map(parse_roi_crop)
        .collect::<Result<Vec<_>, _>>()?;
    if rois.is_empty() {
        return Err(format!("No ROI entries found in {}", index_path.display()));
    }

    Ok(PositionIndex {
        position: raw
            .get("position")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(0) as u32,
        axis_order,
        time_count: raw
            .get("timeCount")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(1) as u32,
        channel_count: raw
            .get("channelCount")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(1) as u32,
        z_count: raw
            .get("zCount")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(1) as u32,
        rois,
    })
}

pub fn validate_channel_index(index: &PositionIndex, channel: u32) -> Result<(), String> {
    if channel >= index.channel_count {
        return Err(format!(
            "--channel must be between 0 and {}, got {channel}",
            index.channel_count.saturating_sub(1)
        ));
    }
    Ok(())
}

pub fn read_roi_frame_2d(
    pos_dir: &Path,
    index: &PositionIndex,
    roi: &RoiCrop,
    timepoint: u32,
    channel: u32,
    z_index: u32,
) -> Result<RoiFrame2D, String> {
    let roi_path = pos_dir.join(&roi.file_name);
    if !roi_path.is_file() {
        return Err(format!(
            "Missing ROI TIFF referenced by index.json: {}",
            roi_path.display()
        ));
    }

    let page = roi_page_index(index, roi, timepoint, channel, z_index)?;
    let frame = load_tiff_frame_page(&roi_path, page)?;
    let expected_area = roi_frame_area(index, roi)?;
    if frame.data.len() != expected_area {
        return Err(format!(
            "{} shape mismatch: expected {} pixels, got {}",
            roi_path.display(),
            expected_area,
            frame.data.len()
        ));
    }

    Ok(RoiFrame2D {
        width: frame.width,
        height: frame.height,
        pixels: frame.data,
    })
}

pub fn read_roi_stack_2d(
    pos_dir: &Path,
    index: &PositionIndex,
    roi: &RoiCrop,
) -> Result<Vec<RoiFrame2D>, String> {
    let roi_path = pos_dir.join(&roi.file_name);
    if !roi_path.is_file() {
        return Err(format!(
            "Missing ROI TIFF referenced by index.json: {}",
            roi_path.display()
        ));
    }

    let expected_pages = roi_page_count(index, roi)?;
    let expected_area = roi_frame_area(index, roi)?;
    let frames = load_tiff_frames(&roi_path)?;
    if frames.len() != expected_pages {
        return Err(format!(
            "{} page count mismatch: expected {}, got {}",
            roi_path.display(),
            expected_pages,
            frames.len()
        ));
    }

    frames
        .into_iter()
        .map(|frame| {
            if frame.data.len() != expected_area {
                return Err(format!(
                    "{} shape mismatch: expected {} pixels, got {}",
                    roi_path.display(),
                    expected_area,
                    frame.data.len()
                ));
            }
            Ok(RoiFrame2D {
                width: frame.width,
                height: frame.height,
                pixels: frame.data,
            })
        })
        .collect()
}

pub fn roi_frame_from_stack<'a>(
    stack: &'a [RoiFrame2D],
    index: &PositionIndex,
    roi: &RoiCrop,
    timepoint: u32,
    channel: u32,
    z_index: u32,
) -> Result<&'a RoiFrame2D, String> {
    let page = roi_page_index(index, roi, timepoint, channel, z_index)?;
    stack.get(page).ok_or_else(|| {
        format!(
            "TIFF page {} is out of range for ROI {}",
            page, roi.file_name
        )
    })
}

fn parse_roi_crop(value: &serde_json::Value) -> Result<RoiCrop, String> {
    let bbox = value
        .get("bbox")
        .cloned()
        .unwrap_or_else(|| serde_json::json!({}));
    Ok(RoiCrop {
        roi: value
            .get("roi")
            .and_then(serde_json::Value::as_u64)
            .ok_or_else(|| "ROI entry is missing roi".to_string())? as u32,
        file_name: value
            .get("fileName")
            .and_then(serde_json::Value::as_str)
            .ok_or_else(|| "ROI entry is missing fileName".to_string())?
            .to_string(),
        shape: value
            .get("shape")
            .and_then(serde_json::Value::as_array)
            .ok_or_else(|| "ROI entry is missing shape".to_string())?
            .iter()
            .map(|entry| {
                entry
                    .as_u64()
                    .map(|v| v as usize)
                    .ok_or_else(|| "ROI shape values must be integers".to_string())
            })
            .collect::<Result<Vec<_>, _>>()?,
        x: bbox
            .get("x")
            .and_then(serde_json::Value::as_u64)
            .map(|v| v as u32),
        y: bbox
            .get("y")
            .and_then(serde_json::Value::as_u64)
            .map(|v| v as u32),
        w: bbox
            .get("w")
            .and_then(serde_json::Value::as_u64)
            .map(|v| v as u32),
        h: bbox
            .get("h")
            .and_then(serde_json::Value::as_u64)
            .map(|v| v as u32),
    })
}

fn roi_page_index(
    index: &PositionIndex,
    roi: &RoiCrop,
    timepoint: u32,
    channel: u32,
    z_index: u32,
) -> Result<usize, String> {
    if index.axis_order.len() != roi.shape.len() {
        return Err(format!(
            "Axis order {:?} does not match ROI stack ndim={}",
            index.axis_order,
            roi.shape.len()
        ));
    }

    let mut page_index = 0usize;
    let mut page_dims = 0usize;
    for (axis, size) in index.axis_order.chars().zip(roi.shape.iter().copied()) {
        let coord = match axis {
            'T' => {
                if timepoint as usize >= size {
                    return Err(format!(
                        "Time index {timepoint} out of range for axis size {size}"
                    ));
                }
                Some(timepoint as usize)
            }
            'C' => {
                if channel as usize >= size {
                    return Err(format!(
                        "Channel index {channel} out of range for axis size {size}"
                    ));
                }
                Some(channel as usize)
            }
            'Z' => {
                if z_index as usize >= size {
                    return Err(format!(
                        "Z index {z_index} out of range for axis size {size}"
                    ));
                }
                Some(z_index as usize)
            }
            'Y' | 'X' => None,
            _ => {
                if size != 1 {
                    return Err(format!(
                        "Unsupported non-singleton axis {axis:?} in ROI stack with shape {:?}",
                        roi.shape
                    ));
                }
                Some(0)
            }
        };

        if let Some(coord) = coord {
            page_dims += 1;
            page_index = page_index * size + coord;
        }
    }

    if page_dims == 0 {
        return Ok(0);
    }
    Ok(page_index)
}

fn roi_frame_area(index: &PositionIndex, roi: &RoiCrop) -> Result<usize, String> {
    let mut area = 1usize;
    let mut found = 0usize;
    for (axis, size) in index.axis_order.chars().zip(roi.shape.iter().copied()) {
        if axis == 'Y' || axis == 'X' {
            found += 1;
            area = area.saturating_mul(size);
        }
    }
    if found != 2 {
        return Err(format!(
            "Expected exactly two spatial axes in {:?}, got {found}",
            index.axis_order
        ));
    }
    Ok(area)
}

fn roi_page_count(index: &PositionIndex, roi: &RoiCrop) -> Result<usize, String> {
    if index.axis_order.len() != roi.shape.len() {
        return Err(format!(
            "Axis order {:?} does not match ROI stack ndim={}",
            index.axis_order,
            roi.shape.len()
        ));
    }

    let mut pages = 1usize;
    for (axis, size) in index.axis_order.chars().zip(roi.shape.iter().copied()) {
        if axis != 'Y' && axis != 'X' {
            pages = pages.saturating_mul(size);
        }
    }
    Ok(pages.max(1))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_channel_index_rejects_out_of_range() {
        let index = PositionIndex {
            position: 0,
            axis_order: "TCZYX".to_string(),
            time_count: 2,
            channel_count: 1,
            z_count: 1,
            rois: Vec::new(),
        };
        assert!(validate_channel_index(&index, 1)
            .unwrap_err()
            .contains("--channel"));
    }

    #[test]
    fn roi_page_index_respects_axis_order() {
        let index = PositionIndex {
            position: 0,
            axis_order: "TCZYX".to_string(),
            time_count: 3,
            channel_count: 2,
            z_count: 4,
            rois: Vec::new(),
        };
        let roi = RoiCrop {
            roi: 1,
            file_name: "Roi1.tif".to_string(),
            shape: vec![3, 2, 4, 5, 6],
            x: None,
            y: None,
            w: None,
            h: None,
        };
        assert_eq!(roi_page_index(&index, &roi, 2, 1, 3).unwrap(), 23);
    }
}
