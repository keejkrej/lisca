//! Dispatch into `lisca-binding` for single-particle LNP binding (`lnp-binding`).
//!
//! Particle detection via Picasso (`x, y, intensity, radius`), per-ROI time-series
//! reductions (`particles`, `intensity_mean`, `intensity_median`, `intensity_iqr`,
//! `radius_mean`, `radius_median`, `radius_iqr`), and CSV / Excel workbooks live in
//! `lisca-binding`. This module schedules those stages and draws the per-sample
//! figures with the shared plot composer.

use std::cmp::Ordering;
use std::path::{Path, PathBuf};

use crate::analysis::output::collect_csv_outputs;
use crate::analysis::progress::{analysis_progress, run_blocking};
use crate::analysis::sample::{build_sample_mapping, parse_interval_minutes, SampleMapping};
use crate::protocol::{AnalysisCsvFile, AnalysisProgress, AnalysisStage, AssayJsonFile};

pub const BINDING_PLOT_METRICS: &[(&str, &str, &str)] = &[
    ("binding_particles", "particles", "particles"),
    (
        "binding_intensity_mean",
        "intensity_mean",
        "mean particle intensity (a.u.)",
    ),
    (
        "binding_intensity_median",
        "intensity_median",
        "median particle intensity (a.u.)",
    ),
    (
        "binding_intensity_iqr",
        "intensity_iqr",
        "particle intensity IQR (a.u.)",
    ),
    (
        "binding_radius_mean",
        "radius_mean",
        "mean particle radius (px)",
    ),
    (
        "binding_radius_median",
        "radius_median",
        "median particle radius (px)",
    ),
    (
        "binding_radius_iqr",
        "radius_iqr",
        "particle radius IQR (px)",
    ),
];

pub(crate) fn to_binding_mapping(mapping: &SampleMapping) -> lisca_binding::SampleMapping {
    mapping
        .iter()
        .map(|sample| lisca_binding::SampleAnalysis {
            name: sample.name.clone(),
            positions: sample.positions.clone(),
            signal: sample.signal.clone(),
            segmentation: sample.segmentation,
        })
        .collect()
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
    lisca_binding::run_position_binding(
        workspace,
        &to_binding_mapping(mapping),
        position,
        interval_minutes,
    )
}

pub fn write_summary(workspace: &Path, mapping: &SampleMapping) -> Result<(), String> {
    lisca_binding::write_binding_summary(workspace, &to_binding_mapping(mapping))
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
        "Preparing LNP binding particle analysis",
    ));
    let binding_workspace = workspace_path.clone();
    let binding_assay = assay_json;
    run_blocking(move || run_sync(&binding_workspace, &binding_assay))
        .await
        .map_err(|error| format!("lnp-binding analysis failed: {error}"))?;
    update_progress(analysis_progress(
        &request_id,
        AnalysisStage::Completed,
        100.0,
        "LNP binding particle analysis completed",
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
    let csvs = lisca_binding::discover_binding_csvs(&workspace.join("analysis"))?;
    let dirnames = crate::analysis::sample::sample_pack_dirnames(mapping);

    for &(file_stem, y_column, y_label) in BINDING_PLOT_METRICS {
        let panels = load_binding_panels(&csvs, y_column, mapping)?;
        if panels.is_empty() {
            return Err("no binding traces to plot".to_string());
        }
        crate::analysis::plot::write_per_sample_metric_plots(
            &panels,
            |sample| {
                let dirname = dirnames
                    .get(&sample)
                    .map(String::as_str)
                    .unwrap_or("sample");
                workspace.join("results").join(dirname)
            },
            file_stem,
            y_label,
            interval_minutes,
            mapping,
        )?;
    }
    Ok(())
}

fn load_binding_panels(
    csvs: &[PathBuf],
    y_column: &str,
    mapping: &SampleMapping,
) -> Result<Vec<crate::analysis::traces::TracePanel>, String> {
    let mut grouped =
        std::collections::BTreeMap::<usize, crate::analysis::traces::TracePanel>::new();
    for path in csvs {
        let position = binding_position(path)?;
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

fn binding_position(path: &Path) -> Result<u32, String> {
    path.parent()
        .and_then(|parent| parent.file_name())
        .and_then(|name| name.to_str())
        .and_then(|name| name.strip_prefix("Pos"))
        .and_then(|rest| rest.parse().ok())
        .ok_or_else(|| format!("Expected Pos{{n}}/binding.csv, got {}", path.display()))
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    #[test]
    fn binding_plots_write_particles_intensity_and_radius_figures_and_workbooks() {
        let root = std::env::temp_dir().join(format!(
            "lisca-binding-plots-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("analysis/Pos0")).unwrap();
        fs::write(
            root.join("analysis/Pos0/particles.csv"),
            "\
roi,t,minutes,particle,x,y,intensity,radius,photons,sx,sy,fwhm,background,snb,net_gradient
0,0,0.0000,0,16.2500,18.4000,1195.2000,1.3991,14750.00,1.3500,1.4500,3.2946,100.0000,11.9520,1200.00
0,1,5.0000,0,16.3000,18.3500,1245.1000,1.3991,15365.00,1.3500,1.4500,3.2946,100.0000,12.4510,1250.00
0,1,5.0000,1,30.6000,22.1500,1492.4000,1.3491,17065.00,1.4000,1.3000,3.1769,100.0000,14.9240,1500.00
",
        )
        .unwrap();
        fs::write(
            root.join("analysis/Pos0/binding.csv"),
            "\
roi,t,minutes,particles,intensity_mean,intensity_median,intensity_iqr,radius_mean,radius_median,radius_iqr
0,0,0.0000,1,1195.2000,1195.2000,0.0000,1.3991,1.3991,0.0000
0,1,5.0000,2,1368.7500,1368.7500,123.6500,1.3741,1.3741,0.0250
1,0,0.0000,1,1340.0000,1340.0000,0.0000,1.4000,1.4000,0.0000
1,1,5.0000,3,1520.0000,1500.0000,180.0000,1.4200,1.4100,0.0400
",
        )
        .unwrap();

        let mapping = SampleMapping(vec![crate::analysis::sample::SampleAnalysis {
            name: "LNP_1".into(),
            positions: vec![0],
            signal: vec![1],
            segmentation: 0,
        }]);
        run_plot_traces(&root, &mapping, 5.0).unwrap();
        write_summary(&root, &mapping).unwrap();

        for &(stem, _, _) in BINDING_PLOT_METRICS {
            assert!(root.join(format!("results/LNP_1/{stem}.png")).is_file());
            assert!(root
                .join(format!("results/LNP_1/{stem}_shared_y.png"))
                .is_file());
            assert!(root
                .join(format!("results/LNP_1/{stem}_summary.png"))
                .is_file());
            assert!(root
                .join(format!("results/LNP_1/{stem}_summary_shared_y.png"))
                .is_file());
        }
        assert!(root.join("results/LNP_1/particles.xlsx").is_file());
        assert!(root.join("results/LNP_1/binding.xlsx").is_file());
        assert!(root.join("results/LNP_1/binding_summary.xlsx").is_file());
        assert!(root.join("analysis/Pos0/binding_summary.csv").is_file());
        fs::remove_dir_all(root).unwrap();
    }
}
