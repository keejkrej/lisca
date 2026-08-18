//! Studio analysis: shared workspace I/O plus per-assay pipelines under `assays/`.

use std::fmt;

use crate::protocol::AssayType;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AnalysisError {
    UnsupportedAssay { assay_id: AssayType },
    Failed(String),
}

impl fmt::Display for AnalysisError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnsupportedAssay { assay_id } => write!(
                formatter,
                "unsupported assay id '{assay_id}': no analysis pipeline is registered"
            ),
            Self::Failed(message) => formatter.write_str(message),
        }
    }
}

impl std::error::Error for AnalysisError {}

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
mod timeseries;

#[cfg(feature = "studio")]
pub use output::{workspace_analysis_manifest, workspace_analysis_outputs};
#[cfg(feature = "studio")]
pub use pipeline::run_analysis_pipeline;
