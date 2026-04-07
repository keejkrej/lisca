use std::collections::BTreeSet;
use std::fs::{self, File};
use std::io::BufReader;
use std::path::{Path, PathBuf};

use czi_rs::{Bitmap as CziBitmap, CziFile, Dimension as CziDimension, PixelType as CziPixelType, PlaneIndex};
use nd2_rs::Nd2File;
use tiff::decoder::{Decoder, DecodingResult};
use walkdir::WalkDir;

use crate::viewer::domain::{
    dimension_size, dimension_values, parse_pos_dir_name, parse_tiff_name, validate_request_index,
    ContrastWindow, FrameRequest, ParsedTiffName, ViewerSource, WorkspaceScan,
};

const SAMPLE_SIZE: usize = 2048;

#[derive(Clone, Debug)]
pub struct RawFrame {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u16>,
}

fn collapse_u8_buffer(width: u32, height: u32, values: Vec<u8>) -> Result<Vec<u16>, String> {
    let expected_len = width as usize * height as usize;
    if values.len() == expected_len {
        return Ok(values.into_iter().map(u16::from).collect());
    }
    if values.len() == expected_len * 3 || values.len() == expected_len * 4 {
        let channels = values.len() / expected_len;
        let mut collapsed = Vec::with_capacity(expected_len);
        for chunk in values.chunks(channels) {
            let sum: u32 = chunk.iter().map(|value| u32::from(*value)).sum();
            collapsed.push((sum / channels as u32) as u16);
        }
        return Ok(collapsed);
    }
    Err("Unsupported CZI sample layout".to_string())
}

fn collapse_u16_buffer(width: u32, height: u32, values: Vec<u16>) -> Result<Vec<u16>, String> {
    let expected_len = width as usize * height as usize;
    if values.len() == expected_len {
        return Ok(values);
    }
    if values.len() == expected_len * 3 || values.len() == expected_len * 4 {
        let channels = values.len() / expected_len;
        let mut collapsed = Vec::with_capacity(expected_len);
        for chunk in values.chunks(channels) {
            let sum: u32 = chunk.iter().map(|value| u32::from(*value)).sum();
            collapsed.push((sum / channels as u32) as u16);
        }
        return Ok(collapsed);
    }
    Err("Unsupported CZI sample layout".to_string())
}

pub fn czi_bitmap_to_u16(bitmap: CziBitmap) -> Result<Vec<u16>, String> {
    let pixel_type = bitmap.pixel_type;
    let width = bitmap.width;
    let height = bitmap.height;

    match pixel_type {
        CziPixelType::Gray8 | CziPixelType::Bgr24 | CziPixelType::Bgra32 => {
            collapse_u8_buffer(width, height, bitmap.into_bytes())
        }
        CziPixelType::Gray16 | CziPixelType::Bgr48 => {
            let values = bitmap.to_u16_vec().map_err(|err| err.to_string())?;
            collapse_u16_buffer(width, height, values)
        }
        _ => Err(format!("Unsupported CZI pixel type {}", pixel_type.as_str())),
    }
}

pub fn collect_tiffs(folder: &Path) -> Vec<(PathBuf, ParsedTiffName)> {
    WalkDir::new(folder)
        .max_depth(6)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| {
            let file_name = entry.path().file_name()?.to_str()?;
            let parsed = parse_tiff_name(file_name)?;
            Some((entry.into_path(), parsed))
        })
        .collect()
}

pub fn find_position_dir(root: &Path, position: u32) -> Result<PathBuf, String> {
    let entries = fs::read_dir(root).map_err(|err| err.to_string())?;
    for entry in entries.flatten() {
        if !entry.path().is_dir() {
            continue;
        }

        let Some(name) = entry.file_name().to_str().map(str::to_string) else {
            continue;
        };
        if parse_pos_dir_name(&name) == Some(position) {
            return Ok(entry.path());
        }
    }

    Err(format!("Position directory not found for Pos{position}"))
}

fn to_u16_buffer(width: u32, height: u32, data: DecodingResult) -> Result<Vec<u16>, String> {
    let expected_len = width as usize * height as usize;
    let collapse_channels = |values: Vec<u16>| -> Result<Vec<u16>, String> {
        if values.len() == expected_len {
            return Ok(values);
        }
        if values.len() == expected_len * 3 || values.len() == expected_len * 4 {
            let channels = values.len() / expected_len;
            let mut collapsed = Vec::with_capacity(expected_len);
            for chunk in values.chunks(channels) {
                let sum: u32 = chunk.iter().map(|value| *value as u32).sum();
                collapsed.push((sum / channels as u32) as u16);
            }
            return Ok(collapsed);
        }
        Err("Unsupported TIFF sample layout".to_string())
    };

    match data {
        DecodingResult::U8(values) => {
            if values.len() == expected_len {
                Ok(values.into_iter().map(|value| value as u16).collect())
            } else if values.len() == expected_len * 3 || values.len() == expected_len * 4 {
                collapse_channels(values.into_iter().map(|value| value as u16).collect())
            } else {
                Err("Unsupported TIFF sample layout".to_string())
            }
        }
        DecodingResult::U16(values) => collapse_channels(values),
        _ => Err("Unsupported TIFF pixel type".to_string()),
    }
}

pub fn load_tiff_frame(path: &Path) -> Result<RawFrame, String> {
    load_tiff_frame_page(path, 0)
}

pub fn load_tiff_frame_page(path: &Path, page: usize) -> Result<RawFrame, String> {
    let file = File::open(path).map_err(|err| err.to_string())?;
    let mut decoder = Decoder::new(BufReader::new(file)).map_err(|err| err.to_string())?;

    for page_idx in 0..page {
        if !decoder.more_images() {
            return Err(format!(
                "TIFF page {} is out of range for {}",
                page_idx + 1,
                path.display()
            ));
        }
        decoder.next_image().map_err(|err| err.to_string())?;
    }

    let dimensions = decoder.dimensions().map_err(|err| err.to_string())?;
    let data = decoder.read_image().map_err(|err| err.to_string())?;
    let pixels = to_u16_buffer(dimensions.0, dimensions.1, data)?;

    Ok(RawFrame {
        width: dimensions.0,
        height: dimensions.1,
        data: pixels,
    })
}

pub fn scan_nd2(path: &Path) -> Result<WorkspaceScan, String> {
    let mut nd2 = Nd2File::open(path).map_err(|err| err.to_string())?;
    let sizes = nd2.sizes().map_err(|err| err.to_string())?;

    Ok(WorkspaceScan {
        positions: dimension_values(&sizes, "P"),
        channels: dimension_values(&sizes, "C"),
        times: dimension_values(&sizes, "T"),
        z_slices: dimension_values(&sizes, "Z"),
    })
}

pub fn scan_czi(path: &Path) -> Result<WorkspaceScan, String> {
    let czi = CziFile::open(path).map_err(|err| err.to_string())?;
    let sizes = czi.sizes().map_err(|err| err.to_string())?;

    Ok(WorkspaceScan {
        positions: dimension_values(&sizes, "S"),
        channels: dimension_values(&sizes, "C"),
        times: dimension_values(&sizes, "T"),
        z_slices: dimension_values(&sizes, "Z"),
    })
}

pub fn scan_tif(root: &Path) -> Result<WorkspaceScan, String> {
    let entries = fs::read_dir(root).map_err(|err| err.to_string())?;
    let mut position_dirs = Vec::<(u32, PathBuf)>::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let Some(name) = entry.file_name().to_str().map(str::to_string) else {
            continue;
        };

        if let Some(position) = parse_pos_dir_name(&name) {
            position_dirs.push((position, path));
        }
    }

    position_dirs.sort_by_key(|(position, _)| *position);

    let mut positions = Vec::new();
    let mut channels = BTreeSet::new();
    let mut times = BTreeSet::new();
    let mut z_slices = BTreeSet::new();

    for (position, folder) in position_dirs {
        positions.push(position);
        for (_, parsed) in collect_tiffs(&folder) {
            channels.insert(parsed.channel);
            times.insert(parsed.time);
            z_slices.insert(parsed.z);
        }
    }

    Ok(WorkspaceScan {
        positions,
        channels: channels.into_iter().collect(),
        times: times.into_iter().collect(),
        z_slices: z_slices.into_iter().collect(),
    })
}

pub fn load_tif_frame(root: &Path, request: FrameRequest) -> Result<RawFrame, String> {
    let pos_dir = find_position_dir(root, request.pos)?;
    let matching = collect_tiffs(&pos_dir)
        .into_iter()
        .find(|(_, parsed)| {
            parsed.position == request.pos
                && parsed.channel == request.channel
                && parsed.time == request.time
                && parsed.z == request.z
        })
        .map(|(path, _)| path)
        .ok_or_else(|| "Requested TIFF frame not found".to_string())?;

    load_tiff_frame(&matching)
}

pub fn load_nd2_frame(path: &Path, request: FrameRequest) -> Result<RawFrame, String> {
    let mut nd2 = Nd2File::open(path).map_err(|err| err.to_string())?;
    let sizes = nd2.sizes().map_err(|err| err.to_string())?;
    let width = u32::try_from(dimension_size(&sizes, "X")).map_err(|err| err.to_string())?;
    let height = u32::try_from(dimension_size(&sizes, "Y")).map_err(|err| err.to_string())?;

    let pos = validate_request_index("Position", request.pos, dimension_size(&sizes, "P"))?;
    let time = validate_request_index("Time", request.time, dimension_size(&sizes, "T"))?;
    let channel = validate_request_index("Channel", request.channel, dimension_size(&sizes, "C"))?;
    let z = validate_request_index("Z", request.z, dimension_size(&sizes, "Z"))?;

    let data = nd2
        .read_frame_2d(pos, time, channel, z)
        .map_err(|err| err.to_string())?;

    Ok(RawFrame { width, height, data })
}

pub fn load_czi_frame(path: &Path, request: FrameRequest) -> Result<RawFrame, String> {
    let mut czi = CziFile::open(path).map_err(|err| err.to_string())?;
    let sizes = czi.sizes().map_err(|err| err.to_string())?;

    let pos = validate_request_index("Position", request.pos, dimension_size(&sizes, "S"))?;
    let time = validate_request_index("Time", request.time, dimension_size(&sizes, "T"))?;
    let channel = validate_request_index("Channel", request.channel, dimension_size(&sizes, "C"))?;
    let z = validate_request_index("Z", request.z, dimension_size(&sizes, "Z"))?;

    let plane = PlaneIndex::new()
        .with(CziDimension::S, pos)
        .with(CziDimension::T, time)
        .with(CziDimension::C, channel)
        .with(CziDimension::Z, z);
    let bitmap = czi.read_plane(&plane).map_err(|err| err.to_string())?;
    let width = bitmap.width;
    let height = bitmap.height;
    let data = czi_bitmap_to_u16(bitmap)?;

    Ok(RawFrame {
        width,
        height,
        data,
    })
}

pub fn scan_source(source: ViewerSource) -> Result<WorkspaceScan, String> {
    match source {
        ViewerSource::Tif { path } => scan_tif(Path::new(&path)),
        ViewerSource::Nd2 { path } => scan_nd2(Path::new(&path)),
        ViewerSource::Czi { path } => scan_czi(Path::new(&path)),
    }
}

pub fn load_frame(source: ViewerSource, request: FrameRequest) -> Result<RawFrame, String> {
    match source {
        ViewerSource::Tif { path } => load_tif_frame(Path::new(&path), request),
        ViewerSource::Nd2 { path } => load_nd2_frame(Path::new(&path), request),
        ViewerSource::Czi { path } => load_czi_frame(Path::new(&path), request),
    }
}

pub fn contrast_domain() -> ContrastWindow {
    ContrastWindow {
        min: 0,
        max: u16::MAX as u32,
    }
}

fn sampled_values(values: &[u16]) -> Vec<u16> {
    if values.is_empty() {
        return vec![0];
    }

    if values.len() <= SAMPLE_SIZE {
        let mut copy = values.to_vec();
        copy.sort_unstable();
        return copy;
    }

    let step = values.len() as f64 / SAMPLE_SIZE as f64;
    let mut sample = Vec::with_capacity(SAMPLE_SIZE);
    for index in 0..SAMPLE_SIZE {
        let position = (index as f64 * step).floor() as usize;
        sample.push(values[position.min(values.len() - 1)]);
    }
    sample.sort_unstable();
    sample
}

fn percentile(values: &[u16], q: f64) -> u16 {
    if values.is_empty() {
        return 0;
    }

    let sorted = sampled_values(values);
    let clamped_q = q.clamp(0.0, 1.0);
    let index = (clamped_q * (sorted.len().saturating_sub(1)) as f64).floor() as usize;
    sorted[index.min(sorted.len() - 1)]
}

pub fn auto_contrast(values: &[u16]) -> ContrastWindow {
    if values.is_empty() {
        return ContrastWindow { min: 0, max: 1 };
    }

    let min = percentile(values, 0.001) as u32;
    let max = percentile(values, 0.999) as u32;
    ContrastWindow {
        min,
        max: max.max(min + 1),
    }
}

pub fn normalize_contrast(contrast: &ContrastWindow) -> ContrastWindow {
    let domain = contrast_domain();
    let min = contrast.min.clamp(domain.min, domain.max.saturating_sub(1));
    let max = contrast.max.clamp(min + 1, domain.max);
    ContrastWindow { min, max }
}

pub fn apply_contrast(values: &[u16], contrast: &ContrastWindow) -> Vec<u8> {
    let min = contrast.min as f32;
    let max = contrast.max.max(contrast.min + 1) as f32;
    let range = (max - min).max(1.0);

    values
        .iter()
        .map(|value| {
            let normalized = ((*value as f32 - min) / range).clamp(0.0, 1.0);
            (normalized * 255.0).round() as u8
        })
        .collect()
}
