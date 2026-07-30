use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::protocol::AssayBasicInfoStep3;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlideChannelMapping {
    pub positions: Vec<u32>,
    pub signal_channel: u32,
    pub mask_channel: u32,
    pub sample_name: String,
}

pub type SlideMapping = BTreeMap<u32, SlideChannelMapping>;

pub fn build_slide_mapping(info3: &AssayBasicInfoStep3) -> Result<SlideMapping, String> {
    let rows = &info3.samples.0;

    let mut mapping = BTreeMap::new();
    for row in rows {
        let sample_name = row.name.trim().to_string();
        if sample_name.is_empty() {
            continue;
        }
        let signal_channel = parse_u32(&row.signal_channel, "signalChannel")?;
        let mask_channel = parse_u32(&row.mask_channel, "maskChannel")?;
        let channel = parse_u32(&row.channel, "channel")?;
        let positions = parse_positions(&row.positions)?;
        mapping.insert(
            channel,
            SlideChannelMapping {
                positions,
                signal_channel,
                mask_channel,
                sample_name,
            },
        );
    }

    if mapping.is_empty() {
        return Err("no samples for selected slide".to_string());
    }
    Ok(mapping)
}

/// Load transfection-format `slide.json` (string keys `"0"`, `"1"`, … → channel entries).
pub fn load_slide_mapping(path: &Path) -> Result<SlideMapping, String> {
    let contents = fs::read_to_string(path)
        .map_err(|error| format!("failed to read slide mapping {}: {error}", path.display()))?;
    let ordered: BTreeMap<String, SlideChannelMapping> = serde_json::from_str(&contents)
        .map_err(|error| format!("invalid slide mapping {}: {error}", path.display()))?;
    if ordered.is_empty() {
        return Err(format!("slide mapping is empty: {}", path.display()));
    }
    let mut mapping = BTreeMap::new();
    for (key, entry) in ordered {
        let channel = key.parse::<u32>().map_err(|_| {
            format!(
                "invalid slide channel key {key:?} in {}",
                path.display()
            )
        })?;
        mapping.insert(channel, entry);
    }
    Ok(mapping)
}

/// Resolve `--sample` path or default `<workspace>/slide.json`.
pub fn resolve_slide_mapping_path(workspace: &Path, sample: Option<&Path>) -> PathBuf {
    sample
        .map(Path::to_path_buf)
        .unwrap_or_else(|| workspace.join("slide.json"))
}

pub fn load_slide_mapping_for_workspace(
    workspace: &Path,
    sample: Option<&Path>,
) -> Result<SlideMapping, String> {
    load_slide_mapping(&resolve_slide_mapping_path(workspace, sample))
}

pub fn write_slide_mapping(workspace: &Path, mapping: &SlideMapping) -> Result<(), String> {
    let ordered: BTreeMap<String, SlideChannelMapping> = mapping
        .iter()
        .map(|(channel, entry)| (channel.to_string(), entry.clone()))
        .collect();
    let json = serde_json::to_string_pretty(&ordered).map_err(|error| error.to_string())?;
    let path = workspace.join("slide.json");
    fs::write(path, format!("{json}\n")).map_err(|error| error.to_string())
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
                signal_channel: 2,
                mask_channel: 0,
                sample_name: "condA".to_string(),
            },
        );
        let json = serde_json::to_string(&mapping).expect("serialize");
        assert!(json.contains("\"signal_channel\""));
        assert!(json.contains("\"mask_channel\""));
        assert!(json.contains("\"sample_name\""));
        assert!(!json.contains("signalChannel"));
    }

    #[test]
    fn expands_inclusive_position_ranges() {
        assert_eq!(parse_positions("1:4").unwrap(), vec![1, 2, 3, 4]);
        assert_eq!(parse_positions("3").unwrap(), vec![3]);
    }

    #[test]
    fn load_slide_mapping_round_trips_written_json() {
        let dir = std::env::temp_dir().join(format!(
            "lisca-slide-roundtrip-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let mut mapping = SlideMapping::new();
        mapping.insert(
            0,
            SlideChannelMapping {
                positions: vec![10, 11],
                signal_channel: 1,
                mask_channel: 0,
                sample_name: "A".to_string(),
            },
        );
        write_slide_mapping(&dir, &mapping).unwrap();
        let loaded = load_slide_mapping(&dir.join("slide.json")).unwrap();
        assert_eq!(loaded.get(&0).unwrap().positions, vec![10, 11]);
        assert_eq!(loaded.get(&0).unwrap().sample_name, "A");
        let _ = std::fs::remove_dir_all(&dir);
    }
}
