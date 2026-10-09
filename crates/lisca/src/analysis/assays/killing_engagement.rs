//! Engagement counts for a killing workspace.
//!
//! Tumor cells come from the segmentation channel (brightfield). T cells come
//! from the first signal channel (CMRA membrane). Crops stay in `roi/`. Counts
//! are written under `traces/engagement/` and `results/engagement_*.csv` so a
//! death-reporter run on the same workspace keeps `traces/Pos{n}/ch{m}.csv`.

use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

use crate::analysis::output::collect_csv_outputs;
use crate::analysis::progress::{analysis_progress, run_blocking};
use crate::analysis::roi_stack::{
    position_dir, read_position_index, roi_frame_2d, validate_channel_index,
};
use crate::analysis::sample::{build_sample_mapping, parse_interval_minutes, SampleMapping};
use crate::protocol::{AnalysisCsvFile, AnalysisProgress, AnalysisStage, AssayJsonFile};

const MIN_COMPONENT_PIXELS: usize = 4;
const SIGNAL_SIGMA: f64 = 6.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EngagementCounts {
    pub tumor_cells: u32,
    pub t_cells: u32,
    pub engagements: u32,
}

pub fn tumor_mask(pixels: &[f64]) -> Vec<bool> {
    let Some(threshold) = otsu_threshold(pixels) else {
        return vec![false; pixels.len()];
    };
    let above = pixels
        .iter()
        .map(|value| *value > threshold)
        .collect::<Vec<_>>();
    let above_count = above.iter().filter(|value| **value).count();
    let below_count = pixels.len().saturating_sub(above_count);
    if above_count == 0 || below_count == 0 {
        return vec![false; pixels.len()];
    }
    if above_count <= below_count {
        above
    } else {
        above.into_iter().map(|value| !value).collect()
    }
}

/// Sparse membrane dye. Quiet fields stay empty; a few bright pixels do not.
pub fn tcell_mask(pixels: &[f64]) -> Vec<bool> {
    if pixels.is_empty() {
        return Vec::new();
    }
    let mean = pixels.iter().sum::<f64>() / pixels.len() as f64;
    let variance = pixels
        .iter()
        .map(|value| {
            let delta = *value - mean;
            delta * delta
        })
        .sum::<f64>()
        / pixels.len() as f64;
    let std = variance.sqrt();
    if std == 0.0 {
        return vec![false; pixels.len()];
    }
    let threshold = mean + SIGNAL_SIGMA * std;
    pixels.iter().map(|value| *value > threshold).collect()
}

pub fn count_engagements(
    tumor: &[bool],
    tcells: &[bool],
    width: usize,
    height: usize,
) -> Result<EngagementCounts, String> {
    if width == 0 || height == 0 || tumor.len() != width * height || tcells.len() != tumor.len() {
        return Err(format!(
            "engagement frame is {} tumor / {} t-cell pixels, expected {width}x{height}",
            tumor.len(),
            tcells.len()
        ));
    }
    let tumor_labels = label_components(tumor, width, height);
    let tcell_labels = label_components(tcells, width, height);
    let mut tcell_ids = BTreeSet::new();
    let mut engaged = BTreeSet::new();
    for (index, &label) in tcell_labels.iter().enumerate() {
        if label == 0 {
            continue;
        }
        tcell_ids.insert(label);
        if engaged.contains(&label) {
            continue;
        }
        let x = index % width;
        let y = index / width;
        if touches_tumor(&tumor_labels, width, height, x, y) {
            engaged.insert(label);
        }
    }
    Ok(EngagementCounts {
        tumor_cells: unique_labels(&tumor_labels),
        t_cells: tcell_ids.len() as u32,
        engagements: engaged.len() as u32,
    })
}

pub fn run_sync(workspace: &Path, assay_json: &AssayJsonFile) -> Result<(), String> {
    let interval = parse_interval_minutes(
        assay_json.interval.value,
        Some(assay_json.interval.unit.as_str()),
    )
    .ok_or_else(|| "invalid interval.value/unit in assay.json".to_string())?;
    let mapping = build_sample_mapping(assay_json)?;
    for position in mapping.positions() {
        run_position(workspace, &mapping, position, interval)?;
    }
    write_summary(workspace)
}

pub fn run_position(
    workspace: &Path,
    mapping: &SampleMapping,
    position: u32,
    interval_minutes: f64,
) -> Result<(), String> {
    let pos_dir = position_dir(workspace, position)?;
    let index = read_position_index(&pos_dir)?;
    let mut rows = Vec::new();
    for sample in mapping
        .iter()
        .filter(|sample| sample.positions.contains(&position))
    {
        let signal = *sample.signal.first().ok_or_else(|| {
            format!(
                "sample {} has no signal channel for engagement",
                sample.name
            )
        })?;
        validate_channel_index(&index, sample.segmentation)?;
        validate_channel_index(&index, signal)?;
        for roi_crop in &index.rois {
            let stack = crate::analysis::roi_stack::RoiStack::load(
                &pos_dir.join(&roi_crop.file_name),
                roi_crop.shape,
            )?;
            for stack_t in 0..index.time_count {
                let source_t = index.time_indices[stack_t as usize];
                let tumor =
                    roi_frame_2d(&stack, &index.axis_order, stack_t, sample.segmentation, 0)?;
                let tcells = roi_frame_2d(&stack, &index.axis_order, stack_t, signal, 0)?;
                let counts = count_engagements(
                    &tumor_mask(tumor.as_slice()),
                    &tcell_mask(tcells.as_slice()),
                    tumor.width,
                    tumor.height,
                )?;
                rows.push(EngagementRow {
                    sample: sample.name.clone(),
                    pos: position,
                    roi: roi_crop.roi,
                    t: source_t,
                    minutes: source_t as f64 * interval_minutes,
                    counts,
                });
            }
        }
    }
    if rows.is_empty() {
        return Err(format!("position {position} has no ROI frames to score"));
    }
    rows.sort_by(|left, right| {
        left.sample
            .cmp(&right.sample)
            .then(left.roi.cmp(&right.roi))
            .then(left.t.cmp(&right.t))
    });
    write_rows(&trace_path(workspace, position), &rows)
}

pub fn write_summary(workspace: &Path) -> Result<(), String> {
    let dir = workspace.join("traces/engagement");
    let mut rows = Vec::new();
    if dir.is_dir() {
        let mut paths = fs::read_dir(&dir)
            .map_err(|error| error.to_string())?
            .map(|entry| {
                entry
                    .map(|entry| entry.path())
                    .map_err(|error| error.to_string())
            })
            .collect::<Result<Vec<_>, _>>()?;
        paths.sort();
        for path in paths {
            if path.extension().is_some_and(|ext| ext == "csv") {
                rows.extend(read_rows(&path)?);
            }
        }
    }
    let counts_path = workspace.join("results/engagement_counts.csv");
    write_rows(&counts_path, &rows)?;
    let mut groups = Vec::<SummaryRow>::new();
    for row in &rows {
        if let Some(group) = groups.iter_mut().find(|group| {
            group.sample == row.sample && group.pos == row.pos && group.roi == row.roi
        }) {
            group.frames += 1;
            group.engagements += f64::from(row.counts.engagements);
            group.tumor_cells += f64::from(row.counts.tumor_cells);
            group.t_cells += f64::from(row.counts.t_cells);
        } else {
            groups.push(SummaryRow {
                sample: row.sample.clone(),
                pos: row.pos,
                roi: row.roi,
                frames: 1,
                engagements: f64::from(row.counts.engagements),
                tumor_cells: f64::from(row.counts.tumor_cells),
                t_cells: f64::from(row.counts.t_cells),
            });
        }
    }
    let summary_path = workspace.join("results/engagement_summary.csv");
    if let Some(parent) = summary_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let mut body =
        String::from("sample,pos,roi,frames,engagements_mean,tumor_cells_mean,t_cells_mean\n");
    for group in groups {
        let frames = group.frames as f64;
        body.push_str(&format!(
            "{},{},{},{},{:.4},{:.4},{:.4}\n",
            csv_field(&group.sample),
            group.pos,
            group.roi,
            group.frames,
            group.engagements / frames,
            group.tumor_cells / frames,
            group.t_cells / frames,
        ));
    }
    fs::write(&summary_path, body).map_err(|error| error.to_string())
}

pub async fn run<F>(
    workspace_path: PathBuf,
    request_id: String,
    assay_json: AssayJsonFile,
    update_progress: F,
) -> Result<Vec<AnalysisCsvFile>, String>
where
    F: Fn(AnalysisProgress) + Send + Sync + 'static,
{
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Preparing,
        5.0,
        "Preparing engagement counts",
    ));
    let count_workspace = workspace_path.clone();
    let count_assay = assay_json;
    run_blocking(move || run_sync(&count_workspace, &count_assay))
        .await
        .map_err(|error| format!("engagement analysis failed: {error}"))?;
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Completed,
        100.0,
        "Engagement counts completed",
    ));
    collect_csv_outputs(&workspace_path)
}

struct EngagementRow {
    sample: String,
    pos: u32,
    roi: u32,
    t: u32,
    minutes: f64,
    counts: EngagementCounts,
}

struct SummaryRow {
    sample: String,
    pos: u32,
    roi: u32,
    frames: u32,
    engagements: f64,
    tumor_cells: f64,
    t_cells: f64,
}

fn trace_path(workspace: &Path, position: u32) -> PathBuf {
    workspace
        .join("traces/engagement")
        .join(format!("Pos{position}.csv"))
}

fn write_rows(path: &Path, rows: &[EngagementRow]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let mut body = String::from("sample,pos,roi,t,minutes,tumor_cells,t_cells,engagements\n");
    for row in rows {
        body.push_str(&format!(
            "{},{},{},{},{:.4},{},{},{}\n",
            csv_field(&row.sample),
            row.pos,
            row.roi,
            row.t,
            row.minutes,
            row.counts.tumor_cells,
            row.counts.t_cells,
            row.counts.engagements,
        ));
    }
    fs::write(path, body).map_err(|error| error.to_string())
}

fn read_rows(path: &Path) -> Result<Vec<EngagementRow>, String> {
    let text = fs::read_to_string(path).map_err(|error| format!("{}: {error}", path.display()))?;
    let mut rows = Vec::new();
    for (index, line) in text.lines().enumerate() {
        if index == 0 || line.trim().is_empty() {
            continue;
        }
        let fields = split_csv(line);
        if fields.len() != 8 {
            return Err(format!(
                "{} line {}: expected 8 columns",
                path.display(),
                index + 1
            ));
        }
        rows.push(EngagementRow {
            sample: fields[0].clone(),
            pos: fields[1].parse().map_err(|error| format!("{error}"))?,
            roi: fields[2].parse().map_err(|error| format!("{error}"))?,
            t: fields[3].parse().map_err(|error| format!("{error}"))?,
            minutes: fields[4].parse().map_err(|error| format!("{error}"))?,
            counts: EngagementCounts {
                tumor_cells: fields[5].parse().map_err(|error| format!("{error}"))?,
                t_cells: fields[6].parse().map_err(|error| format!("{error}"))?,
                engagements: fields[7].parse().map_err(|error| format!("{error}"))?,
            },
        });
    }
    Ok(rows)
}

fn split_csv(line: &str) -> Vec<String> {
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut quoted = false;
    let mut chars = line.chars().peekable();
    while let Some(character) = chars.next() {
        if quoted {
            if character == '"' {
                if chars.peek() == Some(&'"') {
                    chars.next();
                    current.push('"');
                } else {
                    quoted = false;
                }
            } else {
                current.push(character);
            }
        } else if character == '"' && current.is_empty() {
            quoted = true;
        } else if character == ',' {
            fields.push(std::mem::take(&mut current));
        } else {
            current.push(character);
        }
    }
    fields.push(current);
    fields
}

fn csv_field(value: &str) -> String {
    if value.contains([',', '"', '\n']) {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

fn otsu_threshold(pixels: &[f64]) -> Option<f64> {
    if pixels.is_empty() {
        return None;
    }
    let mut min = f64::INFINITY;
    let mut max = f64::NEG_INFINITY;
    for value in pixels {
        min = min.min(*value);
        max = max.max(*value);
    }
    if !min.is_finite() || max <= min {
        return None;
    }
    const BINS: usize = 256;
    let mut histogram = [0u32; BINS];
    let scale = (BINS - 1) as f64 / (max - min);
    for value in pixels {
        let bin = ((*value - min) * scale).round() as usize;
        histogram[bin.min(BINS - 1)] += 1;
    }
    let total = pixels.len() as f64;
    let mut sum_all = 0.0;
    for (bin, count) in histogram.iter().enumerate() {
        sum_all += bin as f64 * f64::from(*count);
    }
    let mut sum_background = 0.0;
    let mut weight_background = 0.0;
    let mut best_variance = -1.0;
    let mut best_bin = 0usize;
    for bin in 0..BINS {
        weight_background += f64::from(histogram[bin]);
        if weight_background == 0.0 {
            continue;
        }
        let weight_foreground = total - weight_background;
        if weight_foreground == 0.0 {
            break;
        }
        sum_background += bin as f64 * f64::from(histogram[bin]);
        let mean_background = sum_background / weight_background;
        let mean_foreground = (sum_all - sum_background) / weight_foreground;
        let between =
            weight_background * weight_foreground * (mean_background - mean_foreground).powi(2);
        if between > best_variance {
            best_variance = between;
            best_bin = bin;
        }
    }
    Some(min + best_bin as f64 / scale)
}

fn label_components(mask: &[bool], width: usize, height: usize) -> Vec<u32> {
    let mut labels = vec![0u32; mask.len()];
    let mut sizes = vec![0u32];
    let mut next = 1u32;
    let mut stack = Vec::new();
    for start in 0..mask.len() {
        if !mask[start] || labels[start] != 0 {
            continue;
        }
        stack.clear();
        stack.push(start);
        labels[start] = next;
        let mut size = 0u32;
        while let Some(index) = stack.pop() {
            size += 1;
            let x = index % width;
            let y = index / width;
            for neighbor in neighbors(width, height, x, y) {
                if mask[neighbor] && labels[neighbor] == 0 {
                    labels[neighbor] = next;
                    stack.push(neighbor);
                }
            }
        }
        sizes.push(size);
        next += 1;
    }
    for label in &mut labels {
        if *label != 0 && sizes[*label as usize] < MIN_COMPONENT_PIXELS as u32 {
            *label = 0;
        }
    }
    labels
}

fn neighbors(width: usize, height: usize, x: usize, y: usize) -> impl Iterator<Item = usize> {
    (-1isize..=1).flat_map(move |dy| {
        (-1isize..=1).filter_map(move |dx| {
            if dx == 0 && dy == 0 {
                return None;
            }
            let nx = x as isize + dx;
            let ny = y as isize + dy;
            if nx < 0 || ny < 0 || nx >= width as isize || ny >= height as isize {
                return None;
            }
            Some(ny as usize * width + nx as usize)
        })
    })
}

fn touches_tumor(tumor: &[u32], width: usize, height: usize, x: usize, y: usize) -> bool {
    if tumor[y * width + x] != 0 {
        return true;
    }
    neighbors(width, height, x, y).any(|index| tumor[index] != 0)
}

fn unique_labels(labels: &[u32]) -> u32 {
    labels
        .iter()
        .copied()
        .filter(|label| *label != 0)
        .collect::<BTreeSet<_>>()
        .len() as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    fn paint(width: usize, height: usize, blocks: &[(usize, usize, usize, usize)]) -> Vec<bool> {
        let mut mask = vec![false; width * height];
        for &(x0, y0, x1, y1) in blocks {
            for y in y0..y1 {
                for x in x0..x1 {
                    mask[y * width + x] = true;
                }
            }
        }
        mask
    }

    #[test]
    fn a_touching_t_cell_is_one_engagement() {
        let width = 16;
        let height = 16;
        let tumor = paint(width, height, &[(2, 2, 5, 5)]);
        let tcells = paint(width, height, &[(5, 2, 8, 5), (12, 12, 15, 15)]);
        let counts = count_engagements(&tumor, &tcells, width, height).unwrap();
        assert_eq!(
            counts,
            EngagementCounts {
                tumor_cells: 1,
                t_cells: 2,
                engagements: 1,
            }
        );
    }

    #[test]
    fn separated_cells_are_not_engagements() {
        let tumor = paint(8, 8, &[(0, 0, 3, 3)]);
        let tcells = paint(8, 8, &[(5, 5, 8, 8)]);
        let counts = count_engagements(&tumor, &tcells, 8, 8).unwrap();
        assert_eq!(counts.engagements, 0);
        assert_eq!(counts.t_cells, 1);
    }

    #[test]
    fn a_single_hot_pixel_is_not_a_t_cell() {
        let mut pixels = vec![10.0; 32 * 32];
        pixels[100] = 400.0;
        let mask = tcell_mask(&pixels);
        assert_eq!(mask.iter().filter(|pixel| **pixel).count(), 1);
        let counts = count_engagements(&vec![false; pixels.len()], &mask, 32, 32).unwrap();
        assert_eq!(counts.t_cells, 0);
    }

    #[test]
    fn a_bright_membrane_patch_is_a_t_cell_and_a_quiet_field_is_empty() {
        let mut pixels = vec![10.0; 32 * 32];
        for y in 4..7 {
            for x in 4..7 {
                pixels[y * 32 + x] = 1000.0;
            }
        }
        let mask = tcell_mask(&pixels);
        let counts = count_engagements(&vec![false; pixels.len()], &mask, 32, 32).unwrap();
        assert_eq!(counts.t_cells, 1);

        let quiet = tcell_mask(&vec![12.0; 32 * 32]);
        assert!(quiet.iter().all(|pixel| !pixel));
    }

    #[test]
    fn otsu_keeps_the_minority_cell_patch() {
        let mut bright_on_dark = vec![0.0; 32 * 32];
        for y in 2..6 {
            for x in 2..6 {
                bright_on_dark[y * 32 + x] = 200.0;
            }
        }
        let bright = tumor_mask(&bright_on_dark);
        assert!(bright[2 * 32 + 2]);
        assert!(!bright[0]);

        let mut dark_on_bright = vec![200.0; 32 * 32];
        for y in 2..6 {
            for x in 2..6 {
                dark_on_bright[y * 32 + x] = 0.0;
            }
        }
        let dark = tumor_mask(&dark_on_bright);
        assert!(dark[2 * 32 + 2]);
        assert!(!dark[0]);
    }

    #[test]
    fn missing_roi_directory_fails_before_writing_death_reporter_files() {
        let root = std::env::temp_dir().join(format!(
            "lisca-engagement-missing-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let mapping = SampleMapping(vec![crate::analysis::sample::SampleAnalysis {
            name: "t-cells".into(),
            positions: vec![41],
            signal: vec![1],
            segmentation: 0,
        }]);
        let error = run_position(&root, &mapping, 41, 2.75).unwrap_err();
        assert!(error.contains("No ROI directory"), "{error}");
        assert!(!root.join("traces/Pos41").exists());
        assert!(!root.join("results/predictions.csv").exists());
        fs::remove_dir_all(root).unwrap();
    }
}
