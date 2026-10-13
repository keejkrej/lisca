//! Build an immutable reference set from classification annotations and
//! classify other ROI frames with cosine k-nearest neighbors.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::protocol::RoiFrameRequest;
use crate::roi::{self, ClassifiedFrame};

use super::embed::{embed_plane, DIMENSIONS, ENCODER_ID, MODEL_ID, REVISION};

const QUERY_CAP: usize = 64;
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

    let mut examples = Vec::with_capacity(classified.len());
    for frame in classified {
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
        let vector = cached_embed(&mut disk, &image.data, image.width, image.height)?;
        examples.push(StoredExample {
            pos: frame.request.pos,
            roi: frame.request.roi,
            channel: frame.request.channel,
            time: frame.request.time,
            z: frame.request.z,
            label_id: frame.label_id,
            vector,
        });
    }
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
    let (channel, time, z) = dominant_plane(&set.examples);
    let reference_keys: BTreeSet<(u32, u32, u32, u32, u32)> = set
        .examples
        .iter()
        .map(|example| {
            (
                example.pos,
                example.roi,
                example.channel,
                example.time,
                example.z,
            )
        })
        .collect();
    let scan = roi::scan_roi_workspace(workspace).map_err(InferenceFailure::Io)?;
    let mut rows = Vec::new();
    for position in scan.positions {
        if !position.times.contains(&time) {
            continue;
        }
        if !position.channels.contains(&channel) || !position.z_slices.contains(&z) {
            continue;
        }
        for roi_entry in position.rois {
            if rows.len() >= limit {
                break;
            }
            let key = (position.pos, roi_entry.roi, channel, time, z);
            if reference_keys.contains(&key) {
                continue;
            }
            let request = RoiFrameRequest {
                pos: position.pos,
                roi: roi_entry.roi,
                channel,
                time,
                z,
            };
            let image = match roi::load_roi_frame(workspace, request.clone()) {
                Ok(image) => image,
                Err(error) => {
                    return Err(InferenceFailure::Io(format!(
                        "Pos{} Roi{}: {error}",
                        request.pos, request.roi
                    )));
                }
            };
            let vector = cached_embed(&mut disk, &image.data, image.width, image.height)?;
            let (label_id, support) = nearest(&set.examples, &vector)?;
            rows.push(ClassificationRow {
                pos: request.pos,
                roi: request.roi,
                channel,
                time,
                z,
                label_id,
                support,
            });
        }
    }
    write_disk(workspace, &disk)?;
    Ok(rows)
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

fn cached_embed(
    disk: &mut Disk,
    pixels: &[u16],
    width: u32,
    height: u32,
) -> Result<Vec<f32>, InferenceFailure> {
    let key = format!("{ENCODER_ID}:{width}x{height}:{}", fnv64(pixels));
    if let Some(entry) = disk.cache.iter().find(|entry| entry.key == key) {
        return Ok(entry.vector.clone());
    }
    let vector = embed_plane(width, height, pixels).map_err(InferenceFailure::Invalid)?;
    if disk.cache.len() >= CACHE_CAP {
        disk.cache.remove(0);
    }
    disk.cache.push(CacheEntry {
        key,
        vector: vector.clone(),
    });
    Ok(vector)
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
    use crate::protocol::{AnnotationLabel, RoiFrameAnnotationPayload};
    use std::fs::File;
    use std::time::{SystemTime, UNIX_EPOCH};
    use tiff::encoder::{colortype, TiffEncoder};

    #[test]
    fn annotations_become_a_reference_set_and_classify_a_new_roi() {
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
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].roi, 2);
        assert_eq!(rows[0].label_id, "low");
        assert!(rows[0].support > 0.0);

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
        write_tiff(&workspace.join("roi").join("Pos0").join("Roi0.tif"), 0);
        write_tiff(&workspace.join("roi").join("Pos0").join("Roi1.tif"), 255);
        write_tiff(&workspace.join("roi").join("Pos0").join("Roi2.tif"), 0);
        let index = serde_json::json!({
            "position": 0,
            "axisOrder": "TCZYX",
            "channelCount": 1,
            "timeCount": 1,
            "zCount": 1,
            "rois": [
                {"roi": 0, "fileName": "Roi0.tif", "bbox": {"roi": 0, "x": 0, "y": 0, "w": 2, "h": 2}},
                {"roi": 1, "fileName": "Roi1.tif", "bbox": {"roi": 1, "x": 0, "y": 0, "w": 2, "h": 2}},
                {"roi": 2, "fileName": "Roi2.tif", "bbox": {"roi": 2, "x": 0, "y": 0, "w": 2, "h": 2}}
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

    fn write_tiff(path: &Path, value: u8) {
        let file = File::create(path).expect("tiff");
        let mut encoder = TiffEncoder::new(file).expect("encoder");
        let image = encoder.new_image::<colortype::Gray8>(2, 2).expect("image");
        image.write_data(&vec![value; 4]).expect("pixels");
    }
}
