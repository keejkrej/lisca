use std::fs;
use std::path::Path;

use crate::protocol::AnalysisCsvFile;

pub fn collect_csv_outputs(workspace: &Path) -> Result<Vec<AnalysisCsvFile>, String> {
    let mut files = Vec::new();
    collect_timeseries_csvs(&workspace.join("timeseries"), &mut files)?;
    collect_csv_dir(&workspace.join("results"), "results", &mut files)?;
    collect_plot_dir(&workspace.join("results"), &mut files)?;
    files.sort_by_key(|entry| entry.file_name.clone());
    Ok(files)
}

pub fn workspace_analysis_outputs(workspace: &Path) -> Result<Vec<AnalysisCsvFile>, String> {
    collect_csv_outputs(workspace)
}

pub fn workspace_analysis_manifest(workspace: &Path) -> Result<Vec<AnalysisCsvFile>, String> {
    let mut files = collect_csv_outputs(workspace)?;
    for file in &mut files {
        file.csv.clear();
    }
    Ok(files)
}

fn collect_timeseries_csvs(directory: &Path, out: &mut Vec<AnalysisCsvFile>) -> Result<(), String> {
    let Ok(entries) = fs::read_dir(directory) else {
        return Ok(());
    };

    for entry in entries.flatten() {
        let pos_dir = entry.path();
        if !pos_dir.is_dir() {
            continue;
        }
        let Some(pos_name) = pos_dir.file_name().and_then(|name| name.to_str()) else {
            continue;
        };
        if !pos_name.starts_with("Pos") {
            continue;
        }
        let Ok(children) = fs::read_dir(&pos_dir) else {
            continue;
        };
        for child in children.flatten() {
            let path = child.path();
            if !path.extension().is_some_and(|ext| ext == "csv") {
                continue;
            }
            let Some(stem) = path.file_stem().and_then(|name| name.to_str()) else {
                continue;
            };
            if !(stem.starts_with("ch") && stem[2..].chars().all(|c| c.is_ascii_digit())) {
                continue;
            }
            let file_name = format!("{pos_name}/{stem}.csv");
            let csv = fs::read_to_string(&path)
                .map_err(|error| format!("failed to read {path:?}: {error}"))?;
            out.push(AnalysisCsvFile {
                kind: "timeseries".to_string(),
                file_name,
                path: path.to_string_lossy().to_string(),
                csv,
            });
        }
    }
    Ok(())
}

fn collect_csv_dir(
    directory: &Path,
    kind: &str,
    out: &mut Vec<AnalysisCsvFile>,
) -> Result<(), String> {
    let Ok(entries) = fs::read_dir(directory) else {
        return Ok(());
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let is_csv = path.extension().is_some_and(|ext| ext == "csv");
        if !is_csv {
            continue;
        }

        let file_name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("")
            .to_string();
        if file_name.is_empty() {
            continue;
        }

        let csv = fs::read_to_string(&path)
            .map_err(|error| format!("failed to read {path:?}: {error}"))?;
        out.push(AnalysisCsvFile {
            kind: kind.to_string(),
            file_name,
            path: path.to_string_lossy().to_string(),
            csv,
        });
    }
    Ok(())
}

fn collect_plot_dir(directory: &Path, out: &mut Vec<AnalysisCsvFile>) -> Result<(), String> {
    let Ok(entries) = fs::read_dir(directory) else {
        return Ok(());
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.extension().is_some_and(|ext| ext == "png") {
            continue;
        }

        let file_name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("")
            .to_string();
        if file_name.is_empty() {
            continue;
        }

        out.push(AnalysisCsvFile {
            kind: "plot".to_string(),
            file_name,
            path: path.to_string_lossy().to_string(),
            csv: String::new(),
        });
    }
    Ok(())
}
