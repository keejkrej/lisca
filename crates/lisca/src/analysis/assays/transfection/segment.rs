use std::collections::BTreeMap;
use std::fs::File;
use std::path::Path;

use rayon::prelude::*;
use tiff::encoder::{colortype, TiffEncoder};

use crate::analysis::roi_stack::{
    position_dir, read_position_index, roi_frame_2d, validate_channel_index, RoiStack,
};
use crate::analysis::slide::SlideMapping;

use super::image_ops::segment_frame;
#[cfg(feature = "smart")]
use super::segment_onnx::{resolve_ge_seg_model_dir, OnnxSegmentConfig, OnnxSegmenter};

#[derive(Debug, Clone, PartialEq, Eq)]
struct PositionSegmentResult {
    slide_channel: u32,
    position: u32,
    mask_count: usize,
    skipped: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum SegmentBackend {
    #[default]
    Otsu,
    Onnx,
}

impl SegmentBackend {
    pub fn parse(value: &str) -> Result<Self, String> {
        match value.trim().to_ascii_lowercase().as_str() {
            "otsu" | "classical" | "default" => Ok(Self::Otsu),
            "onnx" | "unet" | "model" => Ok(Self::Onnx),
            other => Err(format!(
                "unknown segment backend {other:?} (expected otsu|onnx)"
            )),
        }
    }
}

#[derive(Debug, Clone)]
pub struct SegmentOptions {
    pub variation_radius: u32,
    pub gaussian_sigma: f64,
    pub force: bool,
    pub jobs: usize,
    pub backend: SegmentBackend,
    /// Explicit model directory (or path to model.onnx).
    /// Falls back to `LISCA_PATTERN_SEG_MODEL` (or legacy `LISCA_GE_SEG_MODEL`).
    pub model_dir: Option<std::path::PathBuf>,
    pub image_size: u32,
    pub threshold: f32,
    pub batch_size: usize,
}

impl Default for SegmentOptions {
    fn default() -> Self {
        Self {
            variation_radius: 2,
            gaussian_sigma: 1.0,
            force: false,
            jobs: default_jobs(),
            backend: SegmentBackend::Otsu,
            model_dir: None,
            image_size: 128,
            threshold: 0.5,
            batch_size: 32,
        }
    }
}

pub fn run_segment(
    workspace: &Path,
    mapping: &SlideMapping,
    options: &SegmentOptions,
) -> Result<(), String> {
    match options.backend {
        SegmentBackend::Otsu => run_segment_otsu(workspace, mapping, options),
        SegmentBackend::Onnx => run_segment_onnx(workspace, mapping, options),
    }
}

fn run_segment_otsu(
    workspace: &Path,
    mapping: &SlideMapping,
    options: &SegmentOptions,
) -> Result<(), String> {
    let tasks = collect_tasks(mapping)?;
    let pool = rayon::ThreadPoolBuilder::new()
        .num_threads(options.jobs.max(1))
        .build()
        .map_err(|error| error.to_string())?;

    let results = pool.install(|| {
        tasks
            .par_iter()
            .map(|(slide_channel, mask_channel, position)| {
                run_position_segmentation_otsu(
                    workspace,
                    *slide_channel,
                    *mask_channel,
                    *position,
                    options,
                )
            })
            .collect::<Result<Vec<_>, String>>()
    })?;

    summarize_results(results)
}

#[cfg(feature = "smart")]
fn run_segment_onnx(
    workspace: &Path,
    mapping: &SlideMapping,
    options: &SegmentOptions,
) -> Result<(), String> {
    let tasks = collect_tasks(mapping)?;
    let model_dir = resolve_ge_seg_model_dir(options.model_dir.as_deref())?;
    let config = OnnxSegmentConfig {
        model_dir,
        image_size: options.image_size,
        threshold: options.threshold,
        fill_holes: true,
        batch_size: options.batch_size,
    };
    let mut segmenter = OnnxSegmenter::open(&config)?;

    let mut results = Vec::with_capacity(tasks.len());
    for (slide_channel, mask_channel, position) in tasks {
        results.push(run_position_segmentation_onnx(
            workspace,
            slide_channel,
            mask_channel,
            position,
            options,
            &mut segmenter,
        )?);
    }
    summarize_results(results)
}

#[cfg(not(feature = "smart"))]
fn run_segment_onnx(
    _workspace: &Path,
    _mapping: &SlideMapping,
    _options: &SegmentOptions,
) -> Result<(), String> {
    Err("ONNX segment backend requires the `smart` feature (ort)".to_string())
}

fn collect_tasks(mapping: &SlideMapping) -> Result<Vec<(u32, u32, u32)>, String> {
    let tasks = mapping
        .iter()
        .flat_map(|(slide_channel, entry)| {
            entry
                .positions
                .iter()
                .copied()
                .map(|position| (*slide_channel, entry.mask, position))
        })
        .collect::<Vec<_>>();
    if tasks.is_empty() {
        return Err("slide mapping defines no valid positions".to_string());
    }
    Ok(tasks)
}

fn summarize_results(results: Vec<PositionSegmentResult>) -> Result<(), String> {
    let mut skipped_positions: BTreeMap<u32, Vec<u32>> = BTreeMap::new();
    let mut masks_written = 0usize;
    for result in results {
        if result.skipped {
            skipped_positions
                .entry(result.slide_channel)
                .or_default()
                .push(result.position);
        } else {
            masks_written += result.mask_count;
        }
    }

    if masks_written == 0 {
        if !skipped_positions.is_empty() {
            let skipped_summary = format_skipped_positions(&skipped_positions);
            return Err(format!(
                "No ROI masks written. Skipped positions: {skipped_summary}"
            ));
        }
        return Err("slide mapping defines no valid positions".to_string());
    }

    Ok(())
}

fn run_position_segmentation_otsu(
    workspace: &Path,
    slide_channel: u32,
    mask_channel: u32,
    position: u32,
    options: &SegmentOptions,
) -> Result<PositionSegmentResult, String> {
    let pos_dir = match position_dir(workspace, position) {
        Ok(path) => path,
        Err(_) => {
            return Ok(PositionSegmentResult {
                slide_channel,
                position,
                mask_count: 0,
                skipped: true,
            });
        }
    };
    let index = read_position_index(&pos_dir)?;
    validate_channel_index(&index, mask_channel)?;
    let mut mask_count = 0usize;

    for roi in &index.rois {
        let output_path = crate::analysis::roi_stack::default_mask_path(
            workspace,
            index.position,
            &roi.file_name,
        );
        if output_path.exists() && !options.force {
            mask_count += 1;
            continue;
        }
        let roi_path = pos_dir.join(&roi.file_name);
        if !roi_path.is_file() {
            return Err(format!(
                "Missing ROI TIFF referenced by index.json: {}",
                roi_path.display()
            ));
        }
        let stack = RoiStack::load(&roi_path, roi.shape)?;
        let width = roi.shape[4] as usize;
        let height = roi.shape[3] as usize;
        let mut masks = Vec::with_capacity(index.time_count as usize);
        for timepoint in 0..index.time_count {
            let frame = roi_frame_2d(&stack, &index.axis_order, timepoint, mask_channel, 0)?;
            masks.push(segment_frame(
                frame,
                options.variation_radius,
                options.gaussian_sigma,
            ));
        }
        write_mask_tif(&output_path, &masks, width, height)?;
        mask_count += 1;
    }
    Ok(PositionSegmentResult {
        slide_channel,
        position,
        mask_count,
        skipped: false,
    })
}

#[cfg(feature = "smart")]
fn run_position_segmentation_onnx(
    workspace: &Path,
    slide_channel: u32,
    mask_channel: u32,
    position: u32,
    options: &SegmentOptions,
    segmenter: &mut OnnxSegmenter,
) -> Result<PositionSegmentResult, String> {
    let pos_dir = match position_dir(workspace, position) {
        Ok(path) => path,
        Err(_) => {
            return Ok(PositionSegmentResult {
                slide_channel,
                position,
                mask_count: 0,
                skipped: true,
            });
        }
    };
    let index = read_position_index(&pos_dir)?;
    validate_channel_index(&index, mask_channel)?;
    let mut mask_count = 0usize;

    for roi in &index.rois {
        let output_path = crate::analysis::roi_stack::default_mask_path(
            workspace,
            index.position,
            &roi.file_name,
        );
        if output_path.exists() && !options.force {
            mask_count += 1;
            continue;
        }
        let roi_path = pos_dir.join(&roi.file_name);
        if !roi_path.is_file() {
            return Err(format!(
                "Missing ROI TIFF referenced by index.json: {}",
                roi_path.display()
            ));
        }
        let stack = RoiStack::load(&roi_path, roi.shape)?;
        let width = roi.shape[4] as usize;
        let height = roi.shape[3] as usize;
        let mut frames = Vec::with_capacity(index.time_count as usize);
        for timepoint in 0..index.time_count {
            frames.push(roi_frame_2d(
                &stack,
                &index.axis_order,
                timepoint,
                mask_channel,
                0,
            )?);
        }
        let masks = segmenter.segment_frames(&frames)?;
        write_mask_tif(&output_path, &masks, width, height)?;
        mask_count += 1;
    }
    Ok(PositionSegmentResult {
        slide_channel,
        position,
        mask_count,
        skipped: false,
    })
}

fn format_skipped_positions(skipped_positions: &BTreeMap<u32, Vec<u32>>) -> String {
    skipped_positions
        .iter()
        .map(|(slide_channel, positions)| {
            let listed = positions
                .iter()
                .map(|position| position.to_string())
                .collect::<Vec<_>>()
                .join(", ");
            format!("slide channel {slide_channel} -> {listed}")
        })
        .collect::<Vec<_>>()
        .join("; ")
}

fn write_mask_tif(
    path: &Path,
    masks: &[Vec<bool>],
    width: usize,
    height: usize,
) -> Result<(), String> {
    // Always write one Gray8 IFD per timepoint with explicit (width, height).
    // Do not collapse singleton spatial dims (W=1 or H=1): loaders match mask
    // page size to the ROI crop size from index.json.
    if width == 0 || height == 0 {
        return Err(format!(
            "mask dimensions must be non-zero, got width={width} height={height}"
        ));
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let file = File::create(path).map_err(|error| error.to_string())?;
    let mut encoder = TiffEncoder::new(file).map_err(|error| error.to_string())?;
    let plane = width
        .checked_mul(height)
        .ok_or_else(|| format!("mask plane size overflow for width={width} height={height}"))?;
    for mask in masks {
        if mask.len() != plane {
            return Err(format!(
                "mask plane length mismatch: expected {plane} (width={width} height={height}), got {}",
                mask.len()
            ));
        }
        let bytes = mask
            .iter()
            .map(|value| u8::from(*value))
            .collect::<Vec<_>>();
        let image = encoder
            .new_image::<colortype::Gray8>(width as u32, height as u32)
            .map_err(|error| error.to_string())?;
        image
            .write_data(&bytes)
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

pub fn default_jobs() -> usize {
    std::thread::available_parallelism()
        .map(usize::from)
        .unwrap_or(1)
        .max(1)
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;
    use crate::analysis::slide::{SlideChannelMapping, SlideMapping};

    fn test_mapping(positions: Vec<u32>) -> SlideMapping {
        let mut mapping = BTreeMap::new();
        mapping.insert(
            0,
            SlideChannelMapping {
                positions,
                signal: vec![1],
                mask: 0,
                sample_name: "test".to_string(),
            },
        );
        mapping
    }

    fn test_workspace(label: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!("lisca-seg-{label}-{}", std::process::id()))
    }

    #[test]
    fn segment_errors_on_empty_mapping() {
        let workspace = test_workspace("empty");
        let _ = std::fs::remove_dir_all(&workspace);
        std::fs::create_dir_all(&workspace).unwrap();
        let mapping = SlideMapping::new();
        let err = run_segment(&workspace, &mapping, &SegmentOptions::default()).unwrap_err();
        assert!(err.contains("no valid positions"));
        let _ = std::fs::remove_dir_all(&workspace);
    }

    #[test]
    fn segment_errors_when_all_positions_missing() {
        let workspace = test_workspace("missing");
        let _ = std::fs::remove_dir_all(&workspace);
        std::fs::create_dir_all(&workspace).unwrap();
        let mapping = test_mapping(vec![1, 2]);
        let err = run_segment(&workspace, &mapping, &SegmentOptions::default()).unwrap_err();
        assert!(err.contains("No ROI masks written"));
        assert!(err.contains("Skipped positions"));
        assert!(err.contains("slide channel 0 -> 1, 2"));
        let _ = std::fs::remove_dir_all(&workspace);
    }

    #[test]
    fn write_mask_tif_preserves_singleton_width() {
        use crate::analysis::roi_stack::MaskStack;

        let dir = test_workspace("mask-w1");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("Roi0.tif");

        let time_count = 5usize;
        let width = 1usize;
        let height = 8usize;
        let masks: Vec<Vec<bool>> = (0..time_count)
            .map(|t| (0..height * width).map(|i| (i + t) % 2 == 0).collect())
            .collect();

        write_mask_tif(&path, &masks, width, height).expect("write mask");
        let loaded = MaskStack::load(&path, time_count as u32, height, width).expect("load mask");
        assert_eq!(loaded.masks.len(), time_count);
        assert_eq!(loaded.masks[0].len(), height * width);
        assert_eq!(loaded.masks[0][0], masks[0][0]);
        assert_eq!(loaded.masks[time_count - 1], masks[time_count - 1]);

        let _ = std::fs::remove_dir_all(&dir);
    }
}
