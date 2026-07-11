use std::{
    collections::{BTreeSet, HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
};

use crate::protocol::{FrameRequest, WorkspaceScan};

use super::{frame::load_image_frame, RawFrame};

#[derive(Clone, Debug)]
struct FsDirEntry {
    name: String,
    path: PathBuf,
    is_directory: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
enum SeriesAxis {
    Position,
    Time,
    Channel,
    Z,
}

#[derive(Clone, Debug)]
enum SeriesTemplatePart {
    Literal(String),
    Placeholder(SeriesAxis),
}

#[derive(Clone, Debug)]
struct SeriesRecord {
    path: PathBuf,
    position: String,
    time: String,
    channel: String,
    z: String,
}

#[derive(Clone, Debug)]
pub(super) struct SeriesDataset {
    positions: Vec<String>,
    times: Vec<String>,
    channels: Vec<String>,
    z_slices: Vec<String>,
    records: Vec<SeriesRecord>,
}

impl SeriesDataset {
    pub(super) fn build(
        root: &str,
        subfolder_template: &str,
        filename_template: &str,
    ) -> Result<Self, String> {
        let root = Path::new(root);
        if !root.is_dir() {
            return Err(format!("{} is not a directory", root.display()));
        }

        let subfolder_template = subfolder_template.trim();
        let filename_template = strip_supported_image_extension(filename_template.trim());
        if filename_template.is_empty() {
            return Err("Filename template cannot be empty".to_string());
        }
        if subfolder_template.contains('/') || subfolder_template.contains('\\') {
            return Err("Subfolder template cannot contain path separators".to_string());
        }
        if filename_template.contains('/') || filename_template.contains('\\') {
            return Err("Filename template cannot contain path separators".to_string());
        }

        let subfolder_parts = compile_series_template(subfolder_template, true)?;
        let filename_parts = compile_series_template(filename_template, false)?;
        let mut records = Vec::new();

        if subfolder_template.is_empty() {
            collect_series_records(root, "", &subfolder_parts, &filename_parts, &mut records)?;
        } else {
            let mut folders = read_dir_entries(root)?
                .into_iter()
                .filter(|entry| entry.is_directory)
                .collect::<Vec<_>>();
            folders.sort_by_key(|entry| entry.path.clone());

            for folder in folders {
                let name = folder.name;
                if match_series_template(&subfolder_parts, &name, false).is_none() {
                    continue;
                }
                collect_series_records(
                    &folder.path,
                    &name,
                    &subfolder_parts,
                    &filename_parts,
                    &mut records,
                )?;
            }
        }

        if records.is_empty() {
            return Err(format!(
                "No files in {} matched template '{}{}{}'",
                root.display(),
                if subfolder_template.is_empty() {
                    ""
                } else {
                    subfolder_template
                },
                if subfolder_template.is_empty() {
                    ""
                } else {
                    "/"
                },
                filename_template,
            ));
        }

        records.sort_by(|left, right| {
            compare_series_value(&left.position, &right.position)
                .then_with(|| compare_series_value(&left.time, &right.time))
                .then_with(|| compare_series_value(&left.channel, &right.channel))
                .then_with(|| compare_series_value(&left.z, &right.z))
                .then_with(|| left.path.cmp(&right.path))
        });

        let mut seen = HashSet::new();
        for record in &records {
            if !seen.insert((
                record.position.clone(),
                record.time.clone(),
                record.channel.clone(),
                record.z.clone(),
            )) {
                return Err(format!(
                    "Duplicate file match for position={}, time={}, channel={}, z={}",
                    record.position, record.time, record.channel, record.z,
                ));
            }
        }

        Ok(Self {
            positions: sorted_axis_values(records.iter().map(|record| &record.position)),
            times: sorted_axis_values(records.iter().map(|record| &record.time)),
            channels: sorted_axis_values(records.iter().map(|record| &record.channel)),
            z_slices: sorted_axis_values(records.iter().map(|record| &record.z)),
            records,
        })
    }

    pub(super) fn workspace_scan(&self) -> WorkspaceScan {
        WorkspaceScan {
            positions: workspace_axis_values(&self.positions),
            position_labels: axis_label_values(&self.positions),
            channels: workspace_axis_values(&self.channels),
            channel_labels: axis_label_values(&self.channels),
            times: workspace_axis_values(&self.times),
            time_labels: axis_label_values(&self.times),
            z_slices: workspace_axis_values(&self.z_slices),
            z_slice_labels: axis_label_values(&self.z_slices),
        }
    }

    pub(super) fn load_frame(&self, request: FrameRequest) -> Result<RawFrame, String> {
        let position = axis_value(
            "Position",
            &self.positions,
            axis_index_for_request("Position", &self.positions, request.pos)?,
        )?;
        let time = axis_value(
            "Time",
            &self.times,
            axis_index_for_request("Time", &self.times, request.time)?,
        )?;
        let channel = axis_value(
            "Channel",
            &self.channels,
            axis_index_for_request("Channel", &self.channels, request.channel)?,
        )?;
        let z = axis_value(
            "Z",
            &self.z_slices,
            axis_index_for_request("Z", &self.z_slices, request.z)?,
        )?;

        let matching = self
            .records
            .iter()
            .find(|record| {
                record.position == position
                    && record.time == time
                    && record.channel == channel
                    && record.z == z
            })
            .map(|record| record.path.clone())
            .ok_or_else(|| "requested image frame not found".to_string())?;

        load_image_frame(&matching)
    }
}

fn read_dir_entries(dir: &Path) -> Result<Vec<FsDirEntry>, String> {
    let mut entries = Vec::new();
    for entry in fs::read_dir(dir)
        .map_err(|error| error.to_string())?
        .flatten()
    {
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        entries.push(FsDirEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path(),
            is_directory: file_type.is_dir(),
        });
    }
    Ok(entries)
}

fn strip_supported_image_extension(value: &str) -> &str {
    for extension in [".tiff", ".jpeg", ".tif", ".png", ".jpg"] {
        if value
            .to_ascii_lowercase()
            .ends_with(&extension.to_ascii_lowercase())
        {
            return &value[..value.len() - extension.len()];
        }
    }
    value
}

fn collect_series_records(
    folder: &Path,
    subfolder_name: &str,
    subfolder_parts: &[SeriesTemplatePart],
    filename_parts: &[SeriesTemplatePart],
    records: &mut Vec<SeriesRecord>,
) -> Result<(), String> {
    let subfolder_values =
        match_series_template(subfolder_parts, subfolder_name, false).unwrap_or_default();
    let mut files = read_dir_entries(folder)?
        .into_iter()
        .filter(|entry| !entry.is_directory && is_supported_source_image(&entry.path))
        .collect::<Vec<_>>();
    files.sort_by_key(|entry| entry.path.clone());

    for file in files {
        let name = file.name;
        let filename_values = match_series_template(filename_parts, &name, true).or_else(|| {
            file.path
                .file_stem()
                .and_then(|stem| stem.to_str())
                .and_then(|stem| match_series_template(filename_parts, stem, true))
        });
        let Some(filename_values) = filename_values else {
            continue;
        };
        let values = merge_series_values(&subfolder_values, &filename_values, &name)?;
        records.push(SeriesRecord {
            path: file.path,
            position: values
                .get(&SeriesAxis::Position)
                .cloned()
                .unwrap_or_else(|| "0".to_string()),
            time: values
                .get(&SeriesAxis::Time)
                .cloned()
                .unwrap_or_else(|| "0".to_string()),
            channel: values
                .get(&SeriesAxis::Channel)
                .cloned()
                .unwrap_or_else(|| "0".to_string()),
            z: values
                .get(&SeriesAxis::Z)
                .cloned()
                .unwrap_or_else(|| "0".to_string()),
        });
    }

    Ok(())
}

fn compile_series_template(
    template: &str,
    allow_empty: bool,
) -> Result<Vec<SeriesTemplatePart>, String> {
    if template.is_empty() {
        if allow_empty {
            return Ok(Vec::new());
        }
        return Err("Filename template cannot be empty".to_string());
    }

    let mut parts = Vec::new();
    let mut placeholders = BTreeSet::new();
    let mut cursor = 0;
    while let Some(start_offset) = template[cursor..].find('{') {
        let start = cursor + start_offset;
        if start > cursor {
            parts.push(SeriesTemplatePart::Literal(
                template[cursor..start].to_string(),
            ));
        }
        let Some(end_offset) = template[start + 1..].find('}') else {
            return Err("Template placeholder is missing a closing '}'".to_string());
        };
        let end = start + 1 + end_offset;
        let name = &template[start + 1..end];
        let axis = series_axis_from_placeholder(name).ok_or_else(|| {
            "Unsupported placeholder. Supported placeholders: {t}, {p}, {c}, {z}.".to_string()
        })?;
        if !placeholders.insert(axis) {
            return Err(format!("Placeholder {{{name}}} appears more than once"));
        }
        parts.push(SeriesTemplatePart::Placeholder(axis));
        cursor = end + 1;
    }

    if cursor < template.len() {
        parts.push(SeriesTemplatePart::Literal(template[cursor..].to_string()));
    }

    Ok(parts)
}

fn series_axis_from_placeholder(name: &str) -> Option<SeriesAxis> {
    match name {
        "p" | "position" => Some(SeriesAxis::Position),
        "t" | "time" => Some(SeriesAxis::Time),
        "c" | "channel" => Some(SeriesAxis::Channel),
        "z" => Some(SeriesAxis::Z),
        _ => None,
    }
}

fn match_series_template(
    parts: &[SeriesTemplatePart],
    value: &str,
    case_sensitive: bool,
) -> Option<HashMap<SeriesAxis, String>> {
    fn matches_literal(value: &str, cursor: usize, literal: &str, case_sensitive: bool) -> bool {
        let remaining = value.get(cursor..).unwrap_or_default();
        if case_sensitive {
            return remaining.starts_with(literal);
        }
        remaining
            .to_ascii_lowercase()
            .starts_with(&literal.to_ascii_lowercase())
    }

    fn inner(
        parts: &[SeriesTemplatePart],
        value: &str,
        index: usize,
        cursor: usize,
        case_sensitive: bool,
        values: &mut HashMap<SeriesAxis, String>,
    ) -> bool {
        if index == parts.len() {
            return cursor == value.len();
        }

        match &parts[index] {
            SeriesTemplatePart::Literal(literal) => {
                if !matches_literal(value, cursor, literal, case_sensitive) {
                    return false;
                }
                inner(
                    parts,
                    value,
                    index + 1,
                    cursor + literal.len(),
                    case_sensitive,
                    values,
                )
            }
            SeriesTemplatePart::Placeholder(axis) => {
                for end in cursor + 1..=value.len() {
                    if !value.is_char_boundary(end) {
                        continue;
                    }
                    values.insert(*axis, value[cursor..end].to_string());
                    if inner(parts, value, index + 1, end, case_sensitive, values) {
                        return true;
                    }
                    values.remove(axis);
                }
                false
            }
        }
    }

    let mut values = HashMap::new();
    inner(parts, value, 0, 0, case_sensitive, &mut values).then_some(values)
}

fn merge_series_values(
    subfolder_values: &HashMap<SeriesAxis, String>,
    filename_values: &HashMap<SeriesAxis, String>,
    file_name: &str,
) -> Result<HashMap<SeriesAxis, String>, String> {
    let mut values = subfolder_values.clone();
    for (axis, value) in filename_values {
        let Some(existing) = values.get(axis) else {
            values.insert(*axis, value.clone());
            continue;
        };
        if !series_values_are_compatible(existing, value) {
            return Err(format!(
                "Conflicting placeholder values for {file_name}: {axis:?}={existing:?} and {value:?}",
            ));
        }
    }
    Ok(values)
}

fn series_values_are_compatible(left: &str, right: &str) -> bool {
    if left == right {
        return true;
    }
    match (left.parse::<i64>(), right.parse::<i64>()) {
        (Ok(left), Ok(right)) => left == right,
        _ => false,
    }
}

fn compare_series_value(left: &str, right: &str) -> std::cmp::Ordering {
    match (left.parse::<i64>(), right.parse::<i64>()) {
        (Ok(left), Ok(right)) => left.cmp(&right),
        (Ok(_), Err(_)) => std::cmp::Ordering::Less,
        (Err(_), Ok(_)) => std::cmp::Ordering::Greater,
        (Err(_), Err(_)) => left.cmp(right),
    }
}

fn sorted_axis_values<'a>(values: impl IntoIterator<Item = &'a String>) -> Vec<String> {
    let mut values = values
        .into_iter()
        .cloned()
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    values.sort_by(|left, right| compare_series_value(left, right));
    values
}

fn workspace_axis_values(values: &[String]) -> Vec<u32> {
    let mut parsed = Vec::with_capacity(values.len());
    for value in values {
        match value.parse::<u32>() {
            Ok(number) => parsed.push(number),
            Err(_) => {
                return (0..values.len())
                    .filter_map(|index| u32::try_from(index).ok())
                    .collect();
            }
        }
    }
    parsed
}

fn axis_label_values(values: &[String]) -> Vec<String> {
    values
        .iter()
        .map(|value| strip_supported_image_extension(value).to_string())
        .collect()
}

fn axis_index_for_request(
    label: &str,
    values: &[String],
    request_value: u32,
) -> Result<u32, String> {
    if let Some(index) = values
        .iter()
        .position(|value| value.parse::<u32>().ok() == Some(request_value))
    {
        return u32::try_from(index)
            .map_err(|error| format!("{label} index {index} is out of range: {error}"));
    }

    let index = request_value as usize;
    if index < values.len() {
        return Ok(request_value);
    }

    Err(format!("{label} value {request_value} is out of range"))
}

fn axis_value(label: &str, values: &[String], index: u32) -> Result<String, String> {
    values
        .get(index as usize)
        .cloned()
        .ok_or_else(|| format!("{label} index {index} is out of range"))
}

fn is_supported_source_image(path: &Path) -> bool {
    if path
        .file_name()
        .and_then(|value| value.to_str())
        .is_some_and(|name| name.ends_with("_seg.npy"))
    {
        return false;
    }

    matches!(
        path.extension()
            .and_then(|value| value.to_str())
            .map(|value| value.to_ascii_lowercase())
            .as_deref(),
        Some("tif" | "tiff" | "png" | "jpg" | "jpeg")
    )
}

#[cfg(test)]
mod tests {
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::*;

    #[test]
    fn matches_series_template_with_subfolder_values() {
        let subfolder = compile_series_template("Pos{p}", true).expect("subfolder template");
        let filename =
            compile_series_template("img_{t}_{c}_{z}.png", false).expect("filename template");

        let subfolder_values =
            match_series_template(&subfolder, "Pos12", false).expect("subfolder match");
        let filename_values =
            match_series_template(&filename, "img_3_DAPI_2.png", true).expect("filename match");
        let values = merge_series_values(&subfolder_values, &filename_values, "img_3_DAPI_2.png")
            .expect("merged values");

        assert_eq!(
            values.get(&SeriesAxis::Position).map(String::as_str),
            Some("12")
        );
        assert_eq!(values.get(&SeriesAxis::Time).map(String::as_str), Some("3"));
        assert_eq!(
            values.get(&SeriesAxis::Channel).map(String::as_str),
            Some("DAPI")
        );
        assert_eq!(values.get(&SeriesAxis::Z).map(String::as_str), Some("2"));
    }

    #[test]
    fn scans_folder_source_from_templates() {
        let root = temp_workspace("series");
        let pos0 = root.join("Pos0");
        let pos1 = root.join("Pos1");
        fs::create_dir_all(&pos0).expect("pos0");
        fs::create_dir_all(&pos1).expect("pos1");
        fs::write(pos0.join("img_0_DAPI_0.png"), []).expect("pos0 file");
        fs::write(pos1.join("img_0_DAPI_0.png"), []).expect("pos1 file");

        let scan = SeriesDataset::build(
            root.to_str().expect("temp path"),
            "Pos{p}",
            "img_{t}_{c}_{z}",
        )
        .expect("dataset")
        .workspace_scan();

        assert_eq!(scan.positions, vec![0, 1]);
        assert_eq!(scan.channels, vec![0]);
        assert_eq!(scan.times, vec![0]);
        assert_eq!(scan.z_slices, vec![0]);

        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn scans_folder_source_ignores_template_extension() {
        let root = temp_workspace("series-ext");
        let pos0 = root.join("Pos0");
        fs::create_dir_all(&pos0).expect("pos0");
        fs::write(pos0.join("img_channel0_position0_time0_z0.png"), []).expect("pos0 file");

        let scan = SeriesDataset::build(
            root.to_str().expect("temp path"),
            "Pos{p}",
            "img_channel{c}_position{p}_time{t}_z{z}.tif",
        )
        .expect("dataset")
        .workspace_scan();

        assert_eq!(scan.positions, vec![0]);
        assert_eq!(scan.channels, vec![0]);
        assert_eq!(scan.times, vec![0]);
        assert_eq!(scan.z_slices, vec![0]);

        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn scans_folder_source_with_sparse_numeric_axes() {
        let root = temp_workspace("series-sparse");
        let pos = root.join("Pos138");
        fs::create_dir_all(&pos).expect("pos");
        fs::write(
            pos.join("img_channel000_position138_time000000000_z000.png"),
            [],
        )
        .expect("t0");
        fs::write(
            pos.join("img_channel000_position138_time000000012_z000.png"),
            [],
        )
        .expect("t12");
        fs::write(
            pos.join("img_channel000_position138_time000000024_z000.png"),
            [],
        )
        .expect("t24");

        let scan = SeriesDataset::build(
            root.to_str().expect("temp path"),
            "Pos{p}",
            "img_channel{c}_position{p}_time{t}_z{z}.png",
        )
        .expect("dataset")
        .workspace_scan();

        assert_eq!(scan.positions, vec![138]);
        assert_eq!(scan.position_labels, vec!["138"]);
        assert_eq!(scan.channels, vec![0]);
        assert_eq!(scan.channel_labels, vec!["000"]);
        assert_eq!(scan.times, vec![0, 12, 24]);
        assert_eq!(
            scan.time_labels,
            vec!["000000000", "000000012", "000000024"]
        );
        assert_eq!(scan.z_slices, vec![0]);
        assert_eq!(scan.z_slice_labels, vec!["000"]);

        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn scans_mcf_cart_single_fixture_positions() {
        let root = "/home/jack/data/mcf_cart_single";
        if !Path::new(root).is_dir() {
            return;
        }

        let scan = SeriesDataset::build(root, "Pos{p}", "img_channel{c}_position{p}_time{t}_z{z}")
            .expect("dataset")
            .workspace_scan();

        assert_eq!(scan.positions, vec![138, 144, 161]);
        assert!(scan.times.len() > 1);
        assert_eq!(scan.times[1], 12);
        assert_eq!(scan.time_labels[1], "000000012");
    }

    #[test]
    fn scans_folder_source_with_named_channels() {
        let root = temp_workspace("series-channel");
        let pos0 = root.join("Pos0");
        fs::create_dir_all(&pos0).expect("pos0");
        fs::write(pos0.join("img_0_DAPI_0.png"), []).expect("dapi");
        fs::write(pos0.join("img_0_GFP_0.png"), []).expect("gfp");

        let scan = SeriesDataset::build(
            root.to_str().expect("temp path"),
            "Pos{p}",
            "img_{t}_{c}_{z}",
        )
        .expect("dataset")
        .workspace_scan();

        assert_eq!(scan.channels, vec![0, 1]);
        assert_eq!(scan.channel_labels, vec!["DAPI", "GFP"]);

        fs::remove_dir_all(root).expect("cleanup");
    }

    fn temp_workspace(label: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        std::env::temp_dir().join(format!("lisca-{label}-test-{unique}"))
    }
}
