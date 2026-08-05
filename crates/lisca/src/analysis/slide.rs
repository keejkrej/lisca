use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::protocol::AssaySamples;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlideChannelMapping {
    pub positions: Vec<u32>,
    pub fluorescence: u32,
    pub brightfield: u32,
    pub sample_name: String,
}

pub type SlideMapping = BTreeMap<u32, SlideChannelMapping>;

pub fn build_slide_mapping(samples: &AssaySamples) -> Result<SlideMapping, String> {
    let mut mapping = BTreeMap::new();
    for row in samples.iter() {
        let sample_name = row.name.trim().to_string();
        if sample_name.is_empty() {
            continue;
        }
        let fluorescence = parse_u32(&row.fluorescence, "fluorescence")?;
        let brightfield = parse_u32(&row.brightfield, "brightfield")?;
        let slide = parse_u32(&row.slide, "slide")?;
        let positions = parse_positions(&row.positions)?;
        mapping.insert(
            slide,
            SlideChannelMapping {
                positions,
                fluorescence,
                brightfield,
                sample_name,
            },
        );
    }

    if mapping.is_empty() {
        return Err("no samples for selected slide".to_string());
    }
    Ok(mapping)
}

/// Resolve `--assay` path or default `<workspace>/assay.json`.
pub fn resolve_assay_path(workspace: &Path, assay: Option<&Path>) -> PathBuf {
    assay
        .map(Path::to_path_buf)
        .unwrap_or_else(|| workspace.join("assay.json"))
}

/// Load sample mapping from Studio-format `assay.json` (`samples`).
pub fn load_mapping_for_workspace(
    workspace: &Path,
    assay: Option<&Path>,
) -> Result<SlideMapping, String> {
    let path = resolve_assay_path(workspace, assay);
    let contents = fs::read_to_string(&path)
        .map_err(|error| format!("failed to read {}: {error}", path.display()))?;
    let assay_json: crate::protocol::AssayJsonFile = serde_json::from_str(&contents)
        .map_err(|error| format!("invalid assay.json {}: {error}", path.display()))?;
    build_slide_mapping(&assay_json.samples)
}

/// Deprecated alias: stages read assay.json, not slide.json.
#[deprecated(note = "use load_mapping_for_workspace")]
pub fn load_slide_mapping_for_workspace(
    workspace: &Path,
    sample: Option<&Path>,
) -> Result<SlideMapping, String> {
    load_mapping_for_workspace(workspace, sample)
}

pub fn parse_interval_minutes(amount: Option<f64>, unit: Option<&str>) -> Option<f64> {
    let amount = amount?;
    if amount <= 0.0 {
        return None;
    }
    let factor = match unit {
        Some("second") => 1.0 / 60.0,
        Some("minute") | None => 1.0,
        Some("hour") => 60.0,
        Some(_) => return None,
    };
    Some(amount * factor)
}

fn parse_positions(raw: &str) -> Result<Vec<u32>, String> {
    let mut collected = Vec::new();
    let mut seen = HashSet::new();

    for token in raw.split(',') {
        let token = token.trim();
        if token.is_empty() {
            continue;
        }

        let range_parts = token.split(':').collect::<Vec<_>>();
        if range_parts.is_empty() {
            continue;
        }
        if range_parts.len() == 1 {
            let position = parse_position(range_parts[0])?;
            if seen.insert(position) {
                collected.push(position);
            }
            continue;
        }

        if !(2..=3).contains(&range_parts.len()) {
            return Err(format!("invalid position range: {token}"));
        }
        let start = parse_position(range_parts[0])?;
        let stop = parse_position(range_parts[1])?;
        let step = if range_parts.len() == 3 {
            parse_position(range_parts[2])?
        } else {
            1
        };
        if step == 0 {
            return Err(format!("step cannot be 0: {token}"));
        }
        if stop < start {
            return Err(format!("invalid empty position range: {token}"));
        }

        let mut current = start;
        while current <= stop {
            if seen.insert(current) {
                collected.push(current);
            }
            current = current
                .checked_add(step)
                .ok_or_else(|| "position range overflow".to_string())?;
        }
    }

    if collected.is_empty() {
        return Err("no valid positions in sample row".to_string());
    }

    Ok(collected)
}

fn parse_position(raw: &str) -> Result<u32, String> {
    raw.trim()
        .parse::<u32>()
        .map_err(|_| format!("invalid position token: {raw}"))
}

fn parse_u32(raw: &str, field_name: &str) -> Result<u32, String> {
    parse_position(raw).map_err(|error| format!("invalid {field_name}: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slide_mapping_serializes_snake_case() {
        let mut mapping = SlideMapping::new();
        mapping.insert(
            0,
            SlideChannelMapping {
                positions: vec![1, 2, 3],
                fluorescence: 2,
                brightfield: 0,
                sample_name: "condA".to_string(),
            },
        );
        let json = serde_json::to_string(&mapping).expect("serialize");
        assert!(json.contains("\"fluorescence\""));
        assert!(json.contains("\"brightfield\""));
        assert!(json.contains("\"sample_name\""));
        assert!(!json.contains("signalChannel"));
    }

    #[test]
    fn expands_inclusive_position_ranges() {
        assert_eq!(parse_positions("1:4").unwrap(), vec![1, 2, 3, 4]);
        assert_eq!(parse_positions("3").unwrap(), vec![3]);
    }

}
