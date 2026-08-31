use std::{
    fs,
    io::ErrorKind,
    path::{Path, PathBuf},
};

use lisca_workspace::{BBOX_DIR, POS_PREFIX};
use uuid::Uuid;

const CROP: &str = "crop";
const ROI: &str = "roi";

pub(super) fn apply(workspace: &Path) -> Result<Vec<String>, String> {
    let mut rewritten = Vec::new();
    for path in bbox_csv_paths(workspace)? {
        if migrate_file(&path)? {
            rewritten.push(path.to_string_lossy().into_owned());
        }
    }
    Ok(rewritten)
}

fn bbox_csv_paths(workspace: &Path) -> Result<Vec<PathBuf>, String> {
    let bbox_dir = workspace.join(BBOX_DIR);
    let entries = match fs::read_dir(&bbox_dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(format!("failed to read {}: {error}", bbox_dir.display())),
    };
    let mut paths = Vec::new();
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
        if parse_pos_csv_name(name).is_some() {
            paths.push(path);
        }
    }
    paths.sort();
    Ok(paths)
}

fn parse_pos_csv_name(name: &str) -> Option<u32> {
    let rest = name.strip_prefix(POS_PREFIX)?.strip_suffix(".csv")?;
    rest.parse().ok()
}

fn migrate_file(path: &Path) -> Result<bool, String> {
    let text = fs::read_to_string(path).map_err(|error| format!("{}: {error}", path.display()))?;
    let text = text.strip_prefix('\u{feff}').unwrap_or(&text);
    let (header_line, newline, rest) = split_first_line(text);
    let cells = parse_header_cells(header_line, path)?;
    let has_crop = header_has(&cells, CROP);
    let has_roi = header_has(&cells, ROI);
    if has_crop && has_roi {
        return Err(format!(
            "BBox CSV has both `crop` and `roi` columns: {}",
            path.display()
        ));
    }
    if !has_crop && !has_roi {
        return Err(format!(
            "BBox CSV is missing required columns (roi, x, y, w, h): {}",
            path.display()
        ));
    }
    if has_roi {
        return Ok(false);
    }

    let new_header = rewrite_header_line(&cells)?;
    let mut new_text = String::with_capacity(new_header.len() + newline.len() + rest.len());
    new_text.push_str(&new_header);
    new_text.push_str(newline);
    new_text.push_str(rest);
    atomic_write(path, &new_text)?;
    Ok(true)
}

fn split_first_line(text: &str) -> (&str, &str, &str) {
    if let Some(index) = text.find("\r\n") {
        (&text[..index], "\r\n", &text[index + 2..])
    } else if let Some(index) = text.find('\n') {
        (&text[..index], "\n", &text[index + 1..])
    } else if let Some(index) = text.find('\r') {
        (&text[..index], "\r", &text[index + 1..])
    } else {
        (text, "\n", "")
    }
}

fn parse_header_cells(header_line: &str, path: &Path) -> Result<Vec<String>, String> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(false)
        .flexible(true)
        .from_reader(header_line.as_bytes());
    let Some(result) = reader.records().next() else {
        return Ok(Vec::new());
    };
    let record = result.map_err(|error| format!("{}: {error}", path.display()))?;
    Ok(record.iter().map(str::to_string).collect())
}

fn header_has(cells: &[String], name: &str) -> bool {
    cells
        .iter()
        .any(|cell| cell.trim().eq_ignore_ascii_case(name))
}

fn rewrite_header_line(cells: &[String]) -> Result<String, String> {
    let rewritten: Vec<&str> = cells
        .iter()
        .map(|cell| {
            if cell.trim().eq_ignore_ascii_case(CROP) {
                ROI
            } else {
                cell.as_str()
            }
        })
        .collect();
    let mut buf = Vec::new();
    {
        let mut writer = csv::WriterBuilder::new().from_writer(&mut buf);
        writer
            .write_record(&rewritten)
            .map_err(|error| error.to_string())?;
        writer.flush().map_err(|error| error.to_string())?;
    }
    let text = String::from_utf8(buf).map_err(|error| error.to_string())?;
    Ok(text.trim_end_matches(['\n', '\r']).to_string())
}

fn atomic_write(path: &Path, contents: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("bbox CSV has no parent directory: {}", path.display()))?;
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| format!("bbox CSV has a non-utf8 name: {}", path.display()))?;
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
