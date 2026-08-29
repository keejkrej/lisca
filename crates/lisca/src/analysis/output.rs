use std::fs;
use std::io::ErrorKind;
use std::path::Path;

use crate::protocol::AnalysisCsvFile;

pub fn collect_csv_outputs(workspace: &Path) -> Result<Vec<AnalysisCsvFile>, String> {
    collect_outputs(workspace, true)
}

pub fn workspace_analysis_outputs(workspace: &Path) -> Result<Vec<AnalysisCsvFile>, String> {
    collect_csv_outputs(workspace)
}

pub fn workspace_analysis_manifest(workspace: &Path) -> Result<Vec<AnalysisCsvFile>, String> {
    collect_outputs(workspace, false)
}

fn collect_outputs(
    workspace: &Path,
    include_csv_contents: bool,
) -> Result<Vec<AnalysisCsvFile>, String> {
    let mut files = Vec::new();
    collect_timeseries_csvs(
        &workspace.join("timeseries"),
        &mut files,
        include_csv_contents,
    )?;
    collect_csv_dir(
        &workspace.join("results"),
        "results",
        &mut files,
        include_csv_contents,
    )?;
    collect_plot_dir(&workspace.join("results"), &mut files)?;
    files.sort_by_key(|entry| entry.file_name.clone());
    Ok(files)
}

fn read_optional_dir(directory: &Path) -> Result<Option<fs::ReadDir>, String> {
    match fs::read_dir(directory) {
        Ok(entries) => Ok(Some(entries)),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("failed to list {}: {error}", directory.display())),
    }
}

fn collect_timeseries_csvs(
    directory: &Path,
    out: &mut Vec<AnalysisCsvFile>,
    include_csv_contents: bool,
) -> Result<(), String> {
    let Some(entries) = read_optional_dir(directory)? else {
        return Ok(());
    };

    for entry in entries {
        let entry = entry.map_err(|error| {
            format!(
                "failed to read an entry in {}: {error}",
                directory.display()
            )
        })?;
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
        let children = fs::read_dir(&pos_dir)
            .map_err(|error| format!("failed to list {}: {error}", pos_dir.display()))?;
        for child in children {
            let child = child.map_err(|error| {
                format!("failed to read an entry in {}: {error}", pos_dir.display())
            })?;
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
            let csv = if include_csv_contents {
                fs::read_to_string(&path)
                    .map_err(|error| format!("failed to read {path:?}: {error}"))?
            } else {
                String::new()
            };
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
    include_csv_contents: bool,
) -> Result<(), String> {
    let Some(entries) = read_optional_dir(directory)? else {
        return Ok(());
    };

    for entry in entries {
        let entry = entry.map_err(|error| {
            format!(
                "failed to read an entry in {}: {error}",
                directory.display()
            )
        })?;
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

        let csv = if include_csv_contents {
            fs::read_to_string(&path)
                .map_err(|error| format!("failed to read {path:?}: {error}"))?
        } else {
            String::new()
        };
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
    let Some(entries) = read_optional_dir(directory)? else {
        return Ok(());
    };

    for entry in entries {
        let entry = entry.map_err(|error| {
            format!(
                "failed to read an entry in {}: {error}",
                directory.display()
            )
        })?;
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn manifest_does_not_read_csv_contents() {
        let workspace = tempfile::tempdir().unwrap();
        let results = workspace.path().join("results");
        fs::create_dir(&results).unwrap();
        fs::write(results.join("invalid.csv"), [0xff]).unwrap();

        let manifest = workspace_analysis_manifest(workspace.path()).unwrap();

        assert_eq!(manifest.len(), 1);
        assert!(manifest[0].csv.is_empty());
        assert!(workspace_analysis_outputs(workspace.path()).is_err());
    }
}
