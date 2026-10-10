//! Convert this crate's sample mapping into the killing-assay crate's mapping.

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
