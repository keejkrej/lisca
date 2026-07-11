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
    adapters::scan(source)
}

pub fn load_frame(source: ImageSource, request: FrameRequest) -> Result<RawFrame, String> {
    CachedSourceReader::open(source)?.load_frame(request)
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
