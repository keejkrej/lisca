use std::{
    collections::BTreeSet,
    fmt, fs, io,
    path::{Path, PathBuf},
};

pub const BBOX_COLUMNS: [&str; 5] = ["roi", "x", "y", "w", "h"];

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RoiBbox {
    pub roi: u32,
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

#[derive(Debug)]
pub struct BboxError {
    pub path: PathBuf,
    pub message: String,
}

impl BboxError {
    fn new(path: impl Into<PathBuf>, message: impl Into<String>) -> Self {
        Self {
            path: path.into(),
            message: message.into(),
        }
    }
}

impl fmt::Display for BboxError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.path.display(), self.message)
    }
}

impl std::error::Error for BboxError {}

/// Parse a live bbox CSV. Required columns are `roi, x, y, w, h` by name.
///
/// Extra columns are ignored. `crop` is not an alias for `roi`.
pub fn parse_bbox_csv(path: impl AsRef<Path>) -> Result<Vec<RoiBbox>, BboxError> {
    let path = path.as_ref();
    let text = fs::read_to_string(path).map_err(|error| io_error(path, error))?;
    parse_bbox_csv_text(path, &text)
}

fn io_error(path: &Path, error: io::Error) -> BboxError {
    BboxError::new(path, error.to_string())
}

fn parse_bbox_csv_text(path: &Path, text: &str) -> Result<Vec<RoiBbox>, BboxError> {
    let text = text.strip_prefix('\u{feff}').unwrap_or(text);
    let lines = text
        .lines()
        .filter(|line| !line.trim().is_empty())
        .collect::<Vec<_>>();
    if lines.is_empty() {
        return Err(BboxError::new(path, "BBox CSV is empty"));
    }

    let body = lines.join("\n");
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(false)
        .flexible(true)
        .from_reader(body.as_bytes());

    let mut records = reader.records();
    let header_record = records
        .next()
        .ok_or_else(|| BboxError::new(path, "BBox CSV is empty"))?
        .map_err(|error| BboxError::new(path, error.to_string()))?;
    let header = header_record
        .iter()
        .map(|cell| cell.trim().to_ascii_lowercase())
        .collect::<Vec<_>>();

    if header.iter().any(|cell| cell == "crop") {
        return Err(BboxError::new(
            path,
            "BBox CSV uses unsupported column `crop` (not a live header); \
             required columns (roi, x, y, w, h)",
        ));
    }

    let roi_idx = column_index(&header, "roi").ok_or_else(|| missing_columns(path))?;
    let x_idx = column_index(&header, "x").ok_or_else(|| missing_columns(path))?;
    let y_idx = column_index(&header, "y").ok_or_else(|| missing_columns(path))?;
    let w_idx = column_index(&header, "w").ok_or_else(|| missing_columns(path))?;
    let h_idx = column_index(&header, "h").ok_or_else(|| missing_columns(path))?;
    let required_idx = roi_idx.max(x_idx).max(y_idx).max(w_idx).max(h_idx);

    let mut bboxes = Vec::new();
    let mut seen = BTreeSet::new();
    for (offset, record) in records.enumerate() {
        let row_number = offset + 2;
        let record = record.map_err(|error| BboxError::new(path, error.to_string()))?;
        if record.len() <= required_idx {
            return Err(BboxError::new(
                path,
                format!("BBox CSV row {row_number} is malformed"),
            ));
        }
        let bbox = RoiBbox {
            roi: parse_u32(path, record[roi_idx].trim(), "roi")?,
            x: parse_u32(path, record[x_idx].trim(), "x")?,
            y: parse_u32(path, record[y_idx].trim(), "y")?,
            w: parse_u32(path, record[w_idx].trim(), "w")?,
            h: parse_u32(path, record[h_idx].trim(), "h")?,
        };
        if bbox.w == 0 || bbox.h == 0 {
            return Err(BboxError::new(
                path,
                format!("BBox row {row_number} must have positive width and height"),
            ));
        }
        if !seen.insert(bbox.roi) {
            return Err(BboxError::new(path, format!("Duplicate roi {}", bbox.roi)));
        }
        bboxes.push(bbox);
    }

    if bboxes.is_empty() {
        return Err(BboxError::new(
            path,
            "BBox CSV does not contain any ROI rows",
        ));
    }
    bboxes.sort_by_key(|bbox| bbox.roi);
    Ok(bboxes)
}

fn missing_columns(path: &Path) -> BboxError {
    BboxError::new(
        path,
        format!(
            "BBox CSV is missing required columns ({})",
            BBOX_COLUMNS.join(", ")
        ),
    )
}

fn column_index(header: &[String], name: &str) -> Option<usize> {
    header.iter().position(|cell| cell == name)
}

fn parse_u32(path: &Path, value: &str, label: &str) -> Result<u32, BboxError> {
    value
        .parse::<u32>()
        .map_err(|error| BboxError::new(path, format!("invalid bbox {label}: {error}")))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        io::Write,
        sync::atomic::{AtomicU64, Ordering},
    };

    static TEST_FILE_SEQ: AtomicU64 = AtomicU64::new(0);

    fn write_csv(text: &str) -> PathBuf {
        let seq = TEST_FILE_SEQ.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "lisca-workspace-bbox-{}-{seq}.csv",
            std::process::id()
        ));
        let mut file = fs::File::create(&path).expect("create csv");
        file.write_all(text.as_bytes()).expect("write csv");
        path
    }

    fn parse_then_remove(path: &Path) -> Result<Vec<RoiBbox>, BboxError> {
        let result = parse_bbox_csv(path);
        let _ = fs::remove_file(path);
        result
    }

    #[test]
    fn parse_bbox_csv_reads_named_columns() {
        let path = write_csv("h,w,y,x,roi\n4,3,2,1,7\n");
        let bboxes = parse_then_remove(&path).expect("parse");
        assert_eq!(
            bboxes,
            [RoiBbox {
                roi: 7,
                x: 1,
                y: 2,
                w: 3,
                h: 4
            }]
        );
    }

    #[test]
    fn parse_bbox_csv_ignores_extra_columns() {
        let path = write_csv("roi,x,y,w,h,i,j\n0,1,2,3,4,9,8\n");
        let bboxes = parse_then_remove(&path).expect("parse");
        assert_eq!(
            bboxes,
            [RoiBbox {
                roi: 0,
                x: 1,
                y: 2,
                w: 3,
                h: 4
            }]
        );
    }

    #[test]
    fn parse_bbox_csv_rejects_crop_header_alias() {
        let path = write_csv("crop,x,y,w,h\n0,1,2,3,4\n");
        let error = parse_then_remove(&path).expect_err("crop alias");
        assert!(error.message.contains("crop"), "{}", error.message);
        assert!(error.message.contains("roi"), "{}", error.message);
    }

    #[test]
    fn parse_bbox_csv_strips_utf8_bom() {
        let path = write_csv("\u{feff}roi,x,y,w,h\n0,1,2,3,4\n");
        let bboxes = parse_then_remove(&path).expect("parse");
        assert_eq!(
            bboxes,
            [RoiBbox {
                roi: 0,
                x: 1,
                y: 2,
                w: 3,
                h: 4
            }]
        );
    }

    #[test]
    fn parse_bbox_csv_rejects_header_only_file() {
        let path = write_csv("roi,x,y,w,h\n");
        let error = parse_then_remove(&path).expect_err("header only");
        assert!(error.message.contains("does not contain any ROI rows"));
    }
}
