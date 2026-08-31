//! Transfection analysis parity tests against reference formulas.
//!
//! Stage functions dispatch into the `lisca-transfection` git crate.
//! Tolerance constants: see `docs/analysis/parity.md` and
//! `tests/support/transfection_reference.rs`.

mod support;

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use csv::ReaderBuilder;
use lisca::analysis::array::{masked_roi_stats, trapezoidal_integral};
use lisca::analysis::assays::transfection::{run_auc, run_fit, run_timeseries};
use lisca::analysis::slide::build_slide_mapping;
use lisca::protocol::AssayJsonFile;
use tempfile::tempdir;

use support::transfection_fixture::{SyntheticWorkspace, INTERVAL_MINUTES};
use support::transfection_reference::{
    approx_eq, fit_trace_table, integrate_trace, masked_roi_metrics, FitResult, AUC_REL_TOL,
    FIT_CLI_REL_TOL, FIT_REL_TOL,
};

fn read_assay_json(workspace: &Path) -> AssayJsonFile {
    let contents = fs::read_to_string(workspace.join("assay.json")).expect("assay.json");
    serde_json::from_str(&contents).expect("parse assay.json")
}

fn read_results_csv(path: &Path) -> (Vec<String>, Vec<HashMap<String, String>>) {
    let mut reader = ReaderBuilder::new()
        .has_headers(true)
        .from_path(path)
        .expect("open csv");
    let headers: Vec<String> = reader
        .headers()
        .expect("headers")
        .iter()
        .map(str::to_string)
        .collect();
    let rows = reader
        .records()
        .map(|record| {
            let record = record.expect("record");
            headers
                .iter()
                .zip(record.iter())
                .map(|(header, value)| (header.clone(), value.to_string()))
                .collect()
        })
        .collect();
    (headers, rows)
}

fn parse_f64(raw: &str) -> f64 {
    raw.trim().parse().expect("float column")
}

#[test]
fn masked_roi_stats_match_transfection_reference() {
    let frame = synthetic_frame(1);
    let mask = center_mask();
    let rust = masked_roi_stats(&frame, &mask).expect("stats");
    let (area, intensity, background, corrected) = masked_roi_metrics(&frame, &mask);
    assert_eq!(rust.area, area);
    assert!(approx_eq(rust.intensity, intensity, AUC_REL_TOL));
    assert!(approx_eq(rust.background, background, AUC_REL_TOL));
    assert!(approx_eq(rust.corrected, corrected, AUC_REL_TOL));
}

#[test]
fn trapezoidal_integral_matches_transfection_reference() {
    let times = [0.0, 1.0, 2.0, 3.0];
    let values = [10.0, 46.114, 23.534, 14.979];
    let rust = trapezoidal_integral(&times, &values);
    let reference = integrate_trace(&times, &values, 1.0);
    assert!(approx_eq(rust, reference, AUC_REL_TOL));
}

#[test]
fn timeseries_stage_matches_reference_metrics() {
    let temp = tempdir().expect("tempdir");
    let fixture = SyntheticWorkspace::build(temp.path());
    let assay = read_assay_json(&fixture.root);
    let mapping = build_slide_mapping(&assay).expect("mapping");

    run_timeseries(&fixture.root, &mapping, 1).expect("timeseries");

    let csv_path = fixture.root.join("timeseries").join("Pos1").join("ch1.csv");
    assert!(csv_path.is_file(), "expected {}", csv_path.display());

    let (_, rows) = read_results_csv(&csv_path);
    let expected = fixture.expected_timeseries_rows();
    assert_eq!(rows.len(), expected.len());

    for (row, (roi, t, area, background, sum, corrected)) in rows.iter().zip(expected) {
        assert_eq!(row["roi"], roi.to_string());
        assert_eq!(row["t"], t.to_string());
        assert_eq!(row["area"], area.to_string());
        assert!(approx_eq(
            parse_f64(&row["background"]),
            background,
            AUC_REL_TOL
        ));
        assert!(approx_eq(parse_f64(&row["sum"]), sum, AUC_REL_TOL));
        assert!(approx_eq(
            parse_f64(&row["corrected"]),
            corrected,
            AUC_REL_TOL
        ));
    }
}

#[test]
fn auc_stage_matches_reference_trapz() {
    let temp = tempdir().expect("tempdir");
    let fixture = SyntheticWorkspace::build(temp.path());
    let assay = read_assay_json(&fixture.root);
    let mapping = build_slide_mapping(&assay).expect("mapping");
    run_timeseries(&fixture.root, &mapping, 1).expect("timeseries");

    run_auc(&fixture.root, INTERVAL_MINUTES).expect("auc");
    let csv_path = fixture.root.join("results").join("auc.csv");
    let (_, rows) = read_results_csv(&csv_path);
    assert_eq!(rows.len(), 1);

    let timeseries_path = fixture.root.join("timeseries").join("Pos1").join("ch1.csv");
    let (_, ts_rows) = read_results_csv(&timeseries_path);
    let mut trace_times = Vec::new();
    let mut trace_values = Vec::new();
    for row in ts_rows {
        trace_times.push(parse_f64(&row["t"]));
        trace_values.push(parse_f64(&row["corrected"]));
    }
    let expected_auc = integrate_trace(&trace_times, &trace_values, INTERVAL_MINUTES);

    let actual_auc = parse_f64(&rows[0]["auc"]);
    assert!(approx_eq(actual_auc, expected_auc, AUC_REL_TOL));
    assert_eq!(rows[0]["pos"], "1");
    assert_eq!(rows[0]["roi"], "1");
    assert_eq!(rows[0]["slide_channel"], "0");
}

#[test]
fn fit_stage_matches_transfection_reference_fit() {
    let temp = tempdir().expect("tempdir");
    let fixture = SyntheticWorkspace::build(temp.path());
    let assay = read_assay_json(&fixture.root);
    let mapping = build_slide_mapping(&assay).expect("mapping");
    run_timeseries(&fixture.root, &mapping, 1).expect("timeseries");

    run_fit(&fixture.root, INTERVAL_MINUTES, 0.0, 1).expect("fit");
    let csv_path = fixture.root.join("results").join("fit.csv");
    let (_, rows) = read_results_csv(&csv_path);
    assert_eq!(rows.len(), 1);
    let row = &rows[0];
    assert_eq!(row["success"], "true");

    let timeseries_path = fixture.root.join("timeseries").join("Pos1").join("ch1.csv");
    let (_, ts_rows) = read_results_csv(&timeseries_path);
    let mut trace_times = Vec::new();
    let mut trace_values = Vec::new();
    for ts_row in ts_rows {
        trace_times.push(parse_f64(&ts_row["t"]));
        trace_values.push(parse_f64(&ts_row["corrected"]));
    }
    let reference =
        fit_trace_table(&trace_times, &trace_values, INTERVAL_MINUTES).expect("reference fit");

    assert!(approx_eq(
        parse_f64(&row["baseline_intensity"]),
        reference.baseline_intensity,
        FIT_REL_TOL
    ));
    assert!(approx_eq(
        parse_f64(&row["protein_decay_rate"]),
        reference.protein_decay_rate,
        FIT_REL_TOL
    ));
    assert!(approx_eq(
        parse_f64(&row["mrna_decay_rate"]),
        reference.mrna_decay_rate,
        FIT_REL_TOL
    ));
    assert!(approx_eq(
        parse_f64(&row["expression_amplitude"]),
        reference.expression_amplitude,
        FIT_REL_TOL
    ));
    assert!(approx_eq(
        parse_f64(&row["onset_time"]),
        reference.onset_time,
        FIT_REL_TOL
    ));
}

/// Optional end-to-end check against the sibling transfection Python CLI.
#[test]
#[ignore = "requires ../lisca-transfection-assay (or ../transfection) and uv; run with `cargo test -p lisca -- --ignored`"]
fn transfection_csvs_match_transfection_cli() {
    let temp = tempdir().expect("tempdir");
    let fixture = SyntheticWorkspace::build(temp.path());
    let assay = read_assay_json(&fixture.root);
    let mapping = build_slide_mapping(&assay).expect("mapping");
    run_timeseries(&fixture.root, &mapping, 1).expect("lisca timeseries");

    let transfection_root = transfection_repo_root();
    assert!(
        transfection_root.join("pyproject.toml").is_file(),
        "missing transfection repo at {}",
        transfection_root.display()
    );

    let workspace = fixture.root.display().to_string();
    let interval = INTERVAL_MINUTES.to_string();

    run_transfection(
        &transfection_root,
        "auc",
        &workspace,
        &[("--interval", &interval)],
    );
    let transfection_auc = fixture.root.join("results").join("auc.csv");
    let transfection_auc_golden = fs::read_to_string(&transfection_auc).expect("transfection auc");

    fs::remove_file(&transfection_auc).ok();
    run_auc(&fixture.root, INTERVAL_MINUTES).expect("lisca auc");
    let lisca_auc = fs::read_to_string(&transfection_auc).expect("lisca auc");
    assert!(!lisca_auc.is_empty());
    let lisca_rows = normalize_auc_csv(&lisca_auc);
    let tf_rows = normalize_auc_csv(&transfection_auc_golden);
    assert_eq!(lisca_rows.len(), tf_rows.len());
    for (lisca_row, tf_row) in lisca_rows.iter().zip(tf_rows.iter()) {
        assert_eq!(lisca_row.0, tf_row.0);
        assert_eq!(lisca_row.1, tf_row.1);
        assert_eq!(lisca_row.2, tf_row.2);
        assert!(approx_eq(lisca_row.3, tf_row.3, AUC_REL_TOL));
    }

    run_transfection(
        &transfection_root,
        "fit",
        &workspace,
        &[("--interval", &interval)],
    );
    let transfection_fit = fixture.root.join("results").join("fit.csv");
    let transfection_fit_golden = fs::read_to_string(&transfection_fit).expect("transfection fit");

    fs::remove_file(&transfection_fit).ok();
    run_fit(&fixture.root, INTERVAL_MINUTES, 0.0, 1).expect("lisca fit");
    let lisca_fit = fs::read_to_string(&transfection_fit).expect("lisca fit");
    compare_fit_csvs(&lisca_fit, &transfection_fit_golden);
}

fn transfection_repo_root() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    // crates/lisca → repo root → sibling assay package
    let primary = manifest.join("../../../lisca-transfection-assay");
    let fallback = manifest.join("../../../transfection");
    if primary.join("pyproject.toml").is_file() {
        primary
    } else if fallback.join("pyproject.toml").is_file() {
        fallback
    } else {
        primary
    }
}

fn run_transfection(repo: &Path, command: &str, workspace: &str, extra_args: &[(&str, &str)]) {
    let mut cmd = Command::new("uv");
    cmd.current_dir(repo)
        .arg("run")
        .arg("transfection")
        .arg(command)
        .arg(workspace);
    for (flag, value) in extra_args {
        cmd.arg(*flag).arg(*value);
    }
    let output = cmd.output().expect("spawn transfection");
    assert!(
        output.status.success(),
        "transfection {command} failed:\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
}

fn compare_fit_csvs(lisca_csv: &str, transfection_csv: &str) {
    let lisca_path = std::env::temp_dir().join("lisca_fit_compare.csv");
    let tf_path = std::env::temp_dir().join("transfection_fit_compare.csv");
    fs::write(&lisca_path, lisca_csv).expect("write temp lisca fit");
    fs::write(&tf_path, transfection_csv).expect("write temp transfection fit");
    compare_csv_numeric(
        &lisca_path,
        &tf_path,
        &[
            "baseline_intensity",
            "protein_decay_rate",
            "mrna_decay_rate",
            "onset_time",
            "expression_amplitude",
        ],
        FIT_CLI_REL_TOL,
    );
}

fn normalize_auc_csv(csv: &str) -> Vec<(String, String, String, f64)> {
    let mut reader = ReaderBuilder::new()
        .has_headers(true)
        .from_reader(csv.as_bytes());
    reader
        .records()
        .map(|record| {
            let record = record.expect("record");
            (
                record[1].to_string(),
                record[2].to_string(),
                record[0].to_string(),
                record[3].parse().expect("auc"),
            )
        })
        .collect()
}

fn compare_csv_numeric(path: &Path, reference_path: &Path, columns: &[&str], rel_tol: f64) {
    let (_, actual_rows) = read_results_csv(path);
    let (_, reference_rows) = read_results_csv(reference_path);
    assert_eq!(actual_rows.len(), reference_rows.len());
    for (actual, reference) in actual_rows.iter().zip(reference_rows) {
        for column in columns {
            let actual_value = parse_f64(actual.get(*column).expect("column"));
            let reference_value = parse_f64(reference.get(*column).expect("column"));
            assert!(
                approx_eq(actual_value, reference_value, rel_tol),
                "{column}: {actual_value} vs {reference_value}"
            );
        }
    }
}

fn center_mask() -> Vec<bool> {
    let mut mask = vec![false; 16];
    for y in 1..3 {
        for x in 1..3 {
            mask[y * 4 + x] = true;
        }
    }
    mask
}

fn synthetic_frame(timepoint: u32) -> Vec<f64> {
    let foreground = {
        let frame_indices: Vec<f64> = (0..4).map(f64::from).collect();
        let kinetic_truth = FitResult {
            baseline_intensity: 10.0,
            protein_decay_rate: 0.1,
            mrna_decay_rate: 0.5,
            onset_time: 0.0,
            expression_amplitude: 100.0,
        };
        let corrected = support::transfection_reference::synthetic_kinetic_trace(
            &frame_indices,
            INTERVAL_MINUTES,
            kinetic_truth,
        );
        (corrected[timepoint as usize] / 4.0 + 10.0) as u8
    };
    let mut frame = vec![10.0; 16];
    for y in 1..3 {
        for x in 1..3 {
            frame[y * 4 + x] = f64::from(foreground);
        }
    }
    frame
}
