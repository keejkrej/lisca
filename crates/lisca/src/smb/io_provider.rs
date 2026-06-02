use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex, OnceLock,
    },
};

use mdat_smb_rs::{SmbHandle, SmbSessionProvider};
use smb2::types::FileId;

use super::runtime::block_on;
use super::session::{close_smb_file_async, open_smb_file_async, read_smb_file_at_async, stat_file_async};

struct OpenSmbFile {
    session_id: String,
    file_id: FileId,
    file_size: u64,
}

fn open_files() -> &'static Mutex<HashMap<SmbHandle, OpenSmbFile>> {
    static FILES: OnceLock<Mutex<HashMap<SmbHandle, OpenSmbFile>>> = OnceLock::new();
    FILES.get_or_init(|| Mutex::new(HashMap::new()))
}

fn next_handle() -> SmbHandle {
    static NEXT: AtomicU64 = AtomicU64::new(1);
    NEXT.fetch_add(1, Ordering::Relaxed)
}

pub struct LiscaSmbProvider;

impl SmbSessionProvider for LiscaSmbProvider {
    fn open_file(&self, session_id: &str, relative_path: &str) -> Result<(SmbHandle, u64), String> {
        let (file_id, file_size) = block_on(open_smb_file_async(session_id, relative_path))?;
        let handle = next_handle();
        open_files().lock().map_err(|error| error.to_string())?.insert(
            handle,
            OpenSmbFile {
                session_id: session_id.to_string(),
                file_id,
                file_size,
            },
        );
        Ok((handle, file_size))
    }

    fn read_at(&self, handle: SmbHandle, offset: u64, buf: &mut [u8]) -> Result<usize, String> {
        let files = open_files().lock().map_err(|error| error.to_string())?;
        let file = files
            .get(&handle)
            .ok_or_else(|| format!("SMB handle not found: {handle}"))?;
        let session_id = file.session_id.clone();
        let file_id = file.file_id;
        drop(files);
        block_on(read_smb_file_at_async(&session_id, file_id, offset, buf))
    }

    fn file_size(&self, handle: SmbHandle) -> Result<u64, String> {
        let files = open_files().lock().map_err(|error| error.to_string())?;
        files
            .get(&handle)
            .map(|file| file.file_size)
            .ok_or_else(|| format!("SMB handle not found: {handle}"))
    }

    fn close(&self, handle: SmbHandle) -> Result<(), String> {
        let file = open_files()
            .lock()
            .map_err(|error| error.to_string())?
            .remove(&handle)
            .ok_or_else(|| format!("SMB handle not found: {handle}"))?;
        block_on(close_smb_file_async(&file.session_id, file.file_id))
    }

    fn read_file_bounded(
        &self,
        session_id: &str,
        relative_path: &str,
        max_len: u64,
    ) -> Result<Vec<u8>, String> {
        let size = block_on(stat_file_async(session_id, relative_path))?;
        if size > max_len {
            return Err(format!("SMB file size {size} exceeds limit {max_len} bytes"));
        }
        let (handle, _) = self.open_file(session_id, relative_path)?;
        let mut data = vec![0u8; size as usize];
        let mut offset = 0u64;
        while offset < size {
            let end = (offset + (data.len() as u64 - offset)).min(size);
            let read = self.read_at(handle, offset, &mut data[offset as usize..end as usize])?;
            if read == 0 {
                break;
            }
            offset += read as u64;
        }
        self.close(handle)?;
        Ok(data)
    }
}

pub fn register_mdat_smb_provider() -> Result<(), String> {
    mdat_smb_rs::register_provider(std::sync::Arc::new(LiscaSmbProvider))
}
