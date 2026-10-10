//! Dispatch into `lisca-killing` for fluorescent engagement.
//!
//! The counts, the shared fluorescence scale, and the CSV / Excel tables live
//! in the killing-assay crate. This module schedules those stages and draws
//! the per-sample figures with the shared plot composer.

use std::cmp::Ordering;
use std::path::{Path, PathBuf};

use crate::analysis::output::collect_csv_outputs;
use crate::analysis::progress::{analysis_progress, run_blocking};
use crate::analysis::sample::{build_sample_mapping, parse_interval_minutes, SampleMapping};
use crate::protocol::{AnalysisCsvFile, AnalysisProgress, AnalysisStage, AssayJsonFile};

use super::killing::to_killing_mapping;

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
    lisca_killing::run_position_engagement(
        workspace,
        &to_killing_mapping(mapping),
        position,
        interval_minutes,
    )
}

pub fn write_summary(workspace: &Path, mapping: &SampleMapping) -> Result<(), String> {
    lisca_killing::write_engagement_summary(workspace, &to_killing_mapping(mapping))
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

pub fn run_plot_traces(
    workspace: &Path,
    mapping: &SampleMapping,
    interval_minutes: f64,
) -> Result<(), String> {
    if interval_minutes <= 0.0 {
        return Err(format!("interval must be > 0, got {interval_minutes}"));
    }
    let csvs = lisca_killing::discover_engagement_csvs(&workspace.join("analysis"))?;
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

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    use lisca_killing::{
        component_count as unique_labels, label_components, mask_with_scale,
        split_round_components, FluorescenceHistogram, ENGAGER_DIAMETER_PX,
    };

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
