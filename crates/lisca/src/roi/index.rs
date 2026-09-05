use std::{fs, path::PathBuf};

use crate::{
    image_source::RawFrame,
    protocol::{RoiFrameRequest, RoiIndexFile, RoiPositionScan, RoiWorkspaceScan},
    tiff_io,
};

pub fn scan_roi_workspace(workspace_path: &str) -> Result<RoiWorkspaceScan, String> {
    let root = roi_root_path(workspace_path);
    if !root.is_dir() {
        return Ok(RoiWorkspaceScan {
            positions: Vec::new(),
        });
    }

    let mut positions = Vec::new();
    let entries = fs::read_dir(&root)
        .map_err(|error| format!("failed to list {}: {error}", root.display()))?;
    for entry in entries {
        let entry = entry
            .map_err(|error| format!("failed to read an entry in {}: {error}", root.display()))?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let Some(name) = entry.file_name().to_str().map(str::to_string) else {
            continue;
        };
        let Some(pos) = parse_pos_dir_name(&name) else {
            continue;
        };
        let index = read_roi_index(workspace_path, pos)?;
        positions.push(RoiPositionScan {
            pos,
            channels: axis_values(index.channel_count),
            times: published_time_axis(&index.time_indices, index.time_count),
            z_slices: axis_values(index.z_count),
            rois: index.rois,
        });
    }

    positions.sort_by_key(|entry| entry.pos);
    Ok(RoiWorkspaceScan { positions })
}

pub fn load_roi_frame(workspace_path: &str, request: RoiFrameRequest) -> Result<RawFrame, String> {
    let index = read_roi_index(workspace_path, request.pos)?;
    let roi = index
        .rois
        .iter()
        .find(|entry| entry.roi == request.roi)
        .ok_or_else(|| format!("ROI {} not found for Pos{}", request.roi, request.pos))?;

    if request.channel >= index.channel_count {
        return Err(format!("Channel index {} is out of range", request.channel));
    }
    if request.z >= index.z_count {
        return Err(format!("Z index {} is out of range", request.z));
    }

    let times = published_time_axis(&index.time_indices, index.time_count);
    let plane_t = match times.iter().position(|&t| t == request.time) {
        Some(plane_t) => plane_t as u32,
        None => {
            return Err(format!(
                "Time index {} is not in the available time indices {:?}",
                request.time, times
            ))
        }
    };

    let page =
        ((plane_t * index.channel_count + request.channel) * index.z_count + request.z) as usize;
    let frame = tiff_io::load_tiff_frame_page(
        &roi_tiff_path(workspace_path, request.pos, request.roi),
        page,
    )?;
    if frame.width != roi.bbox.w || frame.height != roi.bbox.h {
        return Err(format!(
            "ROI {} TIFF page dimensions {}x{} do not match index {}x{}",
            request.roi, frame.width, frame.height, roi.bbox.w, roi.bbox.h
        ));
    }

    Ok(RawFrame {
        width: frame.width,
        height: frame.height,
        data: frame.data,
        contrast_domain: crate::protocol::ContrastWindow {
            min: 0,
            max: frame.max_value,
        },
    })
}

pub(super) fn read_roi_index(workspace_path: &str, pos: u32) -> Result<RoiIndexFile, String> {
    let path = roi_index_path(workspace_path, pos);
    let bytes = fs::read(&path).map_err(|error| error.to_string())?;
    let index = serde_json::from_slice::<RoiIndexFile>(&bytes)
        .map_err(|error| format!("{}: {error}", path.display()))?;

    if index.position != pos {
        return Err(format!(
            "ROI index position {} does not match Pos{}",
            index.position, pos
        ));
    }
    // axis_order is a closed enum (`TCZYX`) in the generated schema.
    if index.rois.is_empty() {
        return Err(format!("No ROI entries found in {}", path.display()));
    }
    Ok(index)
}

fn parse_pos_dir_name(name: &str) -> Option<u32> {
    let normalized: String = name.chars().filter(|c| !c.is_whitespace()).collect();
    let lower = normalized.to_ascii_lowercase();
    for prefix in ["position", "pos"] {
        if let Some(rest) = lower.strip_prefix(prefix) {
            let trimmed = rest.trim_start_matches(['-', '_']);
            if !trimmed.is_empty() && trimmed.chars().all(|c| c.is_ascii_digit()) {
                return trimmed.parse().ok();
            }
        }
    }
    None
}

fn axis_values(count: u32) -> Vec<u32> {
    (0..count).collect()
}

fn published_time_axis(time_indices: &[u32], time_count: u32) -> Vec<u32> {
    if time_indices.len() as u32 == time_count {
        time_indices.to_vec()
    } else {
        axis_values(time_count)
    }
}

fn roi_root_path(root: &str) -> PathBuf {
    lisca_workspace::roi_dir(root)
}

fn roi_tiff_path(root: &str, pos: u32, roi: u32) -> PathBuf {
    lisca_workspace::roi_tiff_path(root, pos, &lisca_workspace::roi_tiff_name(roi))
}

fn roi_index_path(root: &str, pos: u32) -> PathBuf {
    lisca_workspace::roi_index_path(root, pos)
}
