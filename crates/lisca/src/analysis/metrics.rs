use std::path::Path;

use super::roi_stack::{
    default_mask_path, roi_frame_2d, validate_channel_index, MaskStack,
    PositionIndex, RoiStack,
};

#[derive(Debug, Clone)]
pub struct MetricRow {
    pub pos: u32,
    pub roi: u32,
    pub t: u32,
    pub area: u32,
    pub background: f64,
    pub intensity: f64,
    pub corrected: f64,
}

pub fn compute_masked_roi_metrics(
    workspace: &Path,
    pos_dir: &Path,
    index: &PositionIndex,
    _slide_channel: u32,
    signal_channel: u32,
    _mask_channel: u32,
) -> Result<Vec<MetricRow>, String> {
    validate_channel_index(index, signal_channel)?;
    let mut rows = Vec::new();
    for roi in &index.rois {
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
        let mask_path = default_mask_path(workspace, index.position, &roi.file_name);
        let mask_stack = MaskStack::load(&mask_path, index.time_count, height, width)?;

        for timepoint in 0..index.time_count {
            let frame = roi_frame_2d(
                &stack,
                &index.axis_order,
                timepoint,
                signal_channel,
                0,
            )?;
            let mask = &mask_stack.masks[timepoint as usize];
            let mut area = 0u32;
            let mut intensity = 0.0;
            let mut background_sum = 0.0;
            let mut background_count = 0usize;
            for (pixel, masked) in frame.iter().zip(mask.iter()) {
                if *masked {
                    area = area.saturating_add(1);
                    intensity += pixel;
                } else {
                    background_sum += pixel;
                    background_count += 1;
                }
            }
            let background = if background_count == 0 {
                0.0
            } else {
                background_sum / background_count as f64
            };
            rows.push(MetricRow {
                pos: index.position,
                roi: roi.roi,
                t: timepoint,
                area,
                background,
                intensity,
                corrected: intensity - area as f64 * background,
            });
        }
    }
    if rows.is_empty() {
        return Err("No rows produced".to_string());
    }
    rows.sort_by(|left, right| (left.roi, left.t).cmp(&(right.roi, right.t)));
    Ok(rows)
}

#[cfg(test)]
mod tests {
    #[test]
    fn corrected_intensity_matches_formula() {
        let frame = vec![10.0, 20.0, 30.0, 40.0];
        let mask = vec![true, true, false, false];
        let mut area = 0u32;
        let mut intensity = 0.0;
        let mut background_sum = 0.0;
        let mut background_count = 0usize;
        for (pixel, masked) in frame.iter().zip(mask.iter()) {
            if *masked {
                area += 1;
                intensity += pixel;
            } else {
                background_sum += pixel;
                background_count += 1;
            }
        }
        let background = background_sum / background_count as f64;
        let corrected = intensity - area as f64 * background;
        assert_eq!(area, 2);
        assert!((intensity - 30.0).abs() < 1e-9);
        assert!((background - 35.0).abs() < 1e-9);
        assert!((corrected - (-40.0)).abs() < 1e-9);
    }
}
