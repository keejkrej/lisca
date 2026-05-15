use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AppId {
    Aligner,
    Annotator,
    Studio,
}

impl AppId {
    pub const fn as_str(self) -> &'static str {
        match self {
            AppId::Aligner => "aligner",
            AppId::Annotator => "annotator",
            AppId::Studio => "studio",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hello {
    pub app: AppId,
    pub version: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HostFsEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HostListDirectoryResult {
    pub path: Option<String>,
    pub parent: Option<String>,
    pub entries: Vec<HostFsEntry>,
}
