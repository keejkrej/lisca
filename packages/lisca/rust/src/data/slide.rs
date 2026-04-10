use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};

pub type SlideMapping = BTreeMap<u32, Vec<u32>>;

pub fn resolve_slide_path(dataset_root: &Path, output: Option<&Path>) -> PathBuf {
    match output {
        Some(path) => path.to_path_buf(),
        None => dataset_root.join("slide.json"),
    }
}

pub fn parse_position_token(token: &str) -> Result<Vec<u32>, String> {
    let raw = token.trim();
    if raw.is_empty() {
        return Err("Empty position token".to_string());
    }

    if !raw.contains(':') {
        let value: i64 = raw
            .parse()
            .map_err(|_| format!("Invalid position token: {raw:?}"))?;
        if value < 0 {
            return Err(format!("Positions must be non-negative, got {value}"));
        }
        return Ok(vec![value as u32]);
    }

    let parts = raw.split(':').map(str::trim).collect::<Vec<_>>();
    if parts.len() != 2 && parts.len() != 3 {
        return Err(format!("Invalid slice token: {raw:?}"));
    }
    if parts[0].is_empty() || parts[1].is_empty() {
        return Err(format!("Slices must include explicit start and stop: {raw:?}"));
    }

    let start: i64 = parts[0]
        .parse()
        .map_err(|_| format!("Invalid slice token: {raw:?}"))?;
    let stop: i64 = parts[1]
        .parse()
        .map_err(|_| format!("Invalid slice token: {raw:?}"))?;
    let step: i64 = if parts.len() == 3 {
        parts[2]
            .parse()
            .map_err(|_| format!("Invalid slice token: {raw:?}"))?
    } else {
        1
    };

    if start < 0 || stop < 0 {
        return Err(format!("Positions must be non-negative in slice {raw:?}"));
    }
    if step <= 0 {
        return Err(format!("Slice step must be > 0 in {raw:?}"));
    }

    let values = (start..stop)
        .step_by(step as usize)
        .map(|value| value as u32)
        .collect::<Vec<_>>();
    if values.is_empty() {
        return Err(format!("Slice produced no positions: {raw:?}"));
    }
    Ok(values)
}

pub fn parse_position_spec(spec: &str) -> Result<Vec<u32>, String> {
    let tokens = spec.split(',').map(str::trim).collect::<Vec<_>>();
    if !tokens.iter().any(|token| !token.is_empty()) {
        return Err("Position spec is empty".to_string());
    }

    let mut positions = BTreeSet::new();
    for token in tokens {
        if token.is_empty() {
            return Err("Position spec contains an empty token".to_string());
        }
        for value in parse_position_token(token)? {
            positions.insert(value);
        }
    }

    Ok(positions.into_iter().collect())
}

fn source_label(source: Option<&Path>) -> String {
    source
        .map(|path| path.display().to_string())
        .unwrap_or_else(|| "slide mapping".to_string())
}

fn normalize_mapping_entries<I>(entries: I, source: Option<&Path>) -> Result<SlideMapping, String>
where
    I: IntoIterator<Item = (u32, Vec<u32>)>,
{
    let source_label = source_label(source);
    let mut mapping = BTreeMap::new();

    for (slide_channel, raw_positions) in entries {
        if raw_positions.is_empty() {
            return Err(format!(
                "{source_label} defines no positions for slide channel {slide_channel}"
            ));
        }
        let positions = raw_positions.into_iter().collect::<BTreeSet<_>>();
        mapping.insert(slide_channel, positions.into_iter().collect());
    }

    if mapping.is_empty() {
        return Err(format!("{source_label} defines no slide channels"));
    }

    Ok(mapping)
}

pub fn validate_slide_mapping_value(
    raw: &serde_json::Value,
    source: Option<&Path>,
) -> Result<SlideMapping, String> {
    let source_label = source_label(source);
    let object = raw
        .as_object()
        .ok_or_else(|| format!("Slide mapping must be a JSON object: {source_label}"))?;

    let mut entries = Vec::new();
    for (raw_channel, raw_positions) in object {
        let slide_channel: i64 = raw_channel.parse().map_err(|_| {
            format!("Slide channel keys must be non-negative integers, got {raw_channel:?}")
        })?;
        if slide_channel < 0 {
            return Err(format!(
                "Slide channel keys must be non-negative integers, got {raw_channel:?}"
            ));
        }

        let array = raw_positions.as_array().ok_or_else(|| {
            format!(
                "Slide channel entries must be lists, got {} for {}",
                type_name(raw_positions),
                slide_channel
            )
        })?;

        let mut positions = Vec::new();
        for entry in array {
            let value = entry.as_u64().ok_or_else(|| {
                format!(
                    "Slide positions for channel {} must be integers, got {}",
                    slide_channel,
                    json_value_repr(entry)
                )
            })?;
            positions.push(value as u32);
        }
        entries.push((slide_channel as u32, positions));
    }

    normalize_mapping_entries(entries, source)
}

pub fn validate_slide_mapping(mapping: &SlideMapping) -> Result<SlideMapping, String> {
    normalize_mapping_entries(mapping.iter().map(|(k, v)| (*k, v.clone())), None)
}

pub fn load_slide_mapping(slide_path: &Path) -> Result<SlideMapping, String> {
    let content = std::fs::read_to_string(slide_path).map_err(|err| err.to_string())?;
    let raw = serde_json::from_str::<serde_json::Value>(&content).map_err(|err| err.to_string())?;
    validate_slide_mapping_value(&raw, Some(slide_path))
}

pub fn serialize_slide_mapping(mapping: &SlideMapping) -> Result<String, String> {
    let mapping = validate_slide_mapping(mapping)?;
    let object = mapping
        .into_iter()
        .map(|(channel, positions)| (channel.to_string(), serde_json::json!(positions)))
        .collect::<serde_json::Map<String, serde_json::Value>>();
    serde_json::to_string_pretty(&serde_json::Value::Object(object))
        .map(|mut value| {
            value.push('\n');
            value
        })
        .map_err(|err| err.to_string())
}

pub fn write_slide_mapping(mapping: &SlideMapping, output_path: &Path) -> Result<PathBuf, String> {
    let serialized = serialize_slide_mapping(mapping)?;
    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    std::fs::write(output_path, serialized).map_err(|err| err.to_string())?;
    std::fs::canonicalize(output_path).map_err(|err| err.to_string())
}

fn type_name(value: &serde_json::Value) -> &'static str {
    match value {
        serde_json::Value::Null => "null",
        serde_json::Value::Bool(_) => "bool",
        serde_json::Value::Number(_) => "number",
        serde_json::Value::String(_) => "string",
        serde_json::Value::Array(_) => "array",
        serde_json::Value::Object(_) => "object",
    }
}

fn json_value_repr(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(v) => format!("{v:?}"),
        _ => value.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_position_spec_supports_integers_and_slices() {
        assert_eq!(parse_position_spec("0,2,12:19:2").unwrap(), vec![0, 2, 12, 14, 16, 18]);
    }

    #[test]
    fn parse_position_spec_deduplicates_and_sorts() {
        assert_eq!(parse_position_spec("5,1,1,3:7:2").unwrap(), vec![1, 3, 5]);
    }

    #[test]
    fn parse_position_spec_rejects_empty() {
        assert!(parse_position_spec("  ").unwrap_err().contains("Position spec is empty"));
    }

    #[test]
    fn parse_position_token_rejects_non_positive_step() {
        assert!(parse_position_token("0:10:0")
            .unwrap_err()
            .contains("step must be > 0"));
    }

    #[test]
    fn validate_slide_mapping_orders_keys_and_deduplicates_positions() {
        let mapping = validate_slide_mapping_value(
            &serde_json::json!({"2":[10,12,10],"0":[2,0]}),
            None,
        )
        .unwrap();
        assert_eq!(
            mapping.into_iter().collect::<Vec<_>>(),
            vec![(0, vec![0, 2]), (2, vec![10, 12])]
        );
    }
}
