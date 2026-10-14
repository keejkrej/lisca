//! Build an immutable reference set from classification annotations and
//! classify other ROI frames with cosine k-nearest neighbors and coarse-to-fine
//! binary search over time series.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::protocol::RoiFrameRequest;
use crate::roi::{self, ClassifiedFrame, RawRoiFrame};

use super::embed::{embed_planes, PlaneInput, DIMENSIONS, ENCODER_ID, MODEL_ID, REVISION};

const QUERY_CAP: usize = 64;
const COARSE_STRIDE: usize = 16;
pub(crate) const CACHE_CAP: usize = 4_096;

#[derive(Debug)]
pub enum InferenceFailure {
    Invalid(String),
    Conflict(String),
    Missing(String),
    Io(String),
}

impl InferenceFailure {
    pub fn message(&self) -> &str {
        match self {
            Self::Invalid(message)
            | Self::Conflict(message)
            | Self::Missing(message)
            | Self::Io(message) => message,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ReferenceSetSummary {
    pub name: String,
    pub count: usize,
    pub labels: BTreeMap<String, usize>,
    pub model_id: String,
    pub revision: String,
    pub encoder_id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ClassificationRow {
    pub pos: u32,
    pub roi: u32,
    pub channel: u32,
    pub time: u32,
    pub z: u32,
    pub label_id: String,
    pub support: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredExample {
    pos: u32,
    roi: u32,
    channel: u32,
    time: u32,
    z: u32,
    label_id: String,
    vector: Vec<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredSet {
    name: String,
    encoder_id: String,
    model_id: String,
    revision: String,
    dimensions: usize,
    examples: Vec<StoredExample>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CacheEntry {
    key: String,
    vector: Vec<f32>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct Disk {
    #[serde(default)]
    sets: Vec<StoredSet>,
    #[serde(default)]
    cache: Vec<CacheEntry>,
}

fn store_lock() -> std::sync::MutexGuard<'static, ()> {
    static LOCK: Mutex<()> = Mutex::new(());
    LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

pub fn list_reference_sets(workspace: &str) -> Result<Vec<ReferenceSetSummary>, InferenceFailure> {
    let _guard = store_lock();
    let disk = read_disk(workspace)?;
    Ok(disk
        .sets
        .iter()
        .filter(|set| set.encoder_id == ENCODER_ID)
        .map(summary)
        .collect())
}

pub fn build_from_annotations(
    workspace: &str,
    name: &str,
) -> Result<ReferenceSetSummary, InferenceFailure> {
    validate_name(name)?;
    let workspace_dir = Path::new(workspace);
    if !workspace_dir.is_dir() {
        return Err(InferenceFailure::Invalid(
            "workspace path does not exist".to_string(),
        ));
    }
    let classified = roi::list_classified_frames(workspace).map_err(InferenceFailure::Io)?;
    let labels = label_counts(&classified);
    if labels.len() < 2 {
        return Err(InferenceFailure::Invalid(
            "Label at least two classes on Annotate before building a reference set.".to_string(),
        ));
    }

    let _guard = store_lock();
    let mut disk = read_disk(workspace)?;
    if disk
        .sets
        .iter()
        .any(|set| set.name == name && set.encoder_id == ENCODER_ID)
    {
        return Err(InferenceFailure::Conflict(format!(
            "Reference set '{name}' already exists for this encoder. Choose a new name."
        )));
    }

    let mut loaded_frames = Vec::with_capacity(classified.len());
    for frame in &classified {
        let image = roi::load_roi_frame(workspace, frame.request.clone()).map_err(|error| {
            InferenceFailure::Io(format!(
                "Pos{} Roi{} C{} T{} Z{}: {error}",
                frame.request.pos,
                frame.request.roi,
                frame.request.channel,
                frame.request.time,
                frame.request.z
            ))
        })?;
        loaded_frames.push(image);
    }

    let vectors = cached_embed_batch(&mut disk, &loaded_frames)?;
    let examples = classified
        .into_iter()
        .zip(vectors)
        .map(|(frame, vector)| StoredExample {
            pos: frame.request.pos,
            roi: frame.request.roi,
            channel: frame.request.channel,
            time: frame.request.time,
            z: frame.request.z,
            label_id: frame.label_id,
            vector,
        })
        .collect();

    let stored = StoredSet {
        name: name.to_string(),
        encoder_id: ENCODER_ID.to_string(),
        model_id: MODEL_ID.to_string(),
        revision: REVISION.to_string(),
        dimensions: DIMENSIONS,
        examples,
    };
    let summary = summary(&stored);
    disk.sets.push(stored);
    write_disk(workspace, &disk)?;
    Ok(summary)
}

pub fn classify(
    workspace: &str,
    name: &str,
    limit: usize,
) -> Result<Vec<ClassificationRow>, InferenceFailure> {
    validate_name(name)?;
    let limit = limit.clamp(1, QUERY_CAP);
    let _guard = store_lock();
    let mut disk = read_disk(workspace)?;
    let set = disk
        .sets
        .iter()
        .find(|set| set.name == name && set.encoder_id == ENCODER_ID)
        .cloned()
        .ok_or_else(|| {
            InferenceFailure::Missing(format!(
                "Reference set '{name}' was not found for this encoder."
            ))
        })?;
    let (channel, default_time, z) = dominant_plane(&set.examples);
    let reference_rois: BTreeSet<(u32, u32)> = set
        .examples
        .iter()
        .map(|example| (example.pos, example.roi))
        .collect();
    let scan = roi::scan_roi_workspace(workspace).map_err(InferenceFailure::Io)?;

    let mut targets: Vec<(u32, u32, Vec<u32>)> = Vec::new();
    for position in scan.positions {
        if !position.channels.contains(&channel) || !position.z_slices.contains(&z) {
            continue;
        }
        if position.times.is_empty() {
            continue;
        }
        let times = if position.times.len() == 1 {
            if !position.times.contains(&default_time) {
                continue;
            }
            vec![default_time]
        } else {
            let mut sorted_times = position.times.clone();
            sorted_times.sort_unstable();
            sorted_times
        };
        for roi_entry in position.rois {
            if targets.len() >= limit {
                break;
            }
            if reference_rois.contains(&(position.pos, roi_entry.roi)) {
                continue;
            }
            targets.push((position.pos, roi_entry.roi, times.clone()));
        }
        if targets.len() >= limit {
            break;
        }
    }

    let mut rows = Vec::with_capacity(targets.len());
    for (pos, roi_id, times) in targets {
        let row = classify_roi_trajectory(
            workspace,
            &mut disk,
            &set.examples,
            pos,
            roi_id,
            channel,
            z,
            &times,
        )?;
        rows.push(row);
    }

    write_disk(workspace, &disk)?;
    Ok(rows)
}

/// Coarse-to-fine + binary-search trajectory classifier for a single ROI:
/// 1. Single-frame ROI: embeds that frame and classifies with cosine 3-NN.
/// 2. Multi-frame ROI:
///    - Coarse pass samples `[0, S, 2S, ..., T-1]` (`S = 16`) in a single batch.
///    - Fits the optimal 0-or-1 transition step over the coarse samples.
///    - If the trajectory is constant (`initial_label == final_label`), short-circuits
///      immediately without embedding intermediate frames.
///    - If a state transition occurs between coarse indices `[lo_idx, hi_idx]`,
///      bisects `[lo_idx, hi_idx]` via binary search (`O(log S)` frames) to locate
///      the exact transition frame `times[hi_idx]`.
#[allow(clippy::too_many_arguments)]
fn classify_roi_trajectory(
    workspace: &str,
    disk: &mut Disk,
    examples: &[StoredExample],
    pos: u32,
    roi_id: u32,
    channel: u32,
    z: u32,
    times: &[u32],
) -> Result<ClassificationRow, InferenceFailure> {
    if times.len() <= 1 {
        let time = times.first().copied().unwrap_or(0);
        let frame = load_frame(workspace, pos, roi_id, channel, time, z)?;
        let vectors = cached_embed_batch(disk, &[frame])?;
        let (label_id, support) = nearest(examples, &vectors[0])?;
        return Ok(ClassificationRow {
            pos,
            roi: roi_id,
            channel,
            time,
            z,
            label_id,
            support,
        });
    }

    let coarse_indices = coarse_sample_indices(times.len(), COARSE_STRIDE);
    let mut coarse_frames = Vec::with_capacity(coarse_indices.len());
    for &idx in &coarse_indices {
        coarse_frames.push(load_frame(workspace, pos, roi_id, channel, times[idx], z)?);
    }
    let coarse_vectors = cached_embed_batch(disk, &coarse_frames)?;
    let mut coarse_preds = Vec::with_capacity(coarse_vectors.len());
    for vector in &coarse_vectors {
        coarse_preds.push(nearest(examples, vector)?);
    }

    let Some(bracket) = find_coarse_transition(&coarse_indices, &coarse_preds) else {
        // Constant trajectory: short-circuit without binary search.
        let (label_id, support) = coarse_preds[0].clone();
        return Ok(ClassificationRow {
            pos,
            roi: roi_id,
            channel,
            time: times[0],
            z,
            label_id,
            support,
        });
    };

    let mut lo_idx = bracket.lo_frame_idx;
    let mut hi_idx = bracket.hi_frame_idx;
    let initial_label = bracket.initial_label;
    let mut transition_label = bracket.final_label;
    let mut transition_support = bracket.final_support;

    while hi_idx - lo_idx > 1 {
        let mid_idx = lo_idx + (hi_idx - lo_idx) / 2;
        let mid_frame = load_frame(workspace, pos, roi_id, channel, times[mid_idx], z)?;
        let mid_vectors = cached_embed_batch(disk, &[mid_frame])?;
        let (mid_label, mid_support) = nearest(examples, &mid_vectors[0])?;
        if mid_label == initial_label {
            lo_idx = mid_idx;
        } else {
            hi_idx = mid_idx;
            transition_label = mid_label;
            transition_support = mid_support;
        }
    }

    Ok(ClassificationRow {
        pos,
        roi: roi_id,
        channel,
        time: times[hi_idx],
        z,
        label_id: transition_label,
        support: transition_support,
    })
}

struct CoarseTransitionBracket {
    lo_frame_idx: usize,
    hi_frame_idx: usize,
    initial_label: String,
    final_label: String,
    final_support: f32,
}

fn coarse_sample_indices(len: usize, stride: usize) -> Vec<usize> {
    if len == 0 {
        return Vec::new();
    }
    let step = stride.max(1);
    let mut indices: Vec<usize> = (0..len).step_by(step).collect();
    if indices.last().copied() != Some(len - 1) {
        indices.push(len - 1);
    }
    indices
}

/// Fit the highest-support 0-or-1 step transition across the coarse sample sequence.
/// Returns `None` if a constant label explains the sequence best, or `Some(bracket)`
/// with the coarse bracket `[coarse_indices[m - 1], coarse_indices[m]]` where the
/// transition occurs.
fn find_coarse_transition(
    coarse_indices: &[usize],
    coarse_preds: &[(String, f32)],
) -> Option<CoarseTransitionBracket> {
    if coarse_indices.len() < 2 || coarse_preds.len() != coarse_indices.len() {
        return None;
    }

    let mut candidate_labels = BTreeSet::new();
    for (label, _) in coarse_preds {
        candidate_labels.insert(label.as_str());
    }
    if candidate_labels.len() < 2 {
        return None;
    }

    let mut best_constant_score = -1.0_f32;
    for &label in &candidate_labels {
        let score: f32 = coarse_preds
            .iter()
            .map(|(pred_label, support)| if pred_label == label { *support } else { 0.0 })
            .sum();
        if score > best_constant_score {
            best_constant_score = score;
        }
    }

    let mut best_transition: Option<(f32, usize, &str, &str)> = None;
    for &initial in &candidate_labels {
        for &final_label in &candidate_labels {
            if initial == final_label {
                continue;
            }
            for split in 1..coarse_preds.len() {
                let mut score = 0.0_f32;
                for (idx, (pred_label, support)) in coarse_preds.iter().enumerate() {
                    let expected = if idx < split { initial } else { final_label };
                    if pred_label == expected {
                        score += *support;
                    }
                }
                let is_better = match best_transition {
                    None => score > best_constant_score,
                    Some((best_score, _, _, _)) => score > best_score,
                };
                if is_better {
                    best_transition = Some((score, split, initial, final_label));
                }
            }
        }
    }

    let (_, split, initial, final_label) = best_transition?;
    let final_support = coarse_preds[split..]
        .iter()
        .find(|(label, _)| label == final_label)
        .map(|(_, support)| *support)
        .unwrap_or(coarse_preds[split].1);

    Some(CoarseTransitionBracket {
        lo_frame_idx: coarse_indices[split - 1],
        hi_frame_idx: coarse_indices[split],
        initial_label: initial.to_string(),
        final_label: final_label.to_string(),
        final_support,
    })
}

fn load_frame(
    workspace: &str,
    pos: u32,
    roi: u32,
    channel: u32,
    time: u32,
    z: u32,
) -> Result<RawRoiFrame, InferenceFailure> {
    let request = RoiFrameRequest {
        pos,
        roi,
        channel,
        time,
        z,
    };
    roi::load_roi_frame(workspace, request).map_err(|error| {
        InferenceFailure::Io(format!("Pos{pos} Roi{roi} C{channel} T{time} Z{z}: {error}"))
    })
}

fn nearest(examples: &[StoredExample], query: &[f32]) -> Result<(String, f32), InferenceFailure> {
    if examples.is_empty() {
        return Err(InferenceFailure::Invalid(
            "Reference set has no examples.".to_string(),
        ));
    }
    let k = 3.min(examples.len());
    let mut scored: Vec<(f32, &str)> = examples
        .iter()
        .map(|example| (dot(query, &example.vector), example.label_id.as_str()))
        .collect();
    scored.sort_by(|left, right| right.0.total_cmp(&left.0));
    let mut votes: BTreeMap<&str, (usize, f32)> = BTreeMap::new();
    for (similarity, label) in scored.iter().take(k) {
        let entry = votes.entry(*label).or_insert((0, 0.0));
        entry.0 += 1;
        entry.1 += *similarity;
    }
    let (label, (count, _)) = votes
        .into_iter()
        .max_by(|left, right| {
            left.1
                 .0
                .cmp(&right.1 .0)
                .then(left.1 .1.total_cmp(&right.1 .1))
        })
        .ok_or_else(|| InferenceFailure::Invalid("Reference set has no examples.".to_string()))?;
    Ok((label.to_string(), count as f32 / k as f32))
}

fn dot(left: &[f32], right: &[f32]) -> f32 {
    left.iter().zip(right.iter()).map(|(a, b)| a * b).sum()
}

fn dominant_plane(examples: &[StoredExample]) -> (u32, u32, u32) {
    let mut counts: BTreeMap<(u32, u32, u32), usize> = BTreeMap::new();
    for example in examples {
        *counts
            .entry((example.channel, example.time, example.z))
            .or_insert(0) += 1;
    }
    counts
        .into_iter()
        .max_by(|left, right| left.1.cmp(&right.1).then(right.0.cmp(&left.0)))
        .map(|(plane, _)| plane)
        .unwrap_or((0, 0, 0))
}

fn cached_embed_batch(
    disk: &mut Disk,
    frames: &[RawRoiFrame],
) -> Result<Vec<Vec<f32>>, InferenceFailure> {
    let mut results: Vec<Option<Vec<f32>>> = vec![None; frames.len()];
    let mut missing_indices = Vec::new();
    let mut missing_keys = Vec::new();
    let mut missing_planes = Vec::new();

    for (index, frame) in frames.iter().enumerate() {
        let key = format!(
            "{ENCODER_ID}:{}x{}:{}",
            frame.width,
            frame.height,
            fnv64(&frame.data)
        );
        if let Some(entry) = disk.cache.iter().find(|entry| entry.key == key) {
            results[index] = Some(entry.vector.clone());
        } else {
            missing_indices.push(index);
            missing_keys.push(key);
            missing_planes.push(PlaneInput {
                width: frame.width,
                height: frame.height,
                pixels: &frame.data,
            });
        }
    }

    if !missing_planes.is_empty() {
        let embedded = embed_planes(&missing_planes).map_err(InferenceFailure::Invalid)?;
        for ((index, key), vector) in missing_indices
            .into_iter()
            .zip(missing_keys)
            .zip(embedded)
        {
            if disk.cache.len() >= CACHE_CAP {
                disk.cache.remove(0);
            }
            disk.cache.push(CacheEntry {
                key,
                vector: vector.clone(),
            });
            results[index] = Some(vector);
        }
    }

    results
        .into_iter()
        .collect::<Option<Vec<_>>>()
        .ok_or_else(|| InferenceFailure::Io("missing embedded frame vector".to_string()))
}

fn fnv64(pixels: &[u16]) -> u64 {
    let mut hash = 0xcbf29ce484222325_u64;
    for pixel in pixels {
        for byte in pixel.to_le_bytes() {
            hash ^= u64::from(byte);
            hash = hash.wrapping_mul(0x100000001b3);
        }
    }
    hash
}

fn label_counts(frames: &[ClassifiedFrame]) -> BTreeMap<&str, usize> {
    let mut counts = BTreeMap::new();
    for frame in frames {
        *counts.entry(frame.label_id.as_str()).or_insert(0) += 1;
    }
    counts
}

fn summary(set: &StoredSet) -> ReferenceSetSummary {
    let mut labels = BTreeMap::new();
    for example in &set.examples {
        *labels.entry(example.label_id.clone()).or_insert(0) += 1;
    }
    ReferenceSetSummary {
        name: set.name.clone(),
        count: set.examples.len(),
        labels,
        model_id: set.model_id.clone(),
        revision: set.revision.clone(),
        encoder_id: set.encoder_id.clone(),
    }
}

fn validate_name(name: &str) -> Result<(), InferenceFailure> {
    let ok = (1..=64).contains(&name.len())
        && name.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '-' || character == '_'
        });
    if ok {
        Ok(())
    } else {
        Err(InferenceFailure::Invalid(
            "Reference set name must be 1-64 letters, numbers, hyphens, or underscores."
                .to_string(),
        ))
    }
}

fn disk_path(workspace: &str) -> PathBuf {
    Path::new(workspace)
        .join("inference")
        .join("references.json")
}

fn read_disk(workspace: &str) -> Result<Disk, InferenceFailure> {
    let path = disk_path(workspace);
    if !path.is_file() {
        return Ok(Disk::default());
    }
    let bytes = fs::read(&path).map_err(|error| InferenceFailure::Io(error.to_string()))?;
    serde_json::from_slice(&bytes)
        .map_err(|error| InferenceFailure::Io(format!("{}: {error}", path.display())))
}

fn write_disk(workspace: &str, disk: &Disk) -> Result<(), InferenceFailure> {
    let path = disk_path(workspace);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| InferenceFailure::Io(error.to_string()))?;
    }
    let bytes =
        serde_json::to_vec_pretty(disk).map_err(|error| InferenceFailure::Io(error.to_string()))?;
    fs::write(path, bytes).map_err(|error| InferenceFailure::Io(error.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::inference::embed::set_api_key;
    use crate::protocol::{AnnotationLabel, RoiFrameAnnotationPayload};
    use base64::engine::general_purpose::STANDARD as BASE64;
    use base64::Engine;
    use std::fs::File;
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use std::time::{SystemTime, UNIX_EPOCH};
    use tiff::encoder::{colortype, TiffEncoder};

    fn start_mock_openrouter() -> (String, Arc<AtomicUsize>) {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock openrouter");
        let addr = listener.local_addr().expect("local addr");
        let embedded_inputs = Arc::new(AtomicUsize::new(0));
        let counter = Arc::clone(&embedded_inputs);

        std::thread::spawn(move || {
            for stream in listener.incoming().flatten() {
                let mut stream = stream;
                let mut buf = Vec::new();
                let mut temp = [0_u8; 4096];
                let mut header_end = None;
                let mut content_length = 0_usize;

                loop {
                    let read = stream.read(&mut temp).unwrap_or(0);
                    if read == 0 {
                        break;
                    }
                    buf.extend_from_slice(&temp[..read]);
                    if header_end.is_none() {
                        if let Some(pos) = buf.windows(4).position(|w| w == b"\r\n\r\n") {
                            let end = pos + 4;
                            header_end = Some(end);
                            let headers = String::from_utf8_lossy(&buf[..end]);
                            for line in headers.lines() {
                                if let Some((k, v)) = line.split_once(':') {
                                    if k.trim().eq_ignore_ascii_case("content-length") {
                                        content_length = v.trim().parse().unwrap_or(0);
                                    }
                                }
                            }
                        }
                    }
                    if let Some(end) = header_end {
                        if buf.len() >= end + content_length {
                            break;
                        }
                    }
                }

                let Some(end) = header_end else {
                    continue;
                };
                let body: serde_json::Value =
                    serde_json::from_slice(&buf[end..end + content_length]).expect("json body");
                let items = body["input"].as_array().expect("input array");
                counter.fetch_add(items.len(), Ordering::SeqCst);

                let mut data = Vec::with_capacity(items.len());
                for (index, item) in items.iter().enumerate() {
                    let url = item["content"][0]["image_url"]["url"]
                        .as_str()
                        .expect("data uri");
                    let png_b64 = url
                        .strip_prefix("data:image/png;base64,")
                        .expect("png prefix");
                    let png_bytes = BASE64.decode(png_b64).expect("base64 png");
                    let img = image::load_from_memory(&png_bytes)
                        .expect("decode png")
                        .to_luma8();
                    let mean: f32 = img.as_raw().iter().map(|&p| f32::from(p)).sum::<f32>()
                        / (img.as_raw().len() as f32 * 255.0);

                    let mut embedding = vec![0.0_f32; DIMENSIONS];
                    embedding[0] = 1.0 - mean;
                    embedding[1] = mean;
                    data.push(serde_json::json!({
                        "index": index,
                        "embedding": embedding,
                    }));
                }

                let response_json = serde_json::to_string(&serde_json::json!({
                    "data": data,
                    "model": MODEL_ID,
                }))
                .expect("serialize response");
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    response_json.len(),
                    response_json
                );
                let _ = stream.write_all(response.as_bytes());
            }
        });

        (format!("http://{addr}/api/v1/embeddings"), embedded_inputs)
    }

    #[test]
    fn annotations_become_a_reference_set_and_classify_with_coarse_binary_search() {
        let (mock_url, embedded_inputs) = start_mock_openrouter();
        std::env::set_var("LISCA_OPENROUTER_EMBEDDINGS_URL", &mock_url);
        set_api_key("test-openrouter-key");

        let workspace = temp_workspace("references");
        let path = workspace.to_string_lossy().to_string();
        write_workspace(&workspace);

        let built = build_from_annotations(&path, "annotations").expect("build");
        assert_eq!(built.count, 2);
        assert_eq!(built.labels.get("low").copied(), Some(1));
        assert_eq!(built.labels.get("high").copied(), Some(1));
        assert_eq!(built.model_id, MODEL_ID);

        let again = build_from_annotations(&path, "annotations");
        assert!(matches!(again, Err(InferenceFailure::Conflict(_))));

        let rows = classify(&path, "annotations", 8).expect("classify");
        assert_eq!(rows.len(), 2);
        // Roi2 is constant low across all 33 timepoints -> short-circuits at T=0
        assert_eq!(rows[0].roi, 2);
        assert_eq!(rows[0].label_id, "low");
        assert_eq!(rows[0].time, 0);
        // Roi3 transitions from low to high at T=11 -> binary search pinpoints T=11!
        assert_eq!(rows[1].roi, 3);
        assert_eq!(rows[1].label_id, "high");
        assert_eq!(rows[1].time, 11);
        assert!(rows[1].support > 0.0);

        // Total frames across Roi2 (33) + Roi3 (33) = 66 frames, but coarse + binary search
        // embeds far fewer than 66 frames!
        let total_embedded = embedded_inputs.load(Ordering::SeqCst);
        assert!(
            total_embedded < 20,
            "expected coarse+binary search to embed < 20 frames across 66 movie frames, got {total_embedded}"
        );

        fs::remove_dir_all(&workspace).expect("cleanup");
    }

    fn temp_workspace(tag: &str) -> PathBuf {
        let workspace = std::env::temp_dir().join(format!(
            "lisca-inference-{tag}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        fs::create_dir_all(workspace.join("roi").join("Pos0")).expect("roi dir");
        workspace
    }

    fn write_workspace(workspace: &Path) {
        let time_count = 33_usize;
        // Roi0: all dark (annotated low at T=0)
        write_multi_tiff(
            &workspace.join("roi").join("Pos0").join("Roi0.tif"),
            &vec![0_u8; time_count],
        );
        // Roi1: all bright (annotated high at T=0)
        write_multi_tiff(
            &workspace.join("roi").join("Pos0").join("Roi1.tif"),
            &vec![255_u8; time_count],
        );
        // Roi2: constant dark (0..33) -> should short-circuit after coarse pass
        write_multi_tiff(
            &workspace.join("roi").join("Pos0").join("Roi2.tif"),
            &vec![5_u8; time_count],
        );
        // Roi3: transitions from dark to bright at frame 11
        let mut roi3_values = vec![10_u8; time_count];
        for value in &mut roi3_values[11..] {
            *value = 250;
        }
        write_multi_tiff(
            &workspace.join("roi").join("Pos0").join("Roi3.tif"),
            &roi3_values,
        );

        let index = serde_json::json!({
            "position": 0,
            "axisOrder": "TCZYX",
            "channelCount": 1,
            "timeCount": time_count,
            "zCount": 1,
            "rois": [
                {"roi": 0, "fileName": "Roi0.tif", "bbox": {"roi": 0, "x": 0, "y": 0, "w": 2, "h": 2}},
                {"roi": 1, "fileName": "Roi1.tif", "bbox": {"roi": 1, "x": 0, "y": 0, "w": 2, "h": 2}},
                {"roi": 2, "fileName": "Roi2.tif", "bbox": {"roi": 2, "x": 0, "y": 0, "w": 2, "h": 2}},
                {"roi": 3, "fileName": "Roi3.tif", "bbox": {"roi": 3, "x": 0, "y": 0, "w": 2, "h": 2}}
            ]
        });
        fs::write(
            workspace.join("roi").join("Pos0").join("index.json"),
            serde_json::to_vec_pretty(&index).expect("index"),
        )
        .expect("write index");
        let path = workspace.to_string_lossy().to_string();
        roi::save_annotation_labels(
            &path,
            vec![
                AnnotationLabel {
                    id: "low".to_string(),
                    name: "Low".to_string(),
                    color: "#111111".to_string(),
                },
                AnnotationLabel {
                    id: "high".to_string(),
                    name: "High".to_string(),
                    color: "#eeeeee".to_string(),
                },
            ],
        )
        .expect("labels");
        for (roi_index, label) in [(0, "low"), (1, "high")] {
            roi::save_roi_frame_annotation(
                &path,
                RoiFrameRequest {
                    pos: 0,
                    roi: roi_index,
                    channel: 0,
                    time: 0,
                    z: 0,
                },
                RoiFrameAnnotationPayload {
                    classification_label_id: Some(label.to_string()),
                    mask_base64_png: None,
                },
            )
            .expect("annotation");
        }
    }

    fn write_multi_tiff(path: &Path, values: &[u8]) {
        let file = File::create(path).expect("tiff");
        let mut encoder = TiffEncoder::new(file).expect("encoder");
        for &value in values {
            let image = encoder.new_image::<colortype::Gray8>(2, 2).expect("image");
            image.write_data(&vec![value; 4]).expect("pixels");
        }
    }
}
