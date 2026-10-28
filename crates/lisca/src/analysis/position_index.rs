//! Map `assay.json` position strings onto source indices and file ids.
//!
//! Version 1 stores 0-based indices into the source position list. A missing
//! `positionIndexVersion` is the pre-0.5.1 encoding: folder numbers look up the
//! folder name then fall back to an index; ND2/CZI numbers are already indices.
//! Migration keeps the same physical positions or refuses. It never guesses a
//! neighbour.

use crate::protocol::{AssayData, AssayJsonFile, AssayType, WorkspaceScan};

pub const POSITION_INDEX_VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceKind {
    Folder,
    Nd2,
    Czi,
}

impl SourceKind {
    pub fn from_assay_data(data: &AssayData) -> Self {
        match data {
            AssayData::Folder { .. } => Self::Folder,
            AssayData::Nd2 { .. } => Self::Nd2,
            AssayData::Czi { .. } => Self::Czi,
        }
    }
}

#[derive(Debug, Clone)]
pub struct PositionCatalog {
    pub kind: SourceKind,
    pub ids: Vec<u32>,
    pub labels: Vec<String>,
}

impl PositionCatalog {
    pub fn from_scan(kind: SourceKind, scan: &WorkspaceScan) -> Self {
        let ids = scan.positions.clone();
        let labels = if scan.position_labels.len() == ids.len() {
            scan.position_labels.clone()
        } else {
            default_labels(kind, &ids)
        };
        Self { kind, ids, labels }
    }

    pub fn format_range(&self) -> String {
        if self.labels.is_empty() {
            return "no detected positions".to_string();
        }
        let first = &self.labels[0];
        let last = &self.labels[self.labels.len() - 1];
        let prefix = if self.kind == SourceKind::Folder {
            "Pos"
        } else {
            ""
        };
        format!(
            "{} positions: {prefix}{first} to {prefix}{last}",
            self.labels.len()
        )
    }
}

fn default_labels(kind: SourceKind, ids: &[u32]) -> Vec<String> {
    match kind {
        SourceKind::Folder => ids.iter().map(ToString::to_string).collect(),
        SourceKind::Nd2 | SourceKind::Czi => {
            (1..=ids.len()).map(|index| index.to_string()).collect()
        }
    }
}

pub fn parse_positions(raw: &str) -> Result<Vec<u32>, String> {
    let mut collected = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for token in raw.split(',') {
        let token = token.trim();
        if token.is_empty() {
            continue;
        }
        let parts = token.split(':').collect::<Vec<_>>();
        if parts.len() == 1 {
            let position = parse_position(parts[0])?;
            if seen.insert(position) {
                collected.push(position);
            }
            continue;
        }
        if parts.len() != 2 {
            return Err(format!("invalid position range: {token}"));
        }
        let start = parse_position(parts[0])?;
        let stop = parse_position(parts[1])?;
        if stop < start {
            return Err(format!("invalid empty position range: {token}"));
        }
        let mut current = start;
        while current <= stop {
            if seen.insert(current) {
                collected.push(current);
            }
            current = current
                .checked_add(1)
                .ok_or_else(|| "position range overflow".to_string())?;
        }
    }
    Ok(collected)
}

fn parse_position(raw: &str) -> Result<u32, String> {
    raw.trim()
        .parse::<u32>()
        .map_err(|_| format!("invalid position token: {raw}"))
}

pub fn resolve_legacy_number(stored: u32, catalog: &PositionCatalog) -> Option<usize> {
    if catalog.kind == SourceKind::Folder {
        if let Some(index) = catalog.ids.iter().position(|id| *id == stored) {
            return Some(index);
        }
    }
    let index = stored as usize;
    if index < catalog.ids.len() {
        Some(index)
    } else {
        None
    }
}

pub fn resolve_index(stored: u32, catalog: &PositionCatalog) -> Option<usize> {
    let index = stored as usize;
    (index < catalog.ids.len()).then_some(index)
}

fn refuse_message(stored: u32, catalog: &PositionCatalog) -> String {
    format!(
        "Position {stored} is not in this source ({}). Re-select positions on Metadata. \
         Refusing to guess a neighbouring position because this assay.json uses a different \
         position encoding than the source list.",
        catalog.format_range()
    )
}

fn format_indices(indices: &[usize]) -> String {
    if indices.is_empty() {
        return String::new();
    }
    let mut ranges: Vec<(usize, usize)> = Vec::new();
    for index in indices {
        if let Some(last) = ranges.last_mut() {
            if *index == last.1 + 1 {
                last.1 = *index;
                continue;
            }
        }
        ranges.push((*index, *index));
    }
    ranges
        .into_iter()
        .map(|(start, end)| {
            if start == end {
                start.to_string()
            } else {
                format!("{start}:{end}")
            }
        })
        .collect::<Vec<_>>()
        .join(",")
}

pub fn migrate_stored_positions(
    positions: &str,
    version: Option<u32>,
    catalog: &PositionCatalog,
) -> Result<String, String> {
    let numbers = if positions.trim().is_empty() {
        Vec::new()
    } else {
        parse_positions(positions)?
    };
    if numbers.is_empty() {
        return Ok(String::new());
    }
    let versioned = version == Some(POSITION_INDEX_VERSION);
    let mut indices = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for stored in numbers {
        let index = if versioned {
            resolve_index(stored, catalog)
        } else {
            resolve_legacy_number(stored, catalog)
        };
        let Some(index) = index else {
            return Err(refuse_message(stored, catalog));
        };
        if seen.insert(index) {
            indices.push(index);
        }
    }
    Ok(format_indices(&indices))
}

pub fn file_ids_for_indices(indices: &[usize], catalog: &PositionCatalog) -> Vec<u32> {
    indices
        .iter()
        .filter_map(|index| catalog.ids.get(*index).copied())
        .collect()
}

pub fn resolve_stored_file_ids(
    positions: &str,
    version: Option<u32>,
    catalog: &PositionCatalog,
) -> Result<Vec<u32>, String> {
    let migrated = migrate_stored_positions(positions, version, catalog)?;
    if migrated.is_empty() {
        return Ok(Vec::new());
    }
    let indices = parse_positions(&migrated)?
        .into_iter()
        .map(|value| value as usize)
        .collect::<Vec<_>>();
    Ok(file_ids_for_indices(&indices, catalog))
}

pub fn migrate_assay_samples(
    assay: &mut AssayJsonFile,
    catalog: &PositionCatalog,
) -> Result<bool, String> {
    if assay.position_index_version == Some(POSITION_INDEX_VERSION) {
        return Ok(false);
    }
    for row in assay.samples.0.iter_mut() {
        row.positions =
            migrate_stored_positions(&row.positions, assay.position_index_version, catalog)?;
    }
    assay.position_index_version = Some(POSITION_INDEX_VERSION);
    Ok(true)
}

#[cfg(test)]
fn scan_with(ids: Vec<u32>, labels: Vec<String>) -> WorkspaceScan {
    WorkspaceScan {
        positions: ids,
        position_labels: labels,
        channels: vec![0],
        channel_labels: Vec::new(),
        times: vec![0],
        time_labels: Vec::new(),
        z_slices: vec![0],
        z_slice_labels: Vec::new(),
    }
}

#[cfg(test)]
fn folder_catalog(ids: Vec<u32>) -> PositionCatalog {
    let labels = ids.iter().map(ToString::to_string).collect();
    PositionCatalog::from_scan(SourceKind::Folder, &scan_with(ids, labels))
}

#[cfg(test)]
fn nd2_catalog(count: u32) -> PositionCatalog {
    let ids = (0..count).collect::<Vec<_>>();
    let labels = (1..=count).map(|index| index.to_string()).collect();
    PositionCatalog::from_scan(SourceKind::Nd2, &scan_with(ids, labels))
}

#[cfg(test)]
fn assay_with(positions: &str, version: Option<u32>, folder: bool) -> AssayJsonFile {
    AssayJsonFile {
        analysis: None,
        data: if folder {
            AssayData::Folder {
                path: String::new(),
                template: crate::protocol::AssayFolderTemplate {
                    filename: "img_{t}".into(),
                    subfolder: "Pos{p}".into(),
                },
            }
        } else {
            AssayData::Nd2 {
                path: "run.nd2".into(),
            }
        },
        interval: crate::protocol::AssayInterval {
            unit: crate::protocol::AssayIntervalUnit::Minute,
            value: Some(10.0),
        },
        name: "run".into(),
        position_index_version: version,
        samples: crate::protocol::AssaySamples(vec![crate::protocol::AssaySampleRow {
            name: "A".into(),
            positions: positions.into(),
        }]),
        type_: AssayType::Transfection,
        workspace: crate::protocol::AssayWorkspace {
            path: String::new(),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn folder_legacy_display_minus_one_keeps_the_same_physical_positions() {
        let catalog = folder_catalog((1..=67).collect());
        let migrated = migrate_stored_positions("0:66", None, &catalog).expect("migrate");
        assert_eq!(migrated, "0:65");
        let ids = resolve_stored_file_ids("0:66", None, &catalog).expect("ids");
        assert_eq!(ids.first().copied(), Some(1));
        assert_eq!(ids.last().copied(), Some(66));
        assert!(!ids.contains(&67));
    }

    #[test]
    fn folder_versioned_range_includes_every_label() {
        let catalog = folder_catalog((1..=67).collect());
        let ids =
            resolve_stored_file_ids("0:66", Some(POSITION_INDEX_VERSION), &catalog).expect("ids");
        assert_eq!(ids.len(), 67);
        assert_eq!(ids[0], 1);
        assert_eq!(ids[66], 67);
    }

    #[test]
    fn sparse_folder_legacy_138_stays_pos138() {
        let catalog = folder_catalog(vec![138, 144, 161]);
        assert_eq!(resolve_legacy_number(138, &catalog), Some(0));
        let migrated = migrate_stored_positions("138,144,161", None, &catalog).expect("migrate");
        assert_eq!(migrated, "0:2");
        assert_eq!(
            resolve_stored_file_ids("138,144,161", None, &catalog).expect("ids"),
            vec![138, 144, 161]
        );
    }

    #[test]
    fn sparse_folder_missing_number_is_refused() {
        let catalog = folder_catalog(vec![138, 144, 161]);
        let error = migrate_stored_positions("137", None, &catalog).expect_err("refuse");
        assert!(error.contains("Position 137 is not in this source"));
        assert!(error.contains("Refusing to guess a neighbouring position"));
    }

    #[test]
    fn nd2_legacy_zero_based_range_is_unchanged() {
        let catalog = nd2_catalog(67);
        let migrated = migrate_stored_positions("0:66", None, &catalog).expect("migrate");
        assert_eq!(migrated, "0:66");
        let ids = resolve_stored_file_ids("0:66", None, &catalog).expect("ids");
        assert_eq!(ids, (0..67).collect::<Vec<_>>());
    }

    #[test]
    fn nd2_one_based_hand_edit_is_refused() {
        let catalog = nd2_catalog(10);
        let error = migrate_stored_positions("1:10", None, &catalog).expect_err("refuse");
        assert!(error.contains("Position 10 is not in this source"));
    }

    #[test]
    fn migrate_assay_samples_rewrites_legacy_folder_and_sets_version() {
        let catalog = folder_catalog(vec![138, 144, 161]);
        let mut assay = assay_with("138", None, true);
        assert!(migrate_assay_samples(&mut assay, &catalog).expect("migrate"));
        assert_eq!(assay.position_index_version, Some(POSITION_INDEX_VERSION));
        assert_eq!(assay.samples.0[0].positions, "0");
        assert!(!migrate_assay_samples(&mut assay, &catalog).expect("idempotent"));
    }
}
