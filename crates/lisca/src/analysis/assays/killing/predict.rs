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
use crate::analysis::slide::SlideMapping;
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
        Self { batch_size: 256 }
    }
}

#[derive(Debug, Clone)]
struct FrameBatchItem {
    pos: u32,
    slide_channel: u32,
    roi: u32,
    t: u32,
    pixels: Vec<f64>,
    width: usize,
    height: usize,
}

#[derive(Debug, Clone)]
struct TimeseriesRow {
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
    slide_channel: u32,
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

fn collect_position_frames(
    workspace: &Path,
    slide_channel: u32,
    signal_channel: u32,
    position: u32,
) -> Result<Vec<FrameBatchItem>, String> {
    let pos_dir = match position_dir(workspace, position) {
        Ok(path) => path,
        Err(_) => return Ok(Vec::new()),
    };
    let index = read_position_index(&pos_dir)?;
    validate_channel_index(&index, signal_channel)?;

    let mut frames = Vec::new();

    for roi_crop in &index.rois {
        let stack_path = pos_dir.join(&roi_crop.file_name);
        let stack = RoiStack::load(&stack_path, roi_crop.shape)?;

        for stack_t in 0..index.time_count {
            let frame = roi_frame_2d(&stack, &index.axis_order, stack_t, signal_channel, 0)?;
            let source_t = index.time_indices[stack_t as usize];
            frames.push(FrameBatchItem {
                pos: position,
                slide_channel,
                roi: roi_crop.roi,
                t: source_t,
                width: frame.width,
                height: frame.height,
                pixels: frame.into_vec(),
            });
        }
    }

    Ok(frames)
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

fn write_timeseries_csv(path: &Path, rows: &[TimeseriesRow]) -> Result<(), String> {
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
    mapping: &SlideMapping,
    model_dir: &Path,
    options: PredictOptions,
) -> Result<(), String> {
    run_predict_to(workspace, workspace, mapping, model_dir, options)
}

pub fn run_predict_to(
    workspace: &Path,
    output_workspace: &Path,
    mapping: &SlideMapping,
    model_dir: &Path,
    options: PredictOptions,
) -> Result<(), String> {
    let model_path = model_dir.join("model.onnx");
    if !model_path.is_file() {
        return Err(format!("missing kill model at {}", model_path.display()));
    }

    let mut session = build_kill_session(&model_path)?;
    let input_name = session
        .inputs()
        .first()
        .ok_or("kill model has no inputs")?
        .name()
        .to_string();

    let mut timeseries_by_pos_channel: BTreeMap<(u32, u32), Vec<TimeseriesRow>> = BTreeMap::new();
    let mut prediction_rows: Vec<PredictionRow> = Vec::new();

    for (slide_channel, entry) in mapping {
        for &signal_channel in &entry.signal {
            for position in &entry.positions {
                let frames =
                    collect_position_frames(workspace, *slide_channel, signal_channel, *position)?;
                for chunk in frames.chunks(options.batch_size.max(1)) {
                    let probabilities = run_batch_inference(&mut session, &input_name, chunk)?;
                    for (frame, p_dead) in chunk.iter().zip(probabilities) {
                        timeseries_by_pos_channel
                            .entry((frame.pos, signal_channel))
                            .or_default()
                            .push(TimeseriesRow {
                                pos: frame.pos,
                                roi: frame.roi,
                                t: frame.t,
                                p_dead,
                            });
                        prediction_rows.push(PredictionRow {
                            t: frame.t,
                            roi: frame.roi,
                            p_dead,
                            label: p_dead >= DEAD_LABEL_THRESHOLD,
                            pos: frame.pos,
                            slide_channel: frame.slide_channel,
                        });
                    }
                }
            }
        }
    }

    let timeseries_dir = output_workspace.join("timeseries");
    fs::create_dir_all(&timeseries_dir).map_err(|error| error.to_string())?;
    for ((position, signal_channel), mut rows) in timeseries_by_pos_channel {
        rows.sort_by_key(|row| (row.pos, row.roi, row.t));
        let output = timeseries_dir
            .join(format!("Pos{position}"))
            .join(format!("ch{signal_channel}.csv"));
        write_timeseries_csv(&output, &rows)?;
    }

    prediction_rows.sort_by(|left, right| {
        left.pos
            .cmp(&right.pos)
            .then_with(|| left.slide_channel.cmp(&right.slide_channel))
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
                row.slide_channel.to_string(),
            ]
        })
        .collect::<Vec<_>>();
    write_csv(
        &results_dir.join("predictions.csv"),
        &["t", "crop", "p_dead", "label", "pos", "slide"],
        &prediction_csv_rows,
    )
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
}
