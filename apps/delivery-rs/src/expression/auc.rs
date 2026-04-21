use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use clap::Args;

use lisca::analysis::roi::load_timeseries_csv;

pub const HELP: &str =
    "Integrate ROI timeseries CSVs and write per-trace area-under-the-curve summaries.";

#[derive(Clone, Debug, PartialEq)]
pub struct AucRow {
    pub slide_channel: Option<u32>,
    pub pos: Option<u32>,
    pub roi: u32,
    pub auc: f64,
}

#[derive(Clone, Debug, Args)]
#[command(about = HELP)]
pub struct AucArgs {
    #[arg(help = "One or more long-form ROI timeseries CSV files to integrate.")]
    pub timeseries_csvs: Vec<PathBuf>,
    #[arg(
        long,
        help = "Frame interval in minutes used to convert t into time before integration."
    )]
    pub interval: f64,
    #[arg(
        long,
        help = "Output CSV path. Default: derive a shared <stem>_auc.csv path."
    )]
    pub output_csv: Option<PathBuf>,
}

pub fn run_auc(
    timeseries_csvs: &[PathBuf],
    interval: f64,
    output_csv: Option<&Path>,
) -> Result<PathBuf, String> {
    if interval <= 0.0 {
        return Err(format!("--interval must be > 0, got {interval}"));
    }
    let rows = compute_auc_table(timeseries_csvs, interval)?;
    let output_path = default_output_csv_path(timeseries_csvs, output_csv);
    write_auc_csv(&rows, &output_path)?;
    Ok(output_path)
}

pub fn normalize_output_stem(csv_path: &Path) -> String {
    let stem = csv_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    normalize_output_stem_with(stem, false)
}

pub fn parse_image_channel(csv_path: &Path) -> Option<u32> {
    let stem = csv_path.file_stem()?.to_str()?;
    let marker = stem.find("_ch")?;
    let digits = stem[marker + 3..]
        .chars()
        .take_while(|c| c.is_ascii_digit())
        .collect::<String>();
    if digits.is_empty() {
        return None;
    }
    digits.parse().ok()
}

pub fn aggregate_output_stem(timeseries_csvs: &[PathBuf]) -> String {
    let parsed_channels = timeseries_csvs
        .iter()
        .filter_map(|path| parse_image_channel(path))
        .collect::<std::collections::BTreeSet<_>>();
    let drop_image_channel = parsed_channels.len() > 1;
    let stems = timeseries_csvs
        .iter()
        .map(|path| {
            let stem = path
                .file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or_default();
            normalize_output_stem_with(stem, drop_image_channel)
        })
        .collect::<std::collections::BTreeSet<_>>();
    if stems.len() == 1 {
        stems.into_iter().next().unwrap()
    } else if timeseries_csvs.len() == 1 {
        let stem = timeseries_csvs[0]
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or_default();
        normalize_output_stem_with(stem, drop_image_channel)
    } else {
        "timeseries".to_string()
    }
}

pub fn aggregate_output_stem_candidates(csv_path: &Path) -> std::collections::BTreeSet<String> {
    let stem = csv_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    std::collections::BTreeSet::from([
        normalize_output_stem_with(stem, false),
        normalize_output_stem_with(stem, true),
    ])
}

pub fn default_output_csv_path(timeseries_csvs: &[PathBuf], output_csv: Option<&Path>) -> PathBuf {
    if let Some(path) = output_csv {
        return path.to_path_buf();
    }

    let stem = aggregate_output_stem(timeseries_csvs);
    timeseries_csvs
        .first()
        .cloned()
        .unwrap_or_else(|| PathBuf::from("timeseries.csv"))
        .with_file_name(format!("{stem}_auc.csv"))
}

pub fn parse_slide_channel(csv_path: &Path) -> Option<u32> {
    let stem = csv_path.file_stem()?.to_str()?;
    let marker = stem.find("_sc")?;
    let digits = stem[marker + 3..]
        .chars()
        .take_while(|c| c.is_ascii_digit())
        .collect::<String>();
    if digits.is_empty() {
        return None;
    }
    digits.parse().ok()
}

pub fn integrate_trace(trace: &[(u32, f64)], interval: f64) -> f64 {
    if trace.len() < 2 {
        return 0.0;
    }

    trace
        .windows(2)
        .map(|window| {
            let (t0, v0) = window[0];
            let (t1, v1) = window[1];
            let width = (t1 as f64 - t0 as f64) * interval;
            let height = (v0 + v1) * 0.5;
            width * height
        })
        .sum()
}

pub fn compute_auc_table(
    timeseries_csvs: &[PathBuf],
    interval: f64,
) -> Result<Vec<AucRow>, String> {
    let mut auc_rows = Vec::new();
    let mut csvs = timeseries_csvs.to_vec();
    csvs.sort_by(|a, b| a.file_name().cmp(&b.file_name()));

    for csv_path in csvs {
        let slide_channel = parse_slide_channel(&csv_path);
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
            auc_rows.push(AucRow {
                slide_channel,
                pos,
                roi,
                auc: integrate_trace(&trace, interval),
            });
        }
    }

    if auc_rows.is_empty() {
        return Err("No AUC rows produced".to_string());
    }

    auc_rows.sort_by(|a, b| {
        a.slide_channel
            .cmp(&b.slide_channel)
            .then(a.pos.cmp(&b.pos))
            .then(a.roi.cmp(&b.roi))
    });
    Ok(auc_rows)
}

pub fn write_auc_csv(rows: &[AucRow], output_csv: &Path) -> Result<(), String> {
    if let Some(parent) = output_csv.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let mut writer = csv::Writer::from_path(output_csv).map_err(|err| err.to_string())?;
    writer
        .write_record(["slide_channel", "pos", "roi", "auc"])
        .map_err(|err| err.to_string())?;
    for row in rows {
        writer
            .write_record([
                row.slide_channel
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                row.pos.map(|value| value.to_string()).unwrap_or_default(),
                row.roi.to_string(),
                row.auc.to_string(),
            ])
            .map_err(|err| err.to_string())?;
    }
    writer.flush().map_err(|err| err.to_string())
}

pub fn format_written_auc_csv_message(output_csv: &Path) -> String {
    format!("Wrote AUC CSV: {}", output_csv.display())
}

pub fn execute(args: AucArgs) -> Result<(), String> {
    let output = run_auc(
        &args.timeseries_csvs,
        args.interval,
        args.output_csv.as_deref(),
    )?;
    println!("{}", format_written_auc_csv_message(&output));
    Ok(())
}

fn remove_slide_channel_segment(stem: &str) -> String {
    if let Some(marker) = stem.find("_sc") {
        let digits_end = stem[marker + 3..]
            .chars()
            .take_while(|c| c.is_ascii_digit())
            .count();
        if digits_end > 0 {
            let end = marker + 3 + digits_end;
            if stem.as_bytes().get(end) == Some(&b'_') {
                let mut normalized = stem[..marker].to_string();
                normalized.push_str(&stem[end..]);
                return normalized;
            }
        }
    }
    stem.to_string()
}

fn remove_image_channel_segment(stem: &str) -> String {
    if let Some(marker) = stem.find("_ch") {
        let digits_end = stem[marker + 3..]
            .chars()
            .take_while(|c| c.is_ascii_digit())
            .count();
        if digits_end > 0 {
            let end = marker + 3 + digits_end;
            if stem.as_bytes().get(end) == Some(&b'_') {
                let mut normalized = stem[..marker].to_string();
                normalized.push_str(&stem[end..]);
                return normalized;
            }
        }
    }
    stem.to_string()
}

fn normalize_output_stem_with(stem: &str, drop_image_channel: bool) -> String {
    let normalized = remove_slide_channel_segment(stem);
    if drop_image_channel {
        remove_image_channel_segment(&normalized)
    } else {
        normalized
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_output_csv_path_strips_slide_channel_segment() {
        let csv_paths = vec![
            PathBuf::from("/tmp/slide_sc0_ch001_timeseries.csv"),
            PathBuf::from("/tmp/slide_sc2_ch001_timeseries.csv"),
        ];
        let output = default_output_csv_path(&csv_paths, None);
        assert!(output.ends_with("slide_ch001_timeseries_auc.csv"));
    }

    #[test]
    fn default_output_csv_path_drops_image_channel_for_mixed_inputs() {
        let csv_paths = vec![
            PathBuf::from("/tmp/slide_sc0_ch001_timeseries.csv"),
            PathBuf::from("/tmp/slide_sc2_ch002_timeseries.csv"),
        ];
        let output = default_output_csv_path(&csv_paths, None);
        assert!(output.ends_with("slide_timeseries_auc.csv"));
    }

    #[test]
    fn integrate_trace_uses_trapezoidal_rule() {
        let trace = vec![(0, 1.0), (1, 3.0), (2, 5.0)];
        assert_eq!(integrate_trace(&trace, 10.0), 60.0);
    }
}
