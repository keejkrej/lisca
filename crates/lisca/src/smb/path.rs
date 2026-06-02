const PREFIX: &str = "smb:";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedSmbPath {
    pub session_id: String,
    pub relative_path: String,
}

pub fn is_smb_path(path: &str) -> bool {
    path.starts_with(PREFIX)
}

pub fn format_smb_path(session_id: &str, relative_path: &str) -> String {
    let relative = relative_path.trim_start_matches('/');
    if relative.is_empty() {
        format!("{PREFIX}{session_id}")
    } else {
        format!("{PREFIX}{session_id}/{relative}")
    }
}

pub fn parse_smb_path(path: &str) -> Result<ParsedSmbPath, String> {
    if !is_smb_path(path) {
        return Err(format!("not an SMB path: {path}"));
    }

    let rest = path
        .strip_prefix(PREFIX)
        .ok_or_else(|| format!("not an SMB path: {path}"))?;
    let (session_id, relative_path) = rest
        .split_once('/')
        .map(|(session_id, relative)| (session_id.to_string(), relative.to_string()))
        .unwrap_or_else(|| (rest.to_string(), String::new()));

    if session_id.is_empty() {
        return Err("SMB path is missing session id".to_string());
    }

    Ok(ParsedSmbPath {
        session_id,
        relative_path,
    })
}

#[cfg(test)]
mod tests {
    use super::{format_smb_path, is_smb_path, parse_smb_path};

    #[test]
    fn round_trip_path() {
        let path = format_smb_path("abc-123", "project/ag-moonraedler");
        assert!(is_smb_path(&path));
        let parsed = parse_smb_path(&path).expect("parse");
        assert_eq!(parsed.session_id, "abc-123");
        assert_eq!(parsed.relative_path, "project/ag-moonraedler");
    }
}
