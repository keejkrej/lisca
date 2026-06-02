//! Seekable read-only SMB I/O for large microscopy files (ND2/CZI).
//!
//! Register a host [`SmbSessionProvider`] before calling [`open_path`].

mod path;
mod provider;
mod reader;

pub use path::{is_smb_path, parse_smb_path, ParsedSmbPath};
pub use provider::{register_provider, provider, SmbHandle, SmbSessionProvider};
pub use reader::SmbSeekReader;

/// Open a seekable reader for a virtual `smb:{sessionId}/relative/path` URL.
pub fn open_path(path: &str) -> Result<SmbSeekReader, String> {
    SmbSeekReader::open_path(path)
}
