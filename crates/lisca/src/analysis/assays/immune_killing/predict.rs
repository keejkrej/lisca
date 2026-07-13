use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use image::{imageops::FilterType, GrayImage, ImageBuffer, Luma};
use ndarray::{Array, Array1, ArrayView, Axis, Ix4};
use ndarray_stats::QuantileExt;
use ort::session::Session;
use ort::value::Tensor;

use crate::analysis::csv_io::{format_float, write_csv};
use crate::analysis::roi_stack::{
    position_dir, read_position_index, roi_frame_2d, validate_channel_index, RoiStack,
};
use crate::analysis::slide::SlideMapping;

const IMAGE_SIZE: u32 = 224;
const DEAD_LABEL_THRESHOLD: f64 = 0.5;
const IMAGENET_MEAN: [f32; 3] = [0.485, 0.456, 0.406];
const IMAGENET_STD: [f32; 3] = [0.229, 0.224, 0.225];

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

fn resize_to_224(data: &[u8], width: u32, height: u32) -> GrayImage {
    let img = ImageBuffer::<Luma<u8>, Vec<u8>>::from_raw(width, height, data.to_vec())
        .unwrap_or_else(|| ImageBuffer::from_raw(width, height, vec![0; (width * height) as usize]).unwrap());
    image::imageops::resize(&img, IMAGE_SIZE, IMAGE_SIZE, FilterType::Triangle)
}

fn to_nchw_normalized(gray: &GrayImage) -> Vec<f32> {
    let n = (IMAGE_SIZE * IMAGE_SIZE) as usize;
    let normalized = Array1::from_iter(gray.as_raw().iter().map(|&value| value as f32 / 255.0));
    let mut out = vec![0.0f32; 3 * n];
    for channel in 0..3 {
        let offset = channel * n;
        for (index, value) in normalized.iter().enumerate() {
            out[offset + index] = (value - IMAGENET_MEAN[channel]) / IMAGENET_STD[channel];
        }
    }
    out
}

fn binary_logits(logits: &ArrayView<f32, ndarray::IxDyn>) -> Result<(f32, f32), String> {
    match logits.ndim() {
        1 if logits.len() >= 2 => Ok((logits[[0]], logits[[1]])),
        2 if logits.shape()[1] >= 2 => Ok((logits[[0, 0]], logits[[0, 1]])),
        4 => Ok((logits[[0, 0, 0, 0]], logits[[0, 1, 0, 0]])),
        _ => Err(format!(
            "unsupported immune killing logits shape: {:?}",
            logits.shape()
        )),
    }
}

/// P(dead) = P(absent) — label 0 means no surviving cell on the micropattern.
fn dead_probability_from_logits(absent_logit: f32, present_logit: f32) -> f64 {
    let max = absent_logit.max(present_logit);
    let absent_exp = (absent_logit - max).exp();
    let present_exp = (present_logit - max).exp();
    f64::from(absent_exp / (absent_exp + present_exp))
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

        for t in 0..index.time_count {
            let frame = roi_frame_2d(&stack, &index.axis_order, t, signal_channel, 0)?;
            frames.push(FrameBatchItem {
                pos: position,
                slide_channel,
                roi: roi_crop.roi,
                t,
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
        let resized = resize_to_224(&normalized, frame.width as u32, frame.height as u32);
        let nchw = to_nchw_normalized(&resized);
        let offset = index * 3 * IMAGE_SIZE as usize * IMAGE_SIZE as usize;
        batch_data[offset..offset + nchw.len()].copy_from_slice(&nchw);
    }

    let shape: Ix4 = ndarray::Dim([
        batch_len,
        3,
        IMAGE_SIZE as usize,
        IMAGE_SIZE as usize,
    ]);
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
                (
                    logits[[index, 0, 0, 0]],
                    logits[[index, 1, 0, 0]],
                )
            };
            Ok(dead_probability_from_logits(absent_logit, present_logit))
        })
        .collect::<Result<Vec<f64>, String>>()?;
    Ok(predictions)
}

fn write_timeseries_csv(path: &Path, rows: &[TimeseriesRow]) -> Result<(), String> {
    let headers = ["pos", "roi", "t", "p_dead"];
    let csv_rows = rows
        .iter()
        .map(|row| {
            vec![
                row.pos.to_string(),
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

    let mut timeseries_by_channel: BTreeMap<u32, Vec<TimeseriesRow>> = BTreeMap::new();
    let mut prediction_rows: Vec<PredictionRow> = Vec::new();

    for (slide_channel, entry) in mapping {
        for position in &entry.positions {
            let frames = collect_position_frames(
                workspace,
                *slide_channel,
                entry.signal_channel,
                *position,
            )?;
            for chunk in frames.chunks(options.batch_size.max(1)) {
                let probabilities = run_batch_inference(&mut session, &input_name, chunk)?;
                for (frame, p_dead) in chunk.iter().zip(probabilities) {
                    timeseries_by_channel
                        .entry(*slide_channel)
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

    let timeseries_dir = workspace.join("timeseries");
    fs::create_dir_all(&timeseries_dir).map_err(|error| error.to_string())?;
    for (slide_channel, entry) in mapping {
        let mut rows = timeseries_by_channel
            .remove(slide_channel)
            .unwrap_or_default();
        rows.sort_by_key(|row| (row.pos, row.roi, row.t));
        let output = timeseries_dir.join(format!("sc{slide_channel}_ch{}", entry.signal_channel));
        write_timeseries_csv(&output, &rows)?;
    }

    prediction_rows.sort_by(|left, right| {
        left.pos
            .cmp(&right.pos)
            .then_with(|| left.slide_channel.cmp(&right.slide_channel))
            .then_with(|| left.roi.cmp(&right.roi))
            .then_with(|| left.t.cmp(&right.t))
    });

    let results_dir = workspace.join("results");
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
        &["t", "crop", "p_dead", "label", "pos", "slide_channel"],
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
