//! Rename the killing `timeseries/` directory to `traces/`.
//!
//! Killing analysis writes `traces/Pos{n}/ch{m}.csv`; older workspaces hold
//! the same files under `timeseries/`. When both exist, an empty or identical
//! `timeseries/` is removed; differing contents are an error.

use std::{
    collections::BTreeMap,
    fs,
    io::ErrorKind,
    path::{Path, PathBuf},
};

const OLD_DIR: &str = "timeseries";
const NEW_DIR: &str = "traces";

pub(super) fn apply(workspace: &Path) -> Result<Vec<String>, String> {
    let old = workspace.join(OLD_DIR);
    if !old.is_dir() {
        return Ok(Vec::new());
    }
    let new = workspace.join(NEW_DIR);
    if !new.exists() {
        fs::rename(&old, &new).map_err(|error| {
            format!(
                "failed to rename {} to {}: {error}",
                old.display(),
                new.display()
            )
        })?;
        return Ok(vec![new.to_string_lossy().into_owned()]);
    }
    let old_files = tree_files(&old)?;
    if !old_files.is_empty() && old_files != tree_files(&new)? {
        return Err(format!(
            "workspace has both {} and {} with different contents; keep one of them",
            old.display(),
            new.display()
        ));
    }
    fs::remove_dir_all(&old)
        .map_err(|error| format!("failed to remove {}: {error}", old.display()))?;
    Ok(vec![new.to_string_lossy().into_owned()])
}

/// Relative file path → bytes for every file under `root`.
fn tree_files(root: &Path) -> Result<BTreeMap<PathBuf, Vec<u8>>, String> {
    let mut files = BTreeMap::new();
    collect(root, root, &mut files)?;
    Ok(files)
}

fn collect(
    root: &Path,
    directory: &Path,
    files: &mut BTreeMap<PathBuf, Vec<u8>>,
) -> Result<(), String> {
    let entries = match fs::read_dir(directory) {
        Ok(entries) => entries,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(format!("failed to read {}: {error}", directory.display())),
    };
    for entry in entries {
        let path = entry
            .map_err(|error| format!("failed to read {}: {error}", directory.display()))?
            .path();
        if path.is_dir() {
            collect(root, &path, files)?;
        } else {
            let bytes = fs::read(&path).map_err(|error| format!("{}: {error}", path.display()))?;
            let relative = path
                .strip_prefix(root)
                .map_err(|error| error.to_string())?
                .to_path_buf();
            files.insert(relative, bytes);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write(path: &Path, contents: &str) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, contents).unwrap();
    }

    #[test]
    fn renames_timeseries_to_traces() {
        let root = tempfile::tempdir().unwrap();
        let workspace = root.path();
        write(
            &workspace.join("timeseries/Pos1/ch0.csv"),
            "roi,t,p_dead\n0,0,0.1\n",
        );

        let rewritten = apply(workspace).unwrap();
        assert_eq!(rewritten.len(), 1);
        assert!(rewritten[0].ends_with(NEW_DIR));
        assert!(!workspace.join(OLD_DIR).exists());
        assert_eq!(
            fs::read_to_string(workspace.join("traces/Pos1/ch0.csv")).unwrap(),
            "roi,t,p_dead\n0,0,0.1\n"
        );
        assert!(
            apply(workspace).unwrap().is_empty(),
            "second run is a no-op"
        );
    }

    #[test]
    fn noop_without_timeseries_dir() {
        let root = tempfile::tempdir().unwrap();
        write(&root.path().join("traces/Pos1/ch0.csv"), "roi,t,p_dead\n");
        assert!(apply(root.path()).unwrap().is_empty());
        assert!(root.path().join("traces/Pos1/ch0.csv").is_file());
    }

    #[test]
    fn removes_identical_or_empty_timeseries_when_traces_exists() {
        let root = tempfile::tempdir().unwrap();
        let workspace = root.path();
        write(&workspace.join("timeseries/Pos1/ch0.csv"), "same\n");
        write(&workspace.join("traces/Pos1/ch0.csv"), "same\n");
        assert_eq!(apply(workspace).unwrap().len(), 1);
        assert!(!workspace.join(OLD_DIR).exists());

        fs::create_dir_all(workspace.join("timeseries/Pos2")).unwrap();
        assert_eq!(apply(workspace).unwrap().len(), 1);
        assert!(!workspace.join(OLD_DIR).exists());
        assert_eq!(
            fs::read_to_string(workspace.join("traces/Pos1/ch0.csv")).unwrap(),
            "same\n"
        );
    }

    #[test]
    fn errors_when_both_dirs_differ() {
        let root = tempfile::tempdir().unwrap();
        let workspace = root.path();
        write(&workspace.join("timeseries/Pos1/ch0.csv"), "old\n");
        write(&workspace.join("traces/Pos1/ch0.csv"), "new\n");
        let error = apply(workspace).unwrap_err();
        assert!(error.contains("different contents"), "{error}");
        assert!(workspace.join("timeseries/Pos1/ch0.csv").is_file());
        assert!(workspace.join("traces/Pos1/ch0.csv").is_file());
    }
}
