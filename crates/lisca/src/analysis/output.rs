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
    collect_position_csvs(
        &workspace.join("timeseries"),
        "timeseries",
        &mut files,
        include_csv_contents,
        CsvFilter::TimeseriesOnly,
    )?;
    collect_position_csvs(
        &workspace.join("analysis"),
        "analysis",
        &mut files,
        include_csv_contents,
        CsvFilter::AllCsvs,
    )?;
    collect_csv_dir(
        &workspace.join("results"),
        "results",
        &mut files,
        include_csv_contents,
    )?;
    collect_plot_dir(&workspace.join("results"), &mut files)?;
    files.sort_by(|left, right| {
        left.path
            .cmp(&right.path)
            .then(left.file_name.cmp(&right.file_name))
    });
    Ok(files)
}

fn read_optional_dir(directory: &Path) -> Result<Option<fs::ReadDir>, String> {
    match fs::read_dir(directory) {
        Ok(entries) => Ok(Some(entries)),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("failed to list {}: {error}", directory.display())),
    }
}

enum CsvFilter {
    TimeseriesOnly,
    AllCsvs,
}

fn collect_position_csvs(
    directory: &Path,
    default_kind: &str,
    out: &mut Vec<AnalysisCsvFile>,
    include_csv_contents: bool,
    filter: CsvFilter,
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
            let is_channel =
                stem.starts_with("ch") && stem[2..].chars().all(|c| c.is_ascii_digit());
            if matches!(filter, CsvFilter::TimeseriesOnly) && !is_channel {
                continue;
            }
            let kind = if is_channel {
                "timeseries"
            } else {
                default_kind
            };
            let file_name = format!("{pos_name}/{stem}.csv");
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
    collect_plot_dir_at(directory, out, 0)
}

fn collect_plot_dir_at(
    directory: &Path,
    out: &mut Vec<AnalysisCsvFile>,
    depth: usize,
) -> Result<(), String> {
    const MAX_SAMPLE_DEPTH: usize = 1;
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
        if path.is_dir() {
            if depth < MAX_SAMPLE_DEPTH {
                collect_plot_dir_at(&path, out, depth + 1)?;
            }
            continue;
        }
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

    #[test]
    fn lists_nested_sample_pngs_and_analysis_csvs() {
        let workspace = tempfile::tempdir().unwrap();
        let analysis = workspace.path().join("analysis").join("Pos1");
        let sample = workspace.path().join("results").join("A431_aiLNP");
        fs::create_dir_all(&analysis).unwrap();
        fs::create_dir_all(&sample).unwrap();
        fs::write(analysis.join("ch1.csv"), "roi,t\n1,0\n").unwrap();
        fs::write(analysis.join("auc.csv"), "roi,auc\n1,1.0\n").unwrap();
        fs::write(workspace.path().join("results").join("auc.png"), b"png").unwrap();
        fs::write(sample.join("traces.png"), b"png").unwrap();
        fs::write(sample.join("traces.png.bak"), b"skip").unwrap();

        let manifest = workspace_analysis_manifest(workspace.path()).unwrap();
        let names: Vec<_> = manifest
            .iter()
            .map(|file| (file.kind.as_str(), file.file_name.as_str()))
            .collect();
        assert!(names.contains(&("timeseries", "Pos1/ch1.csv")));
        assert!(names.contains(&("analysis", "Pos1/auc.csv")));
        assert!(names.contains(&("plot", "auc.png")));
        assert!(names.contains(&("plot", "traces.png")));
        let traces = manifest
            .iter()
            .find(|file| file.file_name == "traces.png")
            .unwrap();
        assert!(traces.path.ends_with("results/A431_aiLNP/traces.png"));
        assert!(manifest
            .iter()
            .all(|file| file.file_name != "traces.png.bak"));
    }
}
