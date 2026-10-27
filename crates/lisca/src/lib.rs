//! Shared contracts, domain logic, and HTTP infrastructure for Lisca.

// Lets generated protocol code reference this crate by its package name
// (`::lisca::protocol::...`, emitted by the `x-rust-type` extension).
extern crate self as lisca;

pub mod aligner;
pub mod analysis;
#[cfg(feature = "studio")]
use font_kit as _;
pub mod config;
pub mod http;
pub mod image_source;
pub mod inference;
pub mod migrations;
#[cfg(feature = "smart")]
mod onnx;
pub mod profile;
pub mod protocol;
pub mod roi;
#[cfg(feature = "smart")]
pub mod smart;
mod tiff_io;

pub use protocol::AppId;
