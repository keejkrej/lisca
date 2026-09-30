//! Convert this crate's sample mapping into the sidecar crate's mapping.
//!
//! The two `SampleMapping` types have the same fields but are distinct; cloning
//! at this seam avoids unifying ndarray (or other) versions across the git
//! crate boundary.

use crate::analysis::sample::SampleMapping;

pub(super) fn to_sidecar_mapping(mapping: &SampleMapping) -> lisca_transfection::SampleMapping {
    mapping
        .iter()
        .map(|sample| lisca_transfection::SampleAnalysis {
            name: sample.name.clone(),
            positions: sample.positions.clone(),
            signal: sample.signal.clone(),
            segmentation: sample.segmentation,
        })
        .collect()
}
