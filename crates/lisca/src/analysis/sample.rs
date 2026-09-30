//! In-memory Sample mapping used by analysis stages.
//!
//! Built from Studio `assay.json` (`samples[]` + `analysis.channels` /
//! `analysis.sampleChannels`). A Sample is identified by its name, which is
//! non-empty and unique within the assay. The mapping keeps assay order.
//! Mirrors `lisca_transfection::sample` (separate type; converted at the seam).

use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

use crate::protocol::{AssayAnalysisConfig, AssayJsonFile, AssaySamples};

/// Analysis settings for one Sample: its Positions and channel roles.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SampleAnalysis {
    /// Sample name (trimmed, non-empty, unique within the assay).
    pub name: String,
    pub positions: Vec<u32>,
    /// Signal channel indices (one trace CSV per channel).
    pub signal: Vec<u32>,
    /// Segmentation channel (Otsu / mask generation).
    pub segmentation: u32,
}

/// Samples in assay order. Stages address a Sample by its index here.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(transparent)]
pub struct SampleMapping(pub Vec<SampleAnalysis>);

impl SampleMapping {
    pub fn new() -> Self {
        Self(Vec::new())
    }

    pub fn push(&mut self, sample: SampleAnalysis) {
        self.0.push(sample);
    }

    pub fn iter(&self) -> std::slice::Iter<'_, SampleAnalysis> {
        self.0.iter()
    }

    pub fn len(&self) -> usize {
        self.0.len()
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    /// Sample at `index` (assay order).
    pub fn get(&self, index: usize) -> Option<&SampleAnalysis> {
        self.0.get(index)
    }

    /// Sample with this name.
    pub fn by_name(&self, name: &str) -> Option<&SampleAnalysis> {
        self.0.iter().find(|sample| sample.name == name)
    }

    /// Distinct Positions across all Samples, in assay order.
    pub fn positions(&self) -> Vec<u32> {
        let mut seen = HashSet::new();
        self.0
            .iter()
            .flat_map(|sample| sample.positions.iter().copied())
            .filter(|position| seen.insert(*position))
            .collect()
    }

    /// The Samples that include `position`, each narrowed to that Position.
    pub fn for_position(&self, position: u32) -> SampleMapping {
        SampleMapping(
            self.0
                .iter()
                .filter(|sample| sample.positions.contains(&position))
                .map(|sample| SampleAnalysis {
                    positions: vec![position],
                    ..sample.clone()
                })
                .collect(),
        )
    }
}

impl<'a> IntoIterator for &'a SampleMapping {
    type Item = &'a SampleAnalysis;
    type IntoIter = std::slice::Iter<'a, SampleAnalysis>;

    fn into_iter(self) -> Self::IntoIter {
        self.0.iter()
    }
}

impl FromIterator<SampleAnalysis> for SampleMapping {
    fn from_iter<T: IntoIterator<Item = SampleAnalysis>>(iter: T) -> Self {
        Self(iter.into_iter().collect())
    }
}

pub fn build_sample_mapping(assay: &AssayJsonFile) -> Result<SampleMapping, String> {
    build_sample_mapping_from_parts(&assay.samples, assay.analysis.as_ref())
}

pub fn build_sample_mapping_from_parts(
    samples: &AssaySamples,
    analysis: Option<&AssayAnalysisConfig>,
) -> Result<SampleMapping, String> {
    let mut names = HashSet::new();
    for (index, row) in samples.iter().enumerate() {
        let name = row.name.trim();
        if name.is_empty() {
            return Err(format!("samples[{index}]: sample name must be non-empty"));
        }
        if !names.insert(name.to_string()) {
            return Err(format!("duplicate sample name {name:?} in samples[]"));
        }
    }

    let defaults = analysis.and_then(|config| config.channels.as_ref());
    let mut overrides = HashMap::new();
    if let Some(config) = analysis {
        for row in &config.sample_channels {
            let name = row.sample.trim().to_string();
            if !names.contains(&name) {
                return Err(format!("analysis.sampleChannels: unknown sample {name:?}"));
            }
            if overrides
                .insert(name.clone(), (row.segmentation, row.signal.0.clone()))
                .is_some()
            {
                return Err(format!(
                    "analysis.sampleChannels: duplicate sample {name:?}"
                ));
            }
        }
    }

    let mut mapping = SampleMapping::new();
    for row in samples.iter() {
        let name = row.name.trim().to_string();
        let (segmentation, signal) = if let Some((segmentation, signal)) = overrides.get(&name) {
            (*segmentation, signal.clone())
        } else if let Some(channels) = defaults {
            (channels.segmentation, channels.signal.0.clone())
        } else {
            return Err(format!(
                "missing analysis.channels (and no sampleChannels override) for sample {name:?}"
            ));
        };
        if signal.is_empty() {
            return Err(format!(
                "sample {name:?}: signal channel list must be non-empty"
            ));
        }
        let positions = parse_positions(&row.positions)?;
        mapping.push(SampleAnalysis {
            name,
            positions,
            signal,
            segmentation,
        });
    }

    if mapping.is_empty() {
        return Err("assay.json defines no samples".to_string());
    }
    Ok(mapping)
}

/// Resolve `--assay` path or default `<workspace>/assay.json`.
pub fn resolve_assay_path(workspace: &Path, assay: Option<&Path>) -> PathBuf {
    assay
        .map(Path::to_path_buf)
        .unwrap_or_else(|| workspace.join("assay.json"))
}

/// Load sample mapping from Studio-format `assay.json`.
pub fn load_mapping_for_workspace(
    workspace: &Path,
    assay: Option<&Path>,
) -> Result<SampleMapping, String> {
    let path = resolve_assay_path(workspace, assay);
    let contents = fs::read_to_string(&path)
        .map_err(|error| format!("failed to read {}: {error}", path.display()))?;
    let assay_json: AssayJsonFile = serde_json::from_str(&contents)
        .map_err(|error| format!("invalid assay.json {}: {error}", path.display()))?;
    build_sample_mapping(&assay_json)
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

#[cfg(test)]
mod tests {
    use super::*;

    /// Parse `{ samples, analysis }` into a full protocol `AssayJsonFile`.
    fn mapping_from(json: &str) -> Result<SampleMapping, String> {
        let mut value: serde_json::Value = serde_json::from_str(json).unwrap();
        let object = value.as_object_mut().unwrap();
        for (key, default) in [
            ("type", serde_json::json!("transfection")),
            ("name", serde_json::json!("x")),
            ("data", serde_json::json!({ "type": "nd2", "path": "" })),
            ("workspace", serde_json::json!({ "path": "" })),
            (
                "interval",
                serde_json::json!({ "value": 10, "unit": "minute" }),
            ),
            ("samples", serde_json::json!([])),
        ] {
            object.entry(key).or_insert(default);
        }
        let json = value.to_string();
        let json = json.as_str();
        let assay: AssayJsonFile = serde_json::from_str(json).unwrap();
        build_sample_mapping(&assay)
    }

    #[test]
    fn sample_mapping_serializes_snake_case() {
        let mapping = SampleMapping(vec![SampleAnalysis {
            name: "condA".to_string(),
            positions: vec![1, 2, 3],
            signal: vec![2],
            segmentation: 0,
        }]);
        let json = serde_json::to_string(&mapping).expect("serialize");
        assert!(json.contains("\"signal\""));
        assert!(json.contains("\"segmentation\""));
        assert!(json.contains("\"name\""));
        assert!(!json.contains("signalChannel"));
    }

    #[test]
    fn expands_inclusive_position_ranges() {
        assert_eq!(parse_positions("1:4").unwrap(), vec![1, 2, 3, 4]);
        assert_eq!(parse_positions("3").unwrap(), vec![3]);
    }

    #[test]
    fn mapping_keeps_assay_order_and_applies_overrides_by_name() {
        let mapping = mapping_from(
            r#"{
                "samples": [
                    { "name": " zeta ", "positions": "1" },
                    { "name": "alpha", "positions": "2:3" }
                ],
                "analysis": {
                    "channels": { "segmentation": 0, "signal": [1] },
                    "sampleChannels": [{ "sample": "alpha", "segmentation": 2, "signal": [3, 4] }]
                }
            }"#,
        )
        .unwrap();
        let names: Vec<_> = mapping.iter().map(|sample| sample.name.as_str()).collect();
        assert_eq!(names, vec!["zeta", "alpha"]);
        assert_eq!(mapping.get(0).unwrap().segmentation, 0);
        let alpha = mapping.by_name("alpha").unwrap();
        assert_eq!(alpha.segmentation, 2);
        assert_eq!(alpha.signal, vec![3, 4]);
        assert_eq!(alpha.positions, vec![2, 3]);
        assert_eq!(mapping.positions(), vec![1, 2, 3]);
        assert_eq!(mapping.for_position(3).get(0).unwrap().positions, vec![3]);
        assert!(mapping.for_position(9).is_empty());
    }

    #[test]
    fn blank_sample_names_are_rejected() {
        let err = mapping_from(
            r#"{
                "samples": [{ "name": "  ", "positions": "1" }],
                "analysis": { "channels": { "segmentation": 0, "signal": [1] } }
            }"#,
        )
        .unwrap_err();
        assert_eq!(err, "samples[0]: sample name must be non-empty");
    }

    #[test]
    fn duplicate_sample_names_are_rejected() {
        let err = mapping_from(
            r#"{
                "samples": [
                    { "name": "WT", "positions": "1" },
                    { "name": " WT", "positions": "2" }
                ],
                "analysis": { "channels": { "segmentation": 0, "signal": [1] } }
            }"#,
        )
        .unwrap_err();
        assert!(err.contains("duplicate sample name \"WT\""), "{err}");
    }

    #[test]
    fn unknown_sample_channel_override_is_rejected() {
        let err = mapping_from(
            r#"{
                "samples": [{ "name": "WT", "positions": "1" }],
                "analysis": {
                    "channels": { "segmentation": 0, "signal": [1] },
                    "sampleChannels": [{ "sample": "KO", "segmentation": 0, "signal": [1] }]
                }
            }"#,
        )
        .unwrap_err();
        assert!(err.contains("unknown sample \"KO\""), "{err}");
    }

    #[test]
    fn errors_when_samples_array_is_empty() {
        let err = mapping_from(
            r#"{
                "type": "transfection",
                "name": "x",
                "data": { "type": "nd2", "path": "" },
                "workspace": { "path": "" },
                "interval": { "value": 10, "unit": "minute" },
                "samples": [],
                "analysis": { "channels": { "segmentation": 0, "signal": [1] } }
            }"#,
        )
        .unwrap_err();
        assert_eq!(err, "assay.json defines no samples");
    }
}
