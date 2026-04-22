use std::collections::{BTreeSet, HashMap};
use std::fs;
use std::path::{Path, PathBuf};

use czi_rs::CziFile;
use image::{DynamicImage, ImageReader};
use nd2_rs::Nd2File;
use walkdir::WalkDir;

use crate::data::tiff;
use crate::viewer::domain::{
    dimension_size, dimension_values, parse_pos_dir_name, parse_source_image_name,
    validate_request_index, ContrastWindow, FrameRequest, ParsedSourceChannel,
    ParsedSourceImageName, ViewerSource, WorkspaceScan,
};

const SAMPLE_SIZE: usize = 2048;

#[derive(Clone, Debug)]
pub struct RawFrame {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u16>,
    pub contrast_domain: ContrastWindow,
}

#[derive(Clone, Debug)]
pub struct SourceMetadata {
    pub width: u32,
    pub height: u32,
    pub positions: Vec<u32>,
    pub channels: Vec<u32>,
    pub times: Vec<u32>,
    pub z_slices: Vec<u32>,
}

impl SourceMetadata {
    pub fn workspace_scan(&self) -> WorkspaceScan {
        WorkspaceScan {
            positions: self.positions.clone(),
            channels: self.channels.clone(),
            times: self.times.clone(),
            z_slices: self.z_slices.clone(),
        }
    }

    pub fn contains_position(&self, pos: u32) -> bool {
        self.positions.contains(&pos)
    }

    pub fn position_index(&self, pos: u32) -> Result<usize, String> {
        validate_request_index("Position", pos, self.positions.len())
    }

    pub fn time_index(&self, time: u32) -> Result<usize, String> {
        validate_request_index("Time", time, self.times.len())
    }

    pub fn channel_index(&self, channel: u32) -> Result<usize, String> {
        validate_request_index("Channel", channel, self.channels.len())
    }

    pub fn z_index(&self, z: u32) -> Result<usize, String> {
        validate_request_index("Z", z, self.z_slices.len())
    }

    pub fn indices_for_request(
        &self,
        request: &FrameRequest,
    ) -> Result<(usize, usize, usize, usize), String> {
        Ok((
            self.position_index(request.pos)?,
            self.time_index(request.time)?,
            self.channel_index(request.channel)?,
            self.z_index(request.z)?,
        ))
    }
}

pub enum SourceReader {
    Nd2(Nd2File),
    Czi(CziFile),
}

impl SourceReader {
    pub fn open_nd2(path: &Path) -> Result<Self, String> {
        Ok(Self::Nd2(
            Nd2File::open(path).map_err(|err| err.to_string())?,
        ))
    }

    pub fn open_czi(path: &Path) -> Result<Self, String> {
        Ok(Self::Czi(
            CziFile::open(path).map_err(|err| err.to_string())?,
        ))
    }

    pub fn metadata(&mut self) -> Result<SourceMetadata, String> {
        match self {
            Self::Nd2(reader) => {
                let summary = reader.summary().map_err(|err| err.to_string())?;
                let sizes: HashMap<String, usize> = summary.sizes.into_iter().collect();
                metadata_from_sizes(&sizes, "P")
            }
            Self::Czi(reader) => {
                let summary = reader.summary().map_err(|err| err.to_string())?;
                let sizes: HashMap<String, usize> = summary.sizes.into_iter().collect();
                metadata_from_sizes(&sizes, "S")
            }
        }
    }

    pub fn read_frame_2d(
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
                    .map_err(|err| err.to_string())?;
                let summary = reader.summary().map_err(|err| err.to_string())?;
                let sizes: HashMap<String, usize> = summary.sizes.into_iter().collect();
                let width =
                    u32::try_from(dimension_size(&sizes, "X")).map_err(|err| err.to_string())?;
                let height =
                    u32::try_from(dimension_size(&sizes, "Y")).map_err(|err| err.to_string())?;
                Ok(RawFrame {
                    width,
                    height,
                    data,
                    contrast_domain: ContrastWindow {
                        min: 0,
                        max: u16::MAX as u32,
                    },
                })
            }
            Self::Czi(reader) => {
                let data = reader
                    .read_frame_2d(pos, time, channel, z)
                    .map_err(|err| err.to_string())?;
                let summary = reader.summary().map_err(|err| err.to_string())?;
                let sizes: HashMap<String, usize> = summary.sizes.into_iter().collect();
                let width =
                    u32::try_from(dimension_size(&sizes, "X")).map_err(|err| err.to_string())?;
                let height =
                    u32::try_from(dimension_size(&sizes, "Y")).map_err(|err| err.to_string())?;
                Ok(RawFrame {
                    width,
                    height,
                    data,
                    contrast_domain: ContrastWindow {
                        min: 0,
                        max: u16::MAX as u32,
                    },
                })
            }
        }
    }
}

fn metadata_from_sizes(
    sizes: &HashMap<String, usize>,
    position_key: &str,
) -> Result<SourceMetadata, String> {
    Ok(SourceMetadata {
        width: u32::try_from(dimension_size(sizes, "X")).map_err(|err| err.to_string())?,
        height: u32::try_from(dimension_size(sizes, "Y")).map_err(|err| err.to_string())?,
        positions: dimension_values(sizes, position_key),
        channels: dimension_values(sizes, "C"),
        times: dimension_values(sizes, "T"),
        z_slices: dimension_values(sizes, "Z"),
    })
}

fn infer_position_hint(path: &Path) -> Option<u32> {
    path.ancestors().find_map(|ancestor| {
        ancestor
            .file_name()
            .and_then(|value| value.to_str())
            .and_then(parse_pos_dir_name)
    })
}

pub(crate) fn build_channel_mapping<'a>(
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

pub fn collect_tiffs(folder: &Path) -> Vec<(PathBuf, ParsedSourceImageName)> {
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

fn raw_frame_from_tiff(frame: tiff::TiffFrame16) -> RawFrame {
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

pub fn load_tiff_frame(path: &Path) -> Result<RawFrame, String> {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .as_deref()
    {
        Some("tif" | "tiff") => load_tiff_frame_page(path, 0),
        Some("png" | "jpg" | "jpeg") => load_raster_frame(path),
        _ => Err(format!(
            "Unsupported source image extension for {}",
            path.display()
        )),
    }
}

pub fn load_tiff_frames(path: &Path) -> Result<Vec<RawFrame>, String> {
    tiff::load_tiff_frames(path).map(|frames| frames.into_iter().map(raw_frame_from_tiff).collect())
}

pub fn load_tiff_frame_page(path: &Path, page: usize) -> Result<RawFrame, String> {
    tiff::load_tiff_frame_page(path, page).map(raw_frame_from_tiff)
}

pub fn scan_nd2(path: &Path) -> Result<WorkspaceScan, String> {
    let mut reader = SourceReader::open_nd2(path)?;
    Ok(reader.metadata()?.workspace_scan())
}

pub fn scan_czi(path: &Path) -> Result<WorkspaceScan, String> {
    let mut reader = SourceReader::open_czi(path)?;
    Ok(reader.metadata()?.workspace_scan())
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
    let mut parsed_images = Vec::<ParsedSourceImageName>::new();

    for (position, folder) in position_dirs {
        positions.push(position);
        parsed_images.extend(collect_tiffs(&folder).into_iter().map(|(_, parsed)| parsed));
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

pub fn load_tif_frame(root: &Path, request: FrameRequest) -> Result<RawFrame, String> {
    let pos_dir = find_position_dir(root, request.pos)?;
    let source_images = collect_tiffs(&pos_dir);
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
        .ok_or_else(|| "Requested TIFF frame not found".to_string())?;

    load_tiff_frame(&matching)
}

pub fn load_nd2_frame(path: &Path, request: FrameRequest) -> Result<RawFrame, String> {
    let mut reader = SourceReader::open_nd2(path)?;
    let metadata = reader.metadata()?;
    let (pos, time, channel, z) = metadata.indices_for_request(&request)?;
    reader.read_frame_2d(pos, time, channel, z)
}

pub fn load_czi_frame(path: &Path, request: FrameRequest) -> Result<RawFrame, String> {
    let mut reader = SourceReader::open_czi(path)?;
    let metadata = reader.metadata()?;
    let (pos, time, channel, z) = metadata.indices_for_request(&request)?;
    reader.read_frame_2d(pos, time, channel, z)
}

pub fn scan_source(source: ViewerSource) -> Result<WorkspaceScan, String> {
    match source {
        ViewerSource::Tif { path } | ViewerSource::Jpg { path } => scan_tif(Path::new(&path)),
        ViewerSource::Nd2 { path } => scan_nd2(Path::new(&path)),
        ViewerSource::Czi { path } => scan_czi(Path::new(&path)),
    }
}

pub fn load_frame(source: ViewerSource, request: FrameRequest) -> Result<RawFrame, String> {
    match source {
        ViewerSource::Tif { path } | ViewerSource::Jpg { path } => {
            load_tif_frame(Path::new(&path), request)
        }
        ViewerSource::Nd2 { path } => load_nd2_frame(Path::new(&path), request),
        ViewerSource::Czi { path } => load_czi_frame(Path::new(&path), request),
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

pub fn normalize_contrast(contrast: &ContrastWindow, domain: &ContrastWindow) -> ContrastWindow {
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

fn load_raster_frame(path: &Path) -> Result<RawFrame, String> {
    let image = ImageReader::open(path)
        .map_err(|err| err.to_string())?
        .decode()
        .map_err(|err| err.to_string())?;
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

#[cfg(test)]
mod tests {
    use std::time::{SystemTime, UNIX_EPOCH};

    use image::{ImageBuffer, ImageFormat, Luma};

    use super::*;

    fn unique_test_dir(name: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("lisca-image-{name}-{suffix}"));
        fs::create_dir_all(&path).expect("create test directory");
        path
    }

    #[test]
    fn scan_tif_supports_named_jpg_sources() {
        let root = unique_test_dir("scan-jpg");
        let pos_dir = root.join("Pos18");
        fs::create_dir_all(&pos_dir).expect("create pos dir");
        ImageBuffer::<Luma<u8>, Vec<u8>>::from_vec(2, 2, vec![0, 32, 64, 255])
            .expect("jpg buffer")
            .save_with_format(
                pos_dir.join("img_000000000_Durchlicht_000.jpg"),
                ImageFormat::Jpeg,
            )
            .expect("write durchlicht jpg");
        ImageBuffer::<Luma<u8>, Vec<u8>>::from_vec(2, 2, vec![8, 16, 24, 32])
            .expect("jpg buffer")
            .save_with_format(
                pos_dir.join("img_000000000_TexRed_000.jpg"),
                ImageFormat::Jpeg,
            )
            .expect("write texred jpg");

        let scan = scan_tif(&root).expect("scan source");

        assert_eq!(scan.positions, vec![18]);
        assert_eq!(scan.channels, vec![0, 1]);
        assert_eq!(scan.times, vec![0]);
        assert_eq!(scan.z_slices, vec![0]);

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn load_tif_frame_reads_named_jpg_sources() {
        let root = unique_test_dir("load-jpg");
        let pos_dir = root.join("Pos18");
        fs::create_dir_all(&pos_dir).expect("create pos dir");
        ImageBuffer::<Luma<u8>, Vec<u8>>::from_vec(2, 2, vec![0, 48, 96, 255])
            .expect("jpg buffer")
            .save_with_format(
                pos_dir.join("img_000000000_Durchlicht_000.jpg"),
                ImageFormat::Jpeg,
            )
            .expect("write jpg");

        let frame = load_tif_frame(
            &root,
            FrameRequest {
                pos: 18,
                channel: 0,
                time: 0,
                z: 0,
            },
        )
        .expect("load jpg frame");

        assert_eq!(frame.width, 2);
        assert_eq!(frame.height, 2);
        assert_eq!(frame.data.len(), 4);
        assert!(frame.data[0] < frame.data[3]);

        let _ = fs::remove_dir_all(root);
    }
}
