use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use clap::Args;

use crate::expression::{auc, fit, plot_auc, plot_timeseries, timeseries};

pub const HELP: &str = "Run the full delivery analysis workflow for a slide-mapped ROI workspace and write timeseries CSVs, AUC summary, exponential fit summary, and plots.";

#[derive(Clone, Debug)]
pub struct AnalyzeRunResult {
    pub workspace: PathBuf,
    pub slide: PathBuf,
    pub channel: u32,
    pub interval: f64,
    pub timeseries_csvs: Vec<PathBuf>,
    pub auc_csv: PathBuf,
    pub fit_csv: PathBuf,
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
    #[arg(
        long,
        help = "Frame interval in minutes used when integrating AUC and fitting y=intensity_offset + expression_amplitude * (exp(-protein_decay_rate*t) - exp(-mrna_decay_rate*t))."
    )]
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
    run_analysis_with(
        workspace,
        slide,
        channel,
        interval,
        |workspace, slide, channel, output_csv| {
            timeseries::run_slide_timeseries(
                workspace,
                slide,
                channel,
                output_csv,
                timeseries::DELIVERY_CORRECTION_QUARTILE,
                None::<fn(u32, &Path, usize)>,
            )
        },
        |csvs, interval, output_csv| auc::run_auc(csvs, interval, output_csv),
        |csvs, interval, output_csv| fit::run_fit(csvs, interval, output_csv),
        |csvs, output_plot, columns, alpha, linewidth, color, title| {
            plot_timeseries::run_plot_timeseries(
                csvs,
                output_plot,
                columns,
                alpha,
                linewidth,
                color,
                title,
            )
        },
        |auc_csv, output_plot, color, title| {
            plot_auc::run_plot_auc(auc_csv, output_plot, color, title)
        },
        on_stage,
        on_output,
    )
}

fn run_analysis_with<RT, RA, RF, RPT, RPA, FS, FO>(
    workspace: &Path,
    slide: &Path,
    channel: u32,
    interval: f64,
    mut run_timeseries: RT,
    mut run_auc: RA,
    mut run_fit: RF,
    mut run_plot_timeseries: RPT,
    mut run_plot_auc: RPA,
    mut on_stage: Option<FS>,
    mut on_output: Option<FO>,
) -> Result<AnalyzeRunResult, String>
where
    RT: FnMut(&Path, &Path, u32, Option<&Path>) -> Result<timeseries::SlideTimeseriesRunResult, String>,
    RA: FnMut(&[PathBuf], f64, Option<&Path>) -> Result<PathBuf, String>,
    RF: FnMut(&[PathBuf], f64, Option<&Path>) -> Result<PathBuf, String>,
    RPT: FnMut(&[PathBuf], Option<&Path>, usize, f64, f64, &str, Option<&str>) -> Result<PathBuf, String>,
    RPA: FnMut(&Path, Option<&Path>, &str, Option<&str>) -> Result<PathBuf, String>,
    FS: FnMut(usize, usize, &str),
    FO: FnMut(&str),
{
    let total_steps = 5;
    if let Some(ref mut callback) = on_stage {
        callback(0, total_steps, "Computing timeseries CSVs");
    }
    let timeseries_result = run_timeseries(workspace, slide, channel, None)?;
    if let Some(ref mut callback) = on_output {
        for (slide_channel, output_csv, position_count) in &timeseries_result.written_outputs {
            callback(&timeseries::format_written_timeseries_csv_message(
                *slide_channel,
                output_csv,
                *position_count,
            ));
        }
    }
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
    let auc_csv = run_auc(&timeseries_csvs, interval, None)?;
    if let Some(ref mut callback) = on_output {
        callback(&auc::format_written_auc_csv_message(&auc_csv));
    }

    if let Some(ref mut callback) = on_stage {
        callback(2, total_steps, "Computing exponential fit summary");
    }
    let fit_csv = run_fit(&timeseries_csvs, interval, None)?;
    if let Some(ref mut callback) = on_output {
        callback(&fit::format_written_fit_csv_message(&fit_csv));
    }

    if let Some(ref mut callback) = on_stage {
        callback(3, total_steps, "Rendering timeseries plot");
    }
    let timeseries_plot = run_plot_timeseries(
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
        callback(4, total_steps, "Rendering AUC plot");
    }
    let auc_plot = run_plot_auc(&auc_csv, None, "#c03a2b", Some("AUC by slide channel"))?;
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
        fit_csv,
        timeseries_plot,
        auc_plot,
        skipped_positions: timeseries_result.skipped_positions,
    };
    if let Some(ref mut callback) = on_stage {
        callback(total_steps, total_steps, "Analysis complete");
    }
    Ok(result)
}

pub fn format_completed_analysis_message(result: &AnalyzeRunResult) -> String {
    format!(
        "Completed analysis for channel {}: {} timeseries CSVs, 1 AUC CSV, 1 fit CSV, and 2 plots.",
        result.channel,
        result.timeseries_csvs.len()
    )
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

    eprintln!("{}", format_completed_analysis_message(&result));
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use super::*;

    #[test]
    fn run_analysis_orchestrates_fit_between_auc_and_plots() {
        let workspace = PathBuf::from("/tmp/workspace");
        let slide = PathBuf::from("/tmp/slide.json");
        let timeseries_csv_a = PathBuf::from("/tmp/slide_sc0_ch001_timeseries.csv");
        let timeseries_csv_b = PathBuf::from("/tmp/slide_sc2_ch001_timeseries.csv");
        let auc_csv = PathBuf::from("/tmp/slide_ch001_timeseries_auc.csv");
        let fit_csv = PathBuf::from("/tmp/slide_ch001_timeseries_fit.csv");
        let timeseries_plot = PathBuf::from("/tmp/slide_ch001_timeseries_combined.png");
        let auc_plot = PathBuf::from("/tmp/slide_ch001_timeseries_auc.png");
        let calls = RefCell::new(Vec::<String>::new());
        let output_messages = RefCell::new(Vec::<String>::new());

        let result = run_analysis_with(
            &workspace,
            &slide,
            1,
            10.0,
            |workspace_arg, slide_arg, channel, output_csv| {
                calls.borrow_mut().push(format!(
                    "timeseries:{}:{}:{}:{}",
                    workspace_arg == workspace.as_path(),
                    slide_arg == slide.as_path(),
                    channel,
                    output_csv.is_none()
                ));
                Ok(timeseries::SlideTimeseriesRunResult {
                    written_outputs: vec![
                        (0, timeseries_csv_a.clone(), 2),
                        (2, timeseries_csv_b.clone(), 3),
                    ],
                    skipped_positions: BTreeMap::from([(2, vec![26])]),
                })
            },
            |csvs, interval, output_csv| {
                calls.borrow_mut().push(format!(
                    "auc:{}:{}:{}",
                    csvs.len(),
                    interval,
                    output_csv.is_none()
                ));
                Ok(auc_csv.clone())
            },
            |csvs, interval, output_csv| {
                calls.borrow_mut().push(format!(
                    "fit:{}:{}:{}",
                    csvs.len(),
                    interval,
                    output_csv.is_none()
                ));
                Ok(fit_csv.clone())
            },
            |csvs, output_plot, columns, alpha, linewidth, color, title| {
                calls.borrow_mut().push(format!(
                    "plot_timeseries:{}:{}:{}:{}:{}:{}:{}",
                    csvs.len(),
                    output_plot.is_none(),
                    columns,
                    alpha,
                    linewidth,
                    color,
                    title.unwrap_or_default()
                ));
                Ok(timeseries_plot.clone())
            },
            |auc_csv_arg, output_plot, color, title| {
                calls.borrow_mut().push(format!(
                    "plot_auc:{}:{}:{}:{}",
                    auc_csv_arg == auc_csv.as_path(),
                    output_plot.is_none(),
                    color,
                    title.unwrap_or_default()
                ));
                Ok(auc_plot.clone())
            },
            None::<fn(usize, usize, &str)>,
            Some(|message: &str| output_messages.borrow_mut().push(message.to_string())),
        )
        .unwrap();

        assert_eq!(result.timeseries_csvs, vec![timeseries_csv_a.clone(), timeseries_csv_b.clone()]);
        assert_eq!(result.auc_csv, auc_csv);
        assert_eq!(result.fit_csv, fit_csv);
        assert_eq!(result.timeseries_plot, timeseries_plot);
        assert_eq!(result.auc_plot, auc_plot);
        assert_eq!(result.skipped_positions, BTreeMap::from([(2, vec![26])]));
        assert_eq!(
            calls.into_inner(),
            vec![
                "timeseries:true:true:1:true",
                "auc:2:10:true",
                "fit:2:10:true",
                "plot_timeseries:2:true:3:0.12:1:#c03a2b:",
                "plot_auc:true:true:#c03a2b:AUC by slide channel",
            ]
        );
        assert_eq!(
            output_messages.into_inner(),
            vec![
                timeseries::format_written_timeseries_csv_message(0, &timeseries_csv_a, 2),
                timeseries::format_written_timeseries_csv_message(2, &timeseries_csv_b, 3),
                timeseries::format_skipped_positions_message(&BTreeMap::from([(2, vec![26])])),
                auc::format_written_auc_csv_message(&result.auc_csv),
                fit::format_written_fit_csv_message(&result.fit_csv),
                plot_timeseries::format_written_timeseries_plot_message(&result.timeseries_plot),
                plot_auc::format_written_auc_plot_message(&result.auc_plot),
            ]
        );
    }

    #[test]
    fn run_analysis_emits_five_stage_updates() {
        let mut stage_updates = Vec::<(usize, usize, String)>::new();

        run_analysis_with(
            Path::new("/tmp/workspace"),
            Path::new("/tmp/slide.json"),
            1,
            10.0,
            |_workspace, _slide, _channel, _output_csv| {
                Ok(timeseries::SlideTimeseriesRunResult {
                    written_outputs: vec![(0, PathBuf::from("/tmp/slide_sc0_ch001_timeseries.csv"), 2)],
                    skipped_positions: BTreeMap::new(),
                })
            },
            |_csvs, _interval, _output_csv| Ok(PathBuf::from("/tmp/auc.csv")),
            |_csvs, _interval, _output_csv| Ok(PathBuf::from("/tmp/fit.csv")),
            |_csvs, _output_plot, _columns, _alpha, _linewidth, _color, _title| {
                Ok(PathBuf::from("/tmp/timeseries.png"))
            },
            |_auc_csv, _output_plot, _color, _title| Ok(PathBuf::from("/tmp/auc.png")),
            Some(|completed, total, description| {
                stage_updates.push((completed, total, description.to_string()))
            }),
            None::<fn(&str)>,
        )
        .unwrap();

        assert_eq!(
            stage_updates,
            vec![
                (0, 5, "Computing timeseries CSVs".to_string()),
                (1, 5, "Computing AUC summary".to_string()),
                (2, 5, "Computing exponential fit summary".to_string()),
                (3, 5, "Rendering timeseries plot".to_string()),
                (4, 5, "Rendering AUC plot".to_string()),
                (5, 5, "Analysis complete".to_string()),
            ]
        );
    }

    #[test]
    fn completed_analysis_message_mentions_fit_csv() {
        let result = AnalyzeRunResult {
            workspace: PathBuf::from("/tmp/workspace"),
            slide: PathBuf::from("/tmp/slide.json"),
            channel: 1,
            interval: 10.0,
            timeseries_csvs: vec![PathBuf::from("/tmp/a.csv"), PathBuf::from("/tmp/b.csv")],
            auc_csv: PathBuf::from("/tmp/auc.csv"),
            fit_csv: PathBuf::from("/tmp/fit.csv"),
            timeseries_plot: PathBuf::from("/tmp/timeseries.png"),
            auc_plot: PathBuf::from("/tmp/auc.png"),
            skipped_positions: BTreeMap::new(),
        };

        assert_eq!(
            format_completed_analysis_message(&result),
            "Completed analysis for channel 1: 2 timeseries CSVs, 1 AUC CSV, 1 fit CSV, and 2 plots."
        );
    }
}
