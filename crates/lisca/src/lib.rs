//! Shared contracts, domain logic, and HTTP infrastructure for Lisca.

// Lets generated protocol code reference this crate by its package name
// (`::lisca::protocol::...`, emitted by the `x-rust-type` extension).
extern crate self as lisca;

pub mod aligner;
pub mod analysis;
pub mod http;
pub mod image_source;
pub mod protocol;
pub mod roi;
pub mod smb;
mod tiff_io;

pub use protocol::AppId;
