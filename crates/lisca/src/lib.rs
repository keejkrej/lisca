//! Shared contracts and WebSocket server utilities for Lisca.

pub mod aligner;
pub mod analysis;
pub mod image_source;
pub mod protocol;
pub mod roi;
pub mod server;
mod tiff_io;

pub use protocol::AppId;
pub use server::run_ws_server;
