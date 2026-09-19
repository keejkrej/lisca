//! Assay-scoped occupancy prompt-pack: accumulating few-shot, no per-user retrain.
//!
//! Do not retrain Smart exclude per user. Manual include/exclude edits append
//! to `align/occupancy-pack.json` for that workspace only. Distance-to-prototype
//! scores the rest once the pack is ready (≥2 occupied and ≥2 empty). Until
//! then Smart exclude stays on the ResNet baseline. The v0 embedder is a
//! deterministic 16×16 descriptor (same min-max crop as the ResNet path).

use std::path::Path;

use crate::protocol::{
    AutoExcludePreviewCell, OccupancyPromptExample, OccupancyPromptExampleInput,
    OccupancyPromptLabel, OccupancyPromptPack,
};

pub const OCCUPANCY_EMBEDDER_ID: &str = "lisca-occupancy-v0";
pub const OCCUPANCY_PACK_VERSION: u32 = 1;
pub const OCCUPANCY_GRID: usize = 16;
pub const OCCUPANCY_DEFAULT_THRESHOLD: f64 = 0.0;
pub const OCCUPANCY_MIN_OCCUPIED_EXAMPLES: usize = 2;
pub const OCCUPANCY_MIN_EMPTY_EXAMPLES: usize = 2;

pub fn occupancy_embedding_size() -> usize {
    OCCUPANCY_GRID * OCCUPANCY_GRID + 4
}

pub fn minmax_uint8(values: &[f64]) -> Vec<u8> {
    if values.is_empty() {
        return Vec::new();
    }
    let mut minimum = f64::INFINITY;
    let mut maximum = f64::NEG_INFINITY;
    for value in values {
        minimum = minimum.min(*value);
        maximum = maximum.max(*value);
    }
    let range = maximum - minimum;
    values
        .iter()
        .map(|value| {
            if range > 0.0 {
                (((value - minimum) / range) * 255.0).round() as u8
            } else {
                0
            }
        })
        .collect()
}

pub fn resize_nearest(gray: &[u8], width: usize, height: usize, size: usize) -> Vec<u8> {
    let mut output = vec![0u8; size * size];
    if width == 0 || height == 0 {
        return output;
    }
    for row in 0..size {
        let source_y = ((row * height) / size).min(height - 1);
        for col in 0..size {
            let source_x = ((col * width) / size).min(width - 1);
            output[row * size + col] = gray[source_y * width + source_x];
        }
    }
    output
}

pub fn l2_normalize(vector: &[f64]) -> Vec<f64> {
    let norm = vector.iter().map(|value| value * value).sum::<f64>().sqrt();
    if norm <= 0.0 {
        return vector.to_vec();
    }
    vector.iter().map(|value| value / norm).collect()
}

pub fn embed_occupancy_crop(values: &[f64], width: usize, height: usize) -> Vec<f64> {
    let uint8 = minmax_uint8(values);
    let small = resize_nearest(&uint8, width, height, OCCUPANCY_GRID);
    let mut flat = Vec::with_capacity(occupancy_embedding_size());
    let mut sum = 0.0;
    for pixel in &small {
        let value = f64::from(*pixel) / 255.0;
        flat.push(value);
        sum += value;
    }
    let count = flat.len() as f64;
    let mean = if count > 0.0 { sum / count } else { 0.0 };
    let variance = if count > 0.0 {
        flat.iter()
            .map(|value| {
                let delta = value - mean;
                delta * delta
            })
            .sum::<f64>()
            / count
    } else {
        0.0
    };
    let std = variance.sqrt();
    let mut sorted = flat.clone();
    sorted.sort_by(|left, right| left.partial_cmp(right).unwrap_or(std::cmp::Ordering::Equal));
    let p90 = if sorted.is_empty() {
        0.0
    } else {
        sorted[((0.9 * sorted.len() as f64).floor() as usize).min(sorted.len() - 1)]
    };
    let mut dx_sum = 0.0;
    let mut dx_count = 0.0;
    let mut dy_sum = 0.0;
    let mut dy_count = 0.0;
    for row in 0..OCCUPANCY_GRID {
        for col in 0..OCCUPANCY_GRID {
            let value = f64::from(small[row * OCCUPANCY_GRID + col]) / 255.0;
            if col + 1 < OCCUPANCY_GRID {
                let right = f64::from(small[row * OCCUPANCY_GRID + col + 1]) / 255.0;
                dx_sum += (value - right).abs();
                dx_count += 1.0;
            }
            if row + 1 < OCCUPANCY_GRID {
                let below = f64::from(small[(row + 1) * OCCUPANCY_GRID + col]) / 255.0;
                dy_sum += (value - below).abs();
                dy_count += 1.0;
            }
        }
    }
    let edge = 0.5
        * ((if dx_count > 0.0 {
            dx_sum / dx_count
        } else {
            0.0
        }) + (if dy_count > 0.0 {
            dy_sum / dy_count
        } else {
            0.0
        }));
    flat.push(mean);
    flat.push(std);
    flat.push(p90);
    flat.push(edge);
    l2_normalize(&flat)
}

pub fn mean_prototype(embeddings: &[Vec<f64>]) -> Result<Vec<f64>, String> {
    let Some(first) = embeddings.first() else {
        return Err("prototype requires at least one embedding".into());
    };
    let dim = first.len();
    let mut mean = vec![0.0; dim];
    for embedding in embeddings {
        for (index, value) in embedding.iter().enumerate().take(dim) {
            mean[index] += value;
        }
    }
    let count = embeddings.len() as f64;
    for value in &mut mean {
        *value /= count;
    }
    Ok(l2_normalize(&mean))
}

pub fn occupancy_exclude_score(
    embedding: &[f64],
    occupied_prototype: &[f64],
    empty_prototype: &[f64],
) -> f64 {
    let query = l2_normalize(embedding);
    let occupied = l2_normalize(occupied_prototype);
    let empty = l2_normalize(empty_prototype);
    let dim = query.len().min(occupied.len()).min(empty.len());
    let empty_dot: f64 = (0..dim).map(|index| query[index] * empty[index]).sum();
    let occupied_dot: f64 = (0..dim).map(|index| query[index] * occupied[index]).sum();
    empty_dot - occupied_dot
}

pub fn pack_counts(pack: &OccupancyPromptPack) -> (usize, usize) {
    let mut occupied = 0;
    let mut empty = 0;
    for example in &pack.examples {
        match example.label {
            OccupancyPromptLabel::Occupied => occupied += 1,
            OccupancyPromptLabel::Empty => empty += 1,
        }
    }
    (occupied, empty)
}

pub fn pack_has_both_classes(pack: &OccupancyPromptPack) -> bool {
    let (occupied, empty) = pack_counts(pack);
    occupied > 0 && empty > 0
}

pub fn pack_is_ready(pack: &OccupancyPromptPack) -> bool {
    let (occupied, empty) = pack_counts(pack);
    occupied >= OCCUPANCY_MIN_OCCUPIED_EXAMPLES && empty >= OCCUPANCY_MIN_EMPTY_EXAMPLES
}

pub fn pack_gate_message(pack: Option<&OccupancyPromptPack>) -> String {
    let (occupied, empty) = pack.map(pack_counts).unwrap_or((0, 0));
    if occupied >= OCCUPANCY_MIN_OCCUPIED_EXAMPLES && empty >= OCCUPANCY_MIN_EMPTY_EXAMPLES {
        return format!("Prompt pack ready ({occupied} occupied, {empty} empty).");
    }
    let need_occupied = OCCUPANCY_MIN_OCCUPIED_EXAMPLES.saturating_sub(occupied);
    let need_empty = OCCUPANCY_MIN_EMPTY_EXAMPLES.saturating_sub(empty);
    let mut needed = Vec::new();
    if need_occupied > 0 {
        needed.push(format!("{need_occupied} more occupied"));
    }
    if need_empty > 0 {
        needed.push(format!("{need_empty} more empty"));
    }
    format!(
        "Not ready yet — need {} examples (have {occupied} occupied, {empty} empty). Using ResNet until then.",
        needed.join(" and ")
    )
}

pub fn empty_occupancy_pack(threshold: Option<f64>) -> OccupancyPromptPack {
    OccupancyPromptPack {
        embedder: OCCUPANCY_EMBEDDER_ID.to_string(),
        examples: Vec::new(),
        threshold: Some(threshold.unwrap_or(OCCUPANCY_DEFAULT_THRESHOLD)),
        version: OCCUPANCY_PACK_VERSION,
    }
}

fn example_key(example: &OccupancyPromptExample) -> Option<(Option<u32>, i32, i32)> {
    Some((example.pos, example.i?, example.j?))
}

pub fn merge_occupancy_packs(
    base: &OccupancyPromptPack,
    extra: &OccupancyPromptPack,
) -> OccupancyPromptPack {
    let mut keyed =
        std::collections::BTreeMap::<(Option<u32>, i32, i32), OccupancyPromptExample>::new();
    let mut anonymous = Vec::new();
    for example in base.examples.iter().chain(extra.examples.iter()) {
        match example_key(example) {
            Some(key) => {
                keyed.insert(key, example.clone());
            }
            None => anonymous.push(example.clone()),
        }
    }
    let mut examples = anonymous;
    examples.extend(keyed.into_values());
    OccupancyPromptPack {
        embedder: if extra.embedder.is_empty() {
            base.embedder.clone()
        } else {
            extra.embedder.clone()
        },
        examples,
        threshold: extra.threshold.or(base.threshold),
        version: extra.version.max(base.version),
    }
}

pub fn score_embedding_against_pack(
    embedding: &[f64],
    pack: &OccupancyPromptPack,
) -> Result<f64, String> {
    let occupied: Vec<Vec<f64>> = pack
        .examples
        .iter()
        .filter(|example| example.label == OccupancyPromptLabel::Occupied)
        .map(|example| example.embedding.clone())
        .collect();
    let empty: Vec<Vec<f64>> = pack
        .examples
        .iter()
        .filter(|example| example.label == OccupancyPromptLabel::Empty)
        .map(|example| example.embedding.clone())
        .collect();
    if occupied.is_empty() || empty.is_empty() {
        return Err("prompt pack needs occupied and empty embeddings".into());
    }
    Ok(occupancy_exclude_score(
        embedding,
        &mean_prototype(&occupied)?,
        &mean_prototype(&empty)?,
    ))
}

pub fn should_exclude_score(score: f64, pack: Option<&OccupancyPromptPack>) -> bool {
    let threshold = pack
        .and_then(|pack| pack.threshold)
        .unwrap_or(OCCUPANCY_DEFAULT_THRESHOLD);
    score >= threshold
}

pub fn build_occupancy_pack(
    occupied: Vec<OccupancyPromptExample>,
    empty: Vec<OccupancyPromptExample>,
    threshold: Option<f64>,
) -> OccupancyPromptPack {
    let mut examples = occupied;
    examples.extend(empty);
    OccupancyPromptPack {
        embedder: OCCUPANCY_EMBEDDER_ID.to_string(),
        examples,
        threshold,
        version: OCCUPANCY_PACK_VERSION,
    }
}

pub fn load_occupancy_pack(workspace: &Path) -> Result<Option<OccupancyPromptPack>, String> {
    let path = lisca_workspace::occupancy_pack_path(workspace);
    if !path.is_file() {
        return Ok(None);
    }
    let bytes = std::fs::read(&path)
        .map_err(|error| format!("failed to read {}: {error}", path.display()))?;
    let pack: OccupancyPromptPack =
        serde_json::from_slice(&bytes).map_err(|error| format!("{}: {error}", path.display()))?;
    Ok(Some(pack))
}

pub fn save_occupancy_pack(workspace: &Path, pack: &OccupancyPromptPack) -> Result<(), String> {
    let path = lisca_workspace::occupancy_pack_path(workspace);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("failed to create {}: {error}", parent.display()))?;
    }
    let bytes = serde_json::to_vec_pretty(pack).map_err(|error| error.to_string())?;
    std::fs::write(&path, bytes)
        .map_err(|error| format!("failed to write {}: {error}", path.display()))
}

pub fn embed_preview_cell(
    pixels: &[f64],
    frame_width: usize,
    frame_height: usize,
    cell: &AutoExcludePreviewCell,
) -> Result<Vec<f64>, String> {
    let crop = super::exclude::crop_and_normalize_cell(pixels, frame_width, frame_height, cell)?;
    let width = ((cell.x + cell.w).min(frame_width as u32) - cell.x) as usize;
    let height = ((cell.y + cell.h).min(frame_height as u32) - cell.y) as usize;
    if width == 0 || height == 0 {
        return Ok(l2_normalize(&vec![0.0; occupancy_embedding_size()]));
    }
    let values: Vec<f64> = crop.iter().map(|value| f64::from(*value)).collect();
    Ok(embed_occupancy_crop(&values, width, height))
}

pub fn pack_from_prompt_examples(
    pixels: &[f64],
    frame_width: usize,
    frame_height: usize,
    examples: &[OccupancyPromptExampleInput],
    threshold: Option<f64>,
    pos: Option<u32>,
) -> Result<OccupancyPromptPack, String> {
    let mut occupied = Vec::new();
    let mut empty = Vec::new();
    for example in examples {
        let embedding = embed_preview_cell(pixels, frame_width, frame_height, &example.cell)?;
        let stored = OccupancyPromptExample {
            embedding,
            i: Some(example.cell.i),
            j: Some(example.cell.j),
            label: example.label,
            pos,
        };
        match example.label {
            OccupancyPromptLabel::Occupied => occupied.push(stored),
            OccupancyPromptLabel::Empty => empty.push(stored),
        }
    }
    Ok(build_occupancy_pack(occupied, empty, threshold))
}

pub fn classify_cells_with_pack(
    pixels: &[f64],
    frame_width: usize,
    frame_height: usize,
    cells: &[AutoExcludePreviewCell],
    pack: &OccupancyPromptPack,
) -> Result<Vec<crate::protocol::AlignGridCellCoord>, String> {
    let mut excluded = Vec::new();
    for cell in cells {
        let embedding = embed_preview_cell(pixels, frame_width, frame_height, cell)?;
        let score = score_embedding_against_pack(&embedding, pack)?;
        if should_exclude_score(score, Some(pack)) {
            excluded.push(crate::protocol::AlignGridCellCoord {
                i: cell.i,
                j: cell.j,
            });
        }
    }
    Ok(excluded)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn blob(size: usize) -> (Vec<f64>, usize, usize) {
        let mut values = vec![20.0; size * size];
        let radius = size as f64 / 4.0;
        let center = size as f64 / 2.0;
        for y in 0..size {
            for x in 0..size {
                let dx = x as f64 - center;
                let dy = y as f64 - center;
                if dx * dx + dy * dy < radius * radius {
                    values[y * size + x] = 200.0;
                }
            }
        }
        (values, size, size)
    }

    fn empty(size: usize) -> (Vec<f64>, usize, usize) {
        (vec![40.0; size * size], size, size)
    }

    #[test]
    fn few_shot_separates_occupied_from_empty() {
        let (occupied_values, ow, oh) = blob(32);
        let (empty_values, ew, eh) = empty(32);
        let occupied = embed_occupancy_crop(&occupied_values, ow, oh);
        let empty_emb = embed_occupancy_crop(&empty_values, ew, eh);
        let pack = build_occupancy_pack(
            vec![OccupancyPromptExample {
                embedding: occupied,
                i: Some(0),
                j: Some(0),
                label: OccupancyPromptLabel::Occupied,
                pos: None,
            }],
            vec![OccupancyPromptExample {
                embedding: empty_emb,
                i: Some(1),
                j: Some(1),
                label: OccupancyPromptLabel::Empty,
                pos: None,
            }],
            None,
        );
        let (q_occ, qw, qh) = blob(36);
        let (q_empty, qw2, qh2) = empty(36);
        let occupied_score =
            score_embedding_against_pack(&embed_occupancy_crop(&q_occ, qw, qh), &pack).unwrap();
        let empty_score =
            score_embedding_against_pack(&embed_occupancy_crop(&q_empty, qw2, qh2), &pack).unwrap();
        assert!(empty_score > occupied_score);
        assert!(should_exclude_score(empty_score, Some(&pack)));
        assert!(!should_exclude_score(occupied_score, Some(&pack)));
    }

    #[test]
    fn persist_round_trips_workspace_pack() {
        let root = tempfile::tempdir().expect("tmp");
        let (occupied_values, ow, oh) = blob(16);
        let (empty_values, ew, eh) = empty(16);
        let pack = build_occupancy_pack(
            vec![OccupancyPromptExample {
                embedding: embed_occupancy_crop(&occupied_values, ow, oh),
                i: None,
                j: None,
                label: OccupancyPromptLabel::Occupied,
                pos: None,
            }],
            vec![OccupancyPromptExample {
                embedding: embed_occupancy_crop(&empty_values, ew, eh),
                i: None,
                j: None,
                label: OccupancyPromptLabel::Empty,
                pos: None,
            }],
            None,
        );
        save_occupancy_pack(root.path(), &pack).expect("save");
        let loaded = load_occupancy_pack(root.path())
            .expect("load")
            .expect("present");
        assert_eq!(loaded.embedder, OCCUPANCY_EMBEDDER_ID);
        assert!(pack_has_both_classes(&loaded));
        assert!(!pack_is_ready(&loaded));
    }

    #[test]
    fn accumulating_corrections_replace_the_same_site() {
        let (occupied_values, ow, oh) = blob(16);
        let (empty_values, ew, eh) = empty(16);
        let occupied = OccupancyPromptExample {
            embedding: embed_occupancy_crop(&occupied_values, ow, oh),
            i: Some(0),
            j: Some(0),
            label: OccupancyPromptLabel::Occupied,
            pos: Some(1),
        };
        let empty_ex = OccupancyPromptExample {
            embedding: embed_occupancy_crop(&empty_values, ew, eh),
            i: Some(0),
            j: Some(0),
            label: OccupancyPromptLabel::Empty,
            pos: Some(1),
        };
        let base = build_occupancy_pack(vec![occupied], Vec::new(), None);
        let extra = build_occupancy_pack(Vec::new(), vec![empty_ex], None);
        let merged = merge_occupancy_packs(&base, &extra);
        assert_eq!(pack_counts(&merged), (0, 1));
        assert!(pack_gate_message(Some(&merged)).contains("Not ready yet"));
    }

    #[test]
    fn ready_after_two_of_each_class() {
        let (occupied_values, ow, oh) = blob(16);
        let (empty_values, ew, eh) = empty(16);
        let example = |label, i| OccupancyPromptExample {
            embedding: if label == OccupancyPromptLabel::Occupied {
                embed_occupancy_crop(&occupied_values, ow, oh)
            } else {
                embed_occupancy_crop(&empty_values, ew, eh)
            },
            i: Some(i),
            j: Some(0),
            label,
            pos: Some(1),
        };
        let pack = build_occupancy_pack(
            vec![
                example(OccupancyPromptLabel::Occupied, 0),
                example(OccupancyPromptLabel::Occupied, 1),
            ],
            vec![
                example(OccupancyPromptLabel::Empty, 2),
                example(OccupancyPromptLabel::Empty, 3),
            ],
            None,
        );
        assert!(pack_is_ready(&pack));
    }
}
