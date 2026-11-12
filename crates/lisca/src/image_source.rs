mod adapters;
mod contrast;
mod folder;
mod frame;

use std::{
    fs,
    sync::{mpsc, OnceLock},
    thread,
    time::SystemTime,
};

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

#[derive(Clone, Eq, PartialEq)]
enum SourceCacheKey {
    Folder {
        path: String,
        subfolder_template: String,
        filename_template: String,
    },
    Nd2 {
        path: String,
    },
    Czi {
        path: String,
    },
}

impl SourceCacheKey {
    fn from_source(source: &ImageSource) -> Self {
        match source {
            ImageSource::Folder {
                path,
                subfolder_template,
                filename_template,
            } => Self::Folder {
                path: path.clone(),
                subfolder_template: subfolder_template.clone(),
                filename_template: filename_template.clone(),
            },
            ImageSource::Nd2 { path } => Self::Nd2 { path: path.clone() },
            ImageSource::Czi { path } => Self::Czi { path: path.clone() },
        }
    }

    fn path(&self) -> &str {
        match self {
            Self::Folder { path, .. } | Self::Nd2 { path } | Self::Czi { path } => path,
        }
    }
}

struct CachedReaderEntry {
    key: SourceCacheKey,
    stamp: Option<(u64, SystemTime)>,
    reader: CachedSourceReader,
}

enum ReaderCommand {
    LoadFrame {
        source: ImageSource,
        request: FrameRequest,
        reply: mpsc::SyncSender<Result<RawFrame, String>>,
    },
    Invalidate {
        path: String,
    },
}

fn source_stamp(source: &ImageSource) -> Option<(u64, SystemTime)> {
    let meta = fs::metadata(source_path(source)).ok()?;
    let modified = meta.modified().ok()?;
    Some((meta.len(), modified))
}

fn reader_worker() -> Option<&'static mpsc::SyncSender<ReaderCommand>> {
    static WORKER: OnceLock<Option<mpsc::SyncSender<ReaderCommand>>> = OnceLock::new();
    WORKER
        .get_or_init(|| {
            let (tx, rx) = mpsc::sync_channel::<ReaderCommand>(64);
            let spawned = thread::Builder::new()
                .name("lisca-source-reader".into())
                .spawn(move || {
                    let mut cached: Option<CachedReaderEntry> = None;
                    while let Ok(command) = rx.recv() {
                        match command {
                            ReaderCommand::Invalidate { path } => {
                                if cached
                                    .as_ref()
                                    .is_some_and(|entry| entry.key.path() == path)
                                {
                                    cached = None;
                                }
                            }
                            ReaderCommand::LoadFrame {
                                source,
                                request,
                                reply,
                            } => {
                                let result = load_frame_on_worker(&mut cached, source, request);
                                let _ = reply.send(result);
                            }
                        }
                    }
                });
            spawned.ok().map(|_| tx)
        })
        .as_ref()
}

fn load_frame_on_worker(
    cached: &mut Option<CachedReaderEntry>,
    source: ImageSource,
    request: FrameRequest,
) -> Result<RawFrame, String> {
    let key = SourceCacheKey::from_source(&source);
    let stamp = source_stamp(&source);
    if let Some(entry) = cached.as_mut() {
        if entry.key == key && entry.stamp == stamp {
            if let Ok(frame) = entry.reader.load_frame(request.clone()) {
                return Ok(frame);
            }
        }
    }
    let mut reader = CachedSourceReader::open(source)?;
    let frame = reader.load_frame(request)?;
    *cached = Some(CachedReaderEntry { key, stamp, reader });
    Ok(frame)
}

fn invalidate_cached_reader(source: &ImageSource) {
    if let Some(worker) = reader_worker() {
        let _ = worker.send(ReaderCommand::Invalidate {
            path: source_path(source).to_string(),
        });
    }
}

fn load_frame_with_reader_cache(
    source: ImageSource,
    request: FrameRequest,
) -> Result<RawFrame, String> {
    if let Some(worker) = reader_worker() {
        let (reply_tx, reply_rx) = mpsc::sync_channel(1);
        if worker
            .send(ReaderCommand::LoadFrame {
                source: source.clone(),
                request: request.clone(),
                reply: reply_tx,
            })
            .is_ok()
        {
            if let Ok(result) = reply_rx.recv() {
                return result;
            }
        }
    }
    CachedSourceReader::open(source)?.load_frame(request)
}

pub fn scan_source(source: ImageSource) -> Result<WorkspaceScan, String> {
    invalidate_cached_reader(&source);
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
    match load_frame_with_reader_cache(source, request) {
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
