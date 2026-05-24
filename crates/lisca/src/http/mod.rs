//! Shared HTTP and WebSocket infrastructure for Lisca servers.

pub mod error;
pub mod fs;
pub mod serve;
pub mod ws;

pub use error::FsError;
