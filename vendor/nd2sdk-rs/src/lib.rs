//! Rust wrapper for Nikon Nd2ReadSdk.
//!
//! The public API intentionally mirrors the small `nd2-rs` surface used by
//! downstream crates: `Nd2File::open`, `version`, `summary`, `read_frame`, and
//! `read_frame_2d`.

mod error;
mod ffi;
mod reader;
mod types;

pub use error::{ErrorSource, FileError, InputError, InternalError, Nd2Error, Result};
pub use reader::Nd2File;
pub use types::{DatasetSummary, SummaryChannel, SummaryScaling};
