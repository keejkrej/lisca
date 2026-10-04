use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use ndarray::{Array, Array1, Axis, Ix4};
use ndarray_stats::QuantileExt;
use ort::session::Session;
use ort::value::Tensor;

use crate::analysis::csv_io::{format_float, write_csv};
use crate::analysis::roi_stack::{
    position_dir, read_position_index, roi_frame_2d, validate_channel_index, RoiStack,
};
use crate::analysis::sample::SampleMapping;
use crate::onnx::{
    binary_logits, first_class_probability, resize_to_224, to_nchw_normalized, IMAGE_SIZE,
};

const DEAD_LABEL_THRESHOLD: f64 = 0.5;

#[derive(Debug, Clone)]
pub struct PredictOptions {
    pub batch_size: usize,
}

impl Default for PredictOptions {
    fn default() -> Self {
        // Batch 256 makes the ResNet18 activation tensors hundreds of megabytes.
        // 32 matches transfection segment and stays small on an 8 GB laptop.
        Self { batch_size: 32 }
    }
}

/// Stop and progress hooks for a predict shard. The task scheduler cannot abort
/// `spawn_blocking`, so the batch loop has to notice cancellation itself.
pub struct PredictControl<'a> {
    pub is_cancelled: &'a dyn Fn() -> bool,
    pub on_frames: &'a dyn Fn(u32, u32),
}

#[derive(Debug, PartialEq, Eq)]
pub enum PredictFailure {
    Cancelled,
    Failed(String),
}

impl From<String> for PredictFailure {
    fn from(message: String) -> Self {
        Self::Failed(message)
    }
}

impl From<&str> for PredictFailure {
    fn from(message: &str) -> Self {
        Self::Failed(message.to_string())
    }
}

fn not_cancelled() -> bool {
    false
}

fn ignore_frames(_completed: u32, _total: u32) {}

#[derive(Debug, Clone)]
struct FrameBatchItem {
    pos: u32,
    sample: String,
    signal_channel: u32,
    roi: u32,
    t: u32,
    pixels: Vec<f64>,
    width: usize,
    height: usize,
}

#[derive(Debug, Clone)]
struct TraceRow {
    pos: u32,
    roi: u32,
    t: u32,
    p_dead: f64,
}

#[derive(Debug, Clone)]
struct PredictionRow {
    t: u32,
    roi: u32,
    p_dead: f64,
    label: bool,
    pos: u32,
    sample: String,
}

fn build_kill_session(model_path: &Path) -> Result<Session, String> {
    Session::builder()
        .map_err(|error| error.to_string())?
        .commit_from_file(model_path)
        .map_err(|error| format!("failed to load kill model: {error}"))
}

fn normalize_frame(data: &[f64]) -> Vec<u8> {
    if data.is_empty() {
        return vec![];
    }
    let values = Array1::from_iter(data.iter().copied());
    let min = values.min().copied().unwrap_or(0.0);
    let max = values.max().copied().unwrap_or(0.0);
    let range = max - min;
    data.iter()
        .map(|&value| {
            if range > 0.0 {
                (((value - min) / range) * 255.0).round() as u8
            } else {
                0
            }
        })
        .collect()
}

/// P(dead) = P(absent) — label 0 means no surviving cell on the micropattern.
fn dead_probability_from_logits(absent_logit: f32, present_logit: f32) -> f64 {
    first_class_probability(absent_logit, present_logit)
}

/// `label` follows the mupattern / `clean` contract: `true` means a present
/// (alive) cell — a surviving cell on the micropattern. The model's
/// `p_dead = P(absent)`, so a crop is alive when `p_dead` is below the
/// threshold and dead once it meets or exceeds it.
fn alive_label(p_dead: f64) -> bool {
    p_dead < DEAD_LABEL_THRESHOLD
}

fn count_position_frames(
    workspace: &Path,
    signal_channel: u32,
    position: u32,
) -> Result<u32, PredictFailure> {
    let pos_dir = match position_dir(workspace, position) {
        Ok(path) => path,
        Err(_) => return Ok(0),
    };
    let index = read_position_index(&pos_dir)?;
    validate_channel_index(&index, signal_channel)?;
    let count = index.rois.len().saturating_mul(index.time_count as usize);
    u32::try_from(count).map_err(|error| PredictFailure::Failed(error.to_string()))
}

/// Decoded frames waiting for inference. Filling this for a whole position
/// retains about a gigabyte of `f64` pixels on a typical killing plate, so
/// callers must flush once `limit` frames are buffered.
struct FrameBatch {
    frames: Vec<FrameBatchItem>,
    limit: usize,
}

impl FrameBatch {
    fn new(limit: usize) -> Self {
        let limit = limit.max(1);
        Self {
            frames: Vec::with_capacity(limit),
            limit,
        }
    }

    fn push(&mut self, frame: FrameBatchItem) -> Option<Vec<FrameBatchItem>> {
        self.frames.push(frame);
        if self.frames.len() >= self.limit {
            Some(std::mem::take(&mut self.frames))
        } else {
            None
        }
    }

    fn drain_remainder(&mut self) -> Option<Vec<FrameBatchItem>> {
        if self.frames.is_empty() {
            None
        } else {
            Some(std::mem::take(&mut self.frames))
        }
    }
}

/// Run inference in batches. `completed_offset` / `total` are the shard-wide
/// frame counts so a second channel does not reset the progress bar.
fn run_frame_batches(
    frames: &[FrameBatchItem],
    batch_size: usize,
    completed_offset: u32,
    total: u32,
    is_cancelled: &dyn Fn() -> bool,
    on_frames: &dyn Fn(u32, u32),
    mut infer_batch: impl FnMut(&[FrameBatchItem]) -> Result<Vec<f64>, String>,
) -> Result<Vec<f64>, PredictFailure> {
    let mut probabilities = Vec::with_capacity(frames.len());
    let mut completed = completed_offset;
    for chunk in frames.chunks(batch_size.max(1)) {
        if is_cancelled() {
            return Err(PredictFailure::Cancelled);
        }
        let batch = infer_batch(chunk)?;
        if batch.len() != chunk.len() {
            return Err(PredictFailure::Failed(
                "kill model returned a different number of predictions than frames".to_string(),
            ));
        }
        let chunk_len = u32::try_from(chunk.len()).unwrap_or(u32::MAX);
        completed = completed.saturating_add(chunk_len).min(total);
        probabilities.extend(batch);
        on_frames(completed, total);
    }
    if is_cancelled() {
        return Err(PredictFailure::Cancelled);
    }
    Ok(probabilities)
}

fn run_batch_inference(
    session: &mut Session,
    input_name: &str,
    batch: &[FrameBatchItem],
) -> Result<Vec<f64>, String> {
    let batch_len = batch.len();
    let mut batch_data = vec![0.0f32; batch_len * 3 * IMAGE_SIZE as usize * IMAGE_SIZE as usize];

    for (index, frame) in batch.iter().enumerate() {
        let normalized = normalize_frame(&frame.pixels);
        let resized = resize_to_224(&normalized, frame.width as u32, frame.height as u32)?;
        let nchw = to_nchw_normalized(&resized);
        let offset = index * 3 * IMAGE_SIZE as usize * IMAGE_SIZE as usize;
        batch_data[offset..offset + nchw.len()].copy_from_slice(&nchw);
    }

    let shape: Ix4 = ndarray::Dim([batch_len, 3, IMAGE_SIZE as usize, IMAGE_SIZE as usize]);
    let array = Array::from_shape_vec(shape, batch_data).map_err(|error| error.to_string())?;
    let input_tensor = Tensor::from_array(array).map_err(|error| error.to_string())?;
    let input = ort::inputs![input_name => input_tensor];
    let outputs = session.run(input).map_err(|error| error.to_string())?;
    let logits = if let Some(output) = outputs.get("logits") {
        output.try_extract_array::<f32>()
    } else {
        outputs[0].try_extract_array::<f32>()
    }
    .map_err(|error| error.to_string())?;

    let ndim = logits.ndim();

    let predictions = (0..batch_len)
        .map(|index| {
            let (absent_logit, present_logit) = if ndim == 2 {
                let view = logits.index_axis(Axis(0), index).into_dyn();
                binary_logits(&view)?
            } else {
                (logits[[index, 0, 0, 0]], logits[[index, 1, 0, 0]])
            };
            Ok(dead_probability_from_logits(absent_logit, present_logit))
        })
        .collect::<Result<Vec<f64>, String>>()?;
    Ok(predictions)
}

fn write_trace_csv(path: &Path, rows: &[TraceRow]) -> Result<(), String> {
    let headers = ["roi", "t", "p_dead"];
    let csv_rows = rows
        .iter()
        .map(|row| {
            vec![
                row.roi.to_string(),
                row.t.to_string(),
                format_float(row.p_dead),
            ]
        })
        .collect::<Vec<_>>();
    write_csv(path, &headers, &csv_rows)
}

pub fn run_predict(
    workspace: &Path,
    mapping: &SampleMapping,
    model_dir: &Path,
    options: PredictOptions,
) -> Result<(), String> {
    run_predict_to(workspace, workspace, mapping, model_dir, options)
}

pub fn run_predict_to(
    workspace: &Path,
    output_workspace: &Path,
    mapping: &SampleMapping,
    model_dir: &Path,
    options: PredictOptions,
) -> Result<(), String> {
    run_predict_to_controlled(
        workspace,
        output_workspace,
        mapping,
        model_dir,
        options,
        &PredictControl {
            is_cancelled: &not_cancelled,
            on_frames: &ignore_frames,
        },
    )
    .map_err(|error| match error {
        PredictFailure::Cancelled => "prediction cancelled".to_string(),
        PredictFailure::Failed(message) => message,
    })
}

pub fn run_predict_to_controlled(
    workspace: &Path,
    output_workspace: &Path,
    mapping: &SampleMapping,
    model_dir: &Path,
    options: PredictOptions,
    control: &PredictControl<'_>,
) -> Result<(), PredictFailure> {
    if (control.is_cancelled)() {
        return Err(PredictFailure::Cancelled);
    }

    let mut total_frames = 0u32;
    for sample in mapping {
        for &signal_channel in &sample.signal {
            for position in &sample.positions {
                if (control.is_cancelled)() {
                    return Err(PredictFailure::Cancelled);
                }
                total_frames = total_frames.saturating_add(count_position_frames(
                    workspace,
                    signal_channel,
                    *position,
                )?);
            }
        }
    }
    (control.on_frames)(0, total_frames);
    if (control.is_cancelled)() {
        return Err(PredictFailure::Cancelled);
    }

    let model_path = model_dir.join("model.onnx");
    if !model_path.is_file() {
        return Err(PredictFailure::Failed(format!(
            "missing kill model at {}",
            model_path.display()
        )));
    }

    let mut session = build_kill_session(&model_path)?;
    let input_name = session
        .inputs()
        .first()
        .ok_or("kill model has no inputs")?
        .name()
        .to_string();

    let mut traces_by_pos_channel: BTreeMap<(u32, u32), Vec<TraceRow>> = BTreeMap::new();
    let mut prediction_rows: Vec<PredictionRow> = Vec::new();
    let mut completed_frames = 0u32;
    let mut pending = FrameBatch::new(options.batch_size);
    let mut commit_batch = |frames: Vec<FrameBatchItem>| -> Result<(), PredictFailure> {
        if frames.is_empty() {
            return Ok(());
        }
        let probabilities = run_frame_batches(
            &frames,
            frames.len().max(1),
            completed_frames,
            total_frames,
            control.is_cancelled,
            control.on_frames,
            |chunk| run_batch_inference(&mut session, &input_name, chunk),
        )?;
        let frame_count = u32::try_from(frames.len()).unwrap_or(u32::MAX);
        completed_frames = completed_frames
            .saturating_add(frame_count)
            .min(total_frames);
        for (frame, p_dead) in frames.into_iter().zip(probabilities) {
            traces_by_pos_channel
                .entry((frame.pos, frame.signal_channel))
                .or_default()
                .push(TraceRow {
                    pos: frame.pos,
                    roi: frame.roi,
                    t: frame.t,
                    p_dead,
                });
            prediction_rows.push(PredictionRow {
                t: frame.t,
                roi: frame.roi,
                p_dead,
                label: alive_label(p_dead),
                pos: frame.pos,
                sample: frame.sample,
            });
        }
        Ok(())
    };

    for sample in mapping {
        for &signal_channel in &sample.signal {
            for position in &sample.positions {
                if (control.is_cancelled)() {
                    return Err(PredictFailure::Cancelled);
                }
                let pos_dir = match position_dir(workspace, *position) {
                    Ok(path) => path,
                    Err(_) => continue,
                };
                let index = read_position_index(&pos_dir)?;
                validate_channel_index(&index, signal_channel)?;
                for roi_crop in &index.rois {
                    if (control.is_cancelled)() {
                        return Err(PredictFailure::Cancelled);
                    }
                    // One ROI stack at a time. It is dropped before the next
                    // file is decoded, and frames are inferred every batch
                    // instead of retained for the whole position.
                    let stack = RoiStack::load(&pos_dir.join(&roi_crop.file_name), roi_crop.shape)?;
                    for stack_t in 0..index.time_count {
                        if (control.is_cancelled)() {
                            return Err(PredictFailure::Cancelled);
                        }
                        let frame =
                            roi_frame_2d(&stack, &index.axis_order, stack_t, signal_channel, 0)?;
                        let source_t = index.time_indices[stack_t as usize];
                        if let Some(full) = pending.push(FrameBatchItem {
                            pos: *position,
                            sample: sample.name.clone(),
                            signal_channel,
                            roi: roi_crop.roi,
                            t: source_t,
                            width: frame.width,
                            height: frame.height,
                            pixels: frame.into_vec(),
                        }) {
                            commit_batch(full)?;
                        }
                    }
                }
            }
        }
    }
    if let Some(tail) = pending.drain_remainder() {
        commit_batch(tail)?;
    }

    if (control.is_cancelled)() {
        return Err(PredictFailure::Cancelled);
    }

    let traces_dir = output_workspace.join("traces");
    fs::create_dir_all(&traces_dir).map_err(|error| error.to_string())?;
    for ((position, signal_channel), mut rows) in traces_by_pos_channel {
        rows.sort_by_key(|row| (row.pos, row.roi, row.t));
        let output = traces_dir
            .join(format!("Pos{position}"))
            .join(format!("ch{signal_channel}.csv"));
        write_trace_csv(&output, &rows)?;
    }

    prediction_rows.sort_by(|left, right| {
        left.pos
            .cmp(&right.pos)
            .then_with(|| left.sample.cmp(&right.sample))
            .then_with(|| left.roi.cmp(&right.roi))
            .then_with(|| left.t.cmp(&right.t))
    });

    let results_dir = output_workspace.join("results");
    fs::create_dir_all(&results_dir).map_err(|error| error.to_string())?;
    let prediction_csv_rows = prediction_rows
        .iter()
        .map(|row| {
            vec![
                row.t.to_string(),
                row.roi.to_string(),
                format_float(row.p_dead),
                row.label.to_string().to_lowercase(),
                row.pos.to_string(),
                row.sample.clone(),
            ]
        })
        .collect::<Vec<_>>();
    write_csv(
        &results_dir.join("predictions.csv"),
        &["t", "crop", "p_dead", "label", "pos", "sample"],
        &prediction_csv_rows,
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dead_probability_prefers_absent_label() {
        let probability = dead_probability_from_logits(2.0, 0.0);
        assert!(probability > 0.8);
    }

    #[test]
    fn dead_probability_prefers_present_label() {
        let probability = dead_probability_from_logits(0.0, 2.0);
        assert!(probability < 0.2);
    }

    #[test]
    fn alive_label_true_when_dead_probability_below_threshold() {
        assert!(alive_label(0.1));
        assert!(alive_label(0.49));
        assert!(alive_label(0.0));
    }

    #[test]
    fn alive_label_false_when_dead_probability_meets_threshold() {
        assert!(!alive_label(0.5));
        assert!(!alive_label(0.9));
        assert!(!alive_label(1.0));
    }

    #[test]
    fn controlled_predict_stops_before_loading_a_model() {
        let frames_reported = std::cell::Cell::new(false);
        let error = run_predict_to_controlled(
            Path::new("/missing"),
            Path::new("/missing"),
            &SampleMapping::new(),
            Path::new("/missing"),
            PredictOptions::default(),
            &PredictControl {
                is_cancelled: &|| true,
                on_frames: &|_, _| frames_reported.set(true),
            },
        )
        .expect_err("cancel before work");
        assert_eq!(error, PredictFailure::Cancelled);
        assert!(!frames_reported.get());
    }

    #[test]
    fn frame_batches_stop_before_the_next_batch_and_report_progress() {
        let frames = vec![
            frame_item(0),
            frame_item(1),
            frame_item(2),
            frame_item(3),
            frame_item(4),
        ];
        let batches = std::cell::Cell::new(0);
        let seen = std::cell::RefCell::new(Vec::new());
        let error = run_frame_batches(
            &frames,
            2,
            0,
            5,
            &|| batches.get() >= 1,
            &|completed, total| seen.borrow_mut().push((completed, total)),
            |chunk| {
                batches.set(batches.get() + 1);
                Ok(vec![0.25; chunk.len()])
            },
        )
        .expect_err("stop after the first batch");
        assert_eq!(error, PredictFailure::Cancelled);
        assert_eq!(batches.get(), 1);
        assert_eq!(seen.into_inner(), vec![(2, 5)]);
    }

    fn frame_item(t: u32) -> FrameBatchItem {
        FrameBatchItem {
            pos: 1,
            sample: "sample".to_string(),
            signal_channel: 0,
            roi: 1,
            t,
            pixels: vec![0.0],
            width: 1,
            height: 1,
        }
    }

    #[test]
    fn frame_batch_flushes_at_the_limit_instead_of_retaining_every_frame() {
        let mut pending = FrameBatch::new(2);
        let mut flushed = Vec::new();
        for t in 0..5 {
            if let Some(full) = pending.push(frame_item(t)) {
                assert!(
                    full.len() <= 2,
                    "a flush must not grow past the batch limit"
                );
                flushed.push(full.len());
            }
            assert!(
                pending.frames.len() < 2,
                "unflushed frames must stay under the batch limit"
            );
        }
        let tail = pending.drain_remainder().expect("partial tail");
        assert_eq!(flushed, vec![2, 2]);
        assert_eq!(tail.len(), 1);
        assert!(pending.drain_remainder().is_none());
    }
}
