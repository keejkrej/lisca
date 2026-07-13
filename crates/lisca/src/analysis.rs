//! Studio analysis: shared workspace I/O plus per-assay pipelines under `assays/`.

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
mod pipeline;
#[cfg(feature = "studio")]
mod plot;
#[cfg(feature = "studio")]
mod progress;
#[cfg(feature = "studio")]
mod roi_stack;
#[cfg(feature = "studio")]
pub mod slide;

#[cfg(feature = "studio")]
pub use output::{workspace_analysis_manifest, workspace_analysis_outputs};
#[cfg(feature = "studio")]
pub use pipeline::run_analysis_pipeline;
