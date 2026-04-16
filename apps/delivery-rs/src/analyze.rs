use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use clap::Args;

use crate::expression::{auc, plot_auc, plot_timeseries, timeseries};

pub const HELP: &str = "Run the full delivery analysis workflow for a slide-mapped ROI workspace and write timeseries CSVs, AUC summary, and plots.";

#[derive(Clone, Debug)]
pub struct AnalyzeRunResult {
    pub workspace: PathBuf,
    pub slide: PathBuf,
    pub channel: u32,
    pub interval: f64,
    pub timeseries_csvs: Vec<PathBuf>,
    pub auc_csv: PathBuf,
    pub timeseries_plot: PathBuf,
    pub auc_plot: PathBuf,
    pub skipped_positions: BTreeMap<u32, Vec<u32>>,
}

#[derive(Clone, Debug, Args)]
#[command(about = HELP)]
pub struct AnalyzeArgs {
    #[arg(help = "Workspace containing roi/PosN/index.json and Roi*.tif files.")]
    pub workspace: PathBuf,
    #[arg(
        long,
        help = "Microscopy slide mapping JSON from slide channel to position list."
    )]
    pub slide: PathBuf,
    #[arg(long, help = "Channel index in the cropped ROI TIFF timelapses.")]
    pub channel: u32,
    #[arg(long, help = "Frame interval in minutes used when integrating AUC.")]
    pub interval: f64,
}

pub fn run_analysis<FS, FO>(
    workspace: &Path,
    slide: &Path,
    channel: u32,
    interval: f64,
    mut on_stage: Option<FS>,
    mut on_output: Option<FO>,
) -> Result<AnalyzeRunResult, String>
where
    FS: FnMut(usize, usize, &str),
    FO: FnMut(&str),
{
    let total_steps = 4;
    if let Some(ref mut callback) = on_stage {
        callback(0, total_steps, "Computing timeseries CSVs");
    }
    let timeseries_result = timeseries::run_slide_timeseries(
        workspace,
        slide,
        channel,
        None,
        timeseries::DELIVERY_CORRECTION_QUARTILE,
        on_output.as_mut().map(|callback| {
            move |slide_channel: u32, output_csv: &Path, position_count: usize| {
                callback(&timeseries::format_written_timeseries_csv_message(
                    slide_channel,
                    output_csv,
                    position_count,
                ));
            }
        }),
    )?;
    if !timeseries_result.skipped_positions.is_empty() {
        if let Some(ref mut callback) = on_output {
            callback(&timeseries::format_skipped_positions_message(
                &timeseries_result.skipped_positions,
            ));
        }
    }

    let timeseries_csvs = timeseries_result
        .written_outputs
        .iter()
        .map(|(_, path, _)| path.clone())
        .collect::<Vec<_>>();
    if let Some(ref mut callback) = on_stage {
        callback(1, total_steps, "Computing AUC summary");
    }
    let auc_csv = auc::run_auc(&timeseries_csvs, interval, None)?;
    if let Some(ref mut callback) = on_output {
        callback(&auc::format_written_auc_csv_message(&auc_csv));
    }

    if let Some(ref mut callback) = on_stage {
        callback(2, total_steps, "Rendering timeseries plot");
    }
    let timeseries_plot = plot_timeseries::run_plot_timeseries(
        &timeseries_csvs,
        None,
        3,
        0.12,
        1.0,
        "#c03a2b",
        None,
    )?;
    if let Some(ref mut callback) = on_output {
        callback(&plot_timeseries::format_written_timeseries_plot_message(
            &timeseries_plot,
        ));
    }

    if let Some(ref mut callback) = on_stage {
        callback(3, total_steps, "Rendering AUC plot");
    }
    let auc_plot = plot_auc::run_plot_auc(&auc_csv, None, "#c03a2b", Some("AUC by slide channel"))?;
    if let Some(ref mut callback) = on_output {
        callback(&plot_auc::format_written_auc_plot_message(&auc_plot));
    }

    let result = AnalyzeRunResult {
        workspace: workspace.to_path_buf(),
        slide: slide.to_path_buf(),
        channel,
        interval,
        timeseries_csvs,
        auc_csv,
        timeseries_plot,
        auc_plot,
        skipped_positions: timeseries_result.skipped_positions,
    };
    if let Some(ref mut callback) = on_stage {
        callback(total_steps, total_steps, "Analysis complete");
    }
    Ok(result)
}

pub fn execute(args: AnalyzeArgs) -> Result<(), String> {
    let result = run_analysis(
        &args.workspace,
        &args.slide,
        args.channel,
        args.interval,
        None::<fn(usize, usize, &str)>,
        Some(|message: &str| eprintln!("{message}")),
    )
    .map_err(|error| format!("Analysis failed: {error}"))?;

    eprintln!(
        "Completed analysis for channel {}: {} timeseries CSVs, 1 AUC CSV, and 2 plots.",
        result.channel,
        result.timeseries_csvs.len()
    );
    Ok(())
}
