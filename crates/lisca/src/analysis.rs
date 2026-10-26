//! Studio analysis: shared workspace I/O plus per-assay pipelines under `assays/`.

#[cfg(feature = "studio")]
pub mod array;

#[cfg(feature = "studio")]
pub mod assays;
#[cfg(feature = "studio")]
mod csv_io;
#[cfg(feature = "studio")]
mod export;
#[cfg(feature = "studio")]
mod output;
#[cfg(feature = "studio")]
mod plot;
#[cfg(feature = "studio")]
mod roi_stack;
#[cfg(feature = "studio")]
pub mod sample;
#[cfg(feature = "studio")]
mod traces;

#[cfg(feature = "studio")]
pub use output::workspace_analysis_manifest;
