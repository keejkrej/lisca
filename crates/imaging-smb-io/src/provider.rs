use std::sync::{Arc, OnceLock};

/// Opaque SMB file handle returned by [`SmbSessionProvider::open_file`].
pub type SmbHandle = u64;

/// Host-provided SMB session access (implemented by lisca’s session store).
pub trait SmbSessionProvider: Send + Sync {
    fn open_file(&self, session_id: &str, relative_path: &str) -> Result<(SmbHandle, u64), String>;

    fn read_at(&self, handle: SmbHandle, offset: u64, buf: &mut [u8]) -> Result<usize, String>;

    fn file_size(&self, handle: SmbHandle) -> Result<u64, String>;

    fn close(&self, handle: SmbHandle) -> Result<(), String>;

    /// Full-file read for small payloads (e.g. JSON). Implementations must enforce `max_len`.
    fn read_file_bounded(
        &self,
        session_id: &str,
        relative_path: &str,
        max_len: u64,
    ) -> Result<Vec<u8>, String> {
        let (handle, size) = self.open_file(session_id, relative_path)?;
        if size > max_len {
            let _ = self.close(handle);
            return Err(format!(
                "SMB file size {size} exceeds limit {max_len} bytes"
            ));
        }
        let mut data = vec![0u8; size as usize];
        let mut offset = 0u64;
        while offset < size {
            let read = self.read_at(handle, offset, &mut data[offset as usize..])?;
            if read == 0 {
                break;
            }
            offset += read as u64;
        }
        self.close(handle)?;
        Ok(data)
    }
}

static PROVIDER: OnceLock<Arc<dyn SmbSessionProvider>> = OnceLock::new();

pub fn register_provider(provider: Arc<dyn SmbSessionProvider>) -> Result<(), String> {
    PROVIDER
        .set(provider)
        .map_err(|_| "SMB session provider already registered".to_string())
}

pub fn provider() -> Result<Arc<dyn SmbSessionProvider>, String> {
    PROVIDER
        .get()
        .cloned()
        .ok_or_else(|| "SMB session provider not registered".to_string())
}
