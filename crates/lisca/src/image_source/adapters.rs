use std::{collections::HashMap, path::Path};

use czi_rs::CziFile;
use nd2_rs::Nd2File;

use crate::protocol::{AlignerSource, ContrastWindow, FrameRequest, ImageSource, WorkspaceScan};

use super::{folder::SeriesDataset, RawFrame};

pub(super) trait SourceAdapter {
    fn load_frame(&mut self, request: FrameRequest) -> Result<RawFrame, String>;
}

pub(super) fn open(source: ImageSource) -> Result<Box<dyn SourceAdapter>, String> {
    match source {
        AlignerSource::Folder {
            path,
            subfolder_template,
            filename_template,
        } => Ok(Box::new(FolderAdapter {
            dataset: SeriesDataset::build(&path, &subfolder_template, &filename_template)?,
        })),
        AlignerSource::Nd2 { path } => Ok(Box::new(Nd2Adapter::open(Path::new(&path))?)),
        AlignerSource::Czi { path } => Ok(Box::new(CziAdapter::open(Path::new(&path))?)),
    }
}

pub(super) fn scan(source: ImageSource) -> Result<WorkspaceScan, String> {
    match source {
        AlignerSource::Folder {
            path,
            subfolder_template,
            filename_template,
        } => SeriesDataset::build(&path, &subfolder_template, &filename_template)
            .map(|dataset| dataset.workspace_scan()),
        AlignerSource::Nd2 { path } => Nd2Adapter::scan(Path::new(&path)),
        AlignerSource::Czi { path } => CziAdapter::scan(Path::new(&path)),
    }
}

#[derive(Clone, Debug)]
struct SourceMetadata {
    positions: Vec<u32>,
    channels: Vec<u32>,
    times: Vec<u32>,
    z_slices: Vec<u32>,
}

impl SourceMetadata {
    fn from_sizes(sizes: &HashMap<String, usize>, position_key: &str) -> Self {
        Self {
            positions: dimension_values(sizes, position_key),
            channels: dimension_values(sizes, "C"),
            times: dimension_values(sizes, "T"),
            z_slices: dimension_values(sizes, "Z"),
        }
    }

    fn workspace_scan(&self) -> WorkspaceScan {
        WorkspaceScan {
            positions: self.positions.clone(),
            channels: self.channels.clone(),
            times: self.times.clone(),
            z_slices: self.z_slices.clone(),
            position_labels: u32_labels(&self.positions),
            channel_labels: u32_labels(&self.channels),
            time_labels: u32_labels(&self.times),
            z_slice_labels: u32_labels(&self.z_slices),
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

struct Nd2Adapter {
    reader: Nd2File,
    metadata: SourceMetadata,
    frame_width: u32,
    frame_height: u32,
}

impl Nd2Adapter {
    fn open(path: &Path) -> Result<Self, String> {
        let mut reader = Nd2File::open(path).map_err(|error| error.to_string())?;
        let summary = reader.summary().map_err(|error| error.to_string())?;
        let sizes: HashMap<String, usize> = summary.sizes.into_iter().collect();
        Ok(Self {
            reader,
            metadata: SourceMetadata::from_sizes(&sizes, "P"),
            frame_width: u32::try_from(dimension_size(&sizes, "X"))
                .map_err(|error| error.to_string())?,
            frame_height: u32::try_from(dimension_size(&sizes, "Y"))
                .map_err(|error| error.to_string())?,
        })
    }

    fn scan(path: &Path) -> Result<WorkspaceScan, String> {
        let mut reader = Nd2File::open(path).map_err(|error| error.to_string())?;
        let summary = reader.summary().map_err(|error| error.to_string())?;
        let sizes: HashMap<String, usize> = summary.sizes.into_iter().collect();
        Ok(SourceMetadata::from_sizes(&sizes, "P").workspace_scan())
    }
}

impl SourceAdapter for Nd2Adapter {
    fn load_frame(&mut self, request: FrameRequest) -> Result<RawFrame, String> {
        let (pos, time, channel, z) = self.metadata.indices_for_request(&request)?;
        let data = self
            .reader
            .read_frame_2d(pos, time, channel, z)
            .map_err(|error| error.to_string())?;
        Ok(RawFrame {
            width: self.frame_width,
            height: self.frame_height,
            data,
            contrast_domain: ContrastWindow {
                min: 0,
                max: u16::MAX as u32,
            },
        })
    }
}

struct CziAdapter {
    reader: CziFile,
    metadata: SourceMetadata,
    frame_width: u32,
    frame_height: u32,
}

impl CziAdapter {
    fn open(path: &Path) -> Result<Self, String> {
        let mut reader = CziFile::open(path).map_err(|error| error.to_string())?;
        let summary = reader.summary().map_err(|error| error.to_string())?;
        let sizes: HashMap<String, usize> = summary.sizes.into_iter().collect();
        Ok(Self {
            reader,
            metadata: SourceMetadata::from_sizes(&sizes, "S"),
            frame_width: u32::try_from(dimension_size(&sizes, "X"))
                .map_err(|error| error.to_string())?,
            frame_height: u32::try_from(dimension_size(&sizes, "Y"))
                .map_err(|error| error.to_string())?,
        })
    }

    fn scan(path: &Path) -> Result<WorkspaceScan, String> {
        let mut reader = CziFile::open(path).map_err(|error| error.to_string())?;
        let summary = reader.summary().map_err(|error| error.to_string())?;
        let sizes: HashMap<String, usize> = summary.sizes.into_iter().collect();
        Ok(SourceMetadata::from_sizes(&sizes, "S").workspace_scan())
    }
}

impl SourceAdapter for CziAdapter {
    fn load_frame(&mut self, request: FrameRequest) -> Result<RawFrame, String> {
        let (pos, time, channel, z) = self.metadata.indices_for_request(&request)?;
        let data = self
            .reader
            .read_frame_2d(pos, time, channel, z)
            .map_err(|error| error.to_string())?;
        Ok(RawFrame {
            width: self.frame_width,
            height: self.frame_height,
            data,
            contrast_domain: ContrastWindow {
                min: 0,
                max: u16::MAX as u32,
            },
        })
    }
}

struct FolderAdapter {
    dataset: SeriesDataset,
}

impl SourceAdapter for FolderAdapter {
    fn load_frame(&mut self, request: FrameRequest) -> Result<RawFrame, String> {
        self.dataset.load_frame(request)
    }
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

fn u32_labels(values: &[u32]) -> Vec<String> {
    values.iter().map(|value| value.to_string()).collect()
}
