const PREFIX: &str = "smb:";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedSmbPath {
    pub session_id: String,
    pub relative_path: String,
}

pub fn is_smb_path(path: &str) -> bool {
    path.starts_with(PREFIX)
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
    use super::{is_smb_path, parse_smb_path};

    #[test]
    fn parses_virtual_path() {
        let path = "smb:abc-123/project/file.nd2";
        assert!(is_smb_path(path));
        let parsed = parse_smb_path(path).expect("parse");
        assert_eq!(parsed.session_id, "abc-123");
        assert_eq!(parsed.relative_path, "project/file.nd2");
    }
}
