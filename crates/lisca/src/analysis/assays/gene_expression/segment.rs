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

#[derive(Debug, Clone, PartialEq, Eq)]
struct PositionSegmentResult {
    slide_channel: u32,
    position: u32,
    mask_count: usize,
    skipped: bool,
}

#[derive(Debug, Clone)]
pub struct SegmentOptions {
    pub variation_radius: u32,
    pub gaussian_sigma: f64,
    pub force: bool,
    pub jobs: usize,
}

impl Default for SegmentOptions {
    fn default() -> Self {
        Self {
            variation_radius: 2,
            gaussian_sigma: 1.0,
            force: false,
            jobs: default_jobs(),
        }
    }
}

pub fn run_segment(workspace: &Path, mapping: &SlideMapping, options: &SegmentOptions) -> Result<(), String> {
    let tasks = mapping
        .iter()
        .flat_map(|(slide_channel, entry)| {
            entry.positions.iter().copied().map(|position| {
                (
                    *slide_channel,
                    entry.mask_channel,
                    position,
                )
            })
        })
        .collect::<Vec<_>>();
    if tasks.is_empty() {
        return Err("slide mapping defines no valid positions".to_string());
    }

    let pool = rayon::ThreadPoolBuilder::new()
        .num_threads(options.jobs.max(1))
        .build()
        .map_err(|error| error.to_string())?;

    let results = pool.install(|| {
        tasks
            .par_iter()
            .map(|(slide_channel, mask_channel, position)| {
                run_position_segmentation(
                    workspace,
                    *slide_channel,
                    *mask_channel,
                    *position,
                    options,
                )
            })
            .collect::<Result<Vec<_>, String>>()
    })?;

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

fn run_position_segmentation(
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
            let frame = roi_frame_2d(
                &stack,
                &index.axis_order,
                timepoint,
                mask_channel,
                0,
            )?;
            masks.push(segment_frame(
                &frame,
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

fn write_mask_tif(path: &Path, masks: &[Vec<bool>], width: usize, height: usize) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let file = File::create(path).map_err(|error| error.to_string())?;
    let mut encoder = TiffEncoder::new(file).map_err(|error| error.to_string())?;
    for mask in masks {
        let bytes = mask.iter().map(|value| u8::from(*value)).collect::<Vec<_>>();
        let image = encoder
            .new_image::<colortype::Gray8>(width as u32, height as u32)
            .map_err(|error| error.to_string())?;
        image.write_data(&bytes).map_err(|error| error.to_string())?;
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
                signal_channel: 1,
                mask_channel: 0,
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
}
