use std::io::{Read, Seek, SeekFrom};
use std::sync::Arc;

use crate::path::parse_smb_path;
use crate::provider::{provider, SmbHandle, SmbSessionProvider};

pub struct SmbSeekReader {
    provider: Arc<dyn SmbSessionProvider>,
    handle: SmbHandle,
    file_size: u64,
    position: u64,
}

impl SmbSeekReader {
    pub fn open_path(path: &str) -> Result<Self, String> {
        let parsed = parse_smb_path(path)?;
        let provider = provider()?;
        let (handle, file_size) =
            provider.open_file(&parsed.session_id, &parsed.relative_path)?;
        Ok(Self {
            provider,
            handle,
            file_size,
            position: 0,
        })
    }

    pub fn file_size(&self) -> u64 {
        self.file_size
    }
}

impl Read for SmbSeekReader {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        if self.position >= self.file_size {
            return Ok(0);
        }
        let read = self
            .provider
            .read_at(self.handle, self.position, buf)
            .map_err(std::io::Error::other)?;
        self.position += read as u64;
        Ok(read)
    }
}

impl Seek for SmbSeekReader {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        let new_pos = match pos {
            SeekFrom::Start(offset) => offset,
            SeekFrom::End(offset) => {
                if offset >= 0 {
                    self.file_size.saturating_add(offset as u64)
                } else {
                    self.file_size.saturating_sub(offset.unsigned_abs())
                }
            }
            SeekFrom::Current(offset) => {
                if offset >= 0 {
                    self.position.saturating_add(offset as u64)
                } else {
                    self.position.saturating_sub(offset.unsigned_abs())
                }
            }
        };
        self.position = new_pos.min(self.file_size);
        Ok(self.position)
    }
}

impl Drop for SmbSeekReader {
    fn drop(&mut self) {
        let _ = self.provider.close(self.handle);
    }
}
