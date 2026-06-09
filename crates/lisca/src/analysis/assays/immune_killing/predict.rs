use std::fs;
use std::path::Path;

use image::{imageops::FilterType, GrayImage, ImageBuffer, Luma};
use ndarray::{Array, Ix4};
use ort::session::Session;
use ort::value::Tensor;

use crate::analysis::csv_io::write_csv;
use crate::analysis::roi_stack::{
    position_dir, read_position_index, roi_frame_2d, validate_channel_index, RoiStack,
};
use crate::analysis::slide::SlideMapping;

const IMAGE_SIZE: u32 = 224;
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

struct FrameBatchItem {
    pos: u32,
    slide_channel: u32,
    crop: u32,
    t: u32,
    pixels: Vec<f64>,
    width: usize,
    height: usize,
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
    let (min, max) = data
        .iter()
        .fold((data[0], data[0]), |(min, max), &value| (min.min(value), max.max(value)));
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
    let mut out = vec![0.0f32; 3 * n];
    for (index, &value) in gray.as_raw().iter().enumerate() {
        let normalized = value as f32 / 255.0;
        for channel in 0..3 {
            out[channel * n + index] = (normalized - IMAGENET_MEAN[channel]) / IMAGENET_STD[channel];
        }
    }
    out
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
            let pixels = roi_frame_2d(&stack, &index.axis_order, t, signal_channel, 0)?;
            let y_axis = index.axis_order.find('Y').ok_or("missing Y axis")?;
            let x_axis = index.axis_order.find('X').ok_or("missing X axis")?;
            frames.push(FrameBatchItem {
                pos: position,
                slide_channel,
                crop: roi_crop.roi,
                t,
                pixels,
                width: stack.shape[x_axis],
                height: stack.shape[y_axis],
            });
        }
    }

    Ok(frames)
}

fn run_batch_inference(
    session: &mut Session,
    input_name: &str,
    batch: &[FrameBatchItem],
) -> Result<Vec<bool>, String> {
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
    let logits = outputs[0]
        .try_extract_array::<f32>()
        .map_err(|error| error.to_string())?;

    let ndim = logits.ndim();
    let num_classes = if ndim >= 2 {
        logits.shape()[ndim - 1]
    } else {
        2
    };

    let mut predictions = Vec::with_capacity(batch_len);
    for index in 0..batch_len {
        let mut max_idx = 0;
        let mut max_val = if ndim == 2 {
            logits[[index, 0]]
        } else {
            logits[[index, 0, 0, 0]]
        };
        for class_index in 1..num_classes {
            let value = if ndim == 2 {
                logits[[index, class_index]]
            } else {
                logits[[index, class_index, 0, 0]]
            };
            if value > max_val {
                max_val = value;
                max_idx = class_index;
            }
        }
        predictions.push(max_idx == 1);
    }
    Ok(predictions)
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

    let mut rows: Vec<Vec<String>> = Vec::new();
    for (slide_channel, entry) in mapping {
        for position in &entry.positions {
            let frames = collect_position_frames(
                workspace,
                *slide_channel,
                entry.signal_channel,
                *position,
            )?;
            for chunk in frames.chunks(options.batch_size.max(1)) {
                let predictions = run_batch_inference(&mut session, &input_name, chunk)?;
                for (frame, label) in chunk.iter().zip(predictions) {
                    rows.push(vec![
                        frame.t.to_string(),
                        frame.crop.to_string(),
                        label.to_string().to_lowercase(),
                        frame.pos.to_string(),
                        frame.slide_channel.to_string(),
                    ]);
                }
            }
        }
    }

    rows.sort_by(|left, right| {
        left[3]
            .parse::<u32>()
            .unwrap_or(0)
            .cmp(&right[3].parse::<u32>().unwrap_or(0))
            .then_with(|| {
                left[4]
                    .parse::<u32>()
                    .unwrap_or(0)
                    .cmp(&right[4].parse::<u32>().unwrap_or(0))
            })
            .then_with(|| left[1].parse::<u32>().unwrap_or(0).cmp(&right[1].parse::<u32>().unwrap_or(0)))
            .then_with(|| left[0].parse::<u32>().unwrap_or(0).cmp(&right[0].parse::<u32>().unwrap_or(0)))
    });

    let results_dir = workspace.join("results");
    fs::create_dir_all(&results_dir).map_err(|error| error.to_string())?;
    write_csv(
        &results_dir.join("predictions.csv"),
        &["t", "crop", "label", "pos", "slide_channel"],
        &rows,
    )
}
