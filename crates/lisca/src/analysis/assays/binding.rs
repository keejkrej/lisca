//! LNP binding: Picasso spot detection on each ROI crop, then per-ROI counts.
//!
//! Detection and Gaussian fitting live in `picasso`. This module loads LISCA
//! ROI stacks, assigns localizations to the Pattern ROI they were measured in,
//! and writes the same analysis/results layout family as engagement.

use std::cmp::Ordering;
use std::collections::BTreeMap;
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::path::{Path, PathBuf};

use picasso::prelude::{
    detect_spots_u16_slice, spot_counts, BindingDetectConfig, BindingSpot, CameraInfo, GaussModel,
    SpotFitMethod,
};

use crate::analysis::csv_io::{format_float, read_csv, write_csv_only};
use crate::analysis::export::write_xlsx_only;
use crate::analysis::roi_stack::{
    position_dir, read_position_index, roi_frame_2d, validate_channel_index, RoiStack,
};
use crate::analysis::sample::{
    build_sample_mapping, parse_interval_minutes, sample_pack_dirnames, SampleMapping,
};
use crate::protocol::{AssayAnalysisConfig, AssayJsonFile};

/// Picasso `min_gradient` when `analysis.minGradient` is omitted.
pub const DEFAULT_MIN_GRADIENT: f64 = 50.0;
/// Picasso odd box side length when `analysis.boxSize` is omitted.
pub const DEFAULT_BOX_SIZE: u32 = 7;
/// Distance (px) at which a later-frame spot counts as a new binding event.
const MATCH_DISTANCE_PX: f64 = 5.0;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct BindingDetectParams {
    pub min_gradient: f64,
    pub box_size: u32,
}

impl Default for BindingDetectParams {
    fn default() -> Self {
        Self {
            min_gradient: DEFAULT_MIN_GRADIENT,
            box_size: DEFAULT_BOX_SIZE,
        }
    }
}

pub fn detect_params(
    analysis: Option<&AssayAnalysisConfig>,
) -> Result<BindingDetectParams, String> {
    let min_gradient = analysis
        .and_then(|config| config.min_gradient)
        .unwrap_or(DEFAULT_MIN_GRADIENT);
    if !min_gradient.is_finite() || min_gradient < 0.0 {
        return Err(format!(
            "analysis.minGradient must be >= 0, got {min_gradient}"
        ));
    }
    let box_size = analysis
        .and_then(|config| config.box_size)
        .unwrap_or(DEFAULT_BOX_SIZE);
    if box_size < 3 || box_size.is_multiple_of(2) {
        return Err(format!(
            "analysis.boxSize must be an odd integer >= 3, got {box_size}"
        ));
    }
    Ok(BindingDetectParams {
        min_gradient,
        box_size,
    })
}

pub fn run_sync(workspace: &Path, assay_json: &AssayJsonFile) -> Result<(), String> {
    let interval = parse_interval_minutes(
        assay_json.interval.value,
        Some(assay_json.interval.unit.as_str()),
    )
    .ok_or_else(|| "invalid interval.value/unit in assay.json".to_string())?;
    let mapping = build_sample_mapping(assay_json)?;
    let params = detect_params(assay_json.analysis.as_ref())?;
    for position in mapping.positions() {
        run_position(workspace, &mapping, position, interval, params)?;
    }
    run_plot_traces(workspace, &mapping, interval)?;
    write_summary(workspace, &mapping)
}

pub fn run_position(
    workspace: &Path,
    mapping: &SampleMapping,
    position: u32,
    interval_minutes: f64,
    params: BindingDetectParams,
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
    if interval_minutes <= 0.0 {
        return Err(format!("interval must be > 0, got {interval_minutes}"));
    }
    let signal = *sample.signal.first().ok_or_else(|| {
        format!(
            "sample {} has no signal channel for lnp-binding",
            sample.name
        )
    })?;
    validate_channel_index(&index, signal)?;

    let mut spot_rows = Vec::new();
    let mut count_rows = Vec::new();
    for roi_crop in &index.rois {
        let stack = RoiStack::load(&pos_dir.join(&roi_crop.file_name), roi_crop.shape)?;
        let config = BindingDetectConfig {
            min_gradient: params.min_gradient,
            box_size: params.box_size as usize,
            fit_method: SpotFitMethod::GaussLq,
            gauss_model: GaussModel::Elliptic,
            gaussian_sigma: None,
            camera_info: CameraInfo::default(),
            pos: format!("Pos{position}"),
            roi: roi_crop.roi.to_string(),
            parallel: false,
        };
        let mut roi_spots = Vec::new();
        for stack_t in 0..index.time_count {
            let source_t = index.time_indices[stack_t as usize];
            let frame = roi_frame_2d(&stack, &index.axis_order, stack_t, signal, 0)?;
            let pixels = frame_to_u16(frame.as_slice());
            let detected = detect_frame_spots(
                &pixels,
                frame.height,
                frame.width,
                source_t,
                &config,
                position,
                roi_crop.roi,
            )?;
            roi_spots.extend(detected);
        }
        spot_rows.extend(roi_spots.iter().cloned().map(|spot| SpotRow {
            roi: roi_crop.roi,
            spot,
        }));
        count_rows.extend(count_rows_for_roi(
            roi_crop.roi,
            &roi_spots,
            &index.time_indices,
            interval_minutes,
        ));
    }
    if index.rois.is_empty() {
        return Err(format!("position {position} has no ROI frames to score"));
    }
    spot_rows.sort_by(|left, right| {
        left.roi
            .cmp(&right.roi)
            .then(left.spot.time.cmp(&right.spot.time))
    });
    count_rows.sort_by(|left, right| left.roi.cmp(&right.roi).then(left.t.cmp(&right.t)));
    let analysis_dir = workspace.join("analysis").join(format!("Pos{position}"));
    write_spot_csv(&analysis_dir.join("spots.csv"), &spot_rows)?;
    write_count_csv(&analysis_dir.join("binding.csv"), &count_rows)
}

pub fn write_summary(workspace: &Path, mapping: &SampleMapping) -> Result<(), String> {
    let csvs = discover_binding_csvs(&workspace.join("analysis"))?;
    let dirnames = sample_pack_dirnames(mapping);
    let mut traces: BTreeMap<usize, Vec<Vec<String>>> = BTreeMap::new();
    let mut summaries: BTreeMap<usize, Vec<Vec<String>>> = BTreeMap::new();
    let mut spots: BTreeMap<usize, Vec<Vec<String>>> = BTreeMap::new();

    for path in csvs {
        let position = binding_position(&path)?;
        let sample = mapping
            .iter()
            .position(|sample| sample.positions.contains(&position))
            .ok_or_else(|| format!("No sample owns Pos{position} ({})", path.display()))?;
        let rows = read_count_rows(&path, position)?;
        let summary_rows = summarize_rows(&rows);
        let summary_path = path
            .parent()
            .ok_or_else(|| format!("binding csv has no directory: {}", path.display()))?
            .join("binding_summary.csv");
        write_summary_csv(&summary_path, &summary_rows)?;
        for row in &rows {
            traces.entry(sample).or_default().push(count_xlsx_row(row));
        }
        for row in &summary_rows {
            summaries
                .entry(sample)
                .or_default()
                .push(summary_xlsx_row(row));
        }
        let spots_path = path
            .parent()
            .ok_or_else(|| format!("binding csv has no directory: {}", path.display()))?
            .join("spots.csv");
        if spots_path.is_file() {
            for row in read_spot_xlsx_rows(&spots_path, position)? {
                spots.entry(sample).or_default().push(row);
            }
        }
    }

    publish_sample_xlsx(
        workspace,
        &dirnames,
        &mut traces,
        "binding",
        &[
            "pos",
            "roi",
            "t",
            "minutes",
            "spot_count",
            "intensity_sum",
            "cumulative_count",
        ],
    )?;
    publish_sample_xlsx(
        workspace,
        &dirnames,
        &mut summaries,
        "binding_summary",
        &[
            "pos",
            "roi",
            "frames",
            "spots_mean",
            "intensity_mean",
            "cumulative_last",
        ],
    )?;
    publish_sample_xlsx(
        workspace,
        &dirnames,
        &mut spots,
        "spots",
        &[
            "pos",
            "roi",
            "t",
            "x",
            "y",
            "intensity",
            "photons",
            "fwhm",
            "sx",
            "sy",
            "snb",
            "probability",
        ],
    )
}

pub fn run_plot_traces(
    workspace: &Path,
    mapping: &SampleMapping,
    interval_minutes: f64,
) -> Result<(), String> {
    if interval_minutes <= 0.0 {
        return Err(format!("interval must be > 0, got {interval_minutes}"));
    }
    let csvs = discover_binding_csvs(&workspace.join("analysis"))?;
    let panels = load_binding_panels(&csvs, "spot_count", mapping)?;
    if panels.is_empty() {
        return Err("no binding traces to plot".to_string());
    }
    let dirnames = sample_pack_dirnames(mapping);
    crate::analysis::plot::write_per_sample_metric_plots(
        &panels,
        |sample| {
            let dirname = dirnames
                .get(&sample)
                .map(String::as_str)
                .unwrap_or("sample");
            workspace.join("results").join(dirname)
        },
        "binding_traces",
        "spots",
        interval_minutes,
        mapping,
    )
}

/// Picasso `identify_in_frame` panics when a candidate sits on the detection-box
/// border (`gradient_at` at row/col 0). Catch that so Studio does not abort.
fn detect_frame_spots(
    pixels: &[u16],
    height: usize,
    width: usize,
    time: u32,
    config: &BindingDetectConfig,
    position: u32,
    roi: u32,
) -> Result<Vec<BindingSpot>, String> {
    match catch_unwind(AssertUnwindSafe(|| {
        detect_spots_u16_slice(pixels, height, width, time, config)
    })) {
        Ok(Ok(spots)) => Ok(spots),
        Ok(Err(error)) => Err(error.to_string()),
        Err(payload) => {
            let detail = panic_payload_message(payload.as_ref());
            Err(format!(
                "Picasso identify aborted on Pos{position} Roi{roi} t={time}{detail}. A candidate on the detection-box border can panic picasso-rs. Use a smaller boxSize or a larger ROI."
            ))
        }
    }
}

fn panic_payload_message(payload: &(dyn std::any::Any + Send)) -> String {
    if let Some(message) = payload.downcast_ref::<&str>() {
        format!(": {message}")
    } else if let Some(message) = payload.downcast_ref::<String>() {
        format!(": {message}")
    } else {
        String::new()
    }
}

fn frame_to_u16(pixels: &[f64]) -> Vec<u16> {
    pixels
        .iter()
        .map(|value| {
            if !value.is_finite() || *value <= 0.0 {
                0
            } else {
                value.round().clamp(0.0, 65535.0) as u16
            }
        })
        .collect()
}

struct SpotRow {
    roi: u32,
    spot: BindingSpot,
}

struct CountRow {
    pos: u32,
    roi: u32,
    t: u32,
    minutes: f64,
    spot_count: u32,
    intensity_sum: f64,
    cumulative_count: u32,
}

struct SummaryRow {
    pos: u32,
    roi: u32,
    frames: u32,
    spots: f64,
    intensity: f64,
    cumulative_last: u32,
}

fn count_rows_for_roi(
    roi: u32,
    spots: &[BindingSpot],
    times: &[u32],
    interval_minutes: f64,
) -> Vec<CountRow> {
    let counts = if spots.is_empty() {
        Vec::new()
    } else {
        spot_counts(spots, Some(times), MATCH_DISTANCE_PX)
    };
    times
        .iter()
        .map(|&t| {
            let count = counts.iter().find(|row| row.time == t);
            let intensity_sum = spots
                .iter()
                .filter(|spot| spot.time == t)
                .map(|spot| spot.intensity)
                .sum::<f64>();
            CountRow {
                pos: 0,
                roi,
                t,
                minutes: f64::from(t) * interval_minutes,
                spot_count: count.map(|row| row.spot_count as u32).unwrap_or(0),
                intensity_sum,
                cumulative_count: count.map(|row| row.cumulative_count as u32).unwrap_or(0),
            }
        })
        .collect()
}

fn write_spot_csv(path: &Path, rows: &[SpotRow]) -> Result<(), String> {
    let headers = [
        "roi",
        "t",
        "x",
        "y",
        "intensity",
        "photons",
        "fwhm",
        "sx",
        "sy",
        "snb",
        "probability",
    ];
    let body = rows
        .iter()
        .map(|row| {
            vec![
                row.roi.to_string(),
                row.spot.time.to_string(),
                format_float(row.spot.x),
                format_float(row.spot.y),
                format_float(row.spot.intensity),
                format_float(row.spot.photons),
                format_float(row.spot.fwhm),
                format_float(row.spot.sx),
                format_float(row.spot.sy),
                format_float(row.spot.snb),
                format_float(row.spot.probability),
            ]
        })
        .collect::<Vec<_>>();
    write_csv_only(path, &headers, &body)
}

fn write_count_csv(path: &Path, rows: &[CountRow]) -> Result<(), String> {
    let headers = [
        "roi",
        "t",
        "minutes",
        "spot_count",
        "intensity_sum",
        "cumulative_count",
    ];
    let body = rows
        .iter()
        .map(|row| {
            vec![
                row.roi.to_string(),
                row.t.to_string(),
                format!("{:.4}", row.minutes),
                row.spot_count.to_string(),
                format_float(row.intensity_sum),
                row.cumulative_count.to_string(),
            ]
        })
        .collect::<Vec<_>>();
    write_csv_only(path, &headers, &body)
}

fn write_summary_csv(path: &Path, rows: &[SummaryRow]) -> Result<(), String> {
    let headers = [
        "roi",
        "frames",
        "spots_mean",
        "intensity_mean",
        "cumulative_last",
    ];
    let body = rows
        .iter()
        .map(|row| {
            vec![
                row.roi.to_string(),
                row.frames.to_string(),
                format_float(row.spots),
                format_float(row.intensity),
                row.cumulative_last.to_string(),
            ]
        })
        .collect::<Vec<_>>();
    write_csv_only(path, &headers, &body)
}

fn discover_binding_csvs(dir: &Path) -> Result<Vec<PathBuf>, String> {
    if !dir.is_dir() {
        return Err(format!("Expected analysis directory at {}", dir.display()));
    }
    let mut csvs = Vec::new();
    for entry in std::fs::read_dir(dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let pos_dir = entry.path();
        if !pos_dir.is_dir() {
            continue;
        }
        let path = pos_dir.join("binding.csv");
        if path.is_file() {
            csvs.push(path);
        }
    }
    csvs.sort();
    if csvs.is_empty() {
        return Err(format!(
            "No position binding CSV files (expected Pos{{n}}/binding.csv) in {}",
            dir.display()
        ));
    }
    Ok(csvs)
}

fn binding_position(path: &Path) -> Result<u32, String> {
    path.parent()
        .and_then(|parent| parent.file_name())
        .and_then(|name| name.to_str())
        .and_then(|name| name.strip_prefix("Pos"))
        .and_then(|rest| rest.parse().ok())
        .ok_or_else(|| format!("Expected Pos{{n}}/binding.csv, got {}", path.display()))
}

fn load_binding_panels(
    csvs: &[PathBuf],
    y_column: &str,
    mapping: &SampleMapping,
) -> Result<Vec<crate::analysis::traces::TracePanel>, String> {
    let mut grouped = BTreeMap::<usize, crate::analysis::traces::TracePanel>::new();
    for path in csvs {
        let position = binding_position(path)?;
        let sample = mapping
            .iter()
            .position(|sample| sample.positions.contains(&position))
            .ok_or_else(|| format!("No sample owns Pos{position} ({})", path.display()))?;
        let (headers, rows) = read_csv(path)?;
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

fn read_count_rows(path: &Path, position: u32) -> Result<Vec<CountRow>, String> {
    let (headers, rows) = read_csv(path)?;
    let column = |name: &str| {
        crate::analysis::csv_io::column_index(&headers, name)
            .ok_or_else(|| format!("{} is missing {name}", path.display()))
    };
    let roi = column("roi")?;
    let t = column("t")?;
    let minutes = column("minutes")?;
    let spot_count = column("spot_count")?;
    let intensity_sum = column("intensity_sum")?;
    let cumulative_count = column("cumulative_count")?;
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
        parsed.push(CountRow {
            pos: position,
            roi: number(roi)?,
            t: number(t)?,
            minutes: cell(minutes)?
                .parse()
                .map_err(|error| format!("{}: {error}", path.display()))?,
            spot_count: number(spot_count)?,
            intensity_sum: cell(intensity_sum)?
                .parse()
                .map_err(|error| format!("{}: {error}", path.display()))?,
            cumulative_count: number(cumulative_count)?,
        });
    }
    Ok(parsed)
}

fn read_spot_xlsx_rows(path: &Path, position: u32) -> Result<Vec<Vec<String>>, String> {
    let (headers, rows) = read_csv(path)?;
    let mut out = Vec::with_capacity(rows.len());
    for row in rows {
        let mut xlsx = Vec::with_capacity(headers.len() + 1);
        xlsx.push(position.to_string());
        xlsx.extend(row);
        out.push(xlsx);
    }
    Ok(out)
}

fn summarize_rows(rows: &[CountRow]) -> Vec<SummaryRow> {
    let mut groups = Vec::<SummaryRow>::new();
    for row in rows {
        if let Some(group) = groups
            .iter_mut()
            .find(|group| group.pos == row.pos && group.roi == row.roi)
        {
            group.frames += 1;
            group.spots += f64::from(row.spot_count);
            group.intensity += row.intensity_sum;
            group.cumulative_last = row.cumulative_count;
        } else {
            groups.push(SummaryRow {
                pos: row.pos,
                roi: row.roi,
                frames: 1,
                spots: f64::from(row.spot_count),
                intensity: row.intensity_sum,
                cumulative_last: row.cumulative_count,
            });
        }
    }
    for group in &mut groups {
        if group.frames > 0 {
            group.spots /= f64::from(group.frames);
            group.intensity /= f64::from(group.frames);
        }
    }
    groups
}

fn count_xlsx_row(row: &CountRow) -> Vec<String> {
    vec![
        row.pos.to_string(),
        row.roi.to_string(),
        row.t.to_string(),
        format!("{:.4}", row.minutes),
        row.spot_count.to_string(),
        format_float(row.intensity_sum),
        row.cumulative_count.to_string(),
    ]
}

fn summary_xlsx_row(row: &SummaryRow) -> Vec<String> {
    vec![
        row.pos.to_string(),
        row.roi.to_string(),
        row.frames.to_string(),
        format_float(row.spots),
        format_float(row.intensity),
        row.cumulative_last.to_string(),
    ]
}

fn publish_sample_xlsx(
    workspace: &Path,
    dirnames: &BTreeMap<usize, String>,
    rows: &mut BTreeMap<usize, Vec<Vec<String>>>,
    stem: &str,
    headers: &[&str],
) -> Result<(), String> {
    for (sample, body) in rows {
        let dirname = dirnames.get(sample).map(String::as_str).unwrap_or("sample");
        let path = workspace
            .join("results")
            .join(dirname)
            .join(format!("{stem}.xlsx"));
        write_xlsx_only(&path, headers, body)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::analysis::csv_io::read_csv;
    use crate::analysis::sample::SampleAnalysis;
    use crate::protocol::AssayJsonFile;

    use tiff::encoder::{colortype, TiffEncoder};

    const WIDTH: u32 = 32;
    const HEIGHT: u32 = 32;

    fn unique_root(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "lisca-binding-{label}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
    }

    fn paint_spot(frame: &mut [u16], cx: f64, cy: f64, amplitude: f64, sigma: f64) {
        let width = WIDTH as usize;
        let height = HEIGHT as usize;
        for y in 0..height {
            for x in 0..width {
                let dx = x as f64 - cx;
                let dy = y as f64 - cy;
                let value = amplitude * (-0.5 * (dx * dx + dy * dy) / (sigma * sigma)).exp();
                let index = y * width + x;
                let summed = f64::from(frame[index]) + value;
                frame[index] = summed.round().clamp(0.0, 65535.0) as u16;
            }
        }
    }

    fn write_pages(path: &Path, pages: &[Vec<u16>]) {
        let file = std::fs::File::create(path).expect("create tiff");
        let mut encoder = TiffEncoder::new(file).expect("encoder");
        for page in pages {
            let image = encoder
                .new_image::<colortype::Gray16>(WIDTH, HEIGHT)
                .expect("gray image");
            image.write_data(page).expect("write page");
        }
    }

    fn background_page(value: u16) -> Vec<u16> {
        vec![value; (WIDTH * HEIGHT) as usize]
    }

    fn write_position(workspace: &Path, position: u32, signal_pages: &[Vec<u16>]) {
        let pos_dir = workspace.join(format!("roi/Pos{position}"));
        std::fs::create_dir_all(&pos_dir).unwrap();
        let mut pages = Vec::new();
        for signal in signal_pages {
            pages.push(background_page(40));
            pages.push(signal.clone());
        }
        write_pages(&pos_dir.join("Roi0.tif"), &pages);
        let index = serde_json::json!({
            "position": position,
            "axisOrder": "TCZYX",
            "channelCount": 2,
            "timeCount": signal_pages.len(),
            "zCount": 1,
            "rois": [{
                "roi": 0,
                "fileName": "Roi0.tif",
                "bbox": { "roi": 0, "x": 0, "y": 0, "w": WIDTH, "h": HEIGHT }
            }]
        });
        std::fs::write(
            pos_dir.join("index.json"),
            serde_json::to_string(&index).unwrap(),
        )
        .unwrap();
    }

    fn assay_json() -> String {
        r#"{
            "type": "lnp-binding",
            "name": "binding",
            "workspace": { "path": "" },
            "data": { "type": "folder", "path": "", "template": { "subfolder": "", "filename": "" } },
            "interval": { "value": 1.0, "unit": "minute" },
            "samples": [
                { "name": "bound", "positions": "1" }
            ],
            "analysis": {
                "channels": { "segmentation": 0, "signal": [1] },
                "minGradient": 80,
                "boxSize": 7
            }
        }"#
        .to_string()
    }

    #[test]
    fn detect_params_use_picasso_defaults_when_omitted() {
        let params = detect_params(None).unwrap();
        assert_eq!(params.min_gradient, DEFAULT_MIN_GRADIENT);
        assert_eq!(params.box_size, DEFAULT_BOX_SIZE);
    }

    #[test]
    fn detect_params_reject_an_even_box() {
        let assay: AssayJsonFile = serde_json::from_str(
            r#"{
                "type": "lnp-binding",
                "name": "binding",
                "workspace": { "path": "" },
                "data": { "type": "folder", "path": "", "template": { "subfolder": "", "filename": "" } },
                "interval": { "value": 1.0, "unit": "minute" },
                "samples": [{ "name": "bound", "positions": "1" }],
                "analysis": { "channels": { "segmentation": 0, "signal": [1] }, "boxSize": 8 }
            }"#,
        )
        .unwrap();
        let error = detect_params(assay.analysis.as_ref()).unwrap_err();
        assert!(error.contains("odd integer"), "{error}");
    }

    #[test]
    fn detect_params_reject_a_negative_threshold() {
        let assay: AssayJsonFile = serde_json::from_str(
            r#"{
                "type": "lnp-binding",
                "name": "binding",
                "workspace": { "path": "" },
                "data": { "type": "folder", "path": "", "template": { "subfolder": "", "filename": "" } },
                "interval": { "value": 1.0, "unit": "minute" },
                "samples": [{ "name": "bound", "positions": "1" }],
                "analysis": { "channels": { "segmentation": 0, "signal": [1] }, "minGradient": -1 }
            }"#,
        )
        .unwrap();
        let error = detect_params(assay.analysis.as_ref()).unwrap_err();
        assert!(error.contains("minGradient"), "{error}");
    }

    #[test]
    fn run_sync_rejects_a_non_positive_interval() {
        let root = unique_root("interval");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        let mut assay = assay_json();
        assay = assay.replace("\"value\": 1.0", "\"value\": 0");
        std::fs::write(root.join("assay.json"), &assay).unwrap();
        let assay: AssayJsonFile = serde_json::from_str(&assay).unwrap();
        let error = run_sync(&root, &assay).unwrap_err();
        assert!(error.contains("invalid interval"), "{error}");
        assert!(!root.join("analysis").exists());
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn synthetic_spots_are_counted_per_roi_and_frame() {
        let root = unique_root("spots");
        let _ = std::fs::remove_dir_all(&root);
        let mut t0 = background_page(80);
        paint_spot(&mut t0, 16.0, 16.0, 8000.0, 1.4);
        let mut t1 = background_page(80);
        paint_spot(&mut t1, 16.0, 16.0, 8000.0, 1.4);
        paint_spot(&mut t1, 16.0, 24.0, 8000.0, 1.4);
        write_position(&root, 1, &[t0, t1]);
        std::fs::write(root.join("assay.json"), assay_json()).unwrap();
        let assay: AssayJsonFile = serde_json::from_str(&assay_json()).unwrap();

        run_sync(&root, &assay).unwrap();

        let (headers, rows) = read_csv(&root.join("analysis/Pos1/binding.csv")).unwrap();
        assert_eq!(
            headers,
            [
                "roi",
                "t",
                "minutes",
                "spot_count",
                "intensity_sum",
                "cumulative_count"
            ]
        );
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0][0], "0");
        assert_eq!(rows[0][1], "0");
        assert_eq!(rows[0][3], "1");
        assert_eq!(rows[1][1], "1");
        assert_eq!(rows[1][3], "2");
        let first_intensity: f64 = rows[0][4].parse().unwrap();
        let second_intensity: f64 = rows[1][4].parse().unwrap();
        assert!(first_intensity > 0.0, "{first_intensity}");
        assert!(
            second_intensity > first_intensity,
            "{second_intensity} vs {first_intensity}"
        );

        let (spot_headers, spot_rows) = read_csv(&root.join("analysis/Pos1/spots.csv")).unwrap();
        assert_eq!(spot_headers[0], "roi");
        assert_eq!(spot_rows.len(), 3);
        assert!(root.join("results/bound/binding.xlsx").is_file());
        assert!(root.join("results/bound/binding_traces.png").is_file());
        assert!(root
            .join("results/bound/binding_traces_summary_shared_y.png")
            .is_file());
        assert!(!root.join("results/bound/traces.png").exists());
        assert!(!root.join("analysis/Pos1/ch1.csv").exists());
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn empty_roi_writes_zero_counts() {
        let root = unique_root("empty");
        let _ = std::fs::remove_dir_all(&root);
        write_position(&root, 1, &[background_page(80), background_page(80)]);
        let mapping = SampleMapping(vec![SampleAnalysis {
            name: "bound".into(),
            positions: vec![1],
            signal: vec![1],
            segmentation: 0,
        }]);
        run_position(&root, &mapping, 1, 1.0, BindingDetectParams::default()).unwrap();
        let (_, rows) = read_csv(&root.join("analysis/Pos1/binding.csv")).unwrap();
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0][3], "0");
        assert_eq!(rows[1][3], "0");
        let (_, spots) = read_csv(&root.join("analysis/Pos1/spots.csv")).unwrap();
        assert!(spots.is_empty());
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn missing_roi_directory_fails_before_writing_files() {
        let root = unique_root("missing");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        let mapping = SampleMapping(vec![SampleAnalysis {
            name: "bound".into(),
            positions: vec![1],
            signal: vec![1],
            segmentation: 0,
        }]);
        let error =
            run_position(&root, &mapping, 1, 1.0, BindingDetectParams::default()).unwrap_err();
        assert!(error.contains("No ROI directory"), "{error}");
        assert!(!root.join("analysis/Pos1").exists());
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn a_border_candidate_does_not_abort_the_process() {
        let root = unique_root("border");
        let _ = std::fs::remove_dir_all(&root);
        let mut frame = background_page(80);
        paint_spot(&mut frame, 3.0, 16.0, 8000.0, 1.4);
        write_position(&root, 1, &[frame]);
        let mapping = SampleMapping(vec![SampleAnalysis {
            name: "bound".into(),
            positions: vec![1],
            signal: vec![1],
            segmentation: 0,
        }]);
        let result = run_position(&root, &mapping, 1, 1.0, BindingDetectParams::default());
        match result {
            Ok(()) => {
                assert!(root.join("analysis/Pos1/binding.csv").is_file());
            }
            Err(error) => {
                assert!(
                    error.contains("Picasso") || error.contains("border"),
                    "{error}"
                );
                assert!(!root.join("analysis/Pos1").exists());
            }
        }
        std::fs::remove_dir_all(root).unwrap();
    }
}
