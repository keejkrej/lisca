use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use clap::Args;

use lisca::analysis::roi::{
    compute_roi_metrics, quantile_column_name, write_timeseries_csv, RoiMetricsRow, TimeseriesRow,
};
use lisca::data::roi::{position_dir, read_position_index, validate_channel_index};
use lisca::data::slide::{load_slide_mapping, SlideMapping};

pub const HELP: &str = "Read cropped ROI TIFF timelapses from roi/PosN, compute per-ROI intensity metrics for each slide channel's mapped image channel, and write one long-form CSV per slide channel.";
pub const DELIVERY_CORRECTION_QUARTILE: f64 = 0.25;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SlideTimeseriesRunResult {
    pub written_outputs: Vec<(u32, PathBuf, usize)>,
    pub skipped_positions: BTreeMap<u32, Vec<u32>>,
}

#[derive(Clone, Debug, Args)]
#[command(about = HELP)]
pub struct TimeseriesArgs {
    #[arg(help = "Workspace containing roi/PosN/index.json and Roi*.tif files.")]
    pub workspace: PathBuf,
    #[arg(
        long,
        help = "Microscopy slide mapping JSON from slide channel to positions plus image_channel. Process every position from every slide channel in the file and write one CSV per slide channel."
    )]
    pub slide: PathBuf,
    #[arg(
        long,
        help = "Output CSV path or directory. Default: one CSV per slide channel named <slide_stem>_scS_chCCC_timeseries.csv under <workspace>/timeseries. When a custom .csv path is provided, _scS_chCCC is appended to the stem for each output file."
    )]
    pub output_csv: Option<PathBuf>,
    #[arg(
        long,
        default_value_t = DELIVERY_CORRECTION_QUARTILE,
        help = "Single quartile used to compute the corrected intensity column."
    )]
    pub correction_quartile: f64,
}

pub fn load_slide_position_groups(slide_path: &Path) -> Result<SlideMapping, String> {
    load_slide_mapping(slide_path)
}

pub fn default_slide_timeseries_csv_path(
    workspace: &Path,
    slide_path: &Path,
    slide_channel: u32,
    image_channel: u32,
    output_csv: Option<&Path>,
) -> PathBuf {
    match output_csv {
        None => workspace.join("timeseries").join(format!(
            "{}_sc{}_ch{:03}_timeseries.csv",
            slide_path
                .file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("slide"),
            slide_channel,
            image_channel
        )),
        Some(output_csv) if output_csv.extension().is_some() => {
            let stem = output_csv
                .file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("timeseries");
            let extension = output_csv
                .extension()
                .and_then(|value| value.to_str())
                .unwrap_or("csv");
            output_csv.with_file_name(format!(
                "{stem}_sc{slide_channel}_ch{image_channel:03}.{extension}"
            ))
        }
        Some(output_csv) => output_csv.join(format!(
            "{}_sc{}_ch{:03}_timeseries.csv",
            slide_path
                .file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("slide"),
            slide_channel,
            image_channel
        )),
    }
}

pub fn apply_delivery_correction(
    rows: &[RoiMetricsRow],
    correction_quartile: f64,
) -> Result<Vec<TimeseriesRow>, String> {
    let column = quantile_column_name(correction_quartile)?;
    let mut simplified = rows
        .iter()
        .map(|row| {
            let quantile = row.quartiles.get(&column).ok_or_else(|| {
                format!(
                    "Quartiles must include {correction_quartile:.2} so delivery corrected intensity can be computed"
                )
            })?;
            Ok(TimeseriesRow {
                pos: Some(row.pos),
                roi: row.roi,
                t: row.t,
                corrected: row.sum as f64 - row.area as f64 * quantile,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    simplified.sort_by_key(|row| (row.pos.unwrap_or(0), row.roi, row.t));
    Ok(simplified)
}

pub fn run_slide_timeseries<F>(
    workspace: &Path,
    slide: &Path,
    output_csv: Option<&Path>,
    correction_quartile: f64,
    mut on_csv_written: Option<F>,
) -> Result<SlideTimeseriesRunResult, String>
where
    F: FnMut(u32, &Path, usize),
{
    quantile_column_name(correction_quartile)?;
    let slide_positions = load_slide_position_groups(slide)?;
    let mut skipped_positions = BTreeMap::<u32, Vec<u32>>::new();
    let mut written_outputs = Vec::new();

    for (slide_channel, entry) in slide_positions {
        let image_channel = entry.image_channel;
        let positions = entry.positions;
        let mut metrics = Vec::<RoiMetricsRow>::new();
        let mut position_count = 0usize;
        for pos in positions {
            let pos_dir = match position_dir(workspace, pos) {
                Ok(path) => path,
                Err(_) => {
                    skipped_positions
                        .entry(slide_channel)
                        .or_default()
                        .push(pos);
                    continue;
                }
            };
            let index = read_position_index(&pos_dir)?;
            validate_channel_index(&index, image_channel)?;
            let mut position_rows =
                compute_roi_metrics(&pos_dir, &index, image_channel, &[correction_quartile])?;
            metrics.append(&mut position_rows);
            position_count += 1;
        }

        if metrics.is_empty() {
            continue;
        }

        let output_path = default_slide_timeseries_csv_path(
            workspace,
            slide,
            slide_channel,
            image_channel,
            output_csv,
        );
        let simplified = apply_delivery_correction(&metrics, correction_quartile)?;
        write_timeseries_csv(&simplified, &output_path)?;
        if let Some(ref mut callback) = on_csv_written {
            callback(slide_channel, &output_path, position_count);
        }
        written_outputs.push((slide_channel, output_path, position_count));
    }

    if written_outputs.is_empty() {
        if skipped_positions.is_empty() {
            return Err(format!("{} defines no valid positions", slide.display()));
        }
        return Err(format!(
            "No ROI directories found for positions in {}. Skipped positions: {}",
            slide.display(),
            skipped_positions
                .iter()
                .map(|(slide_channel, positions)| format!(
                    "slide channel {slide_channel} -> {}",
                    positions
                        .iter()
                        .map(u32::to_string)
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
                .collect::<Vec<_>>()
                .join("; ")
        ));
    }

    Ok(SlideTimeseriesRunResult {
        written_outputs,
        skipped_positions,
    })
}

pub fn format_written_timeseries_csv_message(
    slide_channel: u32,
    output_csv: &Path,
    position_count: usize,
) -> String {
    format!(
        "Wrote metrics CSV for slide channel {slide_channel} with {position_count} positions: {}",
        output_csv.display()
    )
}

pub fn format_skipped_positions_message(skipped_positions: &BTreeMap<u32, Vec<u32>>) -> String {
    let total = skipped_positions.values().map(Vec::len).sum::<usize>();
    let summary = skipped_positions
        .iter()
        .map(|(slide_channel, positions)| {
            format!(
                "slide channel {slide_channel} -> {}",
                positions
                    .iter()
                    .map(u32::to_string)
                    .collect::<Vec<_>>()
                    .join(", ")
            )
        })
        .collect::<Vec<_>>()
        .join("; ");
    format!("Skipped {total} missing positions from slide mapping: {summary}")
}

pub fn execute(args: TimeseriesArgs) -> Result<(), String> {
    let result = run_slide_timeseries(
        &args.workspace,
        &args.slide,
        args.output_csv.as_deref(),
        args.correction_quartile,
        Some(
            |slide_channel: u32, output_csv: &Path, position_count: usize| {
                println!(
                    "{}",
                    format_written_timeseries_csv_message(
                        slide_channel,
                        output_csv,
                        position_count
                    )
                );
            },
        ),
    )?;

    if !result.skipped_positions.is_empty() {
        println!(
            "{}",
            format_skipped_positions_message(&result.skipped_positions)
        );
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_slide_timeseries_csv_path_uses_slide_stem() {
        let workspace = PathBuf::from("/tmp/workspace");
        let slide = PathBuf::from("/tmp/plate-a.json");
        let path = default_slide_timeseries_csv_path(&workspace, &slide, 4, 2, None);
        assert!(path.ends_with("timeseries/plate-a_sc4_ch002_timeseries.csv"));
    }
}
