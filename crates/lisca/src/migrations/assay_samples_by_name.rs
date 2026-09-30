//! Rewrite `assay.json` so Samples are identified by name.
//!
//! Old shape:
//!
//! ```text
//! samples[]:                 { slideChannel, name, positions }
//! analysis.channels:         { mask, signal }
//! analysis.sampleChannels[]: { slideChannel, mask, signal }
//! ```
//!
//! New shape:
//!
//! ```text
//! samples[]:                 { name, positions }
//! analysis.channels:         { segmentation, signal }
//! analysis.sampleChannels[]: { sample, segmentation, signal }
//! ```
//!
//! Blank names become `Sample {slideChannel}`; duplicate names are an error.
//! Key order is kept (renamed keys take the old key's place).

use std::{collections::HashMap, fs, io::ErrorKind, path::Path};

use super::atomic_write;
use super::ordered_json::Json;

const ASSAY_FILE: &str = "assay.json";
const SLIDE_CHANNEL: &str = "slideChannel";
const SAMPLE: &str = "sample";
const MASK: &str = "mask";
const SEGMENTATION: &str = "segmentation";

pub(super) fn apply(workspace: &Path) -> Result<Vec<String>, String> {
    let path = workspace.join(ASSAY_FILE);
    let text = match fs::read_to_string(&path) {
        Ok(text) => text,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(format!("failed to read {}: {error}", path.display())),
    };
    let text = text.strip_prefix('\u{feff}').unwrap_or(&text);
    let mut data: Json = serde_json::from_str(text)
        .map_err(|error| format!("invalid assay.json {}: {error}", path.display()))?;
    if !migrate(&mut data).map_err(|error| format!("{error}: {}", path.display()))? {
        return Ok(Vec::new());
    }
    let mut contents = serde_json::to_string_pretty(&data).map_err(|error| error.to_string())?;
    contents.push('\n');
    atomic_write(&path, &contents)?;
    Ok(vec![path.to_string_lossy().into_owned()])
}

/// Rewrite `data` in place. Returns whether anything changed.
fn migrate(data: &mut Json) -> Result<bool, String> {
    let Json::Object(root) = data else {
        return Ok(false);
    };
    let mut changed = false;
    let mut names_by_slide_channel: HashMap<String, Vec<String>> = HashMap::new();

    if let Some(Json::Array(samples)) = get_mut(root, "samples") {
        changed |= migrate_samples(samples, &mut names_by_slide_channel)?;
    }

    if let Some(Json::Object(analysis)) = get_mut(root, "analysis") {
        if let Some(Json::Object(channels)) = get_mut(analysis, "channels") {
            if needs_rename("analysis.channels", channels, MASK, SEGMENTATION)? {
                rename_key(channels, MASK, SEGMENTATION);
                changed = true;
            }
        }
        if let Some(Json::Array(rows)) = get_mut(analysis, "sampleChannels") {
            for (index, row) in rows.iter_mut().enumerate() {
                let Json::Object(row) = row else {
                    continue;
                };
                changed |= migrate_sample_channels_row(index, row, &names_by_slide_channel)?;
            }
        }
    }
    Ok(changed)
}

fn migrate_samples(
    samples: &mut [Json],
    names_by_slide_channel: &mut HashMap<String, Vec<String>>,
) -> Result<bool, String> {
    let mut changed = false;
    for row in samples.iter_mut() {
        let Json::Object(row) = row else {
            continue;
        };
        let Some(index) = row.iter().position(|(key, _)| key == SLIDE_CHANNEL) else {
            continue;
        };
        let (_, slide_channel) = row.remove(index);
        let slide_key = slide_channel.key();
        let blank =
            !matches!(get(row, "name"), Some(Json::String(name)) if !name.trim().is_empty());
        if blank {
            let name = Json::String(format!("Sample {}", slide_channel.display()));
            match get_mut(row, "name") {
                Some(value) => *value = name,
                None => row.push(("name".to_string(), name)),
            }
        }
        if let Some(Json::String(name)) = get(row, "name") {
            names_by_slide_channel
                .entry(slide_key)
                .or_default()
                .push(name.clone());
        }
        changed = true;
    }
    if changed {
        check_unique_names(samples)?;
    }
    Ok(changed)
}

fn check_unique_names(samples: &[Json]) -> Result<(), String> {
    let mut seen = Vec::<String>::new();
    let mut duplicates = Vec::<String>::new();
    for row in samples {
        let Json::Object(row) = row else {
            continue;
        };
        let Some(Json::String(name)) = get(row, "name") else {
            continue;
        };
        let trimmed = name.trim().to_string();
        if seen.contains(&trimmed) && !duplicates.contains(&trimmed) {
            duplicates.push(trimmed.clone());
        }
        seen.push(trimmed);
    }
    if duplicates.is_empty() {
        return Ok(());
    }
    let listed = duplicates
        .iter()
        .map(|name| format!("{name:?}"))
        .collect::<Vec<_>>()
        .join(", ");
    Err(format!(
        "assay.json samples[] has duplicate sample names ({listed}); rename them so each Sample name is unique"
    ))
}

fn migrate_sample_channels_row(
    index: usize,
    row: &mut [(String, Json)],
    names_by_slide_channel: &HashMap<String, Vec<String>>,
) -> Result<bool, String> {
    let location = format!("analysis.sampleChannels[{index}]");
    let mut changed = false;
    if needs_rename(&location, row, MASK, SEGMENTATION)? {
        rename_key(row, MASK, SEGMENTATION);
        changed = true;
    }
    if needs_rename(&location, row, SLIDE_CHANNEL, SAMPLE)? {
        let slide_channel = get(row, SLIDE_CHANNEL).cloned().unwrap_or(Json::Null);
        let names = names_by_slide_channel
            .get(&slide_channel.key())
            .map(Vec::as_slice)
            .unwrap_or_default();
        let name = match names {
            [] => {
                return Err(format!(
                    "assay.json {location}: slideChannel {} matches no samples[] row",
                    slide_channel.display()
                ))
            }
            [name] => name.clone(),
            _ => {
                return Err(format!(
                    "assay.json {location}: slideChannel {} matches several samples ({})",
                    slide_channel.display(),
                    names
                        .iter()
                        .map(|name| format!("{name:?}"))
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
            }
        };
        rename_key(row, SLIDE_CHANNEL, SAMPLE);
        if let Some(value) = get_mut(row, SAMPLE) {
            *value = Json::String(name);
        }
        changed = true;
    }
    Ok(changed)
}

/// `old` must become `new`; error when both are present.
fn needs_rename(
    location: &str,
    object: &[(String, Json)],
    old: &str,
    new: &str,
) -> Result<bool, String> {
    if get(object, old).is_none() {
        return Ok(false);
    }
    if get(object, new).is_some() {
        return Err(format!(
            "assay.json {location} has both `{old}` and `{new}`"
        ));
    }
    Ok(true)
}

fn rename_key(object: &mut [(String, Json)], old: &str, new: &str) {
    for (key, _) in object.iter_mut() {
        if key == old {
            *key = new.to_string();
        }
    }
}

fn get<'a>(object: &'a [(String, Json)], key: &str) -> Option<&'a Json> {
    object
        .iter()
        .find(|(candidate, _)| candidate == key)
        .map(|(_, value)| value)
}

fn get_mut<'a>(object: &'a mut [(String, Json)], key: &str) -> Option<&'a mut Json> {
    object
        .iter_mut()
        .find(|(candidate, _)| candidate == key)
        .map(|(_, value)| value)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write_assay(workspace: &Path, contents: &str) {
        fs::write(workspace.join(ASSAY_FILE), contents).expect("write assay.json");
    }

    fn read_assay(workspace: &Path) -> String {
        fs::read_to_string(workspace.join(ASSAY_FILE)).expect("read assay.json")
    }

    const OLD: &str = r#"{
  "type": "transfection",
  "samples": [
    { "slideChannel": 0, "name": "WT", "positions": "1:2" },
    { "slideChannel": 3, "name": "  ", "positions": "3" }
  ],
  "analysis": {
    "maxOnsetMinutes": 30,
    "channels": { "mask": 0, "signal": [1] },
    "sampleChannels": [{ "slideChannel": 3, "mask": 2, "signal": [1, 2] }]
  }
}"#;

    const NEW: &str = r#"{
  "type": "transfection",
  "samples": [
    {
      "name": "WT",
      "positions": "1:2"
    },
    {
      "name": "Sample 3",
      "positions": "3"
    }
  ],
  "analysis": {
    "maxOnsetMinutes": 30,
    "channels": {
      "segmentation": 0,
      "signal": [
        1
      ]
    },
    "sampleChannels": [
      {
        "sample": "Sample 3",
        "segmentation": 2,
        "signal": [
          1,
          2
        ]
      }
    ]
  }
}
"#;

    #[test]
    fn rewrites_samples_and_channel_roles_keeping_key_order() {
        let root = tempfile::tempdir().expect("tempdir");
        write_assay(root.path(), OLD);
        let rewritten = apply(root.path()).expect("migrate");
        assert_eq!(rewritten.len(), 1);
        assert!(rewritten[0].ends_with(ASSAY_FILE));
        assert_eq!(read_assay(root.path()), NEW);
        let parsed: crate::protocol::AssayJsonFile =
            serde_json::from_str(&format!(
                "{{\"name\":\"x\",\"data\":{{\"type\":\"nd2\",\"path\":\"\"}},\"workspace\":{{\"path\":\"\"}},\"interval\":{{\"value\":null,\"unit\":\"minute\"}},{}",
                &NEW.trim_start()[1..]
            ))
            .expect("migrated assay.json parses with the live contract");
        assert_eq!(parsed.samples.len(), 2);
    }

    #[test]
    fn is_idempotent() {
        let root = tempfile::tempdir().expect("tempdir");
        write_assay(root.path(), OLD);
        apply(root.path()).expect("first");
        assert!(apply(root.path()).expect("second").is_empty());
        assert_eq!(read_assay(root.path()), NEW);
    }

    #[test]
    fn leaves_new_shape_untouched() {
        let root = tempfile::tempdir().expect("tempdir");
        let current = r#"{"samples":[{"name":"WT","positions":"1"}],"analysis":{"channels":{"segmentation":0,"signal":[1]}}}"#;
        write_assay(root.path(), current);
        assert!(apply(root.path()).expect("migrate").is_empty());
        assert_eq!(read_assay(root.path()), current);
    }

    #[test]
    fn is_noop_without_assay_json() {
        let root = tempfile::tempdir().expect("tempdir");
        assert!(apply(root.path()).expect("migrate").is_empty());
        assert!(!root.path().join(ASSAY_FILE).exists());
    }

    #[test]
    fn errors_on_duplicate_names_and_leaves_file_unchanged() {
        let root = tempfile::tempdir().expect("tempdir");
        let old = r#"{"samples":[
            {"slideChannel":0,"name":"WT","positions":"1"},
            {"slideChannel":1,"name":" WT ","positions":"2"}
        ]}"#;
        write_assay(root.path(), old);
        let error = apply(root.path()).expect_err("duplicate names");
        assert!(error.contains("duplicate sample names"), "{error}");
        assert!(error.contains("\"WT\""), "{error}");
        assert_eq!(read_assay(root.path()), old);
    }

    #[test]
    fn errors_when_mask_and_segmentation_both_present() {
        let root = tempfile::tempdir().expect("tempdir");
        write_assay(
            root.path(),
            r#"{"analysis":{"channels":{"mask":0,"segmentation":0,"signal":[1]}}}"#,
        );
        let error = apply(root.path()).expect_err("both keys");
        assert!(error.contains("both `mask` and `segmentation`"), "{error}");
    }

    #[test]
    fn errors_when_sample_channels_row_matches_no_sample() {
        let root = tempfile::tempdir().expect("tempdir");
        write_assay(
            root.path(),
            r#"{"samples":[{"slideChannel":0,"name":"WT","positions":"1"}],
                "analysis":{"sampleChannels":[{"slideChannel":7,"mask":0,"signal":[1]}]}}"#,
        );
        let error = apply(root.path()).expect_err("unknown slide channel");
        assert!(
            error.contains("slideChannel 7 matches no samples[] row"),
            "{error}"
        );
    }
}
