use std::{
    collections::{BTreeSet, HashMap},
    fs,
    path::{Path, PathBuf},
};

use base64::prelude::{Engine as _, BASE64_STANDARD};
use czi_rs::CziFile;
use image::{DynamicImage, ImageReader};
use nd2_rs::Nd2File;
use walkdir::WalkDir;

use crate::{
    protocol::{
        AlignerSource, ContrastWindow, FramePayload, FrameRequest, ImageSource, WorkspaceScan,
    },
    tiff_io::{self, TiffFrame16},
};

const CONTRAST_SAMPLE_SIZE: usize = 2048;

#[derive(Clone, Debug)]
pub struct RawFrame {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u16>,
    pub contrast_domain: ContrastWindow,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
enum ParsedSourceChannel {
    Numeric(u32),
    Named(String),
}

#[derive(Clone, Debug)]
struct ParsedSourceImageName {
    channel: ParsedSourceChannel,
    position: u32,
    time: u32,
    z: u32,
}

#[derive(Clone, Debug)]
struct SourceMetadata {
    positions: Vec<u32>,
    channels: Vec<u32>,
    times: Vec<u32>,
    z_slices: Vec<u32>,
}

impl SourceMetadata {
    fn workspace_scan(&self) -> WorkspaceScan {
        WorkspaceScan {
            positions: self.positions.clone(),
            channels: self.channels.clone(),
            times: self.times.clone(),
            z_slices: self.z_slices.clone(),
        }
    }

    fn indices_for_request(
        &self,
        request: &FrameRequest,
    ) -> Result<(usize, usize, usize, usize), String> {
        Ok((
            validate_request_index("Position", request.pos, self.positions.len())?,
            validate_request_index("Time", request.time, self.times.len())?,
            validate_request_index("Channel", request.channel, self.channels.len())?,
            validate_request_index("Z", request.z, self.z_slices.len())?,
        ))
    }
}

enum SourceReader {
    Nd2(Nd2File),
    Czi(CziFile),
}

impl SourceReader {
    fn open_nd2(path: &Path) -> Result<Self, String> {
        Ok(Self::Nd2(
            Nd2File::open(path).map_err(|error| error.to_string())?,
        ))
    }

    fn open_czi(path: &Path) -> Result<Self, String> {
        Ok(Self::Czi(
            CziFile::open(path).map_err(|error| error.to_string())?,
        ))
    }

    fn metadata(&mut self) -> Result<SourceMetadata, String> {
        match self {
            Self::Nd2(reader) => {
                let summary = reader.summary().map_err(|error| error.to_string())?;
                let sizes: HashMap<String, usize> = summary.sizes.into_iter().collect();
                metadata_from_sizes(&sizes, "P")
            }
            Self::Czi(reader) => {
                let summary = reader.summary().map_err(|error| error.to_string())?;
                let sizes: HashMap<String, usize> = summary.sizes.into_iter().collect();
                metadata_from_sizes(&sizes, "S")
            }
        }
    }

    fn read_frame_2d(
        &mut self,
        pos: usize,
        time: usize,
        channel: usize,
        z: usize,
    ) -> Result<RawFrame, String> {
        match self {
            Self::Nd2(reader) => {
                let data = reader
                    .read_frame_2d(pos, time, channel, z)
                    .map_err(|error| error.to_string())?;
                let summary = reader.summary().map_err(|error| error.to_string())?;
                let sizes: HashMap<String, usize> = summary.sizes.into_iter().collect();
                raw_frame_from_plane(data, &sizes)
            }
            Self::Czi(reader) => {
                let data = reader
                    .read_frame_2d(pos, time, channel, z)
                    .map_err(|error| error.to_string())?;
                let summary = reader.summary().map_err(|error| error.to_string())?;
                let sizes: HashMap<String, usize> = summary.sizes.into_iter().collect();
                raw_frame_from_plane(data, &sizes)
            }
        }
    }
}

pub fn scan_source(source: ImageSource) -> Result<WorkspaceScan, String> {
    match source {
        AlignerSource::Tif { path } | AlignerSource::Jpg { path } => scan_image_folder(&path),
        AlignerSource::Nd2 { path } => scan_nd2(Path::new(&path)),
        AlignerSource::Czi { path } => scan_czi(Path::new(&path)),
    }
}

pub fn load_frame(source: ImageSource, request: FrameRequest) -> Result<RawFrame, String> {
    match source {
        AlignerSource::Tif { path } | AlignerSource::Jpg { path } => {
            load_image_folder_frame(&path, request)
        }
        AlignerSource::Nd2 { path } => load_nd2_frame(Path::new(&path), request),
        AlignerSource::Czi { path } => load_czi_frame(Path::new(&path), request),
    }
}

pub fn load_frame_payload(
    source: ImageSource,
    request: FrameRequest,
    contrast: Option<ContrastWindow>,
) -> Result<FramePayload, String> {
    load_frame(source, request).map(|raw| to_frame_payload(raw, contrast))
}

pub fn to_frame_payload(raw: RawFrame, contrast: Option<ContrastWindow>) -> FramePayload {
    let domain = raw.contrast_domain.clone();
    let suggested = auto_contrast(&raw.data);
    let applied = contrast
        .as_ref()
        .map(|window| normalize_contrast(window, &domain))
        .unwrap_or_else(|| suggested.clone());
    let pixels = apply_contrast(&raw.data, &applied);

    FramePayload {
        width: raw.width,
        height: raw.height,
        data_base64: BASE64_STANDARD.encode(pixels),
        pixel_type: "uint8",
        contrast_domain: domain,
        suggested_contrast: suggested,
        applied_contrast: applied,
    }
}

fn scan_nd2(path: &Path) -> Result<WorkspaceScan, String> {
    let mut reader = SourceReader::open_nd2(path)?;
    Ok(reader.metadata()?.workspace_scan())
}

fn scan_czi(path: &Path) -> Result<WorkspaceScan, String> {
    let mut reader = SourceReader::open_czi(path)?;
    Ok(reader.metadata()?.workspace_scan())
}

fn load_nd2_frame(path: &Path, request: FrameRequest) -> Result<RawFrame, String> {
    let mut reader = SourceReader::open_nd2(path)?;
    let metadata = reader.metadata()?;
    let (pos, time, channel, z) = metadata.indices_for_request(&request)?;
    reader.read_frame_2d(pos, time, channel, z)
}

fn load_czi_frame(path: &Path, request: FrameRequest) -> Result<RawFrame, String> {
    let mut reader = SourceReader::open_czi(path)?;
    let metadata = reader.metadata()?;
    let (pos, time, channel, z) = metadata.indices_for_request(&request)?;
    reader.read_frame_2d(pos, time, channel, z)
}

fn raw_frame_from_plane(data: Vec<u16>, sizes: &HashMap<String, usize>) -> Result<RawFrame, String> {
    Ok(RawFrame {
        width: u32::try_from(dimension_size(sizes, "X")).map_err(|error| error.to_string())?,
        height: u32::try_from(dimension_size(sizes, "Y")).map_err(|error| error.to_string())?,
        data,
        contrast_domain: ContrastWindow {
            min: 0,
            max: u16::MAX as u32,
        },
    })
}

fn metadata_from_sizes(
    sizes: &HashMap<String, usize>,
    position_key: &str,
) -> Result<SourceMetadata, String> {
    Ok(SourceMetadata {
        positions: dimension_values(sizes, position_key),
        channels: dimension_values(sizes, "C"),
        times: dimension_values(sizes, "T"),
        z_slices: dimension_values(sizes, "Z"),
    })
}

fn dimension_size(sizes: &HashMap<String, usize>, key: &str) -> usize {
    sizes.get(key).copied().unwrap_or(1)
}

fn dimension_values(sizes: &HashMap<String, usize>, key: &str) -> Vec<u32> {
    (0..dimension_size(sizes, key))
        .filter_map(|value| u32::try_from(value).ok())
        .collect()
}

fn validate_request_index(label: &str, index: u32, size: usize) -> Result<usize, String> {
    let effective_size = size.max(1);
    let index = index as usize;
    if index >= effective_size {
        return Err(format!("{label} index {index} is out of range"));
    }
    Ok(index)
}

fn scan_image_folder(root: &str) -> Result<WorkspaceScan, String> {
    let entries = fs::read_dir(root).map_err(|error| error.to_string())?;
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
    let mut parsed_images = Vec::<ParsedSourceImageName>::new();

    for (position, folder) in position_dirs {
        positions.push(position);
        parsed_images.extend(collect_source_images(&folder).into_iter().map(|(_, parsed)| parsed));
    }

    let channel_mapping = build_channel_mapping(parsed_images.iter().map(|parsed| &parsed.channel));
    for parsed in parsed_images {
        if let Some(channel) = channel_mapping.get(&parsed.channel) {
            channels.insert(*channel);
        }
        times.insert(parsed.time);
        z_slices.insert(parsed.z);
    }

    Ok(WorkspaceScan {
        positions,
        channels: channels.into_iter().collect(),
        times: times.into_iter().collect(),
        z_slices: z_slices.into_iter().collect(),
    })
}

fn load_image_folder_frame(root: &str, request: FrameRequest) -> Result<RawFrame, String> {
    let pos_dir = find_position_dir(Path::new(root), request.pos)?;
    let source_images = collect_source_images(&pos_dir);
    let channel_mapping =
        build_channel_mapping(source_images.iter().map(|(_, parsed)| &parsed.channel));
    let matching = source_images
        .into_iter()
        .find(|(_, parsed)| {
            parsed.position == request.pos
                && channel_mapping.get(&parsed.channel).copied() == Some(request.channel)
                && parsed.time == request.time
                && parsed.z == request.z
        })
        .map(|(path, _)| path)
        .ok_or_else(|| "requested image frame not found".to_string())?;

    load_image_frame(&matching)
}

fn collect_source_images(folder: &Path) -> Vec<(PathBuf, ParsedSourceImageName)> {
    WalkDir::new(folder)
        .max_depth(6)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| {
            let file_name = entry.path().file_name()?.to_str()?;
            let parsed = parse_source_image_name(file_name, infer_position_hint(entry.path()))?;
            Some((entry.into_path(), parsed))
        })
        .collect()
}

fn load_image_frame(path: &Path) -> Result<RawFrame, String> {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .as_deref()
    {
        Some("tif" | "tiff") => tiff_io::load_tiff_frame_page(path, 0).map(raw_frame_from_tiff),
        Some("png" | "jpg" | "jpeg") => load_raster_frame(path),
        _ => Err(format!(
            "unsupported source image extension for {}",
            path.display()
        )),
    }
}

fn raw_frame_from_tiff(frame: TiffFrame16) -> RawFrame {
    RawFrame {
        width: frame.width,
        height: frame.height,
        data: frame.data,
        contrast_domain: ContrastWindow {
            min: 0,
            max: frame.max_value,
        },
    }
}

fn load_raster_frame(path: &Path) -> Result<RawFrame, String> {
    let image = ImageReader::open(path)
        .map_err(|error| error.to_string())?
        .decode()
        .map_err(|error| error.to_string())?;
    Ok(raw_frame_from_dynamic_image(image))
}

fn raw_frame_from_dynamic_image(image: DynamicImage) -> RawFrame {
    match image {
        DynamicImage::ImageLuma8(buffer) => RawFrame {
            width: buffer.width(),
            height: buffer.height(),
            data: buffer.into_raw().into_iter().map(u16::from).collect(),
            contrast_domain: ContrastWindow {
                min: 0,
                max: u8::MAX as u32,
            },
        },
        DynamicImage::ImageLuma16(buffer) => RawFrame {
            width: buffer.width(),
            height: buffer.height(),
            data: buffer.into_raw(),
            contrast_domain: ContrastWindow {
                min: 0,
                max: u16::MAX as u32,
            },
        },
        other => {
            let buffer = other.into_luma8();
            RawFrame {
                width: buffer.width(),
                height: buffer.height(),
                data: buffer.into_raw().into_iter().map(u16::from).collect(),
                contrast_domain: ContrastWindow {
                    min: 0,
                    max: u8::MAX as u32,
                },
            }
        }
    }
}

fn sampled_values(values: &[u16]) -> Vec<u16> {
    if values.is_empty() {
        return vec![0];
    }
    if values.len() <= CONTRAST_SAMPLE_SIZE {
        let mut copy = values.to_vec();
        copy.sort_unstable();
        return copy;
    }

    let step = values.len() as f64 / CONTRAST_SAMPLE_SIZE as f64;
    let mut sample = Vec::with_capacity(CONTRAST_SAMPLE_SIZE);
    for index in 0..CONTRAST_SAMPLE_SIZE {
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

fn auto_contrast(values: &[u16]) -> ContrastWindow {
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

fn normalize_contrast(contrast: &ContrastWindow, domain: &ContrastWindow) -> ContrastWindow {
    let min = contrast.min.clamp(domain.min, domain.max.saturating_sub(1));
    let max = contrast.max.clamp(min + 1, domain.max);
    ContrastWindow { min, max }
}

fn apply_contrast(values: &[u16], contrast: &ContrastWindow) -> Vec<u8> {
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

fn build_channel_mapping<'a>(
    channels: impl IntoIterator<Item = &'a ParsedSourceChannel>,
) -> HashMap<ParsedSourceChannel, u32> {
    let unique = channels.into_iter().cloned().collect::<BTreeSet<_>>();
    if unique
        .iter()
        .all(|channel| matches!(channel, ParsedSourceChannel::Numeric(_)))
    {
        return unique
            .into_iter()
            .filter_map(|channel| match channel {
                ParsedSourceChannel::Numeric(value) => {
                    Some((ParsedSourceChannel::Numeric(value), value))
                }
                ParsedSourceChannel::Named(_) => None,
            })
            .collect();
    }

    unique
        .into_iter()
        .enumerate()
        .map(|(index, channel)| (channel, index as u32))
        .collect()
}

fn find_position_dir(root: &Path, position: u32) -> Result<PathBuf, String> {
    let entries = fs::read_dir(root).map_err(|error| error.to_string())?;
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

    Err(format!("position directory not found for Pos{position}"))
}

fn infer_position_hint(path: &Path) -> Option<u32> {
    path.ancestors().find_map(|ancestor| {
        ancestor
            .file_name()
            .and_then(|value| value.to_str())
            .and_then(parse_pos_dir_name)
    })
}

fn parse_pos_dir_name(name: &str) -> Option<u32> {
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

fn parse_source_image_name(
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
