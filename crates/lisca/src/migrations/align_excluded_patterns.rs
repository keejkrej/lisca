//! Rewrite align state keys that named a Pattern a "cell".
//!
//! `align/Pos{n}.json`: top-level `excludedCells` → `excludedPatterns`, and
//! `grid.cellWidth` / `grid.cellHeight` → `grid.patternWidth` /
//! `grid.patternHeight`. A file carrying both the old and the new name of a key
//! is an error.

use std::{
    fs,
    io::ErrorKind,
    path::{Path, PathBuf},
};

use lisca_workspace::{align_json_name, ALIGN_DIR, POS_PREFIX};
use serde_json::{Map, Value};
use uuid::Uuid;

const TOP_LEVEL_RENAMES: &[(&str, &str)] = &[("excludedCells", "excludedPatterns")];
const GRID_RENAMES: &[(&str, &str)] = &[
    ("cellWidth", "patternWidth"),
    ("cellHeight", "patternHeight"),
];

pub(super) fn apply(workspace: &Path) -> Result<Vec<String>, String> {
    let mut rewritten = Vec::new();
    for path in align_json_paths(workspace)? {
        if migrate_file(&path)? {
            rewritten.push(path.to_string_lossy().into_owned());
        }
    }
    Ok(rewritten)
}

fn align_json_paths(workspace: &Path) -> Result<Vec<PathBuf>, String> {
    let align_dir = workspace.join(ALIGN_DIR);
    let entries = match fs::read_dir(&align_dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(format!("failed to read {}: {error}", align_dir.display())),
    };
    let mut paths = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|error| {
            format!(
                "failed to read an entry in {}: {error}",
                align_dir.display()
            )
        })?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        if is_align_json_name(name) {
            paths.push(path);
        }
    }
    paths.sort();
    Ok(paths)
}

fn is_align_json_name(name: &str) -> bool {
    let Some(rest) = name
        .strip_prefix(POS_PREFIX)
        .and_then(|rest| rest.strip_suffix(".json"))
    else {
        return false;
    };
    rest.parse::<u32>()
        .is_ok_and(|pos| name == align_json_name(pos))
}

fn migrate_file(path: &Path) -> Result<bool, String> {
    let text = fs::read_to_string(path).map_err(|error| format!("{}: {error}", path.display()))?;
    let mut value: Value =
        serde_json::from_str(&text).map_err(|error| format!("{}: {error}", path.display()))?;
    let Some(root) = value.as_object_mut() else {
        return Err(format!(
            "Align state is not a JSON object: {}",
            path.display()
        ));
    };

    let mut changed = rename_keys(root, TOP_LEVEL_RENAMES, "", path)?;
    if let Some(grid) = root.get_mut("grid").and_then(Value::as_object_mut) {
        changed |= rename_keys(grid, GRID_RENAMES, "grid.", path)?;
    }
    if !changed {
        return Ok(false);
    }

    let mut new_text = serde_json::to_string_pretty(&value).map_err(|error| error.to_string())?;
    if text.ends_with('\n') {
        new_text.push('\n');
    }
    atomic_write(path, &new_text)?;
    Ok(true)
}

fn rename_keys(
    object: &mut Map<String, Value>,
    renames: &[(&str, &str)],
    prefix: &str,
    path: &Path,
) -> Result<bool, String> {
    let mut changed = false;
    for (old, new) in renames {
        if !object.contains_key(*old) {
            continue;
        }
        if object.contains_key(*new) {
            return Err(format!(
                "Align state has both `{prefix}{old}` and `{prefix}{new}`: {}",
                path.display()
            ));
        }
        if let Some(value) = object.remove(*old) {
            object.insert((*new).to_string(), value);
            changed = true;
        }
    }
    Ok(changed)
}

fn atomic_write(path: &Path, text: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("{} has no parent directory", path.display()))?;
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("align.json");
    let tmp = parent.join(format!(".{file_name}.{}.tmp", Uuid::new_v4()));
    if let Err(error) = fs::write(&tmp, text) {
        let _ = fs::remove_file(&tmp);
        return Err(error.to_string());
    }
    if let Err(error) = fs::rename(&tmp, path) {
        let _ = fs::remove_file(&tmp);
        return Err(error.to_string());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn write_align(workspace: &Path, name: &str, value: &Value) -> PathBuf {
        let align_dir = workspace.join(ALIGN_DIR);
        fs::create_dir_all(&align_dir).expect("align dir");
        let path = align_dir.join(name);
        fs::write(&path, serde_json::to_string_pretty(value).expect("json")).expect("write");
        path
    }

    fn read_json(path: &Path) -> Value {
        serde_json::from_str(&fs::read_to_string(path).expect("read")).expect("json")
    }

    fn grid(width_key: &str, height_key: &str) -> Value {
        let mut grid = json!({
            "enabled": true,
            "shape": "rect",
            "tx": 0,
            "ty": 0,
            "rotation": 0,
            "spacingA": 10,
            "spacingB": 10,
            "opacity": 0.5
        });
        let object = grid.as_object_mut().expect("grid object");
        object.insert(width_key.to_string(), json!(12));
        object.insert(height_key.to_string(), json!(20));
        grid
    }

    #[test]
    fn rewrites_cell_keys_to_pattern_keys() {
        let root = tempfile::tempdir().expect("tempdir");
        let path = write_align(
            root.path(),
            "Pos0.json",
            &json!({
                "grid": grid("cellWidth", "cellHeight"),
                "excludedCells": [{ "i": 0, "j": 1 }]
            }),
        );

        let rewritten = apply(root.path()).expect("migrate");
        assert_eq!(rewritten, vec![path.to_string_lossy().into_owned()]);

        let value = read_json(&path);
        assert_eq!(value["excludedPatterns"], json!([{ "i": 0, "j": 1 }]));
        assert!(value.get("excludedCells").is_none());
        assert_eq!(value["grid"]["patternWidth"], json!(12));
        assert_eq!(value["grid"]["patternHeight"], json!(20));
        assert!(value["grid"].get("cellWidth").is_none());
        assert!(value["grid"].get("cellHeight").is_none());
        serde_json::from_value::<crate::protocol::SavedAlignState>(value)
            .expect("strict parse after migrate");
    }

    #[test]
    fn is_idempotent() {
        let root = tempfile::tempdir().expect("tempdir");
        let path = write_align(
            root.path(),
            "Pos1.json",
            &json!({
                "grid": grid("cellWidth", "cellHeight"),
                "excludedCells": []
            }),
        );

        let first = apply(root.path()).expect("first");
        let after_first = fs::read_to_string(&path).expect("read");
        let second = apply(root.path()).expect("second");
        assert_eq!(first.len(), 1);
        assert!(second.is_empty());
        assert_eq!(fs::read_to_string(&path).expect("read"), after_first);
    }

    #[test]
    fn leaves_current_files_untouched() {
        let root = tempfile::tempdir().expect("tempdir");
        let path = write_align(
            root.path(),
            "Pos2.json",
            &json!({
                "grid": grid("patternWidth", "patternHeight"),
                "excludedPatterns": [{ "i": 1, "j": 1 }]
            }),
        );
        let before = fs::read_to_string(&path).expect("read");

        assert!(apply(root.path()).expect("migrate").is_empty());
        assert_eq!(fs::read_to_string(&path).expect("read"), before);
    }

    #[test]
    fn errors_when_excluded_cells_and_patterns_both_present() {
        let root = tempfile::tempdir().expect("tempdir");
        write_align(
            root.path(),
            "Pos3.json",
            &json!({
                "grid": grid("patternWidth", "patternHeight"),
                "excludedCells": [],
                "excludedPatterns": []
            }),
        );

        let error = apply(root.path()).expect_err("both keys");
        assert!(error.contains("excludedCells"), "{error}");
        assert!(error.contains("excludedPatterns"), "{error}");
    }

    #[test]
    fn errors_when_grid_cell_and_pattern_width_both_present() {
        let root = tempfile::tempdir().expect("tempdir");
        let mut grid = grid("patternWidth", "patternHeight");
        grid["cellWidth"] = json!(12);
        write_align(
            root.path(),
            "Pos4.json",
            &json!({ "grid": grid, "excludedPatterns": [] }),
        );

        let error = apply(root.path()).expect_err("both keys");
        assert!(error.contains("grid.cellWidth"), "{error}");
        assert!(error.contains("grid.patternWidth"), "{error}");
    }

    #[test]
    fn ignores_non_canonical_names_and_missing_dir() {
        let root = tempfile::tempdir().expect("tempdir");
        assert!(apply(root.path()).expect("no align dir").is_empty());

        let path = write_align(
            root.path(),
            "Pos05.json",
            &json!({ "grid": grid("cellWidth", "cellHeight"), "excludedCells": [] }),
        );
        assert!(apply(root.path()).expect("migrate").is_empty());
        assert!(read_json(&path).get("excludedCells").is_some());
    }
}
