use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
};

use crate::protocol::{AlignOutputPaths, RoiBbox, SaveBboxResponse, SavedAlignState};

pub fn load_align_state(workspace_path: &str, pos: u32) -> Result<Option<SavedAlignState>, String> {
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
    fs::write(&align_target, bytes).map_err(|error| error.to_string())?;

    Ok(SaveBboxResponse {
        ok: true,
        error: None,
    })
}

pub fn list_saved_bbox_positions(workspace_path: &str) -> Result<Vec<u32>, String> {
    let bbox_dir = Path::new(workspace_path).join("bbox");
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
        bbox: format!("bbox/Pos{pos}.csv"),
        align: format!("align/Pos{pos}.json"),
        roi: format!("roi/Pos{pos}.tif"),
    }
}

pub(super) fn bbox_csv_path(root: &str, pos: u32) -> PathBuf {
    Path::new(root).join("bbox").join(format!("Pos{pos}.csv"))
}

pub(super) fn roi_pos_dir_path(root: &str, pos: u32) -> PathBuf {
    Path::new(root).join("roi").join(format!("Pos{pos}"))
}

pub(super) fn parse_bbox_csv(path: &Path) -> Result<Vec<RoiBbox>, String> {
    let text = fs::read_to_string(path).map_err(|error| format!("{}: {error}", path.display()))?;
    let mut lines = text
        .lines()
        .enumerate()
        .filter(|(_, line)| !line.trim().is_empty());
    let Some((header_index, header_line)) = lines.next() else {
        return Err(format!("{}: empty bbox CSV", path.display()));
    };
    let header = header_line
        .split(',')
        .map(|cell| cell.trim().to_ascii_lowercase())
        .collect::<Vec<_>>();
    let column_index = |name: &str| {
        header
            .iter()
            .position(|column| column == name)
            .ok_or_else(|| {
                format!(
                    "{}:{} missing required column '{name}' (required: roi, x, y, w, h)",
                    path.display(),
                    header_index + 1
                )
            })
    };
    let roi_idx = header
        .iter()
        .position(|column| column == "roi")
        .or_else(|| header.iter().position(|column| column == "crop"))
        .ok_or_else(|| {
            format!(
                "{}:{} missing required column 'roi' (or alias 'crop'); required: roi, x, y, w, h",
                path.display(),
                header_index + 1
            )
        })?;
    let x_idx = column_index("x")?;
    let y_idx = column_index("y")?;
    let w_idx = column_index("w")?;
    let h_idx = column_index("h")?;
    let required_idx = roi_idx.max(x_idx).max(y_idx).max(w_idx).max(h_idx);

    let mut bboxes = Vec::new();
    for (line_index, line) in lines {
        let columns = line.split(',').map(str::trim).collect::<Vec<_>>();
        if columns.len() <= required_idx {
            return Err(format!(
                "{}:{} expected at least {} columns",
                path.display(),
                line_index + 1,
                required_idx + 1
            ));
        }
        let roi = parse_bbox_csv_value(columns[roi_idx], "roi")?;
        let x = parse_bbox_csv_value(columns[x_idx], "x")?;
        let y = parse_bbox_csv_value(columns[y_idx], "y")?;
        let w = parse_bbox_csv_value(columns[w_idx], "w")?;
        let h = parse_bbox_csv_value(columns[h_idx], "h")?;
        if w == 0 || h == 0 {
            continue;
        }
        bboxes.push(RoiBbox { roi, x, y, w, h });
    }
    Ok(bboxes)
}

fn align_json_path(root: &str, pos: u32) -> PathBuf {
    Path::new(root).join("align").join(format!("Pos{pos}.json"))
}

fn parse_pos_csv_name(name: &str) -> Option<u32> {
    let rest = name.strip_prefix("Pos")?.strip_suffix(".csv")?;
    rest.parse().ok()
}

fn parse_bbox_csv_value(value: &str, label: &str) -> Result<u32, String> {
    value
        .trim()
        .parse::<u32>()
        .map_err(|error| format!("invalid bbox {label}: {error}"))
}

#[cfg(test)]
mod tests {
    use std::io::Write;

    use super::*;

    #[test]
    fn parse_bbox_csv_returns_empty_for_header_only_file() {
        let path =
            std::env::temp_dir().join(format!("lisca-empty-bbox-{}.csv", std::process::id()));
        let mut file = fs::File::create(&path).expect("create csv");
        writeln!(file, "roi,x,y,w,h,i,j").expect("write header");
        let bboxes = parse_bbox_csv(&path).expect("parse csv");
        assert!(bboxes.is_empty());
        let _ = fs::remove_file(path);
    }

    #[test]
    fn parse_bbox_csv_accepts_crop_header_as_roi_alias() {
        let path = std::env::temp_dir().join(format!("lisca-crop-bbox-{}.csv", std::process::id()));
        let mut file = fs::File::create(&path).expect("create csv");
        writeln!(file, "crop,x,y,w,h").expect("write header");
        writeln!(file, "1,0,0,2,2").expect("write row");
        let bboxes = parse_bbox_csv(&path).expect("crop alias");
        assert_eq!(bboxes.len(), 1);
        assert_eq!(bboxes[0].roi, 1);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn parse_bbox_csv_reads_named_roi_columns() {
        let path = std::env::temp_dir().join(format!("lisca-roi-bbox-{}.csv", std::process::id()));
        let mut file = fs::File::create(&path).expect("create csv");
        writeln!(file, "roi,x,y,w,h").expect("write header");
        writeln!(file, "1,0,0,2,2").expect("write row");
        let bboxes = parse_bbox_csv(&path).expect("parse csv");
        assert_eq!(bboxes.len(), 1);
        assert_eq!(bboxes[0].roi, 1);
        let _ = fs::remove_file(path);
    }
}
