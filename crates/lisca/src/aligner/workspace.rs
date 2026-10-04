use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
};

use uuid::Uuid;

use lisca_workspace::{bbox_csv_name, ALIGN_DIR, BBOX_DIR, POS_PREFIX, ROI_DIR};

use crate::{
    migrations::migrate_workspace,
    protocol::{AlignOutputPaths, RoiBbox, SaveBboxResponse, SavedAlignState},
};

pub fn load_align_state(workspace_path: &str, pos: u32) -> Result<Option<SavedAlignState>, String> {
    prepare_workspace(workspace_path)?;
    let path = align_json_path(workspace_path, pos);
    let bytes = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.to_string()),
    };
    serde_json::from_slice::<SavedAlignState>(&bytes)
        .map(Some)
        .map_err(|error| format!("{}: {error}", path.display()))
}

pub fn save_bbox(
    workspace_path: &str,
    pos: u32,
    csv: &str,
    align_state: &SavedAlignState,
) -> Result<SaveBboxResponse, String> {
    prepare_workspace(workspace_path)?;
    if bbox_csv_header_has_crop(csv) {
        return Err("bbox CSV must use column `roi`, not `crop`".to_string());
    }
    let bbox_target = bbox_csv_path(workspace_path, pos);
    if let Some(parent) = bbox_target.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(&bbox_target, csv).map_err(|error| error.to_string())?;

    let align_target = align_json_path(workspace_path, pos);
    if let Some(parent) = align_target.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let bytes = serde_json::to_vec_pretty(align_state).map_err(|error| error.to_string())?;
    atomic_write(&align_target, &bytes)?;

    Ok(SaveBboxResponse {
        ok: true,
        error: None,
    })
}

pub fn list_saved_bbox_positions(workspace_path: &str) -> Result<Vec<u32>, String> {
    prepare_workspace(workspace_path)?;
    let bbox_dir = lisca_workspace::bbox_dir(workspace_path);
    let entries = match fs::read_dir(&bbox_dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(error.to_string()),
    };
    let mut positions = BTreeSet::new();
    for entry in entries {
        let entry = entry.map_err(|error| {
            format!("failed to read an entry in {}: {error}", bbox_dir.display())
        })?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        if let Some(pos) = parse_pos_csv_name(name) {
            positions.insert(pos);
        }
    }
    Ok(positions.into_iter().collect())
}

pub fn roi_pos_exists(workspace_path: &str, pos: u32) -> bool {
    roi_pos_dir_path(workspace_path, pos).exists()
}

pub fn output_paths(pos: u32) -> AlignOutputPaths {
    AlignOutputPaths {
        bbox: format!("{BBOX_DIR}/Pos{pos}.csv"),
        align: format!("{ALIGN_DIR}/Pos{pos}.json"),
        roi: format!("{ROI_DIR}/Pos{pos}.tif"),
    }
}

pub(super) fn bbox_csv_path(root: &str, pos: u32) -> PathBuf {
    lisca_workspace::bbox_csv_path(root, pos)
}

pub(super) fn roi_pos_dir_path(root: &str, pos: u32) -> PathBuf {
    lisca_workspace::roi_pos_dir(root, pos)
}

pub(super) fn parse_bbox_csv(path: &Path) -> Result<Vec<RoiBbox>, String> {
    lisca_workspace::parse_bbox_csv(path)
        .map(|bboxes| bboxes.into_iter().map(protocol_bbox).collect())
        .map_err(|error| error.to_string())
}

fn protocol_bbox(bbox: lisca_workspace::RoiBbox) -> RoiBbox {
    RoiBbox {
        roi: bbox.roi,
        x: bbox.x,
        y: bbox.y,
        w: bbox.w,
        h: bbox.h,
    }
}

fn prepare_workspace(workspace_path: &str) -> Result<(), String> {
    migrate_workspace(Path::new(workspace_path)).map(|_| ())
}

fn bbox_csv_header_has_crop(csv: &str) -> bool {
    let Some(header_line) = csv.lines().find(|line| !line.trim().is_empty()) else {
        return false;
    };
    header_line
        .split(',')
        .any(|cell| cell.trim().eq_ignore_ascii_case("crop"))
}

fn align_json_path(root: &str, pos: u32) -> PathBuf {
    lisca_workspace::align_json_path(root, pos)
}

/// Replace `path` with `contents` via a sibling temp file and rename.
fn atomic_write(path: &Path, contents: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("{} has no parent directory", path.display()))?;
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| format!("{} has a non-utf8 name", path.display()))?;
    let tmp = parent.join(format!(".{file_name}.{}.tmp", Uuid::new_v4().simple()));
    if let Err(error) = fs::write(&tmp, contents) {
        let _ = fs::remove_file(&tmp);
        return Err(error.to_string());
    }
    if let Err(error) = fs::rename(&tmp, path) {
        let _ = fs::remove_file(&tmp);
        return Err(error.to_string());
    }
    Ok(())
}

fn parse_pos_csv_name(name: &str) -> Option<u32> {
    let rest = name.strip_prefix(POS_PREFIX)?.strip_suffix(".csv")?;
    let pos: u32 = rest.parse().ok()?;
    if name != bbox_csv_name(pos) {
        return None;
    }
    Some(pos)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::protocol::SavedAlignState;

    fn dummy_align_state() -> SavedAlignState {
        serde_json::from_value(serde_json::json!({
            "grid": {
                "enabled": true,
                "shape": "rect",
                "tx": 0,
                "ty": 0,
                "rotation": 0,
                "spacingA": 10,
                "spacingB": 10,
                "patternWidth": 12,
                "patternHeight": 20,
                "opacity": 0.5
            },
            "excludedPatterns": []
        }))
        .expect("align state")
    }

    #[test]
    fn parse_bbox_csv_rejects_header_only_file() {
        let root = tempfile::tempdir().expect("tempdir");
        let path = root.path().join("Pos0.csv");
        fs::write(&path, "roi,x,y,w,h,i,j\n").expect("write");
        let error = parse_bbox_csv(&path).expect_err("header only");
        assert!(error.contains("does not contain any ROI rows"), "{error}");
    }

    #[test]
    fn parse_bbox_csv_requires_roi_header() {
        let root = tempfile::tempdir().expect("tempdir");
        let path = root.path().join("Pos0.csv");
        fs::write(&path, "crop,x,y,w,h\n1,0,0,2,2\n").expect("write");
        let error = parse_bbox_csv(&path).expect_err("crop is not an alias");
        assert!(error.contains("roi"), "{error}");
        assert!(error.contains("crop"), "{error}");
    }

    #[test]
    fn parse_bbox_csv_reads_named_roi_columns() {
        let root = tempfile::tempdir().expect("tempdir");
        let path = root.path().join("Pos0.csv");
        fs::write(&path, "roi,x,y,w,h\n1,0,0,2,2\n").expect("write");
        let bboxes = parse_bbox_csv(&path).expect("parse csv");
        assert_eq!(bboxes.len(), 1);
        assert_eq!(bboxes[0].roi, 1);
    }

    #[test]
    fn parse_bbox_csv_ignores_leftover_extra_columns() {
        let root = tempfile::tempdir().expect("tempdir");
        let path = root.path().join("Pos0.csv");
        fs::write(&path, "roi,x,y,w,h,i,j\n7,1,2,3,4,0,1\n").expect("write");
        let bboxes = parse_bbox_csv(&path).expect("parse");
        assert_eq!(bboxes.len(), 1);
        assert_eq!(bboxes[0].roi, 7);
        assert_eq!(bboxes[0].x, 1);
        assert_eq!(bboxes[0].w, 3);
    }

    #[test]
    fn save_bbox_rejects_crop_header_and_writes_roi() {
        let root = tempfile::tempdir().expect("tempdir");
        let workspace = root.path().to_string_lossy().into_owned();
        let state = dummy_align_state();

        let error =
            save_bbox(&workspace, 0, "crop,x,y,w,h\n0,1,2,3,4\n", &state).expect_err("crop save");
        assert!(error.contains("`roi`"));
        assert!(!bbox_csv_path(&workspace, 0).exists());

        save_bbox(&workspace, 0, "roi,x,y,w,h\n0,1,2,3,4\n", &state).expect("roi save");
        let written = fs::read_to_string(bbox_csv_path(&workspace, 0)).expect("read");
        assert!(written.starts_with("roi,x,y,w,h"));
        assert!(!written.contains("crop"));
    }

    #[test]
    fn list_saved_bbox_positions_migrates_crop_headers() {
        let root = tempfile::tempdir().expect("tempdir");
        let workspace = root.path();
        fs::create_dir_all(workspace.join("bbox")).expect("bbox dir");
        fs::write(workspace.join("bbox/Pos4.csv"), "crop,x,y,w,h\n0,1,2,3,4\n").expect("write");

        let positions = list_saved_bbox_positions(&workspace.to_string_lossy()).expect("list");
        assert_eq!(positions, vec![4]);
        let text = fs::read_to_string(workspace.join("bbox/Pos4.csv")).expect("read");
        assert!(text.starts_with("roi,x,y,w,h"));
    }

    #[test]
    fn load_align_state_migrates_crop_headers() {
        let root = tempfile::tempdir().expect("tempdir");
        let workspace = root.path();
        fs::create_dir_all(workspace.join("bbox")).expect("bbox dir");
        fs::write(workspace.join("bbox/Pos1.csv"), "crop,x,y,w,h\n0,1,2,3,4\n").expect("write");

        let loaded = load_align_state(&workspace.to_string_lossy(), 1).expect("load");
        assert!(loaded.is_none());
        let text = fs::read_to_string(workspace.join("bbox/Pos1.csv")).expect("read");
        assert!(text.starts_with("roi,x,y,w,h"));
    }

    fn align_state_with_drift(drift: serde_json::Value) -> SavedAlignState {
        let mut value = serde_json::to_value(dummy_align_state()).expect("value");
        value
            .as_object_mut()
            .expect("object")
            .insert("drift".to_string(), drift);
        serde_json::from_value(value).expect("align state with drift")
    }

    #[test]
    fn saved_align_state_drift_defaults_to_none_when_the_key_is_absent() {
        let mut value = serde_json::to_value(dummy_align_state()).expect("value");
        value.as_object_mut().expect("object").remove("drift");
        let parsed: SavedAlignState = serde_json::from_value(value).expect("decode");
        assert!(parsed.drift.is_none());
    }

    #[test]
    fn load_align_state_reads_drift_and_a_file_without_the_key() {
        let root = tempfile::tempdir().expect("tempdir");
        let workspace = root.path();
        fs::create_dir_all(workspace.join("align")).expect("align dir");
        let with_drift = align_state_with_drift(serde_json::json!({
            "referenceTime": 0,
            "interpolation": "linear",
            "keyframes": [
                { "time": 400, "dx": 6.0, "dy": -2.5 },
                { "time": 875, "dx": 14.0, "dy": -4.0 }
            ]
        }));
        fs::write(
            workspace.join("align/Pos61.json"),
            serde_json::to_vec_pretty(&with_drift).expect("json"),
        )
        .expect("write");

        let loaded = load_align_state(&workspace.to_string_lossy(), 61)
            .expect("load")
            .expect("align state");
        let drift = loaded.drift.expect("drift");
        assert_eq!(drift.reference_time, 0);
        assert_eq!(drift.keyframes.len(), 2);
        assert_eq!(drift.keyframes[0].time, 400);
        assert_eq!(drift.keyframes[0].dx, 6.0);
        assert_eq!(drift.keyframes[0].dy, -2.5);
        assert_eq!(drift.keyframes[1].time, 875);
        assert_eq!(drift.keyframes[1].dx, 14.0);
        assert_eq!(drift.keyframes[1].dy, -4.0);

        let mut bare = serde_json::to_value(dummy_align_state()).expect("value");
        bare.as_object_mut().expect("object").remove("drift");
        fs::write(
            workspace.join("align/Pos71.json"),
            serde_json::to_vec_pretty(&bare).expect("json"),
        )
        .expect("write");
        let without = load_align_state(&workspace.to_string_lossy(), 71)
            .expect("load")
            .expect("align state");
        assert!(without.drift.is_none());
    }

    #[test]
    fn save_bbox_round_trips_reference_time_without_pins() {
        let root = tempfile::tempdir().expect("tempdir");
        let workspace = root.path().to_string_lossy().into_owned();
        let state = align_state_with_drift(serde_json::json!({
            "referenceTime": 875,
            "interpolation": "linear",
            "keyframes": []
        }));
        save_bbox(&workspace, 61, "roi,x,y,w,h\n0,1,2,3,4\n", &state).expect("save");
        let loaded = load_align_state(&workspace, 61)
            .expect("load")
            .expect("align state");
        let drift = loaded.drift.as_ref().expect("drift");
        assert_eq!(drift.reference_time, 875);
        assert!(drift.keyframes.is_empty());
        let value = serde_json::to_value(&loaded).expect("value");
        assert_eq!(value["drift"]["referenceTime"], 875);
        assert_eq!(value["drift"]["interpolation"], "linear");
        assert_eq!(value["drift"]["keyframes"], serde_json::json!([]));

        let replaced = align_state_with_drift(serde_json::json!({
            "referenceTime": 400,
            "interpolation": "linear",
            "keyframes": []
        }));
        save_bbox(&workspace, 61, "roi,x,y,w,h\n0,1,2,3,4\n", &replaced).expect("replace");
        let again = load_align_state(&workspace, 61)
            .expect("reload")
            .expect("align state");
        assert_eq!(again.drift.expect("drift").reference_time, 400);

        let align_dir = Path::new(&workspace).join("align");
        let names: Vec<_> = fs::read_dir(&align_dir)
            .expect("align dir")
            .map(|entry| entry.expect("entry").file_name())
            .collect();
        assert_eq!(names, vec![std::ffi::OsString::from("Pos61.json")]);
    }

    #[test]
    fn load_align_state_migrates_excluded_cells_to_patterns() {
        let root = tempfile::tempdir().expect("tempdir");
        let workspace = root.path();
        let mut legacy = serde_json::to_value(dummy_align_state()).expect("value");
        let object = legacy.as_object_mut().expect("object");
        object.remove("excludedPatterns");
        object.insert(
            "excludedCells".to_string(),
            serde_json::json!([{ "i": 2, "j": 3 }]),
        );
        let grid = object
            .get_mut("grid")
            .and_then(serde_json::Value::as_object_mut)
            .expect("grid");
        let width = grid.remove("patternWidth").expect("width");
        let height = grid.remove("patternHeight").expect("height");
        grid.insert("cellWidth".to_string(), width);
        grid.insert("cellHeight".to_string(), height);
        fs::create_dir_all(workspace.join("align")).expect("align dir");
        fs::write(
            workspace.join("align/Pos1.json"),
            serde_json::to_vec_pretty(&legacy).expect("json"),
        )
        .expect("write");

        let loaded = load_align_state(&workspace.to_string_lossy(), 1)
            .expect("load")
            .expect("align state");
        assert_eq!(loaded.excluded_patterns.len(), 1);
        assert_eq!(loaded.excluded_patterns[0].i, 2);
        assert_eq!(loaded.excluded_patterns[0].j, 3);
        assert_eq!(loaded.grid.pattern_width, 12.0);
    }

    #[test]
    fn parse_pos_csv_name_accepts_canonical_filenames() {
        assert_eq!(parse_pos_csv_name("Pos0.csv"), Some(0));
        assert_eq!(parse_pos_csv_name("Pos4.csv"), Some(4));
        assert_eq!(parse_pos_csv_name("Pos12.csv"), Some(12));
    }

    #[test]
    fn parse_pos_csv_name_rejects_noncanonical_filenames() {
        assert_eq!(parse_pos_csv_name("Pos04.csv"), None);
        assert_eq!(parse_pos_csv_name("Pos007.csv"), None);
        assert_eq!(parse_pos_csv_name("Pos00.csv"), None);
        assert_eq!(parse_pos_csv_name("Pos4.txt"), None);
        assert_eq!(parse_pos_csv_name("Foo4.csv"), None);
        assert_eq!(parse_pos_csv_name("Pos4a.csv"), None);
    }

    #[test]
    fn list_saved_bbox_positions_skips_noncanonical_filenames() {
        let root = tempfile::tempdir().expect("tempdir");
        let workspace = root.path();
        fs::create_dir_all(workspace.join("bbox")).expect("bbox dir");
        fs::write(workspace.join("bbox/Pos04.csv"), "roi,x,y,w,h\n1,0,0,2,2\n").expect("write");

        let positions = list_saved_bbox_positions(&workspace.to_string_lossy()).expect("list");
        assert_eq!(positions, Vec::<u32>::new());
        assert!(!bbox_csv_path(&workspace.to_string_lossy(), 4).exists());
    }

    #[test]
    fn list_saved_bbox_positions_keeps_canonical_among_noncanonical() {
        let root = tempfile::tempdir().expect("tempdir");
        let workspace = root.path();
        fs::create_dir_all(workspace.join("bbox")).expect("bbox dir");
        fs::write(workspace.join("bbox/Pos04.csv"), "roi,x,y,w,h\n1,0,0,2,2\n").expect("write");
        fs::write(workspace.join("bbox/Pos7.csv"), "roi,x,y,w,h\n1,0,0,2,2\n").expect("write");

        let positions = list_saved_bbox_positions(&workspace.to_string_lossy()).expect("list");
        assert_eq!(positions, vec![7]);
    }
}
