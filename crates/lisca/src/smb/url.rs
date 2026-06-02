#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedSmbUrl {
    pub host: String,
    pub share: String,
    pub share_relative_path: String,
}

pub fn parse_smb_url(raw: &str) -> Result<ParsedSmbUrl, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("SMB URL cannot be empty".to_string());
    }

    let had_smb_scheme = trimmed.starts_with("smb://") || trimmed.starts_with("SMB://");
    let without_scheme = trimmed
        .strip_prefix("smb://")
        .or_else(|| trimmed.strip_prefix("SMB://"))
        .unwrap_or(trimmed);

    let normalized = without_scheme.replace('\\', "/");
    let stripped = if let Some(rest) = normalized.strip_prefix("//") {
        rest.to_string()
    } else if had_smb_scheme {
        normalized
    } else {
        return Err("SMB URL must start with // or \\\\".to_string());
    };

    let mut segments = stripped
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>();

    if segments.len() < 2 {
        return Err("SMB URL must include host and share (e.g. //host/share/path)".to_string());
    }

    let host = segments.remove(0).to_string();
    let share = segments.remove(0).to_string();
    let share_relative_path = segments.join("/");

    Ok(ParsedSmbUrl {
        host,
        share,
        share_relative_path,
    })
}

#[cfg(test)]
mod tests {
    use super::parse_smb_url;

    #[test]
    fn parses_forward_slash_unc() {
        let parsed = parse_smb_url(
            "//z-sv-dfsroot.ad.physik.uni-muenchen.de/dfsroot/project/ag-moonraedler",
        )
        .expect("parse");
        assert_eq!(
            parsed.host,
            "z-sv-dfsroot.ad.physik.uni-muenchen.de".to_string()
        );
        assert_eq!(parsed.share, "dfsroot");
        assert_eq!(parsed.share_relative_path, "project/ag-moonraedler");
    }

    #[test]
    fn parses_windows_unc() {
        let parsed =
            parse_smb_url("\\\\server.example\\data\\folder").expect("parse");
        assert_eq!(parsed.host, "server.example");
        assert_eq!(parsed.share, "data");
        assert_eq!(parsed.share_relative_path, "folder");
    }

    #[test]
    fn parses_smb_scheme() {
        let parsed = parse_smb_url("smb://host/share").expect("parse");
        assert_eq!(parsed.host, "host");
        assert_eq!(parsed.share, "share");
        assert_eq!(parsed.share_relative_path, "");
    }
}
