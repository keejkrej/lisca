use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use clap::Args;

use lisca::analysis::roi::load_timeseries_csv;

pub const HELP: &str =
    "Fit each ROI trace to a frame-grid onset model: y=d before onset and y=d+amplitude*(1-exp(-b*(t-t_onset))) after onset, where t is measured in minutes from t * --interval.";
const ASYMPTOTE_COARSE_CANDIDATE_COUNT: usize = 64;
const ASYMPTOTE_REFINE_CANDIDATE_COUNT: usize = 32;
const ASYMPTOTE_REFINE_PASSES: usize = 2;

#[derive(Clone, Debug, PartialEq)]
pub struct FitRow {
    pub slide_channel: Option<u32>,
    pub pos: Option<u32>,
    pub roi: u32,
    pub d: Option<f64>,
    pub b: Option<f64>,
    pub t_onset: Option<f64>,
    pub amplitude: Option<f64>,
    pub c: Option<f64>,
    pub intensity_offset: Option<f64>,
    pub mrna_decay_rate: Option<f64>,
    pub expression_onset: Option<f64>,
    pub expression_amplitude: Option<f64>,
    pub success: bool,
}

#[derive(Clone, Debug, Args)]
#[command(about = HELP)]
pub struct FitArgs {
    #[arg(help = "One or more long-form ROI timeseries CSV files to fit.")]
    pub timeseries_csvs: Vec<PathBuf>,
    #[arg(
        long,
        help = "Frame interval in minutes used to convert t into time for fitting y=d before onset and y=d+amplitude*(1-exp(-b*(t-t_onset))) after onset."
    )]
    pub interval: f64,
    #[arg(
        long,
        help = "Output CSV path. Default: derive a shared <stem>_fit.csv path."
    )]
    pub output_csv: Option<PathBuf>,
}

#[derive(Clone, Copy, Debug)]
struct FitResult {
    d: f64,
    b: f64,
    t_onset: f64,
    amplitude: f64,
    c: f64,
}

#[derive(Clone, Copy, Debug)]
struct ScoredFit {
    score: f64,
    result: FitResult,
}

pub fn run_fit(
    timeseries_csvs: &[PathBuf],
    interval: f64,
    output_csv: Option<&Path>,
) -> Result<PathBuf, String> {
    if interval <= 0.0 {
        return Err(format!("--interval must be > 0, got {interval}"));
    }
    let rows = compute_fit_table(timeseries_csvs, interval)?;
    let output_path = default_output_csv_path(timeseries_csvs, output_csv);
    write_fit_csv(&rows, &output_path)?;
    Ok(output_path)
}

pub fn default_output_csv_path(timeseries_csvs: &[PathBuf], output_csv: Option<&Path>) -> PathBuf {
    if let Some(path) = output_csv {
        return path.to_path_buf();
    }

    let stems = timeseries_csvs
        .iter()
        .map(|path| super::auc::normalize_output_stem(path))
        .collect::<std::collections::BTreeSet<_>>();
    let stem = if stems.len() == 1 {
        stems.into_iter().next().unwrap()
    } else if timeseries_csvs.len() == 1 {
        timeseries_csvs[0]
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("timeseries")
            .to_string()
    } else {
        "timeseries".to_string()
    };
    timeseries_csvs
        .first()
        .cloned()
        .unwrap_or_else(|| PathBuf::from("timeseries.csv"))
        .with_file_name(format!("{stem}_fit.csv"))
}

pub fn compute_fit_table(
    timeseries_csvs: &[PathBuf],
    interval: f64,
) -> Result<Vec<FitRow>, String> {
    let mut fit_rows = Vec::new();
    let mut csvs = timeseries_csvs.to_vec();
    csvs.sort_by(|a, b| a.file_name().cmp(&b.file_name()));

    for csv_path in csvs {
        let slide_channel = super::auc::parse_slide_channel(&csv_path);
        let rows = load_timeseries_csv(&csv_path)?;
        let mut grouped = BTreeMap::<(Option<u32>, u32), Vec<(u32, f64)>>::new();
        for row in rows {
            grouped
                .entry((row.pos, row.roi))
                .or_default()
                .push((row.t, row.corrected));
        }

        for ((pos, roi), mut trace) in grouped {
            trace.sort_by_key(|(t, _)| *t);
            let fitted = fit_trace(&trace, interval);
            fit_rows.push(FitRow {
                slide_channel,
                pos,
                roi,
                d: fitted.map(|candidate| candidate.d),
                b: fitted.map(|candidate| candidate.b),
                t_onset: fitted.map(|candidate| candidate.t_onset),
                amplitude: fitted.map(|candidate| candidate.amplitude),
                c: fitted.map(|candidate| candidate.c),
                intensity_offset: fitted.map(|candidate| derive_parameters(candidate).0),
                mrna_decay_rate: fitted.map(|candidate| derive_parameters(candidate).1),
                expression_onset: fitted.map(|candidate| derive_parameters(candidate).2),
                expression_amplitude: fitted.map(|candidate| derive_parameters(candidate).3),
                success: fitted.is_some(),
            });
        }
    }

    if fit_rows.is_empty() {
        return Err("No fit rows produced".to_string());
    }

    fit_rows.sort_by(|a, b| {
        a.slide_channel
            .cmp(&b.slide_channel)
            .then(a.pos.cmp(&b.pos))
            .then(a.roi.cmp(&b.roi))
    });
    Ok(fit_rows)
}

pub fn write_fit_csv(rows: &[FitRow], output_csv: &Path) -> Result<(), String> {
    if let Some(parent) = output_csv.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let mut writer = csv::Writer::from_path(output_csv).map_err(|err| err.to_string())?;
    writer
        .write_record([
            "slide_channel",
            "pos",
            "roi",
            "d",
            "b",
            "t_onset",
            "amplitude",
            "c",
            "intensity_offset",
            "mrna_decay_rate",
            "expression_onset",
            "expression_amplitude",
            "success",
        ])
        .map_err(|err| err.to_string())?;
    for row in rows {
        writer
            .write_record([
                row.slide_channel
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                row.pos.map(|value| value.to_string()).unwrap_or_default(),
                row.roi.to_string(),
                row.d.map(|value| value.to_string()).unwrap_or_default(),
                row.b.map(|value| value.to_string()).unwrap_or_default(),
                row.t_onset.map(|value| value.to_string()).unwrap_or_default(),
                row.amplitude
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                row.c.map(|value| value.to_string()).unwrap_or_default(),
                row.intensity_offset
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                row.mrna_decay_rate
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                row.expression_onset
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                row.expression_amplitude
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                row.success.to_string(),
            ])
            .map_err(|err| err.to_string())?;
    }
    writer.flush().map_err(|err| err.to_string())
}

pub fn format_written_fit_csv_message(output_csv: &Path) -> String {
    format!("Wrote fit CSV: {}", output_csv.display())
}

pub fn execute(args: FitArgs) -> Result<(), String> {
    let output = run_fit(
        &args.timeseries_csvs,
        args.interval,
        args.output_csv.as_deref(),
    )?;
    println!("{}", format_written_fit_csv_message(&output));
    Ok(())
}

fn derive_parameters(result: FitResult) -> (f64, f64, f64, f64) {
    (
        result.d,
        result.b,
        result.t_onset,
        result.amplitude,
    )
}

fn fit_trace(trace: &[(u32, f64)], interval: f64) -> Option<FitResult> {
    if trace.len() < 3 {
        return None;
    }

    let points = trace
        .iter()
        .map(|(t, value)| (*t as f64 * interval, *value))
        .collect::<Vec<_>>();
    if points
        .windows(2)
        .all(|window| (window[0].0 - window[1].0).abs() <= f64::EPSILON)
    {
        return None;
    }

    let y_min = points.iter().map(|(_, value)| *value).fold(f64::INFINITY, f64::min);
    let y_max = points
        .iter()
        .map(|(_, value)| *value)
        .fold(f64::NEG_INFINITY, f64::max);
    if (y_max - y_min).abs() <= 1e-12 {
        return None;
    }

    let mut best = None;
    for onset_index in 0..points.len().saturating_sub(1) {
        let candidate = evaluate_onset_candidate(&points, onset_index);
        if let Some(candidate) = candidate {
            if best
                .as_ref()
                .map_or(true, |best_candidate: &ScoredFit| candidate.score < best_candidate.score)
            {
                best = Some(candidate);
            }
        }
    }

    best.map(|candidate: ScoredFit| candidate.result)
}

fn evaluate_onset_candidate(points: &[(f64, f64)], onset_index: usize) -> Option<ScoredFit> {
    let post_points = &points[onset_index..];
    if post_points.len() < 2 {
        return None;
    }

    let dt = post_points
        .iter()
        .map(|(time, _)| *time - post_points[0].0)
        .collect::<Vec<_>>();
    if dt
        .windows(2)
        .all(|window| (window[0] - window[1]).abs() <= f64::EPSILON)
    {
        return None;
    }

    let candidate_d = if onset_index == 0 {
        points[0].1
    } else {
        median(
            &points[..onset_index]
                .iter()
                .map(|(_, value)| *value)
                .collect::<Vec<_>>(),
        )
    };
    if !candidate_d.is_finite() {
        return None;
    }

    let post_values = post_points.iter().map(|(_, value)| *value).collect::<Vec<_>>();
    let post_max = post_values.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let post_min = post_values.iter().copied().fold(f64::INFINITY, f64::min);
    let span = (post_max - post_min).max(0.0);
    let scale = post_max.abs().max(candidate_d.abs()).max(span).max(1.0);
    let min_gap = (span * 1e-6).max(scale * 1e-9).max(1e-12);
    let max_gap = (scale * 1e6).max(span * 1e6).max(1.0);

    let mut best = None;
    let mut lower = min_gap.ln();
    let mut upper = max_gap.ln();
    let mut counts = vec![ASYMPTOTE_COARSE_CANDIDATE_COUNT];
    counts.extend((0..ASYMPTOTE_REFINE_PASSES).map(|_| ASYMPTOTE_REFINE_CANDIDATE_COUNT));

    for count in counts {
        let log_gaps = linspace(lower, upper, count);
        let mut stage_best = None;
        let mut best_index = None;
        for (index, log_gap) in log_gaps.iter().enumerate() {
            let candidate = evaluate_asymptote_candidate(
                points,
                &dt,
                &post_values,
                candidate_d,
                post_points[0].0,
                post_max + log_gap.exp(),
            );
            if let Some(candidate) = candidate {
                if stage_best
                    .as_ref()
                    .map_or(true, |best_candidate: &ScoredFit| candidate.score < best_candidate.score)
                {
                    stage_best = Some(candidate);
                    best_index = Some(index);
                }
            }
        }

        let Some(candidate) = stage_best else {
            break;
        };
        if best
            .as_ref()
            .map_or(true, |best_candidate: &ScoredFit| candidate.score < best_candidate.score)
        {
            best = Some(candidate);
        }

        if log_gaps.len() <= 1 {
            break;
        }
        let index = best_index.unwrap();
        lower = log_gaps[index.saturating_sub(1)];
        upper = log_gaps[(index + 1).min(log_gaps.len() - 1)];
        if upper <= lower {
            break;
        }
    }

    best
}

fn evaluate_asymptote_candidate(
    points: &[(f64, f64)],
    dt: &[f64],
    post_values: &[f64],
    candidate_d: f64,
    t_onset: f64,
    candidate_c: f64,
) -> Option<ScoredFit> {
    let deltas = post_values
        .iter()
        .map(|value| candidate_c - value)
        .collect::<Vec<_>>();
    if deltas
        .iter()
        .any(|delta| !delta.is_finite() || *delta <= 0.0)
    {
        return None;
    }

    let log_deltas = deltas.iter().map(|delta| delta.ln()).collect::<Vec<_>>();
    let dt_mean = dt.iter().sum::<f64>() / dt.len() as f64;
    let centered_dt = dt.iter().map(|time| *time - dt_mean).collect::<Vec<_>>();
    let denominator = centered_dt.iter().map(|value| value * value).sum::<f64>();
    if denominator <= 0.0 {
        return None;
    }

    let log_delta_mean = log_deltas.iter().sum::<f64>() / log_deltas.len() as f64;
    let slope = centered_dt
        .iter()
        .zip(log_deltas.iter())
        .map(|(time, value)| time * (value - log_delta_mean))
        .sum::<f64>()
        / denominator;
    let intercept = log_delta_mean - slope * dt_mean;
    if !intercept.is_finite() {
        return None;
    }

    let b = -slope;
    if !b.is_finite() || b <= 0.0 {
        return None;
    }

    let amplitude = candidate_c - candidate_d;
    if !amplitude.is_finite() || amplitude <= 0.0 {
        return None;
    }

    let predicted = points
        .iter()
        .map(|(time, _)| {
            if *time < t_onset {
                candidate_d
            } else {
                candidate_d + amplitude * (1.0 - (-b * (*time - t_onset)).exp())
            }
        })
        .collect::<Vec<_>>();
    if predicted.iter().any(|value| !value.is_finite()) {
        return None;
    }

    let sse = predicted
        .iter()
        .zip(points.iter())
        .map(|(predicted_value, (_, observed_value))| {
            let residual = predicted_value - observed_value;
            residual * residual
        })
        .sum::<f64>();
    if !sse.is_finite() {
        return None;
    }

    let intercept_error = (intercept - amplitude.ln()).powi(2);
    let score = sse + intercept_error * 1e-12;
    Some(ScoredFit {
        score,
        result: FitResult {
            d: candidate_d,
            b,
            t_onset,
            amplitude,
            c: candidate_c,
        },
    })
}

fn linspace(lower: f64, upper: f64, count: usize) -> Vec<f64> {
    if count <= 1 {
        return vec![(lower + upper) * 0.5];
    }
    (0..count)
        .map(|index| {
            let fraction = index as f64 / (count.saturating_sub(1)) as f64;
            lower + (upper - lower) * fraction
        })
        .collect::<Vec<_>>()
}

fn median(values: &[f64]) -> f64 {
    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.total_cmp(b));
    if sorted.is_empty() {
        return f64::NAN;
    }
    let mid = sorted.len() / 2;
    if sorted.len() % 2 == 0 {
        (sorted[mid - 1] + sorted[mid]) * 0.5
    } else {
        sorted[mid]
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::*;

    #[test]
    fn default_output_csv_path_strips_slide_channel_segment() {
        let csv_paths = vec![
            PathBuf::from("/tmp/slide_sc0_ch001_timeseries.csv"),
            PathBuf::from("/tmp/slide_sc2_ch001_timeseries.csv"),
        ];
        let output = default_output_csv_path(&csv_paths, None);
        assert!(output.ends_with("slide_ch001_timeseries_fit.csv"));
    }

    #[test]
    fn compute_fit_table_recovers_plateau_and_direct_rise_traces() {
        let tempdir = tempdir().unwrap();
        let csv_path = tempdir.path().join("slide_sc2_ch001_timeseries.csv");
        let interval = 2.5;
        let onset_frame = 2;
        let mut contents = String::from("pos,roi,t,corrected\n");
        for frame in 0..8 {
            let t_min = frame as f64 * interval;
            let corrected = if frame < onset_frame {
                2.0
            } else {
                2.0 + 8.0 * (1.0 - (-0.3 * ((frame - onset_frame) as f64 * interval)).exp())
            };
            contents.push_str(&format!("25,0,{frame},{corrected}\n"));
            let direct = 3.5 + 2.0 * (1.0 - (-0.4 * t_min).exp());
            contents.push_str(&format!("25,1,{frame},{direct}\n"));
        }
        fs::write(&csv_path, contents).unwrap();

        let rows = compute_fit_table(&[csv_path], interval).unwrap();

        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].slide_channel, Some(2));
        assert_eq!(rows[0].pos, Some(25));
        assert_eq!(rows[0].roi, 0);
        assert!(rows[0].success);
        assert!((rows[0].d.unwrap() - 2.0).abs() <= 0.05);
        assert!((rows[0].b.unwrap() - 0.3).abs() <= 0.02);
        assert_eq!(rows[0].t_onset.unwrap(), onset_frame as f64 * interval);
        assert!((rows[0].amplitude.unwrap() - 8.0).abs() <= 0.08);
        assert!((rows[0].c.unwrap() - 10.0).abs() <= 0.05);
        assert!((rows[0].intensity_offset.unwrap() - 2.0).abs() <= 0.05);
        assert!((rows[0].mrna_decay_rate.unwrap() - 0.3).abs() <= 0.02);
        assert_eq!(rows[0].expression_onset.unwrap(), onset_frame as f64 * interval);
        assert!((rows[0].expression_amplitude.unwrap() - 8.0).abs() <= 0.08);

        assert!(rows[1].success);
        assert!((rows[1].d.unwrap() - 3.5).abs() <= 0.05);
        assert!((rows[1].b.unwrap() - 0.4).abs() <= 0.02);
        assert_eq!(rows[1].t_onset.unwrap(), 0.0);
        assert!((rows[1].amplitude.unwrap() - 2.0).abs() <= 0.05);
        assert!((rows[1].c.unwrap() - 5.5).abs() <= 0.05);
        assert!((rows[1].intensity_offset.unwrap() - 3.5).abs() <= 0.05);
        assert!((rows[1].mrna_decay_rate.unwrap() - 0.4).abs() <= 0.02);
        assert_eq!(rows[1].expression_onset.unwrap(), 0.0);
        assert!((rows[1].expression_amplitude.unwrap() - 2.0).abs() <= 0.05);
    }

    #[test]
    fn write_fit_csv_preserves_failed_rows_with_blank_coefficients() {
        let tempdir = tempdir().unwrap();
        let output_csv = tempdir.path().join("fit.csv");
        let rows = vec![FitRow {
            slide_channel: Some(0),
            pos: Some(12),
            roi: 1,
            d: None,
            b: None,
            t_onset: None,
            amplitude: None,
            c: None,
            intensity_offset: None,
            mrna_decay_rate: None,
            expression_onset: None,
            expression_amplitude: None,
            success: false,
        }];

        write_fit_csv(&rows, &output_csv).unwrap();

        let contents = fs::read_to_string(output_csv).unwrap();
        assert!(contents.contains("slide_channel,pos,roi,d,b,t_onset,amplitude,c,intensity_offset,mrna_decay_rate,expression_onset,expression_amplitude,success"));
        assert!(contents.contains("0,12,1,,,,,,,,,,false"));
    }
}
