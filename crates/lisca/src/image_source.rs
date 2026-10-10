mod adapters;
mod contrast;
mod folder;
mod frame;

use crate::protocol::{ContrastWindow, FramePayload, FrameRequest, ImageSource, WorkspaceScan};

#[derive(Clone, Debug)]
pub struct RawFrame {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u16>,
    pub contrast_domain: ContrastWindow,
}

/// Reusable reader for sequential frame loads (avoids reopening ND2/CZI or rescanning folders).
pub struct CachedSourceReader(Box<dyn adapters::SourceAdapter>);

impl CachedSourceReader {
    pub fn open(source: ImageSource) -> Result<Self, String> {
        adapters::open(source).map(Self)
    }

    pub fn load_frame(&mut self, request: FrameRequest) -> Result<RawFrame, String> {
        self.0.load_frame(request)
    }
}

pub fn scan_source(source: ImageSource) -> Result<WorkspaceScan, String> {
    let kind = source_kind(&source);
    let path = source_path(&source).to_string();
    match adapters::scan(source) {
        Ok(scan) => {
            tracing::info!(
                kind,
                %path,
                positions = scan.positions.len(),
                channels = ?scan.channels,
                times = scan.times.len(),
                z = scan.z_slices.len(),
                "scanned source"
            );
            Ok(scan)
        }
        Err(error) => {
            tracing::warn!(kind, %path, %error, "source scan failed");
            Err(error)
        }
    }
}

pub fn load_frame(source: ImageSource, request: FrameRequest) -> Result<RawFrame, String> {
    let kind = source_kind(&source);
    let path = source_path(&source).to_string();
    let pos = request.pos;
    let channel = request.channel;
    let time = request.time;
    let z = request.z;
    match CachedSourceReader::open(source).and_then(|mut reader| reader.load_frame(request)) {
        Ok(frame) => {
            tracing::info!(
                kind,
                %path,
                pos,
                channel,
                time,
                z,
                width = frame.width,
                height = frame.height,
                "loaded frame"
            );
            Ok(frame)
        }
        Err(error) => {
            tracing::warn!(kind, %path, pos, channel, time, z, %error, "frame load failed");
            Err(error)
        }
    }
}

fn source_kind(source: &ImageSource) -> &'static str {
    match source {
        ImageSource::Folder { .. } => "folder",
        ImageSource::Nd2 { .. } => "nd2",
        ImageSource::Czi { .. } => "czi",
    }
}

fn source_path(source: &ImageSource) -> &str {
    match source {
        ImageSource::Folder { path, .. }
        | ImageSource::Nd2 { path }
        | ImageSource::Czi { path } => path,
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
    contrast::to_frame_payload(raw, contrast)
}
