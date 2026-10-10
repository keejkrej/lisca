//! Engagement counts for a killing workspace.
//!
//! Tumor cells come from the segmentation channel (brightfield). Engagers come
//! from the first signal channel (CMRA). Every ROI in a position shares one
//! fluorescence scale: the background, plus a fixed number of noise widths.
//! A peanut of two touching engagers is split into two circles. Counts are
//! written under `analysis/Pos{n}/engagement.csv` and
//! `results/<sample>/engagement.xlsx` so a death-reporter run on the same
//! workspace keeps `analysis/Pos{n}/ch{m}.csv` and `results/<sample>/traces.xlsx`.

use std::cmp::Ordering;
use std::collections::{BTreeSet, BinaryHeap};
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
/// Engagers on `killing_tcell` are about this many pixels across.
const ENGAGER_DIAMETER_PX: f64 = 10.0;
/// How many robust-noise widths above the shared background a pixel must sit.
const GLOBAL_NOISE_SIGMAS: f64 = 8.0;
/// Two seeds closer than this fraction of the diameter are one cell, not a peanut.
const SEED_SPACING_FRACTION: f64 = 0.55;

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

/// One intensity scale for every field in a position.
///
/// `low` is the shared background. `threshold` sits a fixed number of noise
/// widths above it. Crops are compared to this pair. They are not stretched
/// to their own minimum and maximum, so a field with no engager stays empty.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FluorescenceScale {
    pub low: f64,
    pub threshold: f64,
}

/// Histogram of fluorescence values in `[0, 65535]`. One scale for a position.
#[derive(Clone)]
pub struct FluorescenceHistogram {
    bins: Vec<u32>,
    count: u64,
}

impl FluorescenceHistogram {
    pub fn new() -> Self {
        Self {
            bins: vec![0; 65536],
            count: 0,
        }
    }

    pub fn sample(&mut self, pixels: &[f64]) {
        for (index, value) in pixels.iter().enumerate() {
            if index % 4 != 0 || !value.is_finite() || *value < 0.0 {
                continue;
            }
            let bin = (*value).round() as usize;
            if bin >= self.bins.len() {
                continue;
            }
            self.bins[bin] += 1;
            self.count += 1;
        }
    }

    pub fn scale(&self) -> FluorescenceScale {
        if self.count == 0 {
            return FluorescenceScale {
                low: 0.0,
                threshold: f64::MAX,
            };
        }
        let low = percentile_bin(&self.bins, self.count, 0.5);
        let mut deviations = vec![0u32; self.bins.len()];
        for (bin, count) in self.bins.iter().copied().enumerate() {
            if count == 0 {
                continue;
            }
            let deviation = (bin as f64 - low).abs().round() as usize;
            let slot = deviation.min(deviations.len() - 1);
            deviations[slot] = deviations[slot].saturating_add(count);
        }
        let mad = percentile_bin(&deviations, self.count, 0.5);
        let sigma = 1.4826 * mad;
        let threshold = if sigma == 0.0 {
            low
        } else {
            low + GLOBAL_NOISE_SIGMAS * sigma
        };
        FluorescenceScale { low, threshold }
    }
}

impl Default for FluorescenceHistogram {
    fn default() -> Self {
        Self::new()
    }
}

fn percentile_bin(bins: &[u32], count: u64, quantile: f64) -> f64 {
    if count == 0 {
        return 0.0;
    }
    let target = ((count as f64 - 1.0) * quantile).round() as u64;
    let mut seen = 0u64;
    for (bin, count) in bins.iter().copied().enumerate() {
        seen += u64::from(count);
        if seen > target {
            return bin as f64;
        }
    }
    0.0
}

pub fn mask_with_scale(pixels: &[f64], scale: FluorescenceScale) -> Vec<bool> {
    pixels
        .iter()
        .map(|value| value.is_finite() && *value > scale.threshold)
        .collect()
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
    let tcell_labels = split_round_components(tcells, width, height, ENGAGER_DIAMETER_PX);
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
    write_summary(workspace, &mapping)
}

pub fn run_position(
    workspace: &Path,
    mapping: &SampleMapping,
    position: u32,
    interval_minutes: f64,
) -> Result<(), String> {
    let pos_dir = position_dir(workspace, position)?;
    let index = read_position_index(&pos_dir)?;
    let owners: Vec<_> = mapping
        .iter()
        .filter(|sample| sample.positions.contains(&position))
        .collect();
    let sample = match owners.as_slice() {
        [sample] => *sample,
        [] => return Err(format!("no sample in assay.json lists Pos{position}")),
        _ => return Err(format!("Pos{position} is listed by more than one sample")),
    };
    let mut rows = Vec::new();
    let signal = *sample.signal.first().ok_or_else(|| {
        format!(
            "sample {} has no signal channel for engagement",
            sample.name
        )
    })?;
    validate_channel_index(&index, sample.segmentation)?;
    validate_channel_index(&index, signal)?;
    let mut histogram = FluorescenceHistogram::new();
    for roi_crop in &index.rois {
        let stack = crate::analysis::roi_stack::RoiStack::load(
            &pos_dir.join(&roi_crop.file_name),
            roi_crop.shape,
        )?;
        for stack_t in 0..index.time_count {
            let signal_frame = roi_frame_2d(&stack, &index.axis_order, stack_t, signal, 0)?;
            histogram.sample(signal_frame.as_slice());
        }
    }
    let scale = histogram.scale();
    for roi_crop in &index.rois {
        let stack = crate::analysis::roi_stack::RoiStack::load(
            &pos_dir.join(&roi_crop.file_name),
            roi_crop.shape,
        )?;
        for stack_t in 0..index.time_count {
            let source_t = index.time_indices[stack_t as usize];
            let tumor = roi_frame_2d(&stack, &index.axis_order, stack_t, sample.segmentation, 0)?;
            let tcells = roi_frame_2d(&stack, &index.axis_order, stack_t, signal, 0)?;
            let counts = count_engagements(
                &tumor_mask(tumor.as_slice()),
                &mask_with_scale(tcells.as_slice(), scale),
                tumor.width,
                tumor.height,
            )?;
            rows.push(EngagementRow {
                pos: position,
                roi: roi_crop.roi,
                t: source_t,
                minutes: source_t as f64 * interval_minutes,
                counts,
            });
        }
    }
    if rows.is_empty() {
        return Err(format!("position {position} has no ROI frames to score"));
    }
    rows.sort_by(|left, right| left.roi.cmp(&right.roi).then(left.t.cmp(&right.t)));
    write_rows(&trace_path(workspace, position), &rows)
}

pub fn write_summary(workspace: &Path, mapping: &SampleMapping) -> Result<(), String> {
    let csvs = discover_engagement_csvs(&workspace.join("analysis"))?;
    let dirnames = crate::analysis::sample::sample_pack_dirnames(mapping);
    let mut traces: std::collections::BTreeMap<usize, Vec<Vec<String>>> =
        std::collections::BTreeMap::new();
    let mut summaries: std::collections::BTreeMap<usize, Vec<Vec<String>>> =
        std::collections::BTreeMap::new();

    for path in csvs {
        let position = engagement_position(&path)?;
        let sample = mapping
            .iter()
            .position(|sample| sample.positions.contains(&position))
            .ok_or_else(|| format!("No sample owns Pos{position} ({})", path.display()))?;
        let rows = read_rows(&path, position)?;
        let summary_rows = summarize_rows(&rows);
        let summary_path = path
            .parent()
            .ok_or_else(|| format!("engagement csv has no directory: {}", path.display()))?
            .join("engagement_summary.csv");
        write_summary_csv(&summary_path, &summary_rows)?;
        for row in &rows {
            traces.entry(sample).or_default().push(trace_xlsx_row(row));
        }
        for row in &summary_rows {
            summaries
                .entry(sample)
                .or_default()
                .push(summary_xlsx_row(row));
        }
    }

    publish_sample_xlsx(
        workspace,
        &dirnames,
        &mut traces,
        "engagement",
        &[
            "pos",
            "roi",
            "t",
            "minutes",
            "tumor_cells",
            "t_cells",
            "engagements",
        ],
    )?;
    publish_sample_xlsx(
        workspace,
        &dirnames,
        &mut summaries,
        "engagement_summary",
        &[
            "pos",
            "roi",
            "frames",
            "engagements_mean",
            "tumor_cells_mean",
            "t_cells_mean",
        ],
    )
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
    pos: u32,
    roi: u32,
    t: u32,
    minutes: f64,
    counts: EngagementCounts,
}

struct SummaryRow {
    pos: u32,
    roi: u32,
    frames: u32,
    engagements: f64,
    tumor_cells: f64,
    t_cells: f64,
}

fn trace_path(workspace: &Path, position: u32) -> PathBuf {
    workspace
        .join("analysis")
        .join(format!("Pos{position}"))
        .join("engagement.csv")
}

fn write_rows(path: &Path, rows: &[EngagementRow]) -> Result<(), String> {
    let headers = [
        "roi",
        "t",
        "minutes",
        "tumor_cells",
        "t_cells",
        "engagements",
    ];
    let body = rows
        .iter()
        .map(|row| {
            vec![
                row.roi.to_string(),
                row.t.to_string(),
                format!("{:.4}", row.minutes),
                row.counts.tumor_cells.to_string(),
                row.counts.t_cells.to_string(),
                row.counts.engagements.to_string(),
            ]
        })
        .collect::<Vec<_>>();
    crate::analysis::csv_io::write_csv_only(path, &headers, &body)
}

fn read_rows(path: &Path, position: u32) -> Result<Vec<EngagementRow>, String> {
    let (headers, rows) = crate::analysis::csv_io::read_csv(path)?;
    let column = |name: &str| {
        crate::analysis::csv_io::column_index(&headers, name)
            .ok_or_else(|| format!("{} is missing {name}", path.display()))
    };
    let roi = column("roi")?;
    let t = column("t")?;
    let minutes = column("minutes")?;
    let tumor_cells = column("tumor_cells")?;
    let t_cells = column("t_cells")?;
    let engagements = column("engagements")?;
    let mut parsed = Vec::with_capacity(rows.len());
    for row in &rows {
        let cell = |index: usize| -> Result<&str, String> {
            row.get(index)
                .map(String::as_str)
                .ok_or_else(|| format!("{} has a short row", path.display()))
        };
        let number = |index: usize| -> Result<u32, String> {
            cell(index)?
                .parse()
                .map_err(|error| format!("{}: {error}", path.display()))
        };
        parsed.push(EngagementRow {
            pos: position,
            roi: number(roi)?,
            t: number(t)?,
            minutes: cell(minutes)?
                .parse()
                .map_err(|error| format!("{}: {error}", path.display()))?,
            counts: EngagementCounts {
                tumor_cells: number(tumor_cells)?,
                t_cells: number(t_cells)?,
                engagements: number(engagements)?,
            },
        });
    }
    Ok(parsed)
}

fn summarize_rows(rows: &[EngagementRow]) -> Vec<SummaryRow> {
    let mut groups = Vec::<SummaryRow>::new();
    for row in rows {
        if let Some(group) = groups
            .iter_mut()
            .find(|group| group.pos == row.pos && group.roi == row.roi)
        {
            group.frames += 1;
            group.engagements += f64::from(row.counts.engagements);
            group.tumor_cells += f64::from(row.counts.tumor_cells);
            group.t_cells += f64::from(row.counts.t_cells);
        } else {
            groups.push(SummaryRow {
                pos: row.pos,
                roi: row.roi,
                frames: 1,
                engagements: f64::from(row.counts.engagements),
                tumor_cells: f64::from(row.counts.tumor_cells),
                t_cells: f64::from(row.counts.t_cells),
            });
        }
    }
    groups
}

fn write_summary_csv(path: &Path, rows: &[SummaryRow]) -> Result<(), String> {
    let headers = [
        "roi",
        "frames",
        "engagements_mean",
        "tumor_cells_mean",
        "t_cells_mean",
    ];
    let body = rows
        .iter()
        .map(|row| {
            let frames = row.frames as f64;
            vec![
                row.roi.to_string(),
                row.frames.to_string(),
                format!("{:.4}", row.engagements / frames),
                format!("{:.4}", row.tumor_cells / frames),
                format!("{:.4}", row.t_cells / frames),
            ]
        })
        .collect::<Vec<_>>();
    crate::analysis::csv_io::write_csv_only(path, &headers, &body)
}

fn trace_xlsx_row(row: &EngagementRow) -> Vec<String> {
    vec![
        row.pos.to_string(),
        row.roi.to_string(),
        row.t.to_string(),
        format!("{:.4}", row.minutes),
        row.counts.tumor_cells.to_string(),
        row.counts.t_cells.to_string(),
        row.counts.engagements.to_string(),
    ]
}

fn summary_xlsx_row(row: &SummaryRow) -> Vec<String> {
    let frames = row.frames as f64;
    vec![
        row.pos.to_string(),
        row.roi.to_string(),
        row.frames.to_string(),
        format!("{:.4}", row.engagements / frames),
        format!("{:.4}", row.tumor_cells / frames),
        format!("{:.4}", row.t_cells / frames),
    ]
}

fn publish_sample_xlsx(
    workspace: &Path,
    dirnames: &std::collections::BTreeMap<usize, String>,
    frames: &mut std::collections::BTreeMap<usize, Vec<Vec<String>>>,
    kind: &str,
    headers: &[&str],
) -> Result<(), String> {
    if frames.is_empty() {
        return Err(format!("no engagement rows to publish as {kind}.xlsx"));
    }
    for (sample, rows) in frames.iter_mut() {
        let dirname = dirnames
            .get(sample)
            .ok_or_else(|| format!("no results folder for sample {sample}"))?;
        rows.sort_by(|left, right| {
            let number = |row: &[String], index: usize| {
                row.get(index)
                    .and_then(|value| value.parse::<i64>().ok())
                    .unwrap_or(0)
            };
            number(left, 0)
                .cmp(&number(right, 0))
                .then(number(left, 1).cmp(&number(right, 1)))
                .then(number(left, 2).cmp(&number(right, 2)))
        });
        let output = workspace
            .join("results")
            .join(dirname)
            .join(format!("{kind}.xlsx"));
        crate::analysis::export::write_xlsx_only(&output, headers, rows)?;
    }
    Ok(())
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
    for (bin, count) in histogram.iter().enumerate() {
        weight_background += f64::from(*count);
        if weight_background == 0.0 {
            continue;
        }
        let weight_foreground = total - weight_background;
        if weight_foreground == 0.0 {
            break;
        }
        sum_background += bin as f64 * f64::from(*count);
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

/// Split a peanut of two touching engagers into two circles.
///
/// Seeds are peaks of the distance to the background, kept at least half a
/// diameter apart. A watershed from those peaks cuts the waist.
pub fn split_round_components(
    mask: &[bool],
    width: usize,
    height: usize,
    diameter_px: f64,
) -> Vec<u32> {
    if mask.len() != width.saturating_mul(height) || width == 0 || height == 0 {
        return vec![0; mask.len()];
    }
    let distance = distance_to_background(mask, width, height);
    let spacing = (diameter_px * SEED_SPACING_FRACTION).max(1.0);
    // A one-pixel tip has distance about 1. Real centers sit near half the diameter.
    let min_distance = (diameter_px * 0.25).max(1.0);
    let seeds = engager_seeds(&distance, mask, width, height, spacing, min_distance);
    let mut labels = if seeds.is_empty() {
        label_components(mask, width, height)
    } else {
        let mut labels = watershed(&distance, mask, width, height, &seeds);
        drop_small_components(&mut labels, MIN_COMPONENT_PIXELS);
        labels
    };
    keep_diameter(&mut labels, diameter_px);
    labels
}

fn distance_to_background(mask: &[bool], width: usize, height: usize) -> Vec<f64> {
    let inf = 1.0e15;
    let mut grid = vec![inf; mask.len()];
    for (index, on) in mask.iter().enumerate() {
        if !on {
            grid[index] = 0.0;
        }
    }
    let mut horizontal = vec![0.0; mask.len()];
    for y in 0..height {
        let start = y * width;
        let row = squared_distance_1d(&grid[start..start + width]);
        horizontal[start..start + width].copy_from_slice(&row);
    }
    let mut squared = vec![0.0; mask.len()];
    let mut column = vec![0.0; height];
    for x in 0..width {
        for y in 0..height {
            column[y] = horizontal[y * width + x];
        }
        let transformed = squared_distance_1d(&column);
        for y in 0..height {
            squared[y * width + x] = transformed[y];
        }
    }
    squared
        .into_iter()
        .enumerate()
        .map(|(index, value)| if mask[index] { value.sqrt() } else { 0.0 })
        .collect()
}

fn squared_distance_1d(values: &[f64]) -> Vec<f64> {
    let n = values.len();
    if n == 0 {
        return Vec::new();
    }
    let mut envelope = vec![0usize; n];
    let mut bounds = vec![0.0; n + 1];
    let mut k = 0usize;
    envelope[0] = 0;
    bounds[0] = f64::NEG_INFINITY;
    bounds[1] = f64::INFINITY;
    for q in 1..n {
        let mut intersection = parabola_intersection(values, envelope[k], q);
        while intersection <= bounds[k] {
            k -= 1;
            intersection = parabola_intersection(values, envelope[k], q);
        }
        k += 1;
        envelope[k] = q;
        bounds[k] = intersection;
        bounds[k + 1] = f64::INFINITY;
    }
    k = 0;
    let mut distance = vec![0.0; n];
    for (q, slot) in distance.iter_mut().enumerate() {
        while bounds[k + 1] < q as f64 {
            k += 1;
        }
        let origin = envelope[k] as f64;
        let delta = q as f64 - origin;
        *slot = delta * delta + values[envelope[k]];
    }
    distance
}

fn parabola_intersection(values: &[f64], left: usize, right: usize) -> f64 {
    let left_f = left as f64;
    let right_f = right as f64;
    ((values[right] + right_f * right_f) - (values[left] + left_f * left_f))
        / (2.0 * right_f - 2.0 * left_f)
}

fn engager_seeds(
    distance: &[f64],
    mask: &[bool],
    width: usize,
    height: usize,
    spacing: f64,
    min_distance: f64,
) -> Vec<usize> {
    let mut peaks = Vec::new();
    for index in 0..mask.len() {
        if !mask[index] || distance[index] < min_distance {
            continue;
        }
        let x = index % width;
        let y = index / width;
        let is_peak = neighbors(width, height, x, y)
            .all(|neighbor| !mask[neighbor] || distance[neighbor] <= distance[index]);
        if is_peak {
            peaks.push(index);
        }
    }
    peaks.sort_by(|left, right| {
        distance[*right]
            .partial_cmp(&distance[*left])
            .unwrap_or(Ordering::Equal)
            .then(left.cmp(right))
    });
    let spacing_sq = spacing * spacing;
    let mut seeds = Vec::new();
    for peak in peaks {
        let x = peak % width;
        let y = peak / width;
        let crowded = seeds.iter().any(|seed: &usize| {
            let sx = seed % width;
            let sy = seed / width;
            let dx = x as f64 - sx as f64;
            let dy = y as f64 - sy as f64;
            dx * dx + dy * dy < spacing_sq
        });
        if !crowded {
            seeds.push(peak);
        }
    }
    seeds
}

#[derive(Clone, Copy, Eq, PartialEq)]
struct Flood {
    dist_milli: i64,
    index: usize,
    label: u32,
}

impl Ord for Flood {
    fn cmp(&self, other: &Self) -> Ordering {
        self.dist_milli
            .cmp(&other.dist_milli)
            .then(other.index.cmp(&self.index))
            .then(self.label.cmp(&other.label))
    }
}

impl PartialOrd for Flood {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn watershed(
    distance: &[f64],
    mask: &[bool],
    width: usize,
    height: usize,
    seeds: &[usize],
) -> Vec<u32> {
    let mut labels = vec![0u32; mask.len()];
    let mut heap = BinaryHeap::new();
    for (offset, seed) in seeds.iter().copied().enumerate() {
        let label = (offset + 1) as u32;
        labels[seed] = label;
        heap.push(Flood {
            dist_milli: (distance[seed] * 1000.0) as i64,
            index: seed,
            label,
        });
    }
    while let Some(item) = heap.pop() {
        if labels[item.index] != 0 && labels[item.index] != item.label {
            continue;
        }
        labels[item.index] = item.label;
        let x = item.index % width;
        let y = item.index / width;
        for neighbor in neighbors(width, height, x, y) {
            if !mask[neighbor] || labels[neighbor] != 0 {
                continue;
            }
            labels[neighbor] = item.label;
            heap.push(Flood {
                dist_milli: (distance[neighbor] * 1000.0) as i64,
                index: neighbor,
                label: item.label,
            });
        }
    }
    labels
}

fn keep_diameter(labels: &mut [u32], diameter_px: f64) {
    let min_diameter = diameter_px * 0.7;
    let max_diameter = diameter_px * 1.3;
    let mut areas = Vec::new();
    for label in labels.iter().copied() {
        if label == 0 {
            continue;
        }
        let slot = label as usize;
        if areas.len() <= slot {
            areas.resize(slot + 1, 0usize);
        }
        areas[slot] += 1;
    }
    for label in labels.iter_mut() {
        let area = areas.get(*label as usize).copied().unwrap_or(0);
        let diameter = equivalent_diameter(area);
        if *label != 0 && (diameter < min_diameter || diameter > max_diameter) {
            *label = 0;
        }
    }
}

fn equivalent_diameter(area: usize) -> f64 {
    if area == 0 {
        return 0.0;
    }
    2.0 * (area as f64 / std::f64::consts::PI).sqrt()
}

fn drop_small_components(labels: &mut [u32], min_pixels: usize) {
    let mut sizes = Vec::new();
    for label in labels.iter().copied() {
        if label == 0 {
            continue;
        }
        let slot = label as usize;
        if sizes.len() <= slot {
            sizes.resize(slot + 1, 0usize);
        }
        sizes[slot] += 1;
    }
    for label in labels.iter_mut() {
        if *label != 0 && sizes.get(*label as usize).copied().unwrap_or(0) < min_pixels {
            *label = 0;
        }
    }
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

pub fn run_plot_traces(
    workspace: &Path,
    mapping: &SampleMapping,
    interval_minutes: f64,
) -> Result<(), String> {
    if interval_minutes <= 0.0 {
        return Err(format!("interval must be > 0, got {interval_minutes}"));
    }
    let csvs = discover_engagement_csvs(&workspace.join("analysis"))?;
    let panels = load_engagement_panels(&csvs, "t_cells", mapping)?;
    if panels.is_empty() {
        return Err("no engagement traces to plot".to_string());
    }
    let dirnames = crate::analysis::sample::sample_pack_dirnames(mapping);
    crate::analysis::plot::write_per_sample_metric_plots(
        &panels,
        |sample| {
            let dirname = dirnames
                .get(&sample)
                .map(String::as_str)
                .unwrap_or("sample");
            workspace.join("results").join(dirname)
        },
        "engagement_traces",
        "engagers",
        interval_minutes,
        mapping,
    )
}

fn discover_engagement_csvs(dir: &Path) -> Result<Vec<PathBuf>, String> {
    if !dir.is_dir() {
        return Err(format!("Expected engagement traces at {}", dir.display()));
    }
    let mut csvs = Vec::new();
    for entry in fs::read_dir(dir).map_err(|error| error.to_string())? {
        let pos_dir = entry.map_err(|error| error.to_string())?.path();
        if !pos_dir.is_dir() {
            continue;
        }
        let Some(name) = pos_dir.file_name().and_then(|name| name.to_str()) else {
            continue;
        };
        if !(name.starts_with("Pos") && name[3..].chars().all(|c| c.is_ascii_digit())) {
            continue;
        }
        let path = pos_dir.join("engagement.csv");
        if path.is_file() {
            csvs.push(path);
        }
    }
    csvs.sort();
    if csvs.is_empty() {
        return Err(format!(
            "No engagement traces (expected Pos{{n}}/engagement.csv) in {}",
            dir.display()
        ));
    }
    Ok(csvs)
}

fn load_engagement_panels(
    csvs: &[PathBuf],
    y_column: &str,
    mapping: &SampleMapping,
) -> Result<Vec<crate::analysis::traces::TracePanel>, String> {
    let mut grouped =
        std::collections::BTreeMap::<usize, crate::analysis::traces::TracePanel>::new();
    for path in csvs {
        let position = engagement_position(path)?;
        let sample = mapping
            .iter()
            .position(|sample| sample.positions.contains(&position))
            .ok_or_else(|| format!("No sample owns Pos{position} ({})", path.display()))?;
        let (headers, rows) = crate::analysis::csv_io::read_csv(path)?;
        let groups = crate::analysis::traces::group_trace_rows(&headers, &rows, y_column)?;
        let mut y_values = Vec::new();
        let traces = groups
            .into_values()
            .map(|mut points| {
                points
                    .sort_by(|left, right| left.0.partial_cmp(&right.0).unwrap_or(Ordering::Equal));
                y_values.extend(points.iter().map(|(_, value)| *value));
                points
            })
            .collect::<Vec<_>>();
        let entry = grouped
            .entry(sample)
            .or_insert_with(|| crate::analysis::traces::TracePanel {
                sample,
                paths: Vec::new(),
                traces: Vec::new(),
                y_values: Vec::new(),
            });
        entry.paths.push(path.clone());
        entry.traces.extend(traces);
        entry.y_values.extend(y_values);
    }
    Ok(grouped.into_values().collect())
}

fn engagement_position(path: &Path) -> Result<u32, String> {
    path.parent()
        .and_then(|parent| parent.file_name())
        .and_then(|name| name.to_str())
        .and_then(|name| name.strip_prefix("Pos"))
        .and_then(|rest| rest.parse().ok())
        .ok_or_else(|| format!("Expected Pos{{n}}/engagement.csv, got {}", path.display()))
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

    #[test]
    fn a_touching_t_cell_is_one_engagement() {
        let width = 48;
        let height = 48;
        let mut tumor = vec![false; width * height];
        let mut tcells = vec![false; width * height];
        paint_disk(&mut tumor, width, 16.0, 24.0, 6.0);
        paint_disk(&mut tcells, width, 26.0, 24.0, 5.0);
        paint_disk(&mut tcells, width, 40.0, 8.0, 5.0);
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
        let width = 40;
        let mut tumor = vec![false; width * width];
        let mut tcells = vec![false; width * width];
        paint_disk(&mut tumor, width, 10.0, 10.0, 5.0);
        paint_disk(&mut tcells, width, 30.0, 30.0, 5.0);
        let counts = count_engagements(&tumor, &tcells, width, width).unwrap();
        assert_eq!(counts.engagements, 0);
        assert_eq!(counts.t_cells, 1);
        assert_eq!(counts.tumor_cells, 1);
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
    fn a_three_by_three_patch_is_below_the_engager_diameter() {
        let mut pixels = vec![10.0; 32 * 32];
        for y in 4..7 {
            for x in 4..7 {
                pixels[y * 32 + x] = 1000.0;
            }
        }
        let mask = tcell_mask(&pixels);
        assert_eq!(mask.iter().filter(|pixel| **pixel).count(), 9);
        let counts = count_engagements(&vec![false; pixels.len()], &mask, 32, 32).unwrap();
        assert_eq!(counts.t_cells, 0);

        let quiet = tcell_mask(&vec![12.0; 32 * 32]);
        assert!(quiet.iter().all(|pixel| !pixel));
    }

    #[test]
    fn a_one_pixel_spur_does_not_split_a_circle() {
        let width = 32;
        let mut mask = vec![false; width * width];
        paint_disk(&mut mask, width, 16.0, 16.0, 5.0);
        mask[16 * width + 22] = true;
        mask[16 * width + 23] = true;
        assert_eq!(
            unique_labels(&split_round_components(
                &mask,
                width,
                width,
                ENGAGER_DIAMETER_PX
            )),
            1
        );
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

    fn paint_disk(mask: &mut [bool], width: usize, cx: f64, cy: f64, radius: f64) {
        let radius_sq = radius * radius;
        let height = mask.len() / width;
        for y in 0..height {
            for x in 0..width {
                let dx = x as f64 + 0.5 - cx;
                let dy = y as f64 + 0.5 - cy;
                if dx * dx + dy * dy <= radius_sq {
                    mask[y * width + x] = true;
                }
            }
        }
    }

    fn label_areas(labels: &[u32]) -> Vec<usize> {
        let mut areas = std::collections::BTreeMap::<u32, usize>::new();
        for label in labels {
            if *label != 0 {
                *areas.entry(*label).or_insert(0) += 1;
            }
        }
        areas.into_values().collect()
    }

    /// Background near 200, with a deterministic wobble that stays under 230.
    fn quiet_fluorescence(len: usize, salt: usize) -> Vec<f64> {
        (0..len)
            .map(|index| 190.0 + ((index.wrapping_mul(17).wrapping_add(salt)) % 31) as f64)
            .collect()
    }

    #[test]
    fn a_peanut_of_two_touching_engagers_is_two_circles() {
        let width = 40;
        let height = 32;
        let mut mask = vec![false; width * height];
        // Radius 5, centers 8 px apart: the disks overlap in a waist.
        paint_disk(&mut mask, width, 16.0, 16.0, 5.0);
        paint_disk(&mut mask, width, 24.0, 16.0, 5.0);
        let labels = split_round_components(&mask, width, height, ENGAGER_DIAMETER_PX);
        let areas = label_areas(&labels);
        assert_eq!(areas.len(), 2, "areas {areas:?}");
        assert!(areas.iter().all(|area| *area > 30), "areas {areas:?}");
    }

    #[test]
    fn one_disk_stays_one_circle_and_a_distant_pair_stays_two() {
        let width = 48;
        let height = 32;
        let mut one = vec![false; width * height];
        paint_disk(&mut one, width, 16.0, 16.0, 5.0);
        assert_eq!(
            unique_labels(&split_round_components(
                &one,
                width,
                height,
                ENGAGER_DIAMETER_PX
            )),
            1
        );

        let mut pair = vec![false; width * height];
        paint_disk(&mut pair, width, 10.0, 16.0, 5.0);
        paint_disk(&mut pair, width, 32.0, 16.0, 5.0);
        assert_eq!(
            unique_labels(&split_round_components(
                &pair,
                width,
                height,
                ENGAGER_DIAMETER_PX
            )),
            2
        );
    }

    #[test]
    fn a_shared_scale_leaves_an_empty_field_dark() {
        let mut with_engager = quiet_fluorescence(96 * 96, 3);
        let empty = quiet_fluorescence(96 * 96, 11);
        paint_disk_value(&mut with_engager, 96, 48.0, 48.0, 5.0, 4_500.0);

        let mut histogram = FluorescenceHistogram::new();
        histogram.sample(&with_engager);
        histogram.sample(&empty);
        let scale = histogram.scale();

        let empty_max = empty.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        assert!(
            scale.threshold > empty_max,
            "threshold {} should sit above the empty field max {empty_max}",
            scale.threshold
        );
        assert!(scale.threshold < 4_500.0, "threshold {}", scale.threshold);
        assert!(mask_with_scale(&empty, scale).iter().all(|on| !on));
        assert!(mask_with_scale(&with_engager, scale).iter().any(|on| *on));
    }

    #[test]
    fn an_empty_plate_does_not_promote_its_own_noise() {
        let mut histogram = FluorescenceHistogram::new();
        let fields: Vec<Vec<f64>> = (0..6)
            .map(|salt| quiet_fluorescence(64 * 64, salt))
            .collect();
        for field in &fields {
            histogram.sample(field);
        }
        let scale = histogram.scale();
        for field in &fields {
            let max = field.iter().copied().fold(f64::NEG_INFINITY, f64::max);
            assert!(
                scale.threshold > max,
                "threshold {} max {max}",
                scale.threshold
            );
            assert!(mask_with_scale(field, scale).iter().all(|on| !on));
        }
    }

    /// Time-0 check on Jack's CMRA plate. Skipped when the dataset is absent.
    #[test]
    fn killing_tcell_time_zero_keeps_the_empty_well_empty() {
        let root = PathBuf::from("/Users/jack/data/killing_tcell");
        if !root.join("Pos41").is_dir() {
            return;
        }
        let wells = [
            ("CMRA_0_1", 41u32),
            ("CMRA_1_8", 46),
            ("CMRA_1_4", 51),
            ("CMRA_1_2", 56),
        ];
        let mut counts = Vec::new();
        let mut peanuts = 0u32;
        for (name, pos) in wells {
            let frame_path = root.join(format!(
                "Pos{pos}/img_channel001_position{pos:03}_time000000000_z000.tif"
            ));
            let frame = crate::tiff_io::load_tiff_frame_page(&frame_path, 0).expect("tiff");
            let width = frame.width as usize;
            let height = frame.height as usize;
            let bboxes = read_bbox_csv(&root.join(format!("bbox/Pos{pos}.csv")));
            let mut histogram = FluorescenceHistogram::new();
            let mut crops = Vec::new();
            for (x, y, w, h) in &bboxes {
                let crop = crop_f64(&frame.data, width, height, *x, *y, *w, *h);
                histogram.sample(&crop);
                crops.push(crop);
            }
            let scale = histogram.scale();
            let mut spots = 0u32;
            for (crop, (_, _, w, h)) in crops.iter().zip(&bboxes) {
                let mask = mask_with_scale(crop, scale);
                let crop_w = *w as usize;
                let crop_h = *h as usize;
                let labels = split_round_components(&mask, crop_w, crop_h, ENGAGER_DIAMETER_PX);
                let found = unique_labels(&labels);
                spots += found;
                let connected = unique_labels(&label_components(&mask, crop_w, crop_h));
                if connected == 1 && found >= 2 {
                    peanuts += 1;
                }
            }
            counts.push((name, spots, scale.low, scale.threshold));
        }
        let spots = |name: &str| {
            counts
                .iter()
                .find(|(well, _, _, _)| *well == name)
                .unwrap()
                .1
        };
        assert_eq!(
            (
                spots("CMRA_0_1"),
                spots("CMRA_1_8"),
                spots("CMRA_1_4"),
                spots("CMRA_1_2"),
            ),
            (0, 55, 54, 238),
            "{counts:?} peanuts {peanuts}"
        );
        assert!(peanuts > 0, "{counts:?}");
    }

    fn read_bbox_csv(path: &Path) -> Vec<(i64, i64, i64, i64)> {
        let text =
            fs::read_to_string(path).unwrap_or_else(|error| panic!("{}: {error}", path.display()));
        text.lines()
            .skip(1)
            .filter(|line| !line.trim().is_empty())
            .map(|line| {
                let fields: Vec<_> = line.split(',').collect();
                (
                    fields[1].parse().unwrap(),
                    fields[2].parse().unwrap(),
                    fields[3].parse().unwrap(),
                    fields[4].parse().unwrap(),
                )
            })
            .collect()
    }

    fn crop_f64(
        frame: &[u16],
        frame_width: usize,
        frame_height: usize,
        x: i64,
        y: i64,
        w: i64,
        h: i64,
    ) -> Vec<f64> {
        let mut crop = vec![0.0; (w * h) as usize];
        for row in 0..h {
            for col in 0..w {
                let fx = x + col;
                let fy = y + row;
                if fx < 0 || fy < 0 || fx >= frame_width as i64 || fy >= frame_height as i64 {
                    continue;
                }
                crop[(row * w + col) as usize] =
                    f64::from(frame[fy as usize * frame_width + fx as usize]);
            }
        }
        crop
    }

    fn paint_disk_value(
        pixels: &mut [f64],
        width: usize,
        cx: f64,
        cy: f64,
        radius: f64,
        value: f64,
    ) {
        let radius_sq = radius * radius;
        let height = pixels.len() / width;
        for y in 0..height {
            for x in 0..width {
                let dx = x as f64 + 0.5 - cx;
                let dy = y as f64 + 0.5 - cy;
                if dx * dx + dy * dy <= radius_sq {
                    pixels[y * width + x] = value;
                }
            }
        }
    }

    #[test]
    fn engagement_plots_count_spots_without_replacing_death_reporter_figures() {
        let root = std::env::temp_dir().join(format!(
            "lisca-engagement-plots-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("analysis/Pos41")).unwrap();
        fs::write(
            root.join("analysis/Pos41/engagement.csv"),
            "\
roi,t,minutes,tumor_cells,t_cells,engagements
0,0,0.0000,1,0,0
0,5,13.7500,1,3,1
1,0,0.0000,1,1,0
1,5,13.7500,1,2,0
",
        )
        .unwrap();
        let mapping = SampleMapping(vec![crate::analysis::sample::SampleAnalysis {
            name: "CMRA_0_1".into(),
            positions: vec![41],
            signal: vec![1],
            segmentation: 0,
        }]);
        run_plot_traces(&root, &mapping, 2.75).unwrap();
        write_summary(&root, &mapping).unwrap();
        assert!(root
            .join("results/CMRA_0_1/engagement_traces.png")
            .is_file());
        assert!(root
            .join("results/CMRA_0_1/engagement_traces_summary_shared_y.png")
            .is_file());
        assert!(root.join("results/CMRA_0_1/engagement.xlsx").is_file());
        assert!(root
            .join("results/CMRA_0_1/engagement_summary.xlsx")
            .is_file());
        assert!(root.join("analysis/Pos41/engagement_summary.csv").is_file());
        assert!(!root.join("results/traces.png").exists());
        assert!(!root.join("results/engagement_traces.png").exists());
        assert!(!root.join("results/engagement_counts.csv").exists());
        assert!(!root.join("results/engagement_summary.csv").exists());
        fs::remove_dir_all(root).unwrap();
    }

    /// Full CMRA plate. Ignored so `cargo test` does not rewrite a local dataset.
    #[test]
    #[ignore = "writes analysis/PosN/engagement.csv and results/<sample>/ under /Users/jack/data/killing_tcell"]
    fn killing_tcell_engagement_writes_count_plots() {
        let root = PathBuf::from("/Users/jack/data/killing_tcell");
        if !root.join("roi/Pos41/index.json").is_file() {
            return;
        }
        let assay_path = root.join("assay.json");
        let before = fs::read(&assay_path).unwrap();
        let assay: crate::protocol::AssayJsonFile = serde_json::from_slice(&before).unwrap();
        let interval =
            parse_interval_minutes(assay.interval.value, Some(assay.interval.unit.as_str()))
                .unwrap();
        let mapping = build_sample_mapping(&assay).unwrap();
        run_sync(&root, &assay).unwrap();
        run_plot_traces(&root, &mapping, interval).unwrap();
        assert!(root
            .join("results/CMRA_0_1/engagement_traces.png")
            .is_file());
        assert!(root
            .join("results/CMRA_1_2/engagement_traces_summary_shared_y.png")
            .is_file());
        assert!(root.join("results/CMRA_0_1/engagement.xlsx").is_file());
        assert!(!root.join("results/engagement_counts.csv").exists());
        assert_eq!(fs::read(assay_path).unwrap(), before);
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
        assert!(!root.join("analysis/Pos41").exists());
        assert!(!root.join("traces/Pos41").exists());
        assert!(!root.join("results/predictions.csv").exists());
        fs::remove_dir_all(root).unwrap();
    }
}
