//! Convert this crate's slide mapping into the sidecar crate's mapping.
//!
//! The two `SlideMapping` types have the same fields but are distinct; cloning
//! at this seam avoids unifying ndarray (or other) versions across the git
//! crate boundary.

use crate::analysis::slide::SlideMapping;

pub(super) fn to_sidecar_mapping(mapping: &SlideMapping) -> lisca_transfection::SlideMapping {
    mapping
        .iter()
        .map(|(slide_channel, entry)| {
            (
                *slide_channel,
                lisca_transfection::SlideChannelMapping {
                    positions: entry.positions.clone(),
                    signal: entry.signal.clone(),
                    mask: entry.mask,
                    sample_name: entry.sample_name.clone(),
                },
            )
        })
        .collect()
}
