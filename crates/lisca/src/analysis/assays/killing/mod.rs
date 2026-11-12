//! Thin callers into [`lisca_killing`] for death-reporter viability and engagement.

pub mod death_reporter;
pub mod engagement;

use crate::analysis::sample::SampleMapping;

pub(crate) fn to_killing_mapping(mapping: &SampleMapping) -> lisca_killing::SampleMapping {
    mapping
        .iter()
        .map(|sample| lisca_killing::SampleAnalysis {
            name: sample.name.clone(),
            positions: sample.positions.clone(),
            signal: sample.signal.clone(),
            segmentation: sample.segmentation,
        })
        .collect()
}
