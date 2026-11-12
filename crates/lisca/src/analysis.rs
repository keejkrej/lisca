//! Studio analysis: shared workspace I/O plus thin per-assay sidecar callers under `assays/`.

#[cfg(feature = "studio")]
pub mod array;

#[cfg(feature = "studio")]
pub mod assays;
#[cfg(feature = "studio")]
mod output;
#[cfg(feature = "studio")]
pub mod position_index;
#[cfg(feature = "studio")]
pub mod sample;

#[cfg(feature = "studio")]
pub use output::workspace_analysis_manifest;
