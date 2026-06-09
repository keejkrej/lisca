//! Studio analysis: shared workspace I/O plus per-assay pipelines under `assays/`.

mod assays;
mod csv_io;
mod export;
mod output;
mod pipeline;
mod plot;
mod progress;
mod roi_stack;
mod slide;

pub use output::{workspace_analysis_manifest, workspace_analysis_outputs};
pub use pipeline::run_analysis_pipeline;
