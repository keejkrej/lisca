#![allow(clippy::redundant_closure_call)]
#![allow(clippy::needless_lifetimes)]
#![allow(clippy::match_single_binding)]
#![allow(clippy::clone_on_copy)]

#[doc = r" Error types."]
pub mod error {
    #[doc = r" Error from a `TryFrom` or `FromStr` implementation."]
    pub struct ConversionError(::std::borrow::Cow<'static, str>);
    impl ::std::error::Error for ConversionError {}
    impl ::std::fmt::Display for ConversionError {
        fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> Result<(), ::std::fmt::Error> {
            ::std::fmt::Display::fmt(&self.0, f)
        }
    }
    impl ::std::fmt::Debug for ConversionError {
        fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> Result<(), ::std::fmt::Error> {
            ::std::fmt::Debug::fmt(&self.0, f)
        }
    }
    impl From<&'static str> for ConversionError {
        fn from(value: &'static str) -> Self {
            Self(value.into())
        }
    }
    impl From<String> for ConversionError {
        fn from(value: String) -> Self {
            Self(value.into())
        }
    }
}
#[doc = "`AlignGridCellCoord`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"i\","]
#[doc = "    \"j\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"i\": {"]
#[doc = "      \"title\": \"int\","]
#[doc = "      \"description\": \"an integer\","]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"int32\""]
#[doc = "    },"]
#[doc = "    \"j\": {"]
#[doc = "      \"title\": \"int\","]
#[doc = "      \"description\": \"an integer\","]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"int32\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AlignGridCellCoord {
    #[doc = "an integer"]
    pub i: i32,
    #[doc = "an integer"]
    pub j: i32,
}
impl AlignGridCellCoord {
    pub fn builder() -> builder::AlignGridCellCoord {
        Default::default()
    }
}
#[doc = "`AlignGridShape`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"rect\","]
#[doc = "    \"square\","]
#[doc = "    \"hex\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum AlignGridShape {
    #[serde(rename = "rect")]
    Rect,
    #[serde(rename = "square")]
    Square,
    #[serde(rename = "hex")]
    Hex,
}
impl ::std::fmt::Display for AlignGridShape {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Rect => f.write_str("rect"),
            Self::Square => f.write_str("square"),
            Self::Hex => f.write_str("hex"),
        }
    }
}
impl ::std::str::FromStr for AlignGridShape {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "rect" => Ok(Self::Rect),
            "square" => Ok(Self::Square),
            "hex" => Ok(Self::Hex),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AlignGridShape {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AlignGridShape {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AlignGridShape {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`AlignGridState`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"cellHeight\","]
#[doc = "    \"cellWidth\","]
#[doc = "    \"enabled\","]
#[doc = "    \"opacity\","]
#[doc = "    \"rotation\","]
#[doc = "    \"shape\","]
#[doc = "    \"spacingA\","]
#[doc = "    \"spacingB\","]
#[doc = "    \"tx\","]
#[doc = "    \"ty\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"cellHeight\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"cellWidth\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"enabled\": {"]
#[doc = "      \"type\": \"boolean\""]
#[doc = "    },"]
#[doc = "    \"opacity\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"rotation\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"shape\": {"]
#[doc = "      \"$ref\": \"#/definitions/AlignGridShape\""]
#[doc = "    },"]
#[doc = "    \"spacingA\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"spacingB\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"tx\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"ty\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AlignGridState {
    #[serde(rename = "cellHeight")]
    pub cell_height: f64,
    #[serde(rename = "cellWidth")]
    pub cell_width: f64,
    pub enabled: bool,
    pub opacity: f64,
    pub rotation: f64,
    pub shape: AlignGridShape,
    #[serde(rename = "spacingA")]
    pub spacing_a: f64,
    #[serde(rename = "spacingB")]
    pub spacing_b: f64,
    pub tx: f64,
    pub ty: f64,
}
impl AlignGridState {
    pub fn builder() -> builder::AlignGridState {
        Default::default()
    }
}
#[doc = "`AlignOutputPaths`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"align\","]
#[doc = "    \"bbox\","]
#[doc = "    \"roi\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"align\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"bbox\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"roi\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AlignOutputPaths {
    pub align: ::std::string::String,
    pub bbox: ::std::string::String,
    pub roi: ::std::string::String,
}
impl AlignOutputPaths {
    pub fn builder() -> builder::AlignOutputPaths {
        Default::default()
    }
}
#[doc = "`AlignerSource`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"oneOf\": ["]
#[doc = "    {"]
#[doc = "      \"type\": \"object\","]
#[doc = "      \"required\": ["]
#[doc = "        \"filenameTemplate\","]
#[doc = "        \"kind\","]
#[doc = "        \"path\","]
#[doc = "        \"subfolderTemplate\""]
#[doc = "      ],"]
#[doc = "      \"properties\": {"]
#[doc = "        \"filenameTemplate\": {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        \"kind\": {"]
#[doc = "          \"type\": \"string\","]
#[doc = "          \"enum\": ["]
#[doc = "            \"folder\""]
#[doc = "          ]"]
#[doc = "        },"]
#[doc = "        \"path\": {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        \"subfolderTemplate\": {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        }"]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    {"]
#[doc = "      \"type\": \"object\","]
#[doc = "      \"required\": ["]
#[doc = "        \"kind\","]
#[doc = "        \"path\""]
#[doc = "      ],"]
#[doc = "      \"properties\": {"]
#[doc = "        \"kind\": {"]
#[doc = "          \"type\": \"string\","]
#[doc = "          \"enum\": ["]
#[doc = "            \"nd2\""]
#[doc = "          ]"]
#[doc = "        },"]
#[doc = "        \"path\": {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        }"]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    {"]
#[doc = "      \"type\": \"object\","]
#[doc = "      \"required\": ["]
#[doc = "        \"kind\","]
#[doc = "        \"path\""]
#[doc = "      ],"]
#[doc = "      \"properties\": {"]
#[doc = "        \"kind\": {"]
#[doc = "          \"type\": \"string\","]
#[doc = "          \"enum\": ["]
#[doc = "            \"czi\""]
#[doc = "          ]"]
#[doc = "        },"]
#[doc = "        \"path\": {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        }"]
#[doc = "      }"]
#[doc = "    }"]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
#[serde(tag = "kind")]
pub enum AlignerSource {
    #[serde(rename = "folder")]
    Folder {
        #[serde(rename = "filenameTemplate")]
        filename_template: ::std::string::String,
        path: ::std::string::String,
        #[serde(rename = "subfolderTemplate")]
        subfolder_template: ::std::string::String,
    },
    #[serde(rename = "nd2")]
    Nd2 { path: ::std::string::String },
    #[serde(rename = "czi")]
    Czi { path: ::std::string::String },
}
#[doc = "`AnalysisCsvFile`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"csv\","]
#[doc = "    \"fileName\","]
#[doc = "    \"kind\","]
#[doc = "    \"path\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"csv\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"fileName\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"kind\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"path\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AnalysisCsvFile {
    pub csv: ::std::string::String,
    #[serde(rename = "fileName")]
    pub file_name: ::std::string::String,
    pub kind: ::std::string::String,
    pub path: ::std::string::String,
}
impl AnalysisCsvFile {
    pub fn builder() -> builder::AnalysisCsvFile {
        Default::default()
    }
}
#[doc = "`AnalysisProgress`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"error\","]
#[doc = "    \"message\","]
#[doc = "    \"progress\","]
#[doc = "    \"requestId\","]
#[doc = "    \"stage\","]
#[doc = "    \"status\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"error\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"message\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"progress\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"requestId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"resultFiles\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AnalysisCsvFile\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"stage\": {"]
#[doc = "      \"$ref\": \"#/definitions/AnalysisStage\""]
#[doc = "    },"]
#[doc = "    \"status\": {"]
#[doc = "      \"$ref\": \"#/definitions/AnalysisStatus\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AnalysisProgress {
    pub error: ::std::option::Option<::std::string::String>,
    pub message: ::std::option::Option<::std::string::String>,
    pub progress: f64,
    #[serde(rename = "requestId")]
    pub request_id: ::std::string::String,
    #[serde(
        rename = "resultFiles",
        default,
        skip_serializing_if = "::std::vec::Vec::is_empty"
    )]
    pub result_files: ::std::vec::Vec<AnalysisCsvFile>,
    pub stage: AnalysisStage,
    pub status: AnalysisStatus,
}
impl AnalysisProgress {
    pub fn builder() -> builder::AnalysisProgress {
        Default::default()
    }
}
#[doc = "`AnalysisProgressQuery`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"requestId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"requestId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AnalysisProgressQuery {
    #[serde(rename = "requestId")]
    pub request_id: ::std::string::String,
}
impl AnalysisProgressQuery {
    pub fn builder() -> builder::AnalysisProgressQuery {
        Default::default()
    }
}
#[doc = "`AnalysisStage`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"queued\","]
#[doc = "    \"preparing\","]
#[doc = "    \"segment\","]
#[doc = "    \"timeseries\","]
#[doc = "    \"auc\","]
#[doc = "    \"fit\","]
#[doc = "    \"completed\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum AnalysisStage {
    #[serde(rename = "queued")]
    Queued,
    #[serde(rename = "preparing")]
    Preparing,
    #[serde(rename = "segment")]
    Segment,
    #[serde(rename = "timeseries")]
    Timeseries,
    #[serde(rename = "auc")]
    Auc,
    #[serde(rename = "fit")]
    Fit,
    #[serde(rename = "completed")]
    Completed,
}
impl ::std::fmt::Display for AnalysisStage {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Queued => f.write_str("queued"),
            Self::Preparing => f.write_str("preparing"),
            Self::Segment => f.write_str("segment"),
            Self::Timeseries => f.write_str("timeseries"),
            Self::Auc => f.write_str("auc"),
            Self::Fit => f.write_str("fit"),
            Self::Completed => f.write_str("completed"),
        }
    }
}
impl ::std::str::FromStr for AnalysisStage {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "queued" => Ok(Self::Queued),
            "preparing" => Ok(Self::Preparing),
            "segment" => Ok(Self::Segment),
            "timeseries" => Ok(Self::Timeseries),
            "auc" => Ok(Self::Auc),
            "fit" => Ok(Self::Fit),
            "completed" => Ok(Self::Completed),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AnalysisStage {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AnalysisStage {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AnalysisStage {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`AnalysisStartRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"requestId\","]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"requestId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AnalysisStartRequest {
    #[serde(rename = "requestId")]
    pub request_id: ::std::string::String,
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl AnalysisStartRequest {
    pub fn builder() -> builder::AnalysisStartRequest {
        Default::default()
    }
}
#[doc = "`AnalysisStatus`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"queued\","]
#[doc = "    \"running\","]
#[doc = "    \"completed\","]
#[doc = "    \"error\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum AnalysisStatus {
    #[serde(rename = "queued")]
    Queued,
    #[serde(rename = "running")]
    Running,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "error")]
    Error,
}
impl ::std::fmt::Display for AnalysisStatus {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Queued => f.write_str("queued"),
            Self::Running => f.write_str("running"),
            Self::Completed => f.write_str("completed"),
            Self::Error => f.write_str("error"),
        }
    }
}
impl ::std::str::FromStr for AnalysisStatus {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "queued" => Ok(Self::Queued),
            "running" => Ok(Self::Running),
            "completed" => Ok(Self::Completed),
            "error" => Ok(Self::Error),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AnalysisStatus {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AnalysisStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AnalysisStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`AnnotationLabel`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"color\","]
#[doc = "    \"id\","]
#[doc = "    \"name\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"color\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"id\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"name\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AnnotationLabel {
    pub color: ::std::string::String,
    pub id: ::std::string::String,
    pub name: ::std::string::String,
}
impl AnnotationLabel {
    pub fn builder() -> builder::AnnotationLabel {
        Default::default()
    }
}
#[doc = "`AppId`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"aligner\","]
#[doc = "    \"annotator\","]
#[doc = "    \"studio\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum AppId {
    #[serde(rename = "aligner")]
    Aligner,
    #[serde(rename = "annotator")]
    Annotator,
    #[serde(rename = "studio")]
    Studio,
}
impl ::std::fmt::Display for AppId {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Aligner => f.write_str("aligner"),
            Self::Annotator => f.write_str("annotator"),
            Self::Studio => f.write_str("studio"),
        }
    }
}
impl ::std::str::FromStr for AppId {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "aligner" => Ok(Self::Aligner),
            "annotator" => Ok(Self::Annotator),
            "studio" => Ok(Self::Studio),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AppId {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AppId {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AppId {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`AssayAnalysisConfig`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"properties\": {"]
#[doc = "    \"maxOnsetMinutes\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssayAnalysisConfig {
    #[serde(
        rename = "maxOnsetMinutes",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub max_onset_minutes: ::std::option::Option<f64>,
}
impl ::std::default::Default for AssayAnalysisConfig {
    fn default() -> Self {
        Self {
            max_onset_minutes: Default::default(),
        }
    }
}
impl AssayAnalysisConfig {
    pub fn builder() -> builder::AssayAnalysisConfig {
        Default::default()
    }
}
#[doc = "`AssayBasicInfoStep1`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"dataPath\","]
#[doc = "    \"folderFilenameTemplate\","]
#[doc = "    \"folderSubfolderTemplate\","]
#[doc = "    \"name\","]
#[doc = "    \"saveTo\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"dataPath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"folderFilenameTemplate\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"folderSubfolderTemplate\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"name\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"saveTo\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssayBasicInfoStep1 {
    #[serde(rename = "dataPath")]
    pub data_path: ::std::string::String,
    #[serde(rename = "folderFilenameTemplate")]
    pub folder_filename_template: ::std::string::String,
    #[serde(rename = "folderSubfolderTemplate")]
    pub folder_subfolder_template: ::std::string::String,
    pub name: ::std::string::String,
    #[serde(rename = "saveTo")]
    pub save_to: ::std::string::String,
}
impl AssayBasicInfoStep1 {
    pub fn builder() -> builder::AssayBasicInfoStep1 {
        Default::default()
    }
}
#[doc = "`AssayBasicInfoStep2`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"selectedFeatures\","]
#[doc = "    \"timelapseAmount\","]
#[doc = "    \"timelapseUnit\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"selectedFeatures\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AssayFeature\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"timelapseAmount\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"number\","]
#[doc = "          \"format\": \"double\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"timelapseUnit\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayTimelapseUnit\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssayBasicInfoStep2 {
    #[serde(rename = "selectedFeatures")]
    pub selected_features: ::std::vec::Vec<AssayFeature>,
    #[serde(rename = "timelapseAmount")]
    pub timelapse_amount: ::std::option::Option<f64>,
    #[serde(rename = "timelapseUnit")]
    pub timelapse_unit: AssayTimelapseUnit,
}
impl AssayBasicInfoStep2 {
    pub fn builder() -> builder::AssayBasicInfoStep2 {
        Default::default()
    }
}
#[doc = "`AssayBasicInfoStep3`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"samples\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"samples\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssaySamples\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssayBasicInfoStep3 {
    pub samples: AssaySamples,
}
impl AssayBasicInfoStep3 {
    pub fn builder() -> builder::AssayBasicInfoStep3 {
        Default::default()
    }
}
#[doc = "`AssayDataSourceKind`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"folder\","]
#[doc = "    \"nd2\","]
#[doc = "    \"czi\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum AssayDataSourceKind {
    #[serde(rename = "folder")]
    Folder,
    #[serde(rename = "nd2")]
    Nd2,
    #[serde(rename = "czi")]
    Czi,
}
impl ::std::fmt::Display for AssayDataSourceKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Folder => f.write_str("folder"),
            Self::Nd2 => f.write_str("nd2"),
            Self::Czi => f.write_str("czi"),
        }
    }
}
impl ::std::str::FromStr for AssayDataSourceKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "folder" => Ok(Self::Folder),
            "nd2" => Ok(Self::Nd2),
            "czi" => Ok(Self::Czi),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AssayDataSourceKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AssayDataSourceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AssayDataSourceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`AssayFeature`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"morphology\","]
#[doc = "    \"partcount\","]
#[doc = "    \"partfluor\","]
#[doc = "    \"totalfluor\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum AssayFeature {
    #[serde(rename = "morphology")]
    Morphology,
    #[serde(rename = "partcount")]
    Partcount,
    #[serde(rename = "partfluor")]
    Partfluor,
    #[serde(rename = "totalfluor")]
    Totalfluor,
}
impl ::std::fmt::Display for AssayFeature {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Morphology => f.write_str("morphology"),
            Self::Partcount => f.write_str("partcount"),
            Self::Partfluor => f.write_str("partfluor"),
            Self::Totalfluor => f.write_str("totalfluor"),
        }
    }
}
impl ::std::str::FromStr for AssayFeature {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "morphology" => Ok(Self::Morphology),
            "partcount" => Ok(Self::Partcount),
            "partfluor" => Ok(Self::Partfluor),
            "totalfluor" => Ok(Self::Totalfluor),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AssayFeature {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AssayFeature {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AssayFeature {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`AssayJsonFile`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"assayId\","]
#[doc = "    \"assayLabel\","]
#[doc = "    \"dataSourceKind\","]
#[doc = "    \"info1\","]
#[doc = "    \"info2\","]
#[doc = "    \"info3\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"analysis\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayAnalysisConfig\""]
#[doc = "    },"]
#[doc = "    \"assayId\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayType\""]
#[doc = "    },"]
#[doc = "    \"assayLabel\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"dataSourceKind\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"$ref\": \"#/definitions/AssayDataSourceKind\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"info1\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayBasicInfoStep1\""]
#[doc = "    },"]
#[doc = "    \"info2\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayBasicInfoStep2\""]
#[doc = "    },"]
#[doc = "    \"info3\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayBasicInfoStep3\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssayJsonFile {
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub analysis: ::std::option::Option<AssayAnalysisConfig>,
    #[serde(rename = "assayId")]
    pub assay_id: AssayType,
    #[serde(rename = "assayLabel")]
    pub assay_label: ::std::string::String,
    #[serde(rename = "dataSourceKind")]
    pub data_source_kind: ::std::option::Option<AssayDataSourceKind>,
    pub info1: AssayBasicInfoStep1,
    pub info2: AssayBasicInfoStep2,
    pub info3: AssayBasicInfoStep3,
}
impl AssayJsonFile {
    pub fn builder() -> builder::AssayJsonFile {
        Default::default()
    }
}
#[doc = "`AssaySampleRow`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"channel\","]
#[doc = "    \"maskChannel\","]
#[doc = "    \"name\","]
#[doc = "    \"positionFinish\","]
#[doc = "    \"positionStart\","]
#[doc = "    \"positions\","]
#[doc = "    \"signalChannel\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"channel\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"maskChannel\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"name\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"positionFinish\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"positionStart\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"positions\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"signalChannel\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssaySampleRow {
    pub channel: ::std::string::String,
    #[serde(rename = "maskChannel")]
    pub mask_channel: ::std::string::String,
    pub name: ::std::string::String,
    #[serde(rename = "positionFinish")]
    pub position_finish: ::std::string::String,
    #[serde(rename = "positionStart")]
    pub position_start: ::std::string::String,
    pub positions: ::std::string::String,
    #[serde(rename = "signalChannel")]
    pub signal_channel: ::std::string::String,
}
impl AssaySampleRow {
    pub fn builder() -> builder::AssaySampleRow {
        Default::default()
    }
}
#[doc = "`AssaySamples`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"array\","]
#[doc = "  \"items\": {"]
#[doc = "    \"$ref\": \"#/definitions/AssaySampleRow\""]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
#[serde(transparent)]
pub struct AssaySamples(pub ::std::vec::Vec<AssaySampleRow>);
impl ::std::ops::Deref for AssaySamples {
    type Target = ::std::vec::Vec<AssaySampleRow>;
    fn deref(&self) -> &::std::vec::Vec<AssaySampleRow> {
        &self.0
    }
}
impl ::std::convert::From<AssaySamples> for ::std::vec::Vec<AssaySampleRow> {
    fn from(value: AssaySamples) -> Self {
        value.0
    }
}
impl ::std::convert::From<::std::vec::Vec<AssaySampleRow>> for AssaySamples {
    fn from(value: ::std::vec::Vec<AssaySampleRow>) -> Self {
        Self(value)
    }
}
#[doc = "`AssayTimelapseUnit`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"second\","]
#[doc = "    \"minute\","]
#[doc = "    \"hour\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum AssayTimelapseUnit {
    #[serde(rename = "second")]
    Second,
    #[serde(rename = "minute")]
    Minute,
    #[serde(rename = "hour")]
    Hour,
}
impl ::std::fmt::Display for AssayTimelapseUnit {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Second => f.write_str("second"),
            Self::Minute => f.write_str("minute"),
            Self::Hour => f.write_str("hour"),
        }
    }
}
impl ::std::str::FromStr for AssayTimelapseUnit {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "second" => Ok(Self::Second),
            "minute" => Ok(Self::Minute),
            "hour" => Ok(Self::Hour),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AssayTimelapseUnit {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AssayTimelapseUnit {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AssayTimelapseUnit {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`AssayType`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"gene-expression\","]
#[doc = "    \"immune-killing\","]
#[doc = "    \"lnp-binding\","]
#[doc = "    \"custom-assay\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum AssayType {
    #[serde(rename = "gene-expression")]
    GeneExpression,
    #[serde(rename = "immune-killing")]
    ImmuneKilling,
    #[serde(rename = "lnp-binding")]
    LnpBinding,
    #[serde(rename = "custom-assay")]
    CustomAssay,
}
impl ::std::fmt::Display for AssayType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::GeneExpression => f.write_str("gene-expression"),
            Self::ImmuneKilling => f.write_str("immune-killing"),
            Self::LnpBinding => f.write_str("lnp-binding"),
            Self::CustomAssay => f.write_str("custom-assay"),
        }
    }
}
impl ::std::str::FromStr for AssayType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "gene-expression" => Ok(Self::GeneExpression),
            "immune-killing" => Ok(Self::ImmuneKilling),
            "lnp-binding" => Ok(Self::LnpBinding),
            "custom-assay" => Ok(Self::CustomAssay),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AssayType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AssayType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AssayType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`AutoExcludePreviewCell`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"h\","]
#[doc = "    \"i\","]
#[doc = "    \"j\","]
#[doc = "    \"w\","]
#[doc = "    \"x\","]
#[doc = "    \"y\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"h\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"i\": {"]
#[doc = "      \"title\": \"int\","]
#[doc = "      \"description\": \"an integer\","]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"int32\""]
#[doc = "    },"]
#[doc = "    \"j\": {"]
#[doc = "      \"title\": \"int\","]
#[doc = "      \"description\": \"an integer\","]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"int32\""]
#[doc = "    },"]
#[doc = "    \"w\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"x\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"y\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AutoExcludePreviewCell {
    pub h: u32,
    #[doc = "an integer"]
    pub i: i32,
    #[doc = "an integer"]
    pub j: i32,
    pub w: u32,
    pub x: u32,
    pub y: u32,
}
impl AutoExcludePreviewCell {
    pub fn builder() -> builder::AutoExcludePreviewCell {
        Default::default()
    }
}
#[doc = "`CancelCropRoiRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"requestId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"requestId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct CancelCropRoiRequest {
    #[serde(rename = "requestId")]
    pub request_id: ::std::string::String,
}
impl CancelCropRoiRequest {
    pub fn builder() -> builder::CancelCropRoiRequest {
        Default::default()
    }
}
#[doc = "`ContrastWindow`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"max\","]
#[doc = "    \"min\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"max\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"min\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct ContrastWindow {
    pub max: u32,
    pub min: u32,
}
impl ContrastWindow {
    pub fn builder() -> builder::ContrastWindow {
        Default::default()
    }
}
#[doc = "`CreateDirectoryRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"name\","]
#[doc = "    \"parentPath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"name\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"parentPath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct CreateDirectoryRequest {
    pub name: ::std::string::String,
    #[serde(rename = "parentPath")]
    pub parent_path: ::std::string::String,
}
impl CreateDirectoryRequest {
    pub fn builder() -> builder::CreateDirectoryRequest {
        Default::default()
    }
}
#[doc = "`CreateDirectoryResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"path\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"path\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct CreateDirectoryResponse {
    pub path: ::std::string::String,
}
impl CreateDirectoryResponse {
    pub fn builder() -> builder::CreateDirectoryResponse {
        Default::default()
    }
}
#[doc = "`CropOutputFormat`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"tiff\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CropOutputFormat {
    #[serde(rename = "tiff")]
    Tiff,
}
impl ::std::fmt::Display for CropOutputFormat {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Tiff => f.write_str("tiff"),
        }
    }
}
impl ::std::str::FromStr for CropOutputFormat {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "tiff" => Ok(Self::Tiff),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CropOutputFormat {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CropOutputFormat {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CropOutputFormat {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`CropRoiDisposition`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"started\","]
#[doc = "    \"attached\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CropRoiDisposition {
    #[serde(rename = "started")]
    Started,
    #[serde(rename = "attached")]
    Attached,
}
impl ::std::fmt::Display for CropRoiDisposition {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Started => f.write_str("started"),
            Self::Attached => f.write_str("attached"),
        }
    }
}
impl ::std::str::FromStr for CropRoiDisposition {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "started" => Ok(Self::Started),
            "attached" => Ok(Self::Attached),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CropRoiDisposition {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CropRoiDisposition {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CropRoiDisposition {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`CropRoiProgress`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"completedPositions\","]
#[doc = "    \"completedRois\","]
#[doc = "    \"message\","]
#[doc = "    \"position\","]
#[doc = "    \"requestId\","]
#[doc = "    \"status\","]
#[doc = "    \"totalPositions\","]
#[doc = "    \"totalRois\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"completedPositions\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"completedRois\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"error\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"message\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"position\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"integer\","]
#[doc = "          \"format\": \"uint32\","]
#[doc = "          \"minimum\": 0.0"]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"requestId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"skippedPositions\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"integer\","]
#[doc = "        \"format\": \"uint32\","]
#[doc = "        \"minimum\": 0.0"]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"status\": {"]
#[doc = "      \"$ref\": \"#/definitions/CropRoiStatus\""]
#[doc = "    },"]
#[doc = "    \"totalPositions\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"totalRois\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct CropRoiProgress {
    #[serde(rename = "completedPositions")]
    pub completed_positions: u32,
    #[serde(rename = "completedRois")]
    pub completed_rois: u32,
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub error: ::std::option::Option<::std::string::String>,
    pub message: ::std::option::Option<::std::string::String>,
    pub position: ::std::option::Option<u32>,
    #[serde(rename = "requestId")]
    pub request_id: ::std::string::String,
    #[serde(
        rename = "skippedPositions",
        default,
        skip_serializing_if = "::std::vec::Vec::is_empty"
    )]
    pub skipped_positions: ::std::vec::Vec<u32>,
    pub status: CropRoiStatus,
    #[serde(rename = "totalPositions")]
    pub total_positions: u32,
    #[serde(rename = "totalRois")]
    pub total_rois: u32,
}
impl CropRoiProgress {
    pub fn builder() -> builder::CropRoiProgress {
        Default::default()
    }
}
#[doc = "`CropRoiProgressQuery`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"requestId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"requestId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct CropRoiProgressQuery {
    #[serde(rename = "requestId")]
    pub request_id: ::std::string::String,
}
impl CropRoiProgressQuery {
    pub fn builder() -> builder::CropRoiProgressQuery {
        Default::default()
    }
}
#[doc = "`CropRoiRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"overwrite\","]
#[doc = "    \"positions\","]
#[doc = "    \"requestId\","]
#[doc = "    \"source\","]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"outputFormat\": {"]
#[doc = "      \"$ref\": \"#/definitions/CropOutputFormat\""]
#[doc = "    },"]
#[doc = "    \"overwrite\": {"]
#[doc = "      \"type\": \"boolean\""]
#[doc = "    },"]
#[doc = "    \"positions\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"integer\","]
#[doc = "        \"format\": \"uint32\","]
#[doc = "        \"minimum\": 0.0"]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"requestId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"source\": {"]
#[doc = "      \"$ref\": \"#/definitions/AlignerSource\""]
#[doc = "    },"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct CropRoiRequest {
    #[serde(
        rename = "outputFormat",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub output_format: ::std::option::Option<CropOutputFormat>,
    pub overwrite: bool,
    pub positions: ::std::vec::Vec<u32>,
    #[serde(rename = "requestId")]
    pub request_id: ::std::string::String,
    pub source: AlignerSource,
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl CropRoiRequest {
    pub fn builder() -> builder::CropRoiRequest {
        Default::default()
    }
}
#[doc = "`CropRoiResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"disposition\","]
#[doc = "    \"requestId\","]
#[doc = "    \"status\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"disposition\": {"]
#[doc = "      \"$ref\": \"#/definitions/CropRoiDisposition\""]
#[doc = "    },"]
#[doc = "    \"requestId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"status\": {"]
#[doc = "      \"$ref\": \"#/definitions/CropRoiStatus\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct CropRoiResponse {
    pub disposition: CropRoiDisposition,
    #[serde(rename = "requestId")]
    pub request_id: ::std::string::String,
    pub status: CropRoiStatus,
}
impl CropRoiResponse {
    pub fn builder() -> builder::CropRoiResponse {
        Default::default()
    }
}
#[doc = "`CropRoiStatus`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"queued\","]
#[doc = "    \"running\","]
#[doc = "    \"completed\","]
#[doc = "    \"cancelled\","]
#[doc = "    \"error\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CropRoiStatus {
    #[serde(rename = "queued")]
    Queued,
    #[serde(rename = "running")]
    Running,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "cancelled")]
    Cancelled,
    #[serde(rename = "error")]
    Error,
}
impl ::std::fmt::Display for CropRoiStatus {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Queued => f.write_str("queued"),
            Self::Running => f.write_str("running"),
            Self::Completed => f.write_str("completed"),
            Self::Cancelled => f.write_str("cancelled"),
            Self::Error => f.write_str("error"),
        }
    }
}
impl ::std::str::FromStr for CropRoiStatus {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "queued" => Ok(Self::Queued),
            "running" => Ok(Self::Running),
            "completed" => Ok(Self::Completed),
            "cancelled" => Ok(Self::Cancelled),
            "error" => Ok(Self::Error),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CropRoiStatus {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CropRoiStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CropRoiStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`FolderSource`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"filenameTemplate\","]
#[doc = "    \"kind\","]
#[doc = "    \"path\","]
#[doc = "    \"subfolderTemplate\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"filenameTemplate\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"kind\": {"]
#[doc = "      \"type\": \"string\","]
#[doc = "      \"enum\": ["]
#[doc = "        \"folder\""]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"path\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"subfolderTemplate\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct FolderSource {
    #[serde(rename = "filenameTemplate")]
    pub filename_template: ::std::string::String,
    pub kind: FolderSourceKind,
    pub path: ::std::string::String,
    #[serde(rename = "subfolderTemplate")]
    pub subfolder_template: ::std::string::String,
}
impl FolderSource {
    pub fn builder() -> builder::FolderSource {
        Default::default()
    }
}
#[doc = "`FolderSourceKind`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"folder\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum FolderSourceKind {
    #[serde(rename = "folder")]
    Folder,
}
impl ::std::fmt::Display for FolderSourceKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Folder => f.write_str("folder"),
        }
    }
}
impl ::std::str::FromStr for FolderSourceKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "folder" => Ok(Self::Folder),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for FolderSourceKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for FolderSourceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for FolderSourceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`FramePayload`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"appliedContrast\","]
#[doc = "    \"contrastDomain\","]
#[doc = "    \"dataBase64\","]
#[doc = "    \"height\","]
#[doc = "    \"pixelType\","]
#[doc = "    \"suggestedContrast\","]
#[doc = "    \"width\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"appliedContrast\": {"]
#[doc = "      \"$ref\": \"#/definitions/ContrastWindow\""]
#[doc = "    },"]
#[doc = "    \"contrastDomain\": {"]
#[doc = "      \"$ref\": \"#/definitions/ContrastWindow\""]
#[doc = "    },"]
#[doc = "    \"dataBase64\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"height\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"pixelType\": {"]
#[doc = "      \"$ref\": \"#/definitions/PixelType\""]
#[doc = "    },"]
#[doc = "    \"suggestedContrast\": {"]
#[doc = "      \"$ref\": \"#/definitions/ContrastWindow\""]
#[doc = "    },"]
#[doc = "    \"width\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct FramePayload {
    #[serde(rename = "appliedContrast")]
    pub applied_contrast: ContrastWindow,
    #[serde(rename = "contrastDomain")]
    pub contrast_domain: ContrastWindow,
    #[serde(rename = "dataBase64")]
    pub data_base64: ::std::string::String,
    pub height: u32,
    #[serde(rename = "pixelType")]
    pub pixel_type: PixelType,
    #[serde(rename = "suggestedContrast")]
    pub suggested_contrast: ContrastWindow,
    pub width: u32,
}
impl FramePayload {
    pub fn builder() -> builder::FramePayload {
        Default::default()
    }
}
#[doc = "`FrameRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"channel\","]
#[doc = "    \"pos\","]
#[doc = "    \"time\","]
#[doc = "    \"z\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"channel\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"pos\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"time\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"z\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct FrameRequest {
    pub channel: u32,
    pub pos: u32,
    pub time: u32,
    pub z: u32,
}
impl FrameRequest {
    pub fn builder() -> builder::FrameRequest {
        Default::default()
    }
}
#[doc = "`HomeDirectoryResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"path\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"path\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct HomeDirectoryResponse {
    pub path: ::std::string::String,
}
impl HomeDirectoryResponse {
    pub fn builder() -> builder::HomeDirectoryResponse {
        Default::default()
    }
}
#[doc = "`HostFsEntry`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"isDirectory\","]
#[doc = "    \"name\","]
#[doc = "    \"path\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"isDirectory\": {"]
#[doc = "      \"type\": \"boolean\""]
#[doc = "    },"]
#[doc = "    \"name\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"path\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct HostFsEntry {
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    pub name: ::std::string::String,
    pub path: ::std::string::String,
}
impl HostFsEntry {
    pub fn builder() -> builder::HostFsEntry {
        Default::default()
    }
}
#[doc = "`HostListDirectoryQuery`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"properties\": {"]
#[doc = "    \"path\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct HostListDirectoryQuery {
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub path: ::std::option::Option<::std::string::String>,
}
impl ::std::default::Default for HostListDirectoryQuery {
    fn default() -> Self {
        Self {
            path: Default::default(),
        }
    }
}
impl HostListDirectoryQuery {
    pub fn builder() -> builder::HostListDirectoryQuery {
        Default::default()
    }
}
#[doc = "`HostListDirectoryResult`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"entries\","]
#[doc = "    \"parent\","]
#[doc = "    \"path\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"entries\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/HostFsEntry\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"parent\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"path\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct HostListDirectoryResult {
    pub entries: ::std::vec::Vec<HostFsEntry>,
    pub parent: ::std::option::Option<::std::string::String>,
    pub path: ::std::option::Option<::std::string::String>,
}
impl HostListDirectoryResult {
    pub fn builder() -> builder::HostListDirectoryResult {
        Default::default()
    }
}
#[doc = "`LatestAnalysisQuery`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct LatestAnalysisQuery {
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl LatestAnalysisQuery {
    pub fn builder() -> builder::LatestAnalysisQuery {
        Default::default()
    }
}
#[doc = "`LatestCropQuery`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct LatestCropQuery {
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl LatestCropQuery {
    pub fn builder() -> builder::LatestCropQuery {
        Default::default()
    }
}
#[doc = "`LoadAlignStateQuery`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"pos\","]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"pos\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct LoadAlignStateQuery {
    pub pos: u32,
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl LoadAlignStateQuery {
    pub fn builder() -> builder::LoadAlignStateQuery {
        Default::default()
    }
}
#[doc = "`LoadAnnotationLabelsRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct LoadAnnotationLabelsRequest {
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl LoadAnnotationLabelsRequest {
    pub fn builder() -> builder::LoadAnnotationLabelsRequest {
        Default::default()
    }
}
#[doc = "`LoadFrameRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"contrast\","]
#[doc = "    \"request\","]
#[doc = "    \"source\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"contrast\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"$ref\": \"#/definitions/ContrastWindow\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"request\": {"]
#[doc = "      \"$ref\": \"#/definitions/FrameRequest\""]
#[doc = "    },"]
#[doc = "    \"source\": {"]
#[doc = "      \"$ref\": \"#/definitions/AlignerSource\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct LoadFrameRequest {
    pub contrast: ::std::option::Option<ContrastWindow>,
    pub request: FrameRequest,
    pub source: AlignerSource,
}
impl LoadFrameRequest {
    pub fn builder() -> builder::LoadFrameRequest {
        Default::default()
    }
}
#[doc = "`LoadRoiFrameAnnotationRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"request\","]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"request\": {"]
#[doc = "      \"$ref\": \"#/definitions/RoiFrameRequest\""]
#[doc = "    },"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct LoadRoiFrameAnnotationRequest {
    pub request: RoiFrameRequest,
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl LoadRoiFrameAnnotationRequest {
    pub fn builder() -> builder::LoadRoiFrameAnnotationRequest {
        Default::default()
    }
}
#[doc = "`LoadRoiFrameRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"contrast\","]
#[doc = "    \"request\","]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"contrast\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"$ref\": \"#/definitions/ContrastWindow\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"request\": {"]
#[doc = "      \"$ref\": \"#/definitions/RoiFrameRequest\""]
#[doc = "    },"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct LoadRoiFrameRequest {
    pub contrast: ::std::option::Option<ContrastWindow>,
    pub request: RoiFrameRequest,
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl LoadRoiFrameRequest {
    pub fn builder() -> builder::LoadRoiFrameRequest {
        Default::default()
    }
}
#[doc = "`LoadedRoiFrameAnnotation`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"annotation\","]
#[doc = "    \"maskBase64Png\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"annotation\": {"]
#[doc = "      \"$ref\": \"#/definitions/RoiFrameAnnotation\""]
#[doc = "    },"]
#[doc = "    \"maskBase64Png\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct LoadedRoiFrameAnnotation {
    pub annotation: RoiFrameAnnotation,
    #[serde(rename = "maskBase64Png")]
    pub mask_base64_png: ::std::option::Option<::std::string::String>,
}
impl LoadedRoiFrameAnnotation {
    pub fn builder() -> builder::LoadedRoiFrameAnnotation {
        Default::default()
    }
}
#[doc = "`MemoryAssayEntry`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"lastUsedAt\","]
#[doc = "    \"path\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"assayLabel\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"lastUsedAt\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"path\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct MemoryAssayEntry {
    #[serde(
        rename = "assayLabel",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub assay_label: ::std::option::Option<::std::string::String>,
    #[serde(rename = "lastUsedAt")]
    pub last_used_at: ::std::string::String,
    pub path: ::std::string::String,
    #[serde(
        rename = "workspacePath",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub workspace_path: ::std::option::Option<::std::string::String>,
}
impl MemoryAssayEntry {
    pub fn builder() -> builder::MemoryAssayEntry {
        Default::default()
    }
}
#[doc = "`MemoryKind`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"workspace\","]
#[doc = "    \"source\","]
#[doc = "    \"assay\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum MemoryKind {
    #[serde(rename = "workspace")]
    Workspace,
    #[serde(rename = "source")]
    Source,
    #[serde(rename = "assay")]
    Assay,
}
impl ::std::fmt::Display for MemoryKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Workspace => f.write_str("workspace"),
            Self::Source => f.write_str("source"),
            Self::Assay => f.write_str("assay"),
        }
    }
}
impl ::std::str::FromStr for MemoryKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "workspace" => Ok(Self::Workspace),
            "source" => Ok(Self::Source),
            "assay" => Ok(Self::Assay),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for MemoryKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for MemoryKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for MemoryKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`MemoryRecentQuery`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"type\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"type\": {"]
#[doc = "      \"$ref\": \"#/definitions/MemoryKind\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct MemoryRecentQuery {
    #[serde(rename = "type")]
    pub type_: MemoryKind,
}
impl MemoryRecentQuery {
    pub fn builder() -> builder::MemoryRecentQuery {
        Default::default()
    }
}
#[doc = "`MemoryRecentResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"properties\": {"]
#[doc = "    \"assays\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/MemoryAssayEntry\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"sources\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/MemorySourceEntry\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"workspaces\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/MemoryWorkspaceEntry\""]
#[doc = "      }"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct MemoryRecentResponse {
    #[serde(default, skip_serializing_if = "::std::vec::Vec::is_empty")]
    pub assays: ::std::vec::Vec<MemoryAssayEntry>,
    #[serde(default, skip_serializing_if = "::std::vec::Vec::is_empty")]
    pub sources: ::std::vec::Vec<MemorySourceEntry>,
    #[serde(default, skip_serializing_if = "::std::vec::Vec::is_empty")]
    pub workspaces: ::std::vec::Vec<MemoryWorkspaceEntry>,
}
impl ::std::default::Default for MemoryRecentResponse {
    fn default() -> Self {
        Self {
            assays: Default::default(),
            sources: Default::default(),
            workspaces: Default::default(),
        }
    }
}
impl MemoryRecentResponse {
    pub fn builder() -> builder::MemoryRecentResponse {
        Default::default()
    }
}
#[doc = "`MemorySourceEntry`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"lastUsedAt\","]
#[doc = "    \"source\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"label\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"lastUsedAt\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"source\": {"]
#[doc = "      \"$ref\": \"#/definitions/AlignerSource\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct MemorySourceEntry {
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub label: ::std::option::Option<::std::string::String>,
    #[serde(rename = "lastUsedAt")]
    pub last_used_at: ::std::string::String,
    pub source: AlignerSource,
}
impl MemorySourceEntry {
    pub fn builder() -> builder::MemorySourceEntry {
        Default::default()
    }
}
#[doc = "`MemoryTouchResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"ok\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"ok\": {"]
#[doc = "      \"type\": \"boolean\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct MemoryTouchResponse {
    pub ok: bool,
}
impl MemoryTouchResponse {
    pub fn builder() -> builder::MemoryTouchResponse {
        Default::default()
    }
}
#[doc = "`MemoryWorkspaceEntry`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"lastUsedAt\","]
#[doc = "    \"path\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"label\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"lastUsedAt\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"path\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct MemoryWorkspaceEntry {
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub label: ::std::option::Option<::std::string::String>,
    #[serde(rename = "lastUsedAt")]
    pub last_used_at: ::std::string::String,
    pub path: ::std::string::String,
}
impl MemoryWorkspaceEntry {
    pub fn builder() -> builder::MemoryWorkspaceEntry {
        Default::default()
    }
}
#[doc = "`OperationAttention`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"none\","]
#[doc = "    \"error\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum OperationAttention {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "error")]
    Error,
}
impl ::std::fmt::Display for OperationAttention {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::None => f.write_str("none"),
            Self::Error => f.write_str("error"),
        }
    }
}
impl ::std::str::FromStr for OperationAttention {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "none" => Ok(Self::None),
            "error" => Ok(Self::Error),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for OperationAttention {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for OperationAttention {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for OperationAttention {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`OperationCancelRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"operationId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"operationId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct OperationCancelRequest {
    #[serde(rename = "operationId")]
    pub operation_id: ::std::string::String,
}
impl OperationCancelRequest {
    pub fn builder() -> builder::OperationCancelRequest {
        Default::default()
    }
}
#[doc = "`OperationDetail`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"operation\","]
#[doc = "    \"tasks\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"operation\": {"]
#[doc = "      \"$ref\": \"#/definitions/OperationSummary\""]
#[doc = "    },"]
#[doc = "    \"tasks\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/TaskDetail\""]
#[doc = "      }"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct OperationDetail {
    pub operation: OperationSummary,
    pub tasks: ::std::vec::Vec<TaskDetail>,
}
impl OperationDetail {
    pub fn builder() -> builder::OperationDetail {
        Default::default()
    }
}
#[doc = "`OperationDetailQuery`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"operationId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"operationId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct OperationDetailQuery {
    #[serde(rename = "operationId")]
    pub operation_id: ::std::string::String,
}
impl OperationDetailQuery {
    pub fn builder() -> builder::OperationDetailQuery {
        Default::default()
    }
}
#[doc = "`OperationList`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"array\","]
#[doc = "  \"items\": {"]
#[doc = "    \"$ref\": \"#/definitions/OperationSummary\""]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
#[serde(transparent)]
pub struct OperationList(pub ::std::vec::Vec<OperationSummary>);
impl ::std::ops::Deref for OperationList {
    type Target = ::std::vec::Vec<OperationSummary>;
    fn deref(&self) -> &::std::vec::Vec<OperationSummary> {
        &self.0
    }
}
impl ::std::convert::From<OperationList> for ::std::vec::Vec<OperationSummary> {
    fn from(value: OperationList) -> Self {
        value.0
    }
}
impl ::std::convert::From<::std::vec::Vec<OperationSummary>> for OperationList {
    fn from(value: ::std::vec::Vec<OperationSummary>) -> Self {
        Self(value)
    }
}
#[doc = "`OperationProgress`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"blocked\","]
#[doc = "    \"cancellationRequested\","]
#[doc = "    \"cancelled\","]
#[doc = "    \"completed\","]
#[doc = "    \"failed\","]
#[doc = "    \"queued\","]
#[doc = "    \"running\","]
#[doc = "    \"total\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"blocked\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"cancellationRequested\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"cancelled\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"completed\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"failed\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"queued\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"running\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"total\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct OperationProgress {
    pub blocked: u32,
    #[serde(rename = "cancellationRequested")]
    pub cancellation_requested: u32,
    pub cancelled: u32,
    pub completed: u32,
    pub failed: u32,
    pub queued: u32,
    pub running: u32,
    pub total: u32,
}
impl OperationProgress {
    pub fn builder() -> builder::OperationProgress {
        Default::default()
    }
}
#[doc = "`OperationStatus`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"queued\","]
#[doc = "    \"running\","]
#[doc = "    \"partially-complete\","]
#[doc = "    \"completed\","]
#[doc = "    \"failed\","]
#[doc = "    \"cancelled\","]
#[doc = "    \"cancellation-requested\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum OperationStatus {
    #[serde(rename = "queued")]
    Queued,
    #[serde(rename = "running")]
    Running,
    #[serde(rename = "partially-complete")]
    PartiallyComplete,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "cancelled")]
    Cancelled,
    #[serde(rename = "cancellation-requested")]
    CancellationRequested,
}
impl ::std::fmt::Display for OperationStatus {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Queued => f.write_str("queued"),
            Self::Running => f.write_str("running"),
            Self::PartiallyComplete => f.write_str("partially-complete"),
            Self::Completed => f.write_str("completed"),
            Self::Failed => f.write_str("failed"),
            Self::Cancelled => f.write_str("cancelled"),
            Self::CancellationRequested => f.write_str("cancellation-requested"),
        }
    }
}
impl ::std::str::FromStr for OperationStatus {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "queued" => Ok(Self::Queued),
            "running" => Ok(Self::Running),
            "partially-complete" => Ok(Self::PartiallyComplete),
            "completed" => Ok(Self::Completed),
            "failed" => Ok(Self::Failed),
            "cancelled" => Ok(Self::Cancelled),
            "cancellation-requested" => Ok(Self::CancellationRequested),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for OperationStatus {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for OperationStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for OperationStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`OperationSummary`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"attention\","]
#[doc = "    \"createdAtMs\","]
#[doc = "    \"kind\","]
#[doc = "    \"mutating\","]
#[doc = "    \"operationId\","]
#[doc = "    \"progress\","]
#[doc = "    \"status\","]
#[doc = "    \"updatedAtMs\","]
#[doc = "    \"workspaceId\","]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"attention\": {"]
#[doc = "      \"$ref\": \"#/definitions/OperationAttention\""]
#[doc = "    },"]
#[doc = "    \"createdAtMs\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint64\","]
#[doc = "      \"maximum\": 9007199254740991.0,"]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"kind\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"mutating\": {"]
#[doc = "      \"type\": \"boolean\""]
#[doc = "    },"]
#[doc = "    \"operationId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"progress\": {"]
#[doc = "      \"$ref\": \"#/definitions/OperationProgress\""]
#[doc = "    },"]
#[doc = "    \"status\": {"]
#[doc = "      \"$ref\": \"#/definitions/OperationStatus\""]
#[doc = "    },"]
#[doc = "    \"updatedAtMs\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint64\","]
#[doc = "      \"maximum\": 9007199254740991.0,"]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"workspaceId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct OperationSummary {
    pub attention: OperationAttention,
    #[serde(rename = "createdAtMs")]
    pub created_at_ms: u64,
    pub kind: ::std::string::String,
    pub mutating: bool,
    #[serde(rename = "operationId")]
    pub operation_id: ::std::string::String,
    pub progress: OperationProgress,
    pub status: OperationStatus,
    #[serde(rename = "updatedAtMs")]
    pub updated_at_ms: u64,
    #[serde(rename = "workspaceId")]
    pub workspace_id: ::std::string::String,
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl OperationSummary {
    pub fn builder() -> builder::OperationSummary {
        Default::default()
    }
}
#[doc = "`OutputPathsQuery`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"pos\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"pos\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct OutputPathsQuery {
    pub pos: u32,
}
impl OutputPathsQuery {
    pub fn builder() -> builder::OutputPathsQuery {
        Default::default()
    }
}
#[doc = "`PixelType`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"uint8\","]
#[doc = "    \"uint8clamped\","]
#[doc = "    \"int8\","]
#[doc = "    \"uint16\","]
#[doc = "    \"int16\","]
#[doc = "    \"uint32\","]
#[doc = "    \"int32\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum PixelType {
    #[serde(rename = "uint8")]
    Uint8,
    #[serde(rename = "uint8clamped")]
    Uint8clamped,
    #[serde(rename = "int8")]
    Int8,
    #[serde(rename = "uint16")]
    Uint16,
    #[serde(rename = "int16")]
    Int16,
    #[serde(rename = "uint32")]
    Uint32,
    #[serde(rename = "int32")]
    Int32,
}
impl ::std::fmt::Display for PixelType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Uint8 => f.write_str("uint8"),
            Self::Uint8clamped => f.write_str("uint8clamped"),
            Self::Int8 => f.write_str("int8"),
            Self::Uint16 => f.write_str("uint16"),
            Self::Int16 => f.write_str("int16"),
            Self::Uint32 => f.write_str("uint32"),
            Self::Int32 => f.write_str("int32"),
        }
    }
}
impl ::std::str::FromStr for PixelType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "uint8" => Ok(Self::Uint8),
            "uint8clamped" => Ok(Self::Uint8clamped),
            "int8" => Ok(Self::Int8),
            "uint16" => Ok(Self::Uint16),
            "int16" => Ok(Self::Int16),
            "uint32" => Ok(Self::Uint32),
            "int32" => Ok(Self::Int32),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for PixelType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for PixelType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for PixelType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`ProfileCreateRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"displayName\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"displayName\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct ProfileCreateRequest {
    #[serde(rename = "displayName")]
    pub display_name: ::std::string::String,
}
impl ProfileCreateRequest {
    pub fn builder() -> builder::ProfileCreateRequest {
        Default::default()
    }
}
#[doc = "`ProfileListResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"profiles\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"profiles\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/ProfileSummary\""]
#[doc = "      }"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct ProfileListResponse {
    pub profiles: ::std::vec::Vec<ProfileSummary>,
}
impl ProfileListResponse {
    pub fn builder() -> builder::ProfileListResponse {
        Default::default()
    }
}
#[doc = "`ProfileSessionResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"accessToken\","]
#[doc = "    \"displayName\","]
#[doc = "    \"profileId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"accessToken\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"displayName\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"profileId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct ProfileSessionResponse {
    #[serde(rename = "accessToken")]
    pub access_token: ::std::string::String,
    #[serde(rename = "displayName")]
    pub display_name: ::std::string::String,
    #[serde(rename = "profileId")]
    pub profile_id: ::std::string::String,
}
impl ProfileSessionResponse {
    pub fn builder() -> builder::ProfileSessionResponse {
        Default::default()
    }
}
#[doc = "`ProfileSignInRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"displayName\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"displayName\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct ProfileSignInRequest {
    #[serde(rename = "displayName")]
    pub display_name: ::std::string::String,
}
impl ProfileSignInRequest {
    pub fn builder() -> builder::ProfileSignInRequest {
        Default::default()
    }
}
#[doc = "`ProfileSignOutResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"ok\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"ok\": {"]
#[doc = "      \"type\": \"boolean\","]
#[doc = "      \"enum\": ["]
#[doc = "        true"]
#[doc = "      ]"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct ProfileSignOutResponse {
    pub ok: bool,
}
impl ProfileSignOutResponse {
    pub fn builder() -> builder::ProfileSignOutResponse {
        Default::default()
    }
}
#[doc = "`ProfileSummary`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"createdAt\","]
#[doc = "    \"displayName\","]
#[doc = "    \"id\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"createdAt\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"displayName\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"id\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct ProfileSummary {
    #[serde(rename = "createdAt")]
    pub created_at: ::std::string::String,
    #[serde(rename = "displayName")]
    pub display_name: ::std::string::String,
    pub id: ::std::string::String,
}
impl ProfileSummary {
    pub fn builder() -> builder::ProfileSummary {
        Default::default()
    }
}
#[doc = "`ReadTextFileQuery`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"path\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"path\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct ReadTextFileQuery {
    pub path: ::std::string::String,
}
impl ReadTextFileQuery {
    pub fn builder() -> builder::ReadTextFileQuery {
        Default::default()
    }
}
#[doc = "`ReadTextFileResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"contents\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"contents\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct ReadTextFileResponse {
    pub contents: ::std::string::String,
}
impl ReadTextFileResponse {
    pub fn builder() -> builder::ReadTextFileResponse {
        Default::default()
    }
}
#[doc = "`RoiBbox`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"h\","]
#[doc = "    \"roi\","]
#[doc = "    \"w\","]
#[doc = "    \"x\","]
#[doc = "    \"y\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"h\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"roi\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"w\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"x\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"y\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct RoiBbox {
    pub h: u32,
    pub roi: u32,
    pub w: u32,
    pub x: u32,
    pub y: u32,
}
impl RoiBbox {
    pub fn builder() -> builder::RoiBbox {
        Default::default()
    }
}
#[doc = "`RoiFrameAnnotation`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"classificationLabelId\","]
#[doc = "    \"maskPath\","]
#[doc = "    \"updatedAt\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"classificationLabelId\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"maskPath\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"updatedAt\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct RoiFrameAnnotation {
    #[serde(rename = "classificationLabelId")]
    pub classification_label_id: ::std::option::Option<::std::string::String>,
    #[serde(rename = "maskPath")]
    pub mask_path: ::std::option::Option<::std::string::String>,
    #[serde(rename = "updatedAt")]
    pub updated_at: ::std::option::Option<::std::string::String>,
}
impl RoiFrameAnnotation {
    pub fn builder() -> builder::RoiFrameAnnotation {
        Default::default()
    }
}
#[doc = "`RoiFrameAnnotationPayload`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"classificationLabelId\","]
#[doc = "    \"maskBase64Png\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"classificationLabelId\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"maskBase64Png\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct RoiFrameAnnotationPayload {
    #[serde(rename = "classificationLabelId")]
    pub classification_label_id: ::std::option::Option<::std::string::String>,
    #[serde(rename = "maskBase64Png")]
    pub mask_base64_png: ::std::option::Option<::std::string::String>,
}
impl RoiFrameAnnotationPayload {
    pub fn builder() -> builder::RoiFrameAnnotationPayload {
        Default::default()
    }
}
#[doc = "`RoiFrameRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"channel\","]
#[doc = "    \"pos\","]
#[doc = "    \"roi\","]
#[doc = "    \"time\","]
#[doc = "    \"z\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"channel\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"pos\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"roi\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"time\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"z\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct RoiFrameRequest {
    pub channel: u32,
    pub pos: u32,
    pub roi: u32,
    pub time: u32,
    pub z: u32,
}
impl RoiFrameRequest {
    pub fn builder() -> builder::RoiFrameRequest {
        Default::default()
    }
}
#[doc = "`RoiIndexEntry`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"bbox\","]
#[doc = "    \"fileName\","]
#[doc = "    \"roi\","]
#[doc = "    \"shape\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"bbox\": {"]
#[doc = "      \"$ref\": \"#/definitions/RoiBbox\""]
#[doc = "    },"]
#[doc = "    \"fileName\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"roi\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"shape\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"integer\","]
#[doc = "        \"format\": \"uint32\","]
#[doc = "        \"minimum\": 0.0"]
#[doc = "      },"]
#[doc = "      \"maxItems\": 5,"]
#[doc = "      \"minItems\": 5"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct RoiIndexEntry {
    pub bbox: RoiBbox,
    #[serde(rename = "fileName")]
    pub file_name: ::std::string::String,
    pub roi: u32,
    pub shape: [u32; 5usize],
}
impl RoiIndexEntry {
    pub fn builder() -> builder::RoiIndexEntry {
        Default::default()
    }
}
#[doc = "`RoiIndexFile`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"axisOrder\","]
#[doc = "    \"channelCount\","]
#[doc = "    \"pageOrder\","]
#[doc = "    \"position\","]
#[doc = "    \"rois\","]
#[doc = "    \"source\","]
#[doc = "    \"timeCount\","]
#[doc = "    \"zCount\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"axisOrder\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"channelCount\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"pageOrder\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"string\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"position\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"rois\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/RoiIndexEntry\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"source\": {"]
#[doc = "      \"$ref\": \"#/definitions/AlignerSource\""]
#[doc = "    },"]
#[doc = "    \"timeCount\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"zCount\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct RoiIndexFile {
    #[serde(rename = "axisOrder")]
    pub axis_order: ::std::string::String,
    #[serde(rename = "channelCount")]
    pub channel_count: u32,
    #[serde(rename = "pageOrder")]
    pub page_order: ::std::vec::Vec<::std::string::String>,
    pub position: u32,
    pub rois: ::std::vec::Vec<RoiIndexEntry>,
    pub source: AlignerSource,
    #[serde(rename = "timeCount")]
    pub time_count: u32,
    #[serde(rename = "zCount")]
    pub z_count: u32,
}
impl RoiIndexFile {
    pub fn builder() -> builder::RoiIndexFile {
        Default::default()
    }
}
#[doc = "`RoiPosExistsQuery`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"pos\","]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"pos\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct RoiPosExistsQuery {
    pub pos: u32,
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl RoiPosExistsQuery {
    pub fn builder() -> builder::RoiPosExistsQuery {
        Default::default()
    }
}
#[doc = "`RoiPosExistsResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"exists\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"exists\": {"]
#[doc = "      \"type\": \"boolean\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct RoiPosExistsResponse {
    pub exists: bool,
}
impl RoiPosExistsResponse {
    pub fn builder() -> builder::RoiPosExistsResponse {
        Default::default()
    }
}
#[doc = "`RoiPositionScan`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"channels\","]
#[doc = "    \"pos\","]
#[doc = "    \"rois\","]
#[doc = "    \"source\","]
#[doc = "    \"times\","]
#[doc = "    \"zSlices\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"channels\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"integer\","]
#[doc = "        \"format\": \"uint32\","]
#[doc = "        \"minimum\": 0.0"]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"pos\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"rois\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/RoiIndexEntry\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"source\": {"]
#[doc = "      \"$ref\": \"#/definitions/AlignerSource\""]
#[doc = "    },"]
#[doc = "    \"times\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"integer\","]
#[doc = "        \"format\": \"uint32\","]
#[doc = "        \"minimum\": 0.0"]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"zSlices\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"integer\","]
#[doc = "        \"format\": \"uint32\","]
#[doc = "        \"minimum\": 0.0"]
#[doc = "      }"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct RoiPositionScan {
    pub channels: ::std::vec::Vec<u32>,
    pub pos: u32,
    pub rois: ::std::vec::Vec<RoiIndexEntry>,
    pub source: AlignerSource,
    pub times: ::std::vec::Vec<u32>,
    #[serde(rename = "zSlices")]
    pub z_slices: ::std::vec::Vec<u32>,
}
impl RoiPositionScan {
    pub fn builder() -> builder::RoiPositionScan {
        Default::default()
    }
}
#[doc = "`RoiWorkspaceScan`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"positions\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"positions\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/RoiPositionScan\""]
#[doc = "      }"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct RoiWorkspaceScan {
    pub positions: ::std::vec::Vec<RoiPositionScan>,
}
impl RoiWorkspaceScan {
    pub fn builder() -> builder::RoiWorkspaceScan {
        Default::default()
    }
}
#[doc = "`SaveAnnotationLabelsRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"labels\","]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"labels\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AnnotationLabel\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SaveAnnotationLabelsRequest {
    pub labels: ::std::vec::Vec<AnnotationLabel>,
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl SaveAnnotationLabelsRequest {
    pub fn builder() -> builder::SaveAnnotationLabelsRequest {
        Default::default()
    }
}
#[doc = "`SaveAssayJsonRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"contents\","]
#[doc = "    \"saveTo\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"contents\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"saveTo\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SaveAssayJsonRequest {
    pub contents: ::std::string::String,
    #[serde(rename = "saveTo")]
    pub save_to: ::std::string::String,
}
impl SaveAssayJsonRequest {
    pub fn builder() -> builder::SaveAssayJsonRequest {
        Default::default()
    }
}
#[doc = "`SaveAssayJsonResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"ok\","]
#[doc = "    \"path\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"ok\": {"]
#[doc = "      \"type\": \"boolean\""]
#[doc = "    },"]
#[doc = "    \"path\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SaveAssayJsonResponse {
    pub ok: bool,
    pub path: ::std::string::String,
}
impl SaveAssayJsonResponse {
    pub fn builder() -> builder::SaveAssayJsonResponse {
        Default::default()
    }
}
#[doc = "`SaveBboxRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"alignState\","]
#[doc = "    \"csv\","]
#[doc = "    \"pos\","]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"alignState\": {"]
#[doc = "      \"$ref\": \"#/definitions/SavedAlignState\""]
#[doc = "    },"]
#[doc = "    \"csv\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"pos\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SaveBboxRequest {
    #[serde(rename = "alignState")]
    pub align_state: SavedAlignState,
    pub csv: ::std::string::String,
    pub pos: u32,
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl SaveBboxRequest {
    pub fn builder() -> builder::SaveBboxRequest {
        Default::default()
    }
}
#[doc = "`SaveBboxResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"error\","]
#[doc = "    \"ok\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"error\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"ok\": {"]
#[doc = "      \"type\": \"boolean\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SaveBboxResponse {
    pub error: ::std::option::Option<::std::string::String>,
    pub ok: bool,
}
impl SaveBboxResponse {
    pub fn builder() -> builder::SaveBboxResponse {
        Default::default()
    }
}
#[doc = "`SaveResultPdfRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"contentsBase64\","]
#[doc = "    \"fileName\","]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"contentsBase64\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"fileName\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SaveResultPdfRequest {
    #[serde(rename = "contentsBase64")]
    pub contents_base64: ::std::string::String,
    #[serde(rename = "fileName")]
    pub file_name: ::std::string::String,
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl SaveResultPdfRequest {
    pub fn builder() -> builder::SaveResultPdfRequest {
        Default::default()
    }
}
#[doc = "`SaveResultPdfResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"directory\","]
#[doc = "    \"ok\","]
#[doc = "    \"path\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"directory\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"ok\": {"]
#[doc = "      \"type\": \"boolean\""]
#[doc = "    },"]
#[doc = "    \"path\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SaveResultPdfResponse {
    pub directory: ::std::string::String,
    pub ok: bool,
    pub path: ::std::string::String,
}
impl SaveResultPdfResponse {
    pub fn builder() -> builder::SaveResultPdfResponse {
        Default::default()
    }
}
#[doc = "`SaveRoiFrameAnnotationRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"annotation\","]
#[doc = "    \"request\","]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"annotation\": {"]
#[doc = "      \"$ref\": \"#/definitions/RoiFrameAnnotationPayload\""]
#[doc = "    },"]
#[doc = "    \"request\": {"]
#[doc = "      \"$ref\": \"#/definitions/RoiFrameRequest\""]
#[doc = "    },"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SaveRoiFrameAnnotationRequest {
    pub annotation: RoiFrameAnnotationPayload,
    pub request: RoiFrameRequest,
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl SaveRoiFrameAnnotationRequest {
    pub fn builder() -> builder::SaveRoiFrameAnnotationRequest {
        Default::default()
    }
}
#[doc = "`SavedAlignState`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"excludedCells\","]
#[doc = "    \"grid\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"excludedCells\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AlignGridCellCoord\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"grid\": {"]
#[doc = "      \"$ref\": \"#/definitions/AlignGridState\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SavedAlignState {
    #[serde(rename = "excludedCells")]
    pub excluded_cells: ::std::vec::Vec<AlignGridCellCoord>,
    pub grid: AlignGridState,
}
impl SavedAlignState {
    pub fn builder() -> builder::SavedAlignState {
        Default::default()
    }
}
#[doc = "`SavedBboxPositionsQuery`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SavedBboxPositionsQuery {
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl SavedBboxPositionsQuery {
    pub fn builder() -> builder::SavedBboxPositionsQuery {
        Default::default()
    }
}
#[doc = "`ScanRoiWorkspaceRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct ScanRoiWorkspaceRequest {
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl ScanRoiWorkspaceRequest {
    pub fn builder() -> builder::ScanRoiWorkspaceRequest {
        Default::default()
    }
}
#[doc = "`ScanSourceRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"source\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"source\": {"]
#[doc = "      \"$ref\": \"#/definitions/AlignerSource\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct ScanSourceRequest {
    pub source: AlignerSource,
}
impl ScanSourceRequest {
    pub fn builder() -> builder::ScanSourceRequest {
        Default::default()
    }
}
#[doc = "`SmartExcludeRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"cells\","]
#[doc = "    \"contrast\","]
#[doc = "    \"request\","]
#[doc = "    \"source\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"cells\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AutoExcludePreviewCell\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"contrast\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"$ref\": \"#/definitions/ContrastWindow\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"request\": {"]
#[doc = "      \"$ref\": \"#/definitions/FrameRequest\""]
#[doc = "    },"]
#[doc = "    \"source\": {"]
#[doc = "      \"$ref\": \"#/definitions/AlignerSource\""]
#[doc = "    },"]
#[doc = "    \"threshold\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SmartExcludeRequest {
    pub cells: ::std::vec::Vec<AutoExcludePreviewCell>,
    pub contrast: ::std::option::Option<ContrastWindow>,
    pub request: FrameRequest,
    pub source: AlignerSource,
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub threshold: ::std::option::Option<f64>,
}
impl SmartExcludeRequest {
    pub fn builder() -> builder::SmartExcludeRequest {
        Default::default()
    }
}
#[doc = "`SmartExcludeResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"excludedCells\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"excludedCells\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AlignGridCellCoord\""]
#[doc = "      }"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SmartExcludeResponse {
    #[serde(rename = "excludedCells")]
    pub excluded_cells: ::std::vec::Vec<AlignGridCellCoord>,
}
impl SmartExcludeResponse {
    pub fn builder() -> builder::SmartExcludeResponse {
        Default::default()
    }
}
#[doc = "`SmartSegmentPoint`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"label\","]
#[doc = "    \"x\","]
#[doc = "    \"y\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"label\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"enum\": ["]
#[doc = "        0,"]
#[doc = "        1"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"x\": {"]
#[doc = "      \"type\": \"number\""]
#[doc = "    },"]
#[doc = "    \"y\": {"]
#[doc = "      \"type\": \"number\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SmartSegmentPoint {
    pub label: SmartSegmentPointLabel,
    pub x: f64,
    pub y: f64,
}
impl SmartSegmentPoint {
    pub fn builder() -> builder::SmartSegmentPoint {
        Default::default()
    }
}
#[doc = "`SmartSegmentPointLabel`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"number\","]
#[doc = "  \"enum\": ["]
#[doc = "    0,"]
#[doc = "    1"]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Serialize, Clone, Debug)]
#[serde(transparent)]
pub struct SmartSegmentPointLabel(f64);
impl ::std::ops::Deref for SmartSegmentPointLabel {
    type Target = f64;
    fn deref(&self) -> &f64 {
        &self.0
    }
}
impl ::std::convert::From<SmartSegmentPointLabel> for f64 {
    fn from(value: SmartSegmentPointLabel) -> Self {
        value.0
    }
}
impl ::std::convert::TryFrom<f64> for SmartSegmentPointLabel {
    type Error = self::error::ConversionError;
    fn try_from(value: f64) -> ::std::result::Result<Self, self::error::ConversionError> {
        if ![0_f64, 1_f64].contains(&value) {
            Err("invalid value".into())
        } else {
            Ok(Self(value))
        }
    }
}
impl<'de> ::serde::Deserialize<'de> for SmartSegmentPointLabel {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        Self::try_from(<f64>::deserialize(deserializer)?)
            .map_err(|e| <D::Error as ::serde::de::Error>::custom(e.to_string()))
    }
}
#[doc = "`SmartSegmentRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"contrast\","]
#[doc = "    \"points\","]
#[doc = "    \"request\","]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"contrast\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"$ref\": \"#/definitions/ContrastWindow\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"points\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/SmartSegmentPoint\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"request\": {"]
#[doc = "      \"$ref\": \"#/definitions/RoiFrameRequest\""]
#[doc = "    },"]
#[doc = "    \"workspacePath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SmartSegmentRequest {
    pub contrast: ::std::option::Option<ContrastWindow>,
    pub points: ::std::vec::Vec<SmartSegmentPoint>,
    pub request: RoiFrameRequest,
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl SmartSegmentRequest {
    pub fn builder() -> builder::SmartSegmentRequest {
        Default::default()
    }
}
#[doc = "`SmartSegmentResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"mask\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"mask\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"integer\","]
#[doc = "        \"format\": \"uint32\","]
#[doc = "        \"minimum\": 0.0"]
#[doc = "      }"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SmartSegmentResponse {
    pub mask: ::std::vec::Vec<u32>,
}
impl SmartSegmentResponse {
    pub fn builder() -> builder::SmartSegmentResponse {
        Default::default()
    }
}
#[doc = "`TaskAttempt`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"attemptId\","]
#[doc = "    \"error\","]
#[doc = "    \"finishedAtMs\","]
#[doc = "    \"operationId\","]
#[doc = "    \"startedAtMs\","]
#[doc = "    \"status\","]
#[doc = "    \"taskId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"attemptId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"error\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"$ref\": \"#/definitions/TaskError\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"finishedAtMs\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"integer\","]
#[doc = "          \"format\": \"uint64\","]
#[doc = "          \"maximum\": 9007199254740991.0,"]
#[doc = "          \"minimum\": 0.0"]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"operationId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"startedAtMs\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"integer\","]
#[doc = "          \"format\": \"uint64\","]
#[doc = "          \"maximum\": 9007199254740991.0,"]
#[doc = "          \"minimum\": 0.0"]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"status\": {"]
#[doc = "      \"$ref\": \"#/definitions/TaskStatus\""]
#[doc = "    },"]
#[doc = "    \"taskId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct TaskAttempt {
    #[serde(rename = "attemptId")]
    pub attempt_id: ::std::string::String,
    pub error: ::std::option::Option<TaskError>,
    #[serde(rename = "finishedAtMs")]
    pub finished_at_ms: ::std::option::Option<u64>,
    #[serde(rename = "operationId")]
    pub operation_id: ::std::string::String,
    #[serde(rename = "startedAtMs")]
    pub started_at_ms: ::std::option::Option<u64>,
    pub status: TaskStatus,
    #[serde(rename = "taskId")]
    pub task_id: ::std::string::String,
}
impl TaskAttempt {
    pub fn builder() -> builder::TaskAttempt {
        Default::default()
    }
}
#[doc = "`TaskCancelRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"taskId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"taskId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct TaskCancelRequest {
    #[serde(rename = "taskId")]
    pub task_id: ::std::string::String,
}
impl TaskCancelRequest {
    pub fn builder() -> builder::TaskCancelRequest {
        Default::default()
    }
}
#[doc = "`TaskCommandError`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"_tag\","]
#[doc = "    \"code\","]
#[doc = "    \"currentStatus\","]
#[doc = "    \"entity\","]
#[doc = "    \"id\","]
#[doc = "    \"message\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"_tag\": {"]
#[doc = "      \"type\": \"string\","]
#[doc = "      \"enum\": ["]
#[doc = "        \"TaskCommandError\""]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"code\": {"]
#[doc = "      \"type\": \"string\","]
#[doc = "      \"enum\": ["]
#[doc = "        \"not-found\","]
#[doc = "        \"invalid-transition\""]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"currentStatus\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"entity\": {"]
#[doc = "      \"type\": \"string\","]
#[doc = "      \"enum\": ["]
#[doc = "        \"operation\","]
#[doc = "        \"task\""]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"id\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"message\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct TaskCommandError {
    pub code: TaskCommandErrorCode,
    #[serde(rename = "currentStatus")]
    pub current_status: ::std::option::Option<::std::string::String>,
    pub entity: TaskCommandErrorEntity,
    pub id: ::std::string::String,
    pub message: ::std::string::String,
    #[serde(rename = "_tag")]
    pub tag: TaskCommandErrorTag,
}
impl TaskCommandError {
    pub fn builder() -> builder::TaskCommandError {
        Default::default()
    }
}
#[doc = "`TaskCommandErrorCode`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"not-found\","]
#[doc = "    \"invalid-transition\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum TaskCommandErrorCode {
    #[serde(rename = "not-found")]
    NotFound,
    #[serde(rename = "invalid-transition")]
    InvalidTransition,
}
impl ::std::fmt::Display for TaskCommandErrorCode {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::NotFound => f.write_str("not-found"),
            Self::InvalidTransition => f.write_str("invalid-transition"),
        }
    }
}
impl ::std::str::FromStr for TaskCommandErrorCode {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "not-found" => Ok(Self::NotFound),
            "invalid-transition" => Ok(Self::InvalidTransition),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for TaskCommandErrorCode {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for TaskCommandErrorCode {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for TaskCommandErrorCode {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`TaskCommandErrorEntity`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"operation\","]
#[doc = "    \"task\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum TaskCommandErrorEntity {
    #[serde(rename = "operation")]
    Operation,
    #[serde(rename = "task")]
    Task,
}
impl ::std::fmt::Display for TaskCommandErrorEntity {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Operation => f.write_str("operation"),
            Self::Task => f.write_str("task"),
        }
    }
}
impl ::std::str::FromStr for TaskCommandErrorEntity {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "operation" => Ok(Self::Operation),
            "task" => Ok(Self::Task),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for TaskCommandErrorEntity {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for TaskCommandErrorEntity {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for TaskCommandErrorEntity {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`TaskCommandErrorTag`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"TaskCommandError\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum TaskCommandErrorTag {
    TaskCommandError,
}
impl ::std::fmt::Display for TaskCommandErrorTag {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::TaskCommandError => f.write_str("TaskCommandError"),
        }
    }
}
impl ::std::str::FromStr for TaskCommandErrorTag {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "TaskCommandError" => Ok(Self::TaskCommandError),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for TaskCommandErrorTag {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for TaskCommandErrorTag {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for TaskCommandErrorTag {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`TaskDependencyBlock`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"error\","]
#[doc = "    \"status\","]
#[doc = "    \"taskId\","]
#[doc = "    \"taskKind\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"error\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"$ref\": \"#/definitions/TaskError\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"status\": {"]
#[doc = "      \"$ref\": \"#/definitions/TaskStatus\""]
#[doc = "    },"]
#[doc = "    \"taskId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"taskKind\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct TaskDependencyBlock {
    pub error: ::std::option::Option<TaskError>,
    pub status: TaskStatus,
    #[serde(rename = "taskId")]
    pub task_id: ::std::string::String,
    #[serde(rename = "taskKind")]
    pub task_kind: ::std::string::String,
}
impl TaskDependencyBlock {
    pub fn builder() -> builder::TaskDependencyBlock {
        Default::default()
    }
}
#[doc = "`TaskDetail`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"attempts\","]
#[doc = "    \"blockedBy\","]
#[doc = "    \"dependencies\","]
#[doc = "    \"enqueueOrder\","]
#[doc = "    \"operationId\","]
#[doc = "    \"status\","]
#[doc = "    \"taskId\","]
#[doc = "    \"taskKind\","]
#[doc = "    \"weight\","]
#[doc = "    \"workspaceId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"attempts\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/TaskAttempt\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"blockedBy\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/TaskDependencyBlock\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"dependencies\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"string\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"enqueueOrder\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint64\","]
#[doc = "      \"maximum\": 9007199254740991.0,"]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"operationId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"status\": {"]
#[doc = "      \"$ref\": \"#/definitions/TaskStatus\""]
#[doc = "    },"]
#[doc = "    \"taskId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"taskKind\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"weight\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"workspaceId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct TaskDetail {
    pub attempts: ::std::vec::Vec<TaskAttempt>,
    #[serde(rename = "blockedBy")]
    pub blocked_by: ::std::vec::Vec<TaskDependencyBlock>,
    pub dependencies: ::std::vec::Vec<::std::string::String>,
    #[serde(rename = "enqueueOrder")]
    pub enqueue_order: u64,
    #[serde(rename = "operationId")]
    pub operation_id: ::std::string::String,
    pub status: TaskStatus,
    #[serde(rename = "taskId")]
    pub task_id: ::std::string::String,
    #[serde(rename = "taskKind")]
    pub task_kind: ::std::string::String,
    pub weight: u32,
    #[serde(rename = "workspaceId")]
    pub workspace_id: ::std::string::String,
}
impl TaskDetail {
    pub fn builder() -> builder::TaskDetail {
        Default::default()
    }
}
#[doc = "`TaskDetailQuery`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"taskId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"taskId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct TaskDetailQuery {
    #[serde(rename = "taskId")]
    pub task_id: ::std::string::String,
}
impl TaskDetailQuery {
    pub fn builder() -> builder::TaskDetailQuery {
        Default::default()
    }
}
#[doc = "`TaskError`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"code\","]
#[doc = "    \"message\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"code\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"message\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct TaskError {
    pub code: ::std::string::String,
    pub message: ::std::string::String,
}
impl TaskError {
    pub fn builder() -> builder::TaskError {
        Default::default()
    }
}
#[doc = "`TaskRetryRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"taskId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"taskId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct TaskRetryRequest {
    #[serde(rename = "taskId")]
    pub task_id: ::std::string::String,
}
impl TaskRetryRequest {
    pub fn builder() -> builder::TaskRetryRequest {
        Default::default()
    }
}
#[doc = "`TaskStatus`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"queued\","]
#[doc = "    \"blocked\","]
#[doc = "    \"running\","]
#[doc = "    \"completed\","]
#[doc = "    \"failed\","]
#[doc = "    \"cancelled\","]
#[doc = "    \"cancellation-requested\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum TaskStatus {
    #[serde(rename = "queued")]
    Queued,
    #[serde(rename = "blocked")]
    Blocked,
    #[serde(rename = "running")]
    Running,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "cancelled")]
    Cancelled,
    #[serde(rename = "cancellation-requested")]
    CancellationRequested,
}
impl ::std::fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Queued => f.write_str("queued"),
            Self::Blocked => f.write_str("blocked"),
            Self::Running => f.write_str("running"),
            Self::Completed => f.write_str("completed"),
            Self::Failed => f.write_str("failed"),
            Self::Cancelled => f.write_str("cancelled"),
            Self::CancellationRequested => f.write_str("cancellation-requested"),
        }
    }
}
impl ::std::str::FromStr for TaskStatus {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "queued" => Ok(Self::Queued),
            "blocked" => Ok(Self::Blocked),
            "running" => Ok(Self::Running),
            "completed" => Ok(Self::Completed),
            "failed" => Ok(Self::Failed),
            "cancelled" => Ok(Self::Cancelled),
            "cancellation-requested" => Ok(Self::CancellationRequested),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for TaskStatus {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for TaskStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for TaskStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`Unauthorized`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"_tag\","]
#[doc = "    \"message\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"_tag\": {"]
#[doc = "      \"type\": \"string\","]
#[doc = "      \"enum\": ["]
#[doc = "        \"Unauthorized\""]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"message\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct Unauthorized {
    pub message: ::std::string::String,
    #[serde(rename = "_tag")]
    pub tag: UnauthorizedTag,
}
impl Unauthorized {
    pub fn builder() -> builder::Unauthorized {
        Default::default()
    }
}
#[doc = "`UnauthorizedTag`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"Unauthorized\""]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum UnauthorizedTag {
    Unauthorized,
}
impl ::std::fmt::Display for UnauthorizedTag {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Unauthorized => f.write_str("Unauthorized"),
        }
    }
}
impl ::std::str::FromStr for UnauthorizedTag {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "Unauthorized" => Ok(Self::Unauthorized),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for UnauthorizedTag {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for UnauthorizedTag {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for UnauthorizedTag {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`WorkspaceScan`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"channels\","]
#[doc = "    \"positions\","]
#[doc = "    \"times\","]
#[doc = "    \"zSlices\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"channelLabels\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"string\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"channels\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"integer\","]
#[doc = "        \"format\": \"uint32\","]
#[doc = "        \"minimum\": 0.0"]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"positionLabels\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"string\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"positions\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"integer\","]
#[doc = "        \"format\": \"uint32\","]
#[doc = "        \"minimum\": 0.0"]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"timeLabels\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"string\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"times\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"integer\","]
#[doc = "        \"format\": \"uint32\","]
#[doc = "        \"minimum\": 0.0"]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"zSliceLabels\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"string\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"zSlices\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"integer\","]
#[doc = "        \"format\": \"uint32\","]
#[doc = "        \"minimum\": 0.0"]
#[doc = "      }"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct WorkspaceScan {
    #[serde(
        rename = "channelLabels",
        default,
        skip_serializing_if = "::std::vec::Vec::is_empty"
    )]
    pub channel_labels: ::std::vec::Vec<::std::string::String>,
    pub channels: ::std::vec::Vec<u32>,
    #[serde(
        rename = "positionLabels",
        default,
        skip_serializing_if = "::std::vec::Vec::is_empty"
    )]
    pub position_labels: ::std::vec::Vec<::std::string::String>,
    pub positions: ::std::vec::Vec<u32>,
    #[serde(
        rename = "timeLabels",
        default,
        skip_serializing_if = "::std::vec::Vec::is_empty"
    )]
    pub time_labels: ::std::vec::Vec<::std::string::String>,
    pub times: ::std::vec::Vec<u32>,
    #[serde(
        rename = "zSliceLabels",
        default,
        skip_serializing_if = "::std::vec::Vec::is_empty"
    )]
    pub z_slice_labels: ::std::vec::Vec<::std::string::String>,
    #[serde(rename = "zSlices")]
    pub z_slices: ::std::vec::Vec<u32>,
}
impl WorkspaceScan {
    pub fn builder() -> builder::WorkspaceScan {
        Default::default()
    }
}
#[doc = r" Types for composing complex structures."]
pub mod builder {
    #[derive(Clone, Debug)]
    pub struct AlignGridCellCoord {
        i: ::std::result::Result<i32, ::std::string::String>,
        j: ::std::result::Result<i32, ::std::string::String>,
    }
    impl ::std::default::Default for AlignGridCellCoord {
        fn default() -> Self {
            Self {
                i: Err("no value supplied for i".to_string()),
                j: Err("no value supplied for j".to_string()),
            }
        }
    }
    impl AlignGridCellCoord {
        pub fn i<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<i32>,
            T::Error: ::std::fmt::Display,
        {
            self.i = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for i: {e}"));
            self
        }
        pub fn j<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<i32>,
            T::Error: ::std::fmt::Display,
        {
            self.j = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for j: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AlignGridCellCoord> for super::AlignGridCellCoord {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AlignGridCellCoord,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                i: value.i?,
                j: value.j?,
            })
        }
    }
    impl ::std::convert::From<super::AlignGridCellCoord> for AlignGridCellCoord {
        fn from(value: super::AlignGridCellCoord) -> Self {
            Self {
                i: Ok(value.i),
                j: Ok(value.j),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AlignGridState {
        cell_height: ::std::result::Result<f64, ::std::string::String>,
        cell_width: ::std::result::Result<f64, ::std::string::String>,
        enabled: ::std::result::Result<bool, ::std::string::String>,
        opacity: ::std::result::Result<f64, ::std::string::String>,
        rotation: ::std::result::Result<f64, ::std::string::String>,
        shape: ::std::result::Result<super::AlignGridShape, ::std::string::String>,
        spacing_a: ::std::result::Result<f64, ::std::string::String>,
        spacing_b: ::std::result::Result<f64, ::std::string::String>,
        tx: ::std::result::Result<f64, ::std::string::String>,
        ty: ::std::result::Result<f64, ::std::string::String>,
    }
    impl ::std::default::Default for AlignGridState {
        fn default() -> Self {
            Self {
                cell_height: Err("no value supplied for cell_height".to_string()),
                cell_width: Err("no value supplied for cell_width".to_string()),
                enabled: Err("no value supplied for enabled".to_string()),
                opacity: Err("no value supplied for opacity".to_string()),
                rotation: Err("no value supplied for rotation".to_string()),
                shape: Err("no value supplied for shape".to_string()),
                spacing_a: Err("no value supplied for spacing_a".to_string()),
                spacing_b: Err("no value supplied for spacing_b".to_string()),
                tx: Err("no value supplied for tx".to_string()),
                ty: Err("no value supplied for ty".to_string()),
            }
        }
    }
    impl AlignGridState {
        pub fn cell_height<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.cell_height = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for cell_height: {e}"));
            self
        }
        pub fn cell_width<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.cell_width = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for cell_width: {e}"));
            self
        }
        pub fn enabled<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<bool>,
            T::Error: ::std::fmt::Display,
        {
            self.enabled = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for enabled: {e}"));
            self
        }
        pub fn opacity<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.opacity = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for opacity: {e}"));
            self
        }
        pub fn rotation<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.rotation = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for rotation: {e}"));
            self
        }
        pub fn shape<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AlignGridShape>,
            T::Error: ::std::fmt::Display,
        {
            self.shape = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for shape: {e}"));
            self
        }
        pub fn spacing_a<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.spacing_a = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for spacing_a: {e}"));
            self
        }
        pub fn spacing_b<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.spacing_b = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for spacing_b: {e}"));
            self
        }
        pub fn tx<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.tx = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for tx: {e}"));
            self
        }
        pub fn ty<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.ty = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for ty: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AlignGridState> for super::AlignGridState {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AlignGridState,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                cell_height: value.cell_height?,
                cell_width: value.cell_width?,
                enabled: value.enabled?,
                opacity: value.opacity?,
                rotation: value.rotation?,
                shape: value.shape?,
                spacing_a: value.spacing_a?,
                spacing_b: value.spacing_b?,
                tx: value.tx?,
                ty: value.ty?,
            })
        }
    }
    impl ::std::convert::From<super::AlignGridState> for AlignGridState {
        fn from(value: super::AlignGridState) -> Self {
            Self {
                cell_height: Ok(value.cell_height),
                cell_width: Ok(value.cell_width),
                enabled: Ok(value.enabled),
                opacity: Ok(value.opacity),
                rotation: Ok(value.rotation),
                shape: Ok(value.shape),
                spacing_a: Ok(value.spacing_a),
                spacing_b: Ok(value.spacing_b),
                tx: Ok(value.tx),
                ty: Ok(value.ty),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AlignOutputPaths {
        align: ::std::result::Result<::std::string::String, ::std::string::String>,
        bbox: ::std::result::Result<::std::string::String, ::std::string::String>,
        roi: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for AlignOutputPaths {
        fn default() -> Self {
            Self {
                align: Err("no value supplied for align".to_string()),
                bbox: Err("no value supplied for bbox".to_string()),
                roi: Err("no value supplied for roi".to_string()),
            }
        }
    }
    impl AlignOutputPaths {
        pub fn align<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.align = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for align: {e}"));
            self
        }
        pub fn bbox<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.bbox = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for bbox: {e}"));
            self
        }
        pub fn roi<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.roi = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for roi: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AlignOutputPaths> for super::AlignOutputPaths {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AlignOutputPaths,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                align: value.align?,
                bbox: value.bbox?,
                roi: value.roi?,
            })
        }
    }
    impl ::std::convert::From<super::AlignOutputPaths> for AlignOutputPaths {
        fn from(value: super::AlignOutputPaths) -> Self {
            Self {
                align: Ok(value.align),
                bbox: Ok(value.bbox),
                roi: Ok(value.roi),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AnalysisCsvFile {
        csv: ::std::result::Result<::std::string::String, ::std::string::String>,
        file_name: ::std::result::Result<::std::string::String, ::std::string::String>,
        kind: ::std::result::Result<::std::string::String, ::std::string::String>,
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for AnalysisCsvFile {
        fn default() -> Self {
            Self {
                csv: Err("no value supplied for csv".to_string()),
                file_name: Err("no value supplied for file_name".to_string()),
                kind: Err("no value supplied for kind".to_string()),
                path: Err("no value supplied for path".to_string()),
            }
        }
    }
    impl AnalysisCsvFile {
        pub fn csv<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.csv = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for csv: {e}"));
            self
        }
        pub fn file_name<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.file_name = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for file_name: {e}"));
            self
        }
        pub fn kind<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.kind = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for kind: {e}"));
            self
        }
        pub fn path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AnalysisCsvFile> for super::AnalysisCsvFile {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AnalysisCsvFile,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                csv: value.csv?,
                file_name: value.file_name?,
                kind: value.kind?,
                path: value.path?,
            })
        }
    }
    impl ::std::convert::From<super::AnalysisCsvFile> for AnalysisCsvFile {
        fn from(value: super::AnalysisCsvFile) -> Self {
            Self {
                csv: Ok(value.csv),
                file_name: Ok(value.file_name),
                kind: Ok(value.kind),
                path: Ok(value.path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AnalysisProgress {
        error: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        message: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        progress: ::std::result::Result<f64, ::std::string::String>,
        request_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        result_files:
            ::std::result::Result<::std::vec::Vec<super::AnalysisCsvFile>, ::std::string::String>,
        stage: ::std::result::Result<super::AnalysisStage, ::std::string::String>,
        status: ::std::result::Result<super::AnalysisStatus, ::std::string::String>,
    }
    impl ::std::default::Default for AnalysisProgress {
        fn default() -> Self {
            Self {
                error: Err("no value supplied for error".to_string()),
                message: Err("no value supplied for message".to_string()),
                progress: Err("no value supplied for progress".to_string()),
                request_id: Err("no value supplied for request_id".to_string()),
                result_files: Ok(Default::default()),
                stage: Err("no value supplied for stage".to_string()),
                status: Err("no value supplied for status".to_string()),
            }
        }
    }
    impl AnalysisProgress {
        pub fn error<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.error = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for error: {e}"));
            self
        }
        pub fn message<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.message = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for message: {e}"));
            self
        }
        pub fn progress<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.progress = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for progress: {e}"));
            self
        }
        pub fn request_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.request_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for request_id: {e}"));
            self
        }
        pub fn result_files<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::AnalysisCsvFile>>,
            T::Error: ::std::fmt::Display,
        {
            self.result_files = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for result_files: {e}"));
            self
        }
        pub fn stage<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AnalysisStage>,
            T::Error: ::std::fmt::Display,
        {
            self.stage = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for stage: {e}"));
            self
        }
        pub fn status<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AnalysisStatus>,
            T::Error: ::std::fmt::Display,
        {
            self.status = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for status: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AnalysisProgress> for super::AnalysisProgress {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AnalysisProgress,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                error: value.error?,
                message: value.message?,
                progress: value.progress?,
                request_id: value.request_id?,
                result_files: value.result_files?,
                stage: value.stage?,
                status: value.status?,
            })
        }
    }
    impl ::std::convert::From<super::AnalysisProgress> for AnalysisProgress {
        fn from(value: super::AnalysisProgress) -> Self {
            Self {
                error: Ok(value.error),
                message: Ok(value.message),
                progress: Ok(value.progress),
                request_id: Ok(value.request_id),
                result_files: Ok(value.result_files),
                stage: Ok(value.stage),
                status: Ok(value.status),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AnalysisProgressQuery {
        request_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for AnalysisProgressQuery {
        fn default() -> Self {
            Self {
                request_id: Err("no value supplied for request_id".to_string()),
            }
        }
    }
    impl AnalysisProgressQuery {
        pub fn request_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.request_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for request_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AnalysisProgressQuery> for super::AnalysisProgressQuery {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AnalysisProgressQuery,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                request_id: value.request_id?,
            })
        }
    }
    impl ::std::convert::From<super::AnalysisProgressQuery> for AnalysisProgressQuery {
        fn from(value: super::AnalysisProgressQuery) -> Self {
            Self {
                request_id: Ok(value.request_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AnalysisStartRequest {
        request_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for AnalysisStartRequest {
        fn default() -> Self {
            Self {
                request_id: Err("no value supplied for request_id".to_string()),
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl AnalysisStartRequest {
        pub fn request_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.request_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for request_id: {e}"));
            self
        }
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AnalysisStartRequest> for super::AnalysisStartRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AnalysisStartRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                request_id: value.request_id?,
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::AnalysisStartRequest> for AnalysisStartRequest {
        fn from(value: super::AnalysisStartRequest) -> Self {
            Self {
                request_id: Ok(value.request_id),
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AnnotationLabel {
        color: ::std::result::Result<::std::string::String, ::std::string::String>,
        id: ::std::result::Result<::std::string::String, ::std::string::String>,
        name: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for AnnotationLabel {
        fn default() -> Self {
            Self {
                color: Err("no value supplied for color".to_string()),
                id: Err("no value supplied for id".to_string()),
                name: Err("no value supplied for name".to_string()),
            }
        }
    }
    impl AnnotationLabel {
        pub fn color<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.color = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for color: {e}"));
            self
        }
        pub fn id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for id: {e}"));
            self
        }
        pub fn name<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.name = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for name: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AnnotationLabel> for super::AnnotationLabel {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AnnotationLabel,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                color: value.color?,
                id: value.id?,
                name: value.name?,
            })
        }
    }
    impl ::std::convert::From<super::AnnotationLabel> for AnnotationLabel {
        fn from(value: super::AnnotationLabel) -> Self {
            Self {
                color: Ok(value.color),
                id: Ok(value.id),
                name: Ok(value.name),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayAnalysisConfig {
        max_onset_minutes: ::std::result::Result<::std::option::Option<f64>, ::std::string::String>,
    }
    impl ::std::default::Default for AssayAnalysisConfig {
        fn default() -> Self {
            Self {
                max_onset_minutes: Ok(Default::default()),
            }
        }
    }
    impl AssayAnalysisConfig {
        pub fn max_onset_minutes<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<f64>>,
            T::Error: ::std::fmt::Display,
        {
            self.max_onset_minutes = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for max_onset_minutes: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssayAnalysisConfig> for super::AssayAnalysisConfig {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssayAnalysisConfig,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                max_onset_minutes: value.max_onset_minutes?,
            })
        }
    }
    impl ::std::convert::From<super::AssayAnalysisConfig> for AssayAnalysisConfig {
        fn from(value: super::AssayAnalysisConfig) -> Self {
            Self {
                max_onset_minutes: Ok(value.max_onset_minutes),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayBasicInfoStep1 {
        data_path: ::std::result::Result<::std::string::String, ::std::string::String>,
        folder_filename_template:
            ::std::result::Result<::std::string::String, ::std::string::String>,
        folder_subfolder_template:
            ::std::result::Result<::std::string::String, ::std::string::String>,
        name: ::std::result::Result<::std::string::String, ::std::string::String>,
        save_to: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for AssayBasicInfoStep1 {
        fn default() -> Self {
            Self {
                data_path: Err("no value supplied for data_path".to_string()),
                folder_filename_template: Err(
                    "no value supplied for folder_filename_template".to_string()
                ),
                folder_subfolder_template: Err(
                    "no value supplied for folder_subfolder_template".to_string()
                ),
                name: Err("no value supplied for name".to_string()),
                save_to: Err("no value supplied for save_to".to_string()),
            }
        }
    }
    impl AssayBasicInfoStep1 {
        pub fn data_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.data_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for data_path: {e}"));
            self
        }
        pub fn folder_filename_template<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.folder_filename_template = value.try_into().map_err(|e| {
                format!("error converting supplied value for folder_filename_template: {e}")
            });
            self
        }
        pub fn folder_subfolder_template<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.folder_subfolder_template = value.try_into().map_err(|e| {
                format!("error converting supplied value for folder_subfolder_template: {e}")
            });
            self
        }
        pub fn name<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.name = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for name: {e}"));
            self
        }
        pub fn save_to<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.save_to = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for save_to: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssayBasicInfoStep1> for super::AssayBasicInfoStep1 {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssayBasicInfoStep1,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                data_path: value.data_path?,
                folder_filename_template: value.folder_filename_template?,
                folder_subfolder_template: value.folder_subfolder_template?,
                name: value.name?,
                save_to: value.save_to?,
            })
        }
    }
    impl ::std::convert::From<super::AssayBasicInfoStep1> for AssayBasicInfoStep1 {
        fn from(value: super::AssayBasicInfoStep1) -> Self {
            Self {
                data_path: Ok(value.data_path),
                folder_filename_template: Ok(value.folder_filename_template),
                folder_subfolder_template: Ok(value.folder_subfolder_template),
                name: Ok(value.name),
                save_to: Ok(value.save_to),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayBasicInfoStep2 {
        selected_features:
            ::std::result::Result<::std::vec::Vec<super::AssayFeature>, ::std::string::String>,
        timelapse_amount: ::std::result::Result<::std::option::Option<f64>, ::std::string::String>,
        timelapse_unit: ::std::result::Result<super::AssayTimelapseUnit, ::std::string::String>,
    }
    impl ::std::default::Default for AssayBasicInfoStep2 {
        fn default() -> Self {
            Self {
                selected_features: Err("no value supplied for selected_features".to_string()),
                timelapse_amount: Err("no value supplied for timelapse_amount".to_string()),
                timelapse_unit: Err("no value supplied for timelapse_unit".to_string()),
            }
        }
    }
    impl AssayBasicInfoStep2 {
        pub fn selected_features<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::AssayFeature>>,
            T::Error: ::std::fmt::Display,
        {
            self.selected_features = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for selected_features: {e}"));
            self
        }
        pub fn timelapse_amount<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<f64>>,
            T::Error: ::std::fmt::Display,
        {
            self.timelapse_amount = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for timelapse_amount: {e}"));
            self
        }
        pub fn timelapse_unit<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayTimelapseUnit>,
            T::Error: ::std::fmt::Display,
        {
            self.timelapse_unit = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for timelapse_unit: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssayBasicInfoStep2> for super::AssayBasicInfoStep2 {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssayBasicInfoStep2,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                selected_features: value.selected_features?,
                timelapse_amount: value.timelapse_amount?,
                timelapse_unit: value.timelapse_unit?,
            })
        }
    }
    impl ::std::convert::From<super::AssayBasicInfoStep2> for AssayBasicInfoStep2 {
        fn from(value: super::AssayBasicInfoStep2) -> Self {
            Self {
                selected_features: Ok(value.selected_features),
                timelapse_amount: Ok(value.timelapse_amount),
                timelapse_unit: Ok(value.timelapse_unit),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayBasicInfoStep3 {
        samples: ::std::result::Result<super::AssaySamples, ::std::string::String>,
    }
    impl ::std::default::Default for AssayBasicInfoStep3 {
        fn default() -> Self {
            Self {
                samples: Err("no value supplied for samples".to_string()),
            }
        }
    }
    impl AssayBasicInfoStep3 {
        pub fn samples<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssaySamples>,
            T::Error: ::std::fmt::Display,
        {
            self.samples = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for samples: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssayBasicInfoStep3> for super::AssayBasicInfoStep3 {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssayBasicInfoStep3,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                samples: value.samples?,
            })
        }
    }
    impl ::std::convert::From<super::AssayBasicInfoStep3> for AssayBasicInfoStep3 {
        fn from(value: super::AssayBasicInfoStep3) -> Self {
            Self {
                samples: Ok(value.samples),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayJsonFile {
        analysis: ::std::result::Result<
            ::std::option::Option<super::AssayAnalysisConfig>,
            ::std::string::String,
        >,
        assay_id: ::std::result::Result<super::AssayType, ::std::string::String>,
        assay_label: ::std::result::Result<::std::string::String, ::std::string::String>,
        data_source_kind: ::std::result::Result<
            ::std::option::Option<super::AssayDataSourceKind>,
            ::std::string::String,
        >,
        info1: ::std::result::Result<super::AssayBasicInfoStep1, ::std::string::String>,
        info2: ::std::result::Result<super::AssayBasicInfoStep2, ::std::string::String>,
        info3: ::std::result::Result<super::AssayBasicInfoStep3, ::std::string::String>,
    }
    impl ::std::default::Default for AssayJsonFile {
        fn default() -> Self {
            Self {
                analysis: Ok(Default::default()),
                assay_id: Err("no value supplied for assay_id".to_string()),
                assay_label: Err("no value supplied for assay_label".to_string()),
                data_source_kind: Err("no value supplied for data_source_kind".to_string()),
                info1: Err("no value supplied for info1".to_string()),
                info2: Err("no value supplied for info2".to_string()),
                info3: Err("no value supplied for info3".to_string()),
            }
        }
    }
    impl AssayJsonFile {
        pub fn analysis<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::AssayAnalysisConfig>>,
            T::Error: ::std::fmt::Display,
        {
            self.analysis = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for analysis: {e}"));
            self
        }
        pub fn assay_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayType>,
            T::Error: ::std::fmt::Display,
        {
            self.assay_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for assay_id: {e}"));
            self
        }
        pub fn assay_label<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.assay_label = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for assay_label: {e}"));
            self
        }
        pub fn data_source_kind<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::AssayDataSourceKind>>,
            T::Error: ::std::fmt::Display,
        {
            self.data_source_kind = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for data_source_kind: {e}"));
            self
        }
        pub fn info1<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayBasicInfoStep1>,
            T::Error: ::std::fmt::Display,
        {
            self.info1 = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for info1: {e}"));
            self
        }
        pub fn info2<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayBasicInfoStep2>,
            T::Error: ::std::fmt::Display,
        {
            self.info2 = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for info2: {e}"));
            self
        }
        pub fn info3<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayBasicInfoStep3>,
            T::Error: ::std::fmt::Display,
        {
            self.info3 = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for info3: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssayJsonFile> for super::AssayJsonFile {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssayJsonFile,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                analysis: value.analysis?,
                assay_id: value.assay_id?,
                assay_label: value.assay_label?,
                data_source_kind: value.data_source_kind?,
                info1: value.info1?,
                info2: value.info2?,
                info3: value.info3?,
            })
        }
    }
    impl ::std::convert::From<super::AssayJsonFile> for AssayJsonFile {
        fn from(value: super::AssayJsonFile) -> Self {
            Self {
                analysis: Ok(value.analysis),
                assay_id: Ok(value.assay_id),
                assay_label: Ok(value.assay_label),
                data_source_kind: Ok(value.data_source_kind),
                info1: Ok(value.info1),
                info2: Ok(value.info2),
                info3: Ok(value.info3),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssaySampleRow {
        channel: ::std::result::Result<::std::string::String, ::std::string::String>,
        mask_channel: ::std::result::Result<::std::string::String, ::std::string::String>,
        name: ::std::result::Result<::std::string::String, ::std::string::String>,
        position_finish: ::std::result::Result<::std::string::String, ::std::string::String>,
        position_start: ::std::result::Result<::std::string::String, ::std::string::String>,
        positions: ::std::result::Result<::std::string::String, ::std::string::String>,
        signal_channel: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for AssaySampleRow {
        fn default() -> Self {
            Self {
                channel: Err("no value supplied for channel".to_string()),
                mask_channel: Err("no value supplied for mask_channel".to_string()),
                name: Err("no value supplied for name".to_string()),
                position_finish: Err("no value supplied for position_finish".to_string()),
                position_start: Err("no value supplied for position_start".to_string()),
                positions: Err("no value supplied for positions".to_string()),
                signal_channel: Err("no value supplied for signal_channel".to_string()),
            }
        }
    }
    impl AssaySampleRow {
        pub fn channel<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.channel = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for channel: {e}"));
            self
        }
        pub fn mask_channel<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.mask_channel = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for mask_channel: {e}"));
            self
        }
        pub fn name<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.name = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for name: {e}"));
            self
        }
        pub fn position_finish<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.position_finish = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for position_finish: {e}"));
            self
        }
        pub fn position_start<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.position_start = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for position_start: {e}"));
            self
        }
        pub fn positions<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.positions = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for positions: {e}"));
            self
        }
        pub fn signal_channel<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.signal_channel = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for signal_channel: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssaySampleRow> for super::AssaySampleRow {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssaySampleRow,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                channel: value.channel?,
                mask_channel: value.mask_channel?,
                name: value.name?,
                position_finish: value.position_finish?,
                position_start: value.position_start?,
                positions: value.positions?,
                signal_channel: value.signal_channel?,
            })
        }
    }
    impl ::std::convert::From<super::AssaySampleRow> for AssaySampleRow {
        fn from(value: super::AssaySampleRow) -> Self {
            Self {
                channel: Ok(value.channel),
                mask_channel: Ok(value.mask_channel),
                name: Ok(value.name),
                position_finish: Ok(value.position_finish),
                position_start: Ok(value.position_start),
                positions: Ok(value.positions),
                signal_channel: Ok(value.signal_channel),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AutoExcludePreviewCell {
        h: ::std::result::Result<u32, ::std::string::String>,
        i: ::std::result::Result<i32, ::std::string::String>,
        j: ::std::result::Result<i32, ::std::string::String>,
        w: ::std::result::Result<u32, ::std::string::String>,
        x: ::std::result::Result<u32, ::std::string::String>,
        y: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for AutoExcludePreviewCell {
        fn default() -> Self {
            Self {
                h: Err("no value supplied for h".to_string()),
                i: Err("no value supplied for i".to_string()),
                j: Err("no value supplied for j".to_string()),
                w: Err("no value supplied for w".to_string()),
                x: Err("no value supplied for x".to_string()),
                y: Err("no value supplied for y".to_string()),
            }
        }
    }
    impl AutoExcludePreviewCell {
        pub fn h<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.h = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for h: {e}"));
            self
        }
        pub fn i<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<i32>,
            T::Error: ::std::fmt::Display,
        {
            self.i = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for i: {e}"));
            self
        }
        pub fn j<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<i32>,
            T::Error: ::std::fmt::Display,
        {
            self.j = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for j: {e}"));
            self
        }
        pub fn w<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.w = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for w: {e}"));
            self
        }
        pub fn x<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.x = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for x: {e}"));
            self
        }
        pub fn y<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.y = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for y: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AutoExcludePreviewCell> for super::AutoExcludePreviewCell {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AutoExcludePreviewCell,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                h: value.h?,
                i: value.i?,
                j: value.j?,
                w: value.w?,
                x: value.x?,
                y: value.y?,
            })
        }
    }
    impl ::std::convert::From<super::AutoExcludePreviewCell> for AutoExcludePreviewCell {
        fn from(value: super::AutoExcludePreviewCell) -> Self {
            Self {
                h: Ok(value.h),
                i: Ok(value.i),
                j: Ok(value.j),
                w: Ok(value.w),
                x: Ok(value.x),
                y: Ok(value.y),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct CancelCropRoiRequest {
        request_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for CancelCropRoiRequest {
        fn default() -> Self {
            Self {
                request_id: Err("no value supplied for request_id".to_string()),
            }
        }
    }
    impl CancelCropRoiRequest {
        pub fn request_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.request_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for request_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<CancelCropRoiRequest> for super::CancelCropRoiRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: CancelCropRoiRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                request_id: value.request_id?,
            })
        }
    }
    impl ::std::convert::From<super::CancelCropRoiRequest> for CancelCropRoiRequest {
        fn from(value: super::CancelCropRoiRequest) -> Self {
            Self {
                request_id: Ok(value.request_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct ContrastWindow {
        max: ::std::result::Result<u32, ::std::string::String>,
        min: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for ContrastWindow {
        fn default() -> Self {
            Self {
                max: Err("no value supplied for max".to_string()),
                min: Err("no value supplied for min".to_string()),
            }
        }
    }
    impl ContrastWindow {
        pub fn max<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.max = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for max: {e}"));
            self
        }
        pub fn min<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.min = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for min: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<ContrastWindow> for super::ContrastWindow {
        type Error = super::error::ConversionError;
        fn try_from(
            value: ContrastWindow,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                max: value.max?,
                min: value.min?,
            })
        }
    }
    impl ::std::convert::From<super::ContrastWindow> for ContrastWindow {
        fn from(value: super::ContrastWindow) -> Self {
            Self {
                max: Ok(value.max),
                min: Ok(value.min),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct CreateDirectoryRequest {
        name: ::std::result::Result<::std::string::String, ::std::string::String>,
        parent_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for CreateDirectoryRequest {
        fn default() -> Self {
            Self {
                name: Err("no value supplied for name".to_string()),
                parent_path: Err("no value supplied for parent_path".to_string()),
            }
        }
    }
    impl CreateDirectoryRequest {
        pub fn name<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.name = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for name: {e}"));
            self
        }
        pub fn parent_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.parent_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for parent_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<CreateDirectoryRequest> for super::CreateDirectoryRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: CreateDirectoryRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                name: value.name?,
                parent_path: value.parent_path?,
            })
        }
    }
    impl ::std::convert::From<super::CreateDirectoryRequest> for CreateDirectoryRequest {
        fn from(value: super::CreateDirectoryRequest) -> Self {
            Self {
                name: Ok(value.name),
                parent_path: Ok(value.parent_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct CreateDirectoryResponse {
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for CreateDirectoryResponse {
        fn default() -> Self {
            Self {
                path: Err("no value supplied for path".to_string()),
            }
        }
    }
    impl CreateDirectoryResponse {
        pub fn path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<CreateDirectoryResponse> for super::CreateDirectoryResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: CreateDirectoryResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self { path: value.path? })
        }
    }
    impl ::std::convert::From<super::CreateDirectoryResponse> for CreateDirectoryResponse {
        fn from(value: super::CreateDirectoryResponse) -> Self {
            Self {
                path: Ok(value.path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct CropRoiProgress {
        completed_positions: ::std::result::Result<u32, ::std::string::String>,
        completed_rois: ::std::result::Result<u32, ::std::string::String>,
        error: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        message: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        position: ::std::result::Result<::std::option::Option<u32>, ::std::string::String>,
        request_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        skipped_positions: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
        status: ::std::result::Result<super::CropRoiStatus, ::std::string::String>,
        total_positions: ::std::result::Result<u32, ::std::string::String>,
        total_rois: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for CropRoiProgress {
        fn default() -> Self {
            Self {
                completed_positions: Err("no value supplied for completed_positions".to_string()),
                completed_rois: Err("no value supplied for completed_rois".to_string()),
                error: Ok(Default::default()),
                message: Err("no value supplied for message".to_string()),
                position: Err("no value supplied for position".to_string()),
                request_id: Err("no value supplied for request_id".to_string()),
                skipped_positions: Ok(Default::default()),
                status: Err("no value supplied for status".to_string()),
                total_positions: Err("no value supplied for total_positions".to_string()),
                total_rois: Err("no value supplied for total_rois".to_string()),
            }
        }
    }
    impl CropRoiProgress {
        pub fn completed_positions<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.completed_positions = value.try_into().map_err(|e| {
                format!("error converting supplied value for completed_positions: {e}")
            });
            self
        }
        pub fn completed_rois<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.completed_rois = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for completed_rois: {e}"));
            self
        }
        pub fn error<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.error = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for error: {e}"));
            self
        }
        pub fn message<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.message = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for message: {e}"));
            self
        }
        pub fn position<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<u32>>,
            T::Error: ::std::fmt::Display,
        {
            self.position = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for position: {e}"));
            self
        }
        pub fn request_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.request_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for request_id: {e}"));
            self
        }
        pub fn skipped_positions<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<u32>>,
            T::Error: ::std::fmt::Display,
        {
            self.skipped_positions = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for skipped_positions: {e}"));
            self
        }
        pub fn status<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::CropRoiStatus>,
            T::Error: ::std::fmt::Display,
        {
            self.status = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for status: {e}"));
            self
        }
        pub fn total_positions<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.total_positions = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for total_positions: {e}"));
            self
        }
        pub fn total_rois<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.total_rois = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for total_rois: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<CropRoiProgress> for super::CropRoiProgress {
        type Error = super::error::ConversionError;
        fn try_from(
            value: CropRoiProgress,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                completed_positions: value.completed_positions?,
                completed_rois: value.completed_rois?,
                error: value.error?,
                message: value.message?,
                position: value.position?,
                request_id: value.request_id?,
                skipped_positions: value.skipped_positions?,
                status: value.status?,
                total_positions: value.total_positions?,
                total_rois: value.total_rois?,
            })
        }
    }
    impl ::std::convert::From<super::CropRoiProgress> for CropRoiProgress {
        fn from(value: super::CropRoiProgress) -> Self {
            Self {
                completed_positions: Ok(value.completed_positions),
                completed_rois: Ok(value.completed_rois),
                error: Ok(value.error),
                message: Ok(value.message),
                position: Ok(value.position),
                request_id: Ok(value.request_id),
                skipped_positions: Ok(value.skipped_positions),
                status: Ok(value.status),
                total_positions: Ok(value.total_positions),
                total_rois: Ok(value.total_rois),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct CropRoiProgressQuery {
        request_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for CropRoiProgressQuery {
        fn default() -> Self {
            Self {
                request_id: Err("no value supplied for request_id".to_string()),
            }
        }
    }
    impl CropRoiProgressQuery {
        pub fn request_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.request_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for request_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<CropRoiProgressQuery> for super::CropRoiProgressQuery {
        type Error = super::error::ConversionError;
        fn try_from(
            value: CropRoiProgressQuery,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                request_id: value.request_id?,
            })
        }
    }
    impl ::std::convert::From<super::CropRoiProgressQuery> for CropRoiProgressQuery {
        fn from(value: super::CropRoiProgressQuery) -> Self {
            Self {
                request_id: Ok(value.request_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct CropRoiRequest {
        output_format: ::std::result::Result<
            ::std::option::Option<super::CropOutputFormat>,
            ::std::string::String,
        >,
        overwrite: ::std::result::Result<bool, ::std::string::String>,
        positions: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
        request_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        source: ::std::result::Result<super::AlignerSource, ::std::string::String>,
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for CropRoiRequest {
        fn default() -> Self {
            Self {
                output_format: Ok(Default::default()),
                overwrite: Err("no value supplied for overwrite".to_string()),
                positions: Err("no value supplied for positions".to_string()),
                request_id: Err("no value supplied for request_id".to_string()),
                source: Err("no value supplied for source".to_string()),
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl CropRoiRequest {
        pub fn output_format<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::CropOutputFormat>>,
            T::Error: ::std::fmt::Display,
        {
            self.output_format = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for output_format: {e}"));
            self
        }
        pub fn overwrite<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<bool>,
            T::Error: ::std::fmt::Display,
        {
            self.overwrite = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for overwrite: {e}"));
            self
        }
        pub fn positions<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<u32>>,
            T::Error: ::std::fmt::Display,
        {
            self.positions = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for positions: {e}"));
            self
        }
        pub fn request_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.request_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for request_id: {e}"));
            self
        }
        pub fn source<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AlignerSource>,
            T::Error: ::std::fmt::Display,
        {
            self.source = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for source: {e}"));
            self
        }
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<CropRoiRequest> for super::CropRoiRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: CropRoiRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                output_format: value.output_format?,
                overwrite: value.overwrite?,
                positions: value.positions?,
                request_id: value.request_id?,
                source: value.source?,
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::CropRoiRequest> for CropRoiRequest {
        fn from(value: super::CropRoiRequest) -> Self {
            Self {
                output_format: Ok(value.output_format),
                overwrite: Ok(value.overwrite),
                positions: Ok(value.positions),
                request_id: Ok(value.request_id),
                source: Ok(value.source),
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct CropRoiResponse {
        disposition: ::std::result::Result<super::CropRoiDisposition, ::std::string::String>,
        request_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        status: ::std::result::Result<super::CropRoiStatus, ::std::string::String>,
    }
    impl ::std::default::Default for CropRoiResponse {
        fn default() -> Self {
            Self {
                disposition: Err("no value supplied for disposition".to_string()),
                request_id: Err("no value supplied for request_id".to_string()),
                status: Err("no value supplied for status".to_string()),
            }
        }
    }
    impl CropRoiResponse {
        pub fn disposition<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::CropRoiDisposition>,
            T::Error: ::std::fmt::Display,
        {
            self.disposition = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for disposition: {e}"));
            self
        }
        pub fn request_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.request_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for request_id: {e}"));
            self
        }
        pub fn status<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::CropRoiStatus>,
            T::Error: ::std::fmt::Display,
        {
            self.status = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for status: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<CropRoiResponse> for super::CropRoiResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: CropRoiResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                disposition: value.disposition?,
                request_id: value.request_id?,
                status: value.status?,
            })
        }
    }
    impl ::std::convert::From<super::CropRoiResponse> for CropRoiResponse {
        fn from(value: super::CropRoiResponse) -> Self {
            Self {
                disposition: Ok(value.disposition),
                request_id: Ok(value.request_id),
                status: Ok(value.status),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct FolderSource {
        filename_template: ::std::result::Result<::std::string::String, ::std::string::String>,
        kind: ::std::result::Result<super::FolderSourceKind, ::std::string::String>,
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
        subfolder_template: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for FolderSource {
        fn default() -> Self {
            Self {
                filename_template: Err("no value supplied for filename_template".to_string()),
                kind: Err("no value supplied for kind".to_string()),
                path: Err("no value supplied for path".to_string()),
                subfolder_template: Err("no value supplied for subfolder_template".to_string()),
            }
        }
    }
    impl FolderSource {
        pub fn filename_template<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.filename_template = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for filename_template: {e}"));
            self
        }
        pub fn kind<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::FolderSourceKind>,
            T::Error: ::std::fmt::Display,
        {
            self.kind = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for kind: {e}"));
            self
        }
        pub fn path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for path: {e}"));
            self
        }
        pub fn subfolder_template<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.subfolder_template = value.try_into().map_err(|e| {
                format!("error converting supplied value for subfolder_template: {e}")
            });
            self
        }
    }
    impl ::std::convert::TryFrom<FolderSource> for super::FolderSource {
        type Error = super::error::ConversionError;
        fn try_from(
            value: FolderSource,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                filename_template: value.filename_template?,
                kind: value.kind?,
                path: value.path?,
                subfolder_template: value.subfolder_template?,
            })
        }
    }
    impl ::std::convert::From<super::FolderSource> for FolderSource {
        fn from(value: super::FolderSource) -> Self {
            Self {
                filename_template: Ok(value.filename_template),
                kind: Ok(value.kind),
                path: Ok(value.path),
                subfolder_template: Ok(value.subfolder_template),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct FramePayload {
        applied_contrast: ::std::result::Result<super::ContrastWindow, ::std::string::String>,
        contrast_domain: ::std::result::Result<super::ContrastWindow, ::std::string::String>,
        data_base64: ::std::result::Result<::std::string::String, ::std::string::String>,
        height: ::std::result::Result<u32, ::std::string::String>,
        pixel_type: ::std::result::Result<super::PixelType, ::std::string::String>,
        suggested_contrast: ::std::result::Result<super::ContrastWindow, ::std::string::String>,
        width: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for FramePayload {
        fn default() -> Self {
            Self {
                applied_contrast: Err("no value supplied for applied_contrast".to_string()),
                contrast_domain: Err("no value supplied for contrast_domain".to_string()),
                data_base64: Err("no value supplied for data_base64".to_string()),
                height: Err("no value supplied for height".to_string()),
                pixel_type: Err("no value supplied for pixel_type".to_string()),
                suggested_contrast: Err("no value supplied for suggested_contrast".to_string()),
                width: Err("no value supplied for width".to_string()),
            }
        }
    }
    impl FramePayload {
        pub fn applied_contrast<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::ContrastWindow>,
            T::Error: ::std::fmt::Display,
        {
            self.applied_contrast = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for applied_contrast: {e}"));
            self
        }
        pub fn contrast_domain<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::ContrastWindow>,
            T::Error: ::std::fmt::Display,
        {
            self.contrast_domain = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for contrast_domain: {e}"));
            self
        }
        pub fn data_base64<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.data_base64 = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for data_base64: {e}"));
            self
        }
        pub fn height<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.height = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for height: {e}"));
            self
        }
        pub fn pixel_type<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::PixelType>,
            T::Error: ::std::fmt::Display,
        {
            self.pixel_type = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for pixel_type: {e}"));
            self
        }
        pub fn suggested_contrast<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::ContrastWindow>,
            T::Error: ::std::fmt::Display,
        {
            self.suggested_contrast = value.try_into().map_err(|e| {
                format!("error converting supplied value for suggested_contrast: {e}")
            });
            self
        }
        pub fn width<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.width = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for width: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<FramePayload> for super::FramePayload {
        type Error = super::error::ConversionError;
        fn try_from(
            value: FramePayload,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                applied_contrast: value.applied_contrast?,
                contrast_domain: value.contrast_domain?,
                data_base64: value.data_base64?,
                height: value.height?,
                pixel_type: value.pixel_type?,
                suggested_contrast: value.suggested_contrast?,
                width: value.width?,
            })
        }
    }
    impl ::std::convert::From<super::FramePayload> for FramePayload {
        fn from(value: super::FramePayload) -> Self {
            Self {
                applied_contrast: Ok(value.applied_contrast),
                contrast_domain: Ok(value.contrast_domain),
                data_base64: Ok(value.data_base64),
                height: Ok(value.height),
                pixel_type: Ok(value.pixel_type),
                suggested_contrast: Ok(value.suggested_contrast),
                width: Ok(value.width),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct FrameRequest {
        channel: ::std::result::Result<u32, ::std::string::String>,
        pos: ::std::result::Result<u32, ::std::string::String>,
        time: ::std::result::Result<u32, ::std::string::String>,
        z: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for FrameRequest {
        fn default() -> Self {
            Self {
                channel: Err("no value supplied for channel".to_string()),
                pos: Err("no value supplied for pos".to_string()),
                time: Err("no value supplied for time".to_string()),
                z: Err("no value supplied for z".to_string()),
            }
        }
    }
    impl FrameRequest {
        pub fn channel<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.channel = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for channel: {e}"));
            self
        }
        pub fn pos<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.pos = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for pos: {e}"));
            self
        }
        pub fn time<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.time = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for time: {e}"));
            self
        }
        pub fn z<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.z = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for z: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<FrameRequest> for super::FrameRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: FrameRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                channel: value.channel?,
                pos: value.pos?,
                time: value.time?,
                z: value.z?,
            })
        }
    }
    impl ::std::convert::From<super::FrameRequest> for FrameRequest {
        fn from(value: super::FrameRequest) -> Self {
            Self {
                channel: Ok(value.channel),
                pos: Ok(value.pos),
                time: Ok(value.time),
                z: Ok(value.z),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct HomeDirectoryResponse {
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for HomeDirectoryResponse {
        fn default() -> Self {
            Self {
                path: Err("no value supplied for path".to_string()),
            }
        }
    }
    impl HomeDirectoryResponse {
        pub fn path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<HomeDirectoryResponse> for super::HomeDirectoryResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: HomeDirectoryResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self { path: value.path? })
        }
    }
    impl ::std::convert::From<super::HomeDirectoryResponse> for HomeDirectoryResponse {
        fn from(value: super::HomeDirectoryResponse) -> Self {
            Self {
                path: Ok(value.path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct HostFsEntry {
        is_directory: ::std::result::Result<bool, ::std::string::String>,
        name: ::std::result::Result<::std::string::String, ::std::string::String>,
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for HostFsEntry {
        fn default() -> Self {
            Self {
                is_directory: Err("no value supplied for is_directory".to_string()),
                name: Err("no value supplied for name".to_string()),
                path: Err("no value supplied for path".to_string()),
            }
        }
    }
    impl HostFsEntry {
        pub fn is_directory<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<bool>,
            T::Error: ::std::fmt::Display,
        {
            self.is_directory = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for is_directory: {e}"));
            self
        }
        pub fn name<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.name = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for name: {e}"));
            self
        }
        pub fn path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<HostFsEntry> for super::HostFsEntry {
        type Error = super::error::ConversionError;
        fn try_from(
            value: HostFsEntry,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                is_directory: value.is_directory?,
                name: value.name?,
                path: value.path?,
            })
        }
    }
    impl ::std::convert::From<super::HostFsEntry> for HostFsEntry {
        fn from(value: super::HostFsEntry) -> Self {
            Self {
                is_directory: Ok(value.is_directory),
                name: Ok(value.name),
                path: Ok(value.path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct HostListDirectoryQuery {
        path: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
    }
    impl ::std::default::Default for HostListDirectoryQuery {
        fn default() -> Self {
            Self {
                path: Ok(Default::default()),
            }
        }
    }
    impl HostListDirectoryQuery {
        pub fn path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<HostListDirectoryQuery> for super::HostListDirectoryQuery {
        type Error = super::error::ConversionError;
        fn try_from(
            value: HostListDirectoryQuery,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self { path: value.path? })
        }
    }
    impl ::std::convert::From<super::HostListDirectoryQuery> for HostListDirectoryQuery {
        fn from(value: super::HostListDirectoryQuery) -> Self {
            Self {
                path: Ok(value.path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct HostListDirectoryResult {
        entries: ::std::result::Result<::std::vec::Vec<super::HostFsEntry>, ::std::string::String>,
        parent: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        path: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
    }
    impl ::std::default::Default for HostListDirectoryResult {
        fn default() -> Self {
            Self {
                entries: Err("no value supplied for entries".to_string()),
                parent: Err("no value supplied for parent".to_string()),
                path: Err("no value supplied for path".to_string()),
            }
        }
    }
    impl HostListDirectoryResult {
        pub fn entries<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::HostFsEntry>>,
            T::Error: ::std::fmt::Display,
        {
            self.entries = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for entries: {e}"));
            self
        }
        pub fn parent<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.parent = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for parent: {e}"));
            self
        }
        pub fn path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<HostListDirectoryResult> for super::HostListDirectoryResult {
        type Error = super::error::ConversionError;
        fn try_from(
            value: HostListDirectoryResult,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                entries: value.entries?,
                parent: value.parent?,
                path: value.path?,
            })
        }
    }
    impl ::std::convert::From<super::HostListDirectoryResult> for HostListDirectoryResult {
        fn from(value: super::HostListDirectoryResult) -> Self {
            Self {
                entries: Ok(value.entries),
                parent: Ok(value.parent),
                path: Ok(value.path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct LatestAnalysisQuery {
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for LatestAnalysisQuery {
        fn default() -> Self {
            Self {
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl LatestAnalysisQuery {
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<LatestAnalysisQuery> for super::LatestAnalysisQuery {
        type Error = super::error::ConversionError;
        fn try_from(
            value: LatestAnalysisQuery,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::LatestAnalysisQuery> for LatestAnalysisQuery {
        fn from(value: super::LatestAnalysisQuery) -> Self {
            Self {
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct LatestCropQuery {
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for LatestCropQuery {
        fn default() -> Self {
            Self {
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl LatestCropQuery {
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<LatestCropQuery> for super::LatestCropQuery {
        type Error = super::error::ConversionError;
        fn try_from(
            value: LatestCropQuery,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::LatestCropQuery> for LatestCropQuery {
        fn from(value: super::LatestCropQuery) -> Self {
            Self {
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct LoadAlignStateQuery {
        pos: ::std::result::Result<u32, ::std::string::String>,
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for LoadAlignStateQuery {
        fn default() -> Self {
            Self {
                pos: Err("no value supplied for pos".to_string()),
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl LoadAlignStateQuery {
        pub fn pos<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.pos = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for pos: {e}"));
            self
        }
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<LoadAlignStateQuery> for super::LoadAlignStateQuery {
        type Error = super::error::ConversionError;
        fn try_from(
            value: LoadAlignStateQuery,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                pos: value.pos?,
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::LoadAlignStateQuery> for LoadAlignStateQuery {
        fn from(value: super::LoadAlignStateQuery) -> Self {
            Self {
                pos: Ok(value.pos),
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct LoadAnnotationLabelsRequest {
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for LoadAnnotationLabelsRequest {
        fn default() -> Self {
            Self {
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl LoadAnnotationLabelsRequest {
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<LoadAnnotationLabelsRequest> for super::LoadAnnotationLabelsRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: LoadAnnotationLabelsRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::LoadAnnotationLabelsRequest> for LoadAnnotationLabelsRequest {
        fn from(value: super::LoadAnnotationLabelsRequest) -> Self {
            Self {
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct LoadFrameRequest {
        contrast: ::std::result::Result<
            ::std::option::Option<super::ContrastWindow>,
            ::std::string::String,
        >,
        request: ::std::result::Result<super::FrameRequest, ::std::string::String>,
        source: ::std::result::Result<super::AlignerSource, ::std::string::String>,
    }
    impl ::std::default::Default for LoadFrameRequest {
        fn default() -> Self {
            Self {
                contrast: Err("no value supplied for contrast".to_string()),
                request: Err("no value supplied for request".to_string()),
                source: Err("no value supplied for source".to_string()),
            }
        }
    }
    impl LoadFrameRequest {
        pub fn contrast<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::ContrastWindow>>,
            T::Error: ::std::fmt::Display,
        {
            self.contrast = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for contrast: {e}"));
            self
        }
        pub fn request<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::FrameRequest>,
            T::Error: ::std::fmt::Display,
        {
            self.request = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for request: {e}"));
            self
        }
        pub fn source<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AlignerSource>,
            T::Error: ::std::fmt::Display,
        {
            self.source = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for source: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<LoadFrameRequest> for super::LoadFrameRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: LoadFrameRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                contrast: value.contrast?,
                request: value.request?,
                source: value.source?,
            })
        }
    }
    impl ::std::convert::From<super::LoadFrameRequest> for LoadFrameRequest {
        fn from(value: super::LoadFrameRequest) -> Self {
            Self {
                contrast: Ok(value.contrast),
                request: Ok(value.request),
                source: Ok(value.source),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct LoadRoiFrameAnnotationRequest {
        request: ::std::result::Result<super::RoiFrameRequest, ::std::string::String>,
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for LoadRoiFrameAnnotationRequest {
        fn default() -> Self {
            Self {
                request: Err("no value supplied for request".to_string()),
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl LoadRoiFrameAnnotationRequest {
        pub fn request<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::RoiFrameRequest>,
            T::Error: ::std::fmt::Display,
        {
            self.request = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for request: {e}"));
            self
        }
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<LoadRoiFrameAnnotationRequest>
        for super::LoadRoiFrameAnnotationRequest
    {
        type Error = super::error::ConversionError;
        fn try_from(
            value: LoadRoiFrameAnnotationRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                request: value.request?,
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::LoadRoiFrameAnnotationRequest> for LoadRoiFrameAnnotationRequest {
        fn from(value: super::LoadRoiFrameAnnotationRequest) -> Self {
            Self {
                request: Ok(value.request),
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct LoadRoiFrameRequest {
        contrast: ::std::result::Result<
            ::std::option::Option<super::ContrastWindow>,
            ::std::string::String,
        >,
        request: ::std::result::Result<super::RoiFrameRequest, ::std::string::String>,
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for LoadRoiFrameRequest {
        fn default() -> Self {
            Self {
                contrast: Err("no value supplied for contrast".to_string()),
                request: Err("no value supplied for request".to_string()),
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl LoadRoiFrameRequest {
        pub fn contrast<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::ContrastWindow>>,
            T::Error: ::std::fmt::Display,
        {
            self.contrast = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for contrast: {e}"));
            self
        }
        pub fn request<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::RoiFrameRequest>,
            T::Error: ::std::fmt::Display,
        {
            self.request = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for request: {e}"));
            self
        }
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<LoadRoiFrameRequest> for super::LoadRoiFrameRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: LoadRoiFrameRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                contrast: value.contrast?,
                request: value.request?,
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::LoadRoiFrameRequest> for LoadRoiFrameRequest {
        fn from(value: super::LoadRoiFrameRequest) -> Self {
            Self {
                contrast: Ok(value.contrast),
                request: Ok(value.request),
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct LoadedRoiFrameAnnotation {
        annotation: ::std::result::Result<super::RoiFrameAnnotation, ::std::string::String>,
        mask_base64_png: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
    }
    impl ::std::default::Default for LoadedRoiFrameAnnotation {
        fn default() -> Self {
            Self {
                annotation: Err("no value supplied for annotation".to_string()),
                mask_base64_png: Err("no value supplied for mask_base64_png".to_string()),
            }
        }
    }
    impl LoadedRoiFrameAnnotation {
        pub fn annotation<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::RoiFrameAnnotation>,
            T::Error: ::std::fmt::Display,
        {
            self.annotation = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for annotation: {e}"));
            self
        }
        pub fn mask_base64_png<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.mask_base64_png = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for mask_base64_png: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<LoadedRoiFrameAnnotation> for super::LoadedRoiFrameAnnotation {
        type Error = super::error::ConversionError;
        fn try_from(
            value: LoadedRoiFrameAnnotation,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                annotation: value.annotation?,
                mask_base64_png: value.mask_base64_png?,
            })
        }
    }
    impl ::std::convert::From<super::LoadedRoiFrameAnnotation> for LoadedRoiFrameAnnotation {
        fn from(value: super::LoadedRoiFrameAnnotation) -> Self {
            Self {
                annotation: Ok(value.annotation),
                mask_base64_png: Ok(value.mask_base64_png),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct MemoryAssayEntry {
        assay_label: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        last_used_at: ::std::result::Result<::std::string::String, ::std::string::String>,
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
        workspace_path: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
    }
    impl ::std::default::Default for MemoryAssayEntry {
        fn default() -> Self {
            Self {
                assay_label: Ok(Default::default()),
                last_used_at: Err("no value supplied for last_used_at".to_string()),
                path: Err("no value supplied for path".to_string()),
                workspace_path: Ok(Default::default()),
            }
        }
    }
    impl MemoryAssayEntry {
        pub fn assay_label<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.assay_label = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for assay_label: {e}"));
            self
        }
        pub fn last_used_at<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.last_used_at = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for last_used_at: {e}"));
            self
        }
        pub fn path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for path: {e}"));
            self
        }
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<MemoryAssayEntry> for super::MemoryAssayEntry {
        type Error = super::error::ConversionError;
        fn try_from(
            value: MemoryAssayEntry,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                assay_label: value.assay_label?,
                last_used_at: value.last_used_at?,
                path: value.path?,
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::MemoryAssayEntry> for MemoryAssayEntry {
        fn from(value: super::MemoryAssayEntry) -> Self {
            Self {
                assay_label: Ok(value.assay_label),
                last_used_at: Ok(value.last_used_at),
                path: Ok(value.path),
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct MemoryRecentQuery {
        type_: ::std::result::Result<super::MemoryKind, ::std::string::String>,
    }
    impl ::std::default::Default for MemoryRecentQuery {
        fn default() -> Self {
            Self {
                type_: Err("no value supplied for type_".to_string()),
            }
        }
    }
    impl MemoryRecentQuery {
        pub fn type_<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::MemoryKind>,
            T::Error: ::std::fmt::Display,
        {
            self.type_ = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for type_: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<MemoryRecentQuery> for super::MemoryRecentQuery {
        type Error = super::error::ConversionError;
        fn try_from(
            value: MemoryRecentQuery,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                type_: value.type_?,
            })
        }
    }
    impl ::std::convert::From<super::MemoryRecentQuery> for MemoryRecentQuery {
        fn from(value: super::MemoryRecentQuery) -> Self {
            Self {
                type_: Ok(value.type_),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct MemoryRecentResponse {
        assays:
            ::std::result::Result<::std::vec::Vec<super::MemoryAssayEntry>, ::std::string::String>,
        sources:
            ::std::result::Result<::std::vec::Vec<super::MemorySourceEntry>, ::std::string::String>,
        workspaces: ::std::result::Result<
            ::std::vec::Vec<super::MemoryWorkspaceEntry>,
            ::std::string::String,
        >,
    }
    impl ::std::default::Default for MemoryRecentResponse {
        fn default() -> Self {
            Self {
                assays: Ok(Default::default()),
                sources: Ok(Default::default()),
                workspaces: Ok(Default::default()),
            }
        }
    }
    impl MemoryRecentResponse {
        pub fn assays<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::MemoryAssayEntry>>,
            T::Error: ::std::fmt::Display,
        {
            self.assays = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for assays: {e}"));
            self
        }
        pub fn sources<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::MemorySourceEntry>>,
            T::Error: ::std::fmt::Display,
        {
            self.sources = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for sources: {e}"));
            self
        }
        pub fn workspaces<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::MemoryWorkspaceEntry>>,
            T::Error: ::std::fmt::Display,
        {
            self.workspaces = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspaces: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<MemoryRecentResponse> for super::MemoryRecentResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: MemoryRecentResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                assays: value.assays?,
                sources: value.sources?,
                workspaces: value.workspaces?,
            })
        }
    }
    impl ::std::convert::From<super::MemoryRecentResponse> for MemoryRecentResponse {
        fn from(value: super::MemoryRecentResponse) -> Self {
            Self {
                assays: Ok(value.assays),
                sources: Ok(value.sources),
                workspaces: Ok(value.workspaces),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct MemorySourceEntry {
        label: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        last_used_at: ::std::result::Result<::std::string::String, ::std::string::String>,
        source: ::std::result::Result<super::AlignerSource, ::std::string::String>,
    }
    impl ::std::default::Default for MemorySourceEntry {
        fn default() -> Self {
            Self {
                label: Ok(Default::default()),
                last_used_at: Err("no value supplied for last_used_at".to_string()),
                source: Err("no value supplied for source".to_string()),
            }
        }
    }
    impl MemorySourceEntry {
        pub fn label<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.label = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for label: {e}"));
            self
        }
        pub fn last_used_at<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.last_used_at = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for last_used_at: {e}"));
            self
        }
        pub fn source<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AlignerSource>,
            T::Error: ::std::fmt::Display,
        {
            self.source = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for source: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<MemorySourceEntry> for super::MemorySourceEntry {
        type Error = super::error::ConversionError;
        fn try_from(
            value: MemorySourceEntry,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                label: value.label?,
                last_used_at: value.last_used_at?,
                source: value.source?,
            })
        }
    }
    impl ::std::convert::From<super::MemorySourceEntry> for MemorySourceEntry {
        fn from(value: super::MemorySourceEntry) -> Self {
            Self {
                label: Ok(value.label),
                last_used_at: Ok(value.last_used_at),
                source: Ok(value.source),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct MemoryTouchResponse {
        ok: ::std::result::Result<bool, ::std::string::String>,
    }
    impl ::std::default::Default for MemoryTouchResponse {
        fn default() -> Self {
            Self {
                ok: Err("no value supplied for ok".to_string()),
            }
        }
    }
    impl MemoryTouchResponse {
        pub fn ok<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<bool>,
            T::Error: ::std::fmt::Display,
        {
            self.ok = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for ok: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<MemoryTouchResponse> for super::MemoryTouchResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: MemoryTouchResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self { ok: value.ok? })
        }
    }
    impl ::std::convert::From<super::MemoryTouchResponse> for MemoryTouchResponse {
        fn from(value: super::MemoryTouchResponse) -> Self {
            Self { ok: Ok(value.ok) }
        }
    }
    #[derive(Clone, Debug)]
    pub struct MemoryWorkspaceEntry {
        label: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        last_used_at: ::std::result::Result<::std::string::String, ::std::string::String>,
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for MemoryWorkspaceEntry {
        fn default() -> Self {
            Self {
                label: Ok(Default::default()),
                last_used_at: Err("no value supplied for last_used_at".to_string()),
                path: Err("no value supplied for path".to_string()),
            }
        }
    }
    impl MemoryWorkspaceEntry {
        pub fn label<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.label = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for label: {e}"));
            self
        }
        pub fn last_used_at<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.last_used_at = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for last_used_at: {e}"));
            self
        }
        pub fn path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<MemoryWorkspaceEntry> for super::MemoryWorkspaceEntry {
        type Error = super::error::ConversionError;
        fn try_from(
            value: MemoryWorkspaceEntry,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                label: value.label?,
                last_used_at: value.last_used_at?,
                path: value.path?,
            })
        }
    }
    impl ::std::convert::From<super::MemoryWorkspaceEntry> for MemoryWorkspaceEntry {
        fn from(value: super::MemoryWorkspaceEntry) -> Self {
            Self {
                label: Ok(value.label),
                last_used_at: Ok(value.last_used_at),
                path: Ok(value.path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct OperationCancelRequest {
        operation_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for OperationCancelRequest {
        fn default() -> Self {
            Self {
                operation_id: Err("no value supplied for operation_id".to_string()),
            }
        }
    }
    impl OperationCancelRequest {
        pub fn operation_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.operation_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for operation_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<OperationCancelRequest> for super::OperationCancelRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: OperationCancelRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                operation_id: value.operation_id?,
            })
        }
    }
    impl ::std::convert::From<super::OperationCancelRequest> for OperationCancelRequest {
        fn from(value: super::OperationCancelRequest) -> Self {
            Self {
                operation_id: Ok(value.operation_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct OperationDetail {
        operation: ::std::result::Result<super::OperationSummary, ::std::string::String>,
        tasks: ::std::result::Result<::std::vec::Vec<super::TaskDetail>, ::std::string::String>,
    }
    impl ::std::default::Default for OperationDetail {
        fn default() -> Self {
            Self {
                operation: Err("no value supplied for operation".to_string()),
                tasks: Err("no value supplied for tasks".to_string()),
            }
        }
    }
    impl OperationDetail {
        pub fn operation<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::OperationSummary>,
            T::Error: ::std::fmt::Display,
        {
            self.operation = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for operation: {e}"));
            self
        }
        pub fn tasks<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::TaskDetail>>,
            T::Error: ::std::fmt::Display,
        {
            self.tasks = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for tasks: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<OperationDetail> for super::OperationDetail {
        type Error = super::error::ConversionError;
        fn try_from(
            value: OperationDetail,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                operation: value.operation?,
                tasks: value.tasks?,
            })
        }
    }
    impl ::std::convert::From<super::OperationDetail> for OperationDetail {
        fn from(value: super::OperationDetail) -> Self {
            Self {
                operation: Ok(value.operation),
                tasks: Ok(value.tasks),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct OperationDetailQuery {
        operation_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for OperationDetailQuery {
        fn default() -> Self {
            Self {
                operation_id: Err("no value supplied for operation_id".to_string()),
            }
        }
    }
    impl OperationDetailQuery {
        pub fn operation_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.operation_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for operation_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<OperationDetailQuery> for super::OperationDetailQuery {
        type Error = super::error::ConversionError;
        fn try_from(
            value: OperationDetailQuery,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                operation_id: value.operation_id?,
            })
        }
    }
    impl ::std::convert::From<super::OperationDetailQuery> for OperationDetailQuery {
        fn from(value: super::OperationDetailQuery) -> Self {
            Self {
                operation_id: Ok(value.operation_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct OperationProgress {
        blocked: ::std::result::Result<u32, ::std::string::String>,
        cancellation_requested: ::std::result::Result<u32, ::std::string::String>,
        cancelled: ::std::result::Result<u32, ::std::string::String>,
        completed: ::std::result::Result<u32, ::std::string::String>,
        failed: ::std::result::Result<u32, ::std::string::String>,
        queued: ::std::result::Result<u32, ::std::string::String>,
        running: ::std::result::Result<u32, ::std::string::String>,
        total: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for OperationProgress {
        fn default() -> Self {
            Self {
                blocked: Err("no value supplied for blocked".to_string()),
                cancellation_requested: Err(
                    "no value supplied for cancellation_requested".to_string()
                ),
                cancelled: Err("no value supplied for cancelled".to_string()),
                completed: Err("no value supplied for completed".to_string()),
                failed: Err("no value supplied for failed".to_string()),
                queued: Err("no value supplied for queued".to_string()),
                running: Err("no value supplied for running".to_string()),
                total: Err("no value supplied for total".to_string()),
            }
        }
    }
    impl OperationProgress {
        pub fn blocked<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.blocked = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for blocked: {e}"));
            self
        }
        pub fn cancellation_requested<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.cancellation_requested = value.try_into().map_err(|e| {
                format!("error converting supplied value for cancellation_requested: {e}")
            });
            self
        }
        pub fn cancelled<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.cancelled = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for cancelled: {e}"));
            self
        }
        pub fn completed<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.completed = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for completed: {e}"));
            self
        }
        pub fn failed<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.failed = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for failed: {e}"));
            self
        }
        pub fn queued<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.queued = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for queued: {e}"));
            self
        }
        pub fn running<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.running = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for running: {e}"));
            self
        }
        pub fn total<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.total = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for total: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<OperationProgress> for super::OperationProgress {
        type Error = super::error::ConversionError;
        fn try_from(
            value: OperationProgress,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                blocked: value.blocked?,
                cancellation_requested: value.cancellation_requested?,
                cancelled: value.cancelled?,
                completed: value.completed?,
                failed: value.failed?,
                queued: value.queued?,
                running: value.running?,
                total: value.total?,
            })
        }
    }
    impl ::std::convert::From<super::OperationProgress> for OperationProgress {
        fn from(value: super::OperationProgress) -> Self {
            Self {
                blocked: Ok(value.blocked),
                cancellation_requested: Ok(value.cancellation_requested),
                cancelled: Ok(value.cancelled),
                completed: Ok(value.completed),
                failed: Ok(value.failed),
                queued: Ok(value.queued),
                running: Ok(value.running),
                total: Ok(value.total),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct OperationSummary {
        attention: ::std::result::Result<super::OperationAttention, ::std::string::String>,
        created_at_ms: ::std::result::Result<u64, ::std::string::String>,
        kind: ::std::result::Result<::std::string::String, ::std::string::String>,
        mutating: ::std::result::Result<bool, ::std::string::String>,
        operation_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        progress: ::std::result::Result<super::OperationProgress, ::std::string::String>,
        status: ::std::result::Result<super::OperationStatus, ::std::string::String>,
        updated_at_ms: ::std::result::Result<u64, ::std::string::String>,
        workspace_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for OperationSummary {
        fn default() -> Self {
            Self {
                attention: Err("no value supplied for attention".to_string()),
                created_at_ms: Err("no value supplied for created_at_ms".to_string()),
                kind: Err("no value supplied for kind".to_string()),
                mutating: Err("no value supplied for mutating".to_string()),
                operation_id: Err("no value supplied for operation_id".to_string()),
                progress: Err("no value supplied for progress".to_string()),
                status: Err("no value supplied for status".to_string()),
                updated_at_ms: Err("no value supplied for updated_at_ms".to_string()),
                workspace_id: Err("no value supplied for workspace_id".to_string()),
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl OperationSummary {
        pub fn attention<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::OperationAttention>,
            T::Error: ::std::fmt::Display,
        {
            self.attention = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for attention: {e}"));
            self
        }
        pub fn created_at_ms<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u64>,
            T::Error: ::std::fmt::Display,
        {
            self.created_at_ms = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for created_at_ms: {e}"));
            self
        }
        pub fn kind<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.kind = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for kind: {e}"));
            self
        }
        pub fn mutating<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<bool>,
            T::Error: ::std::fmt::Display,
        {
            self.mutating = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for mutating: {e}"));
            self
        }
        pub fn operation_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.operation_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for operation_id: {e}"));
            self
        }
        pub fn progress<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::OperationProgress>,
            T::Error: ::std::fmt::Display,
        {
            self.progress = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for progress: {e}"));
            self
        }
        pub fn status<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::OperationStatus>,
            T::Error: ::std::fmt::Display,
        {
            self.status = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for status: {e}"));
            self
        }
        pub fn updated_at_ms<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u64>,
            T::Error: ::std::fmt::Display,
        {
            self.updated_at_ms = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for updated_at_ms: {e}"));
            self
        }
        pub fn workspace_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_id: {e}"));
            self
        }
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<OperationSummary> for super::OperationSummary {
        type Error = super::error::ConversionError;
        fn try_from(
            value: OperationSummary,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                attention: value.attention?,
                created_at_ms: value.created_at_ms?,
                kind: value.kind?,
                mutating: value.mutating?,
                operation_id: value.operation_id?,
                progress: value.progress?,
                status: value.status?,
                updated_at_ms: value.updated_at_ms?,
                workspace_id: value.workspace_id?,
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::OperationSummary> for OperationSummary {
        fn from(value: super::OperationSummary) -> Self {
            Self {
                attention: Ok(value.attention),
                created_at_ms: Ok(value.created_at_ms),
                kind: Ok(value.kind),
                mutating: Ok(value.mutating),
                operation_id: Ok(value.operation_id),
                progress: Ok(value.progress),
                status: Ok(value.status),
                updated_at_ms: Ok(value.updated_at_ms),
                workspace_id: Ok(value.workspace_id),
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct OutputPathsQuery {
        pos: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for OutputPathsQuery {
        fn default() -> Self {
            Self {
                pos: Err("no value supplied for pos".to_string()),
            }
        }
    }
    impl OutputPathsQuery {
        pub fn pos<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.pos = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for pos: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<OutputPathsQuery> for super::OutputPathsQuery {
        type Error = super::error::ConversionError;
        fn try_from(
            value: OutputPathsQuery,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self { pos: value.pos? })
        }
    }
    impl ::std::convert::From<super::OutputPathsQuery> for OutputPathsQuery {
        fn from(value: super::OutputPathsQuery) -> Self {
            Self { pos: Ok(value.pos) }
        }
    }
    #[derive(Clone, Debug)]
    pub struct ProfileCreateRequest {
        display_name: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for ProfileCreateRequest {
        fn default() -> Self {
            Self {
                display_name: Err("no value supplied for display_name".to_string()),
            }
        }
    }
    impl ProfileCreateRequest {
        pub fn display_name<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.display_name = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for display_name: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<ProfileCreateRequest> for super::ProfileCreateRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: ProfileCreateRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                display_name: value.display_name?,
            })
        }
    }
    impl ::std::convert::From<super::ProfileCreateRequest> for ProfileCreateRequest {
        fn from(value: super::ProfileCreateRequest) -> Self {
            Self {
                display_name: Ok(value.display_name),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct ProfileListResponse {
        profiles:
            ::std::result::Result<::std::vec::Vec<super::ProfileSummary>, ::std::string::String>,
    }
    impl ::std::default::Default for ProfileListResponse {
        fn default() -> Self {
            Self {
                profiles: Err("no value supplied for profiles".to_string()),
            }
        }
    }
    impl ProfileListResponse {
        pub fn profiles<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::ProfileSummary>>,
            T::Error: ::std::fmt::Display,
        {
            self.profiles = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for profiles: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<ProfileListResponse> for super::ProfileListResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: ProfileListResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                profiles: value.profiles?,
            })
        }
    }
    impl ::std::convert::From<super::ProfileListResponse> for ProfileListResponse {
        fn from(value: super::ProfileListResponse) -> Self {
            Self {
                profiles: Ok(value.profiles),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct ProfileSessionResponse {
        access_token: ::std::result::Result<::std::string::String, ::std::string::String>,
        display_name: ::std::result::Result<::std::string::String, ::std::string::String>,
        profile_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for ProfileSessionResponse {
        fn default() -> Self {
            Self {
                access_token: Err("no value supplied for access_token".to_string()),
                display_name: Err("no value supplied for display_name".to_string()),
                profile_id: Err("no value supplied for profile_id".to_string()),
            }
        }
    }
    impl ProfileSessionResponse {
        pub fn access_token<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.access_token = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for access_token: {e}"));
            self
        }
        pub fn display_name<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.display_name = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for display_name: {e}"));
            self
        }
        pub fn profile_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.profile_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for profile_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<ProfileSessionResponse> for super::ProfileSessionResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: ProfileSessionResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                access_token: value.access_token?,
                display_name: value.display_name?,
                profile_id: value.profile_id?,
            })
        }
    }
    impl ::std::convert::From<super::ProfileSessionResponse> for ProfileSessionResponse {
        fn from(value: super::ProfileSessionResponse) -> Self {
            Self {
                access_token: Ok(value.access_token),
                display_name: Ok(value.display_name),
                profile_id: Ok(value.profile_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct ProfileSignInRequest {
        display_name: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for ProfileSignInRequest {
        fn default() -> Self {
            Self {
                display_name: Err("no value supplied for display_name".to_string()),
            }
        }
    }
    impl ProfileSignInRequest {
        pub fn display_name<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.display_name = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for display_name: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<ProfileSignInRequest> for super::ProfileSignInRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: ProfileSignInRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                display_name: value.display_name?,
            })
        }
    }
    impl ::std::convert::From<super::ProfileSignInRequest> for ProfileSignInRequest {
        fn from(value: super::ProfileSignInRequest) -> Self {
            Self {
                display_name: Ok(value.display_name),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct ProfileSignOutResponse {
        ok: ::std::result::Result<bool, ::std::string::String>,
    }
    impl ::std::default::Default for ProfileSignOutResponse {
        fn default() -> Self {
            Self {
                ok: Err("no value supplied for ok".to_string()),
            }
        }
    }
    impl ProfileSignOutResponse {
        pub fn ok<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<bool>,
            T::Error: ::std::fmt::Display,
        {
            self.ok = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for ok: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<ProfileSignOutResponse> for super::ProfileSignOutResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: ProfileSignOutResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self { ok: value.ok? })
        }
    }
    impl ::std::convert::From<super::ProfileSignOutResponse> for ProfileSignOutResponse {
        fn from(value: super::ProfileSignOutResponse) -> Self {
            Self { ok: Ok(value.ok) }
        }
    }
    #[derive(Clone, Debug)]
    pub struct ProfileSummary {
        created_at: ::std::result::Result<::std::string::String, ::std::string::String>,
        display_name: ::std::result::Result<::std::string::String, ::std::string::String>,
        id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for ProfileSummary {
        fn default() -> Self {
            Self {
                created_at: Err("no value supplied for created_at".to_string()),
                display_name: Err("no value supplied for display_name".to_string()),
                id: Err("no value supplied for id".to_string()),
            }
        }
    }
    impl ProfileSummary {
        pub fn created_at<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.created_at = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for created_at: {e}"));
            self
        }
        pub fn display_name<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.display_name = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for display_name: {e}"));
            self
        }
        pub fn id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<ProfileSummary> for super::ProfileSummary {
        type Error = super::error::ConversionError;
        fn try_from(
            value: ProfileSummary,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                created_at: value.created_at?,
                display_name: value.display_name?,
                id: value.id?,
            })
        }
    }
    impl ::std::convert::From<super::ProfileSummary> for ProfileSummary {
        fn from(value: super::ProfileSummary) -> Self {
            Self {
                created_at: Ok(value.created_at),
                display_name: Ok(value.display_name),
                id: Ok(value.id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct ReadTextFileQuery {
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for ReadTextFileQuery {
        fn default() -> Self {
            Self {
                path: Err("no value supplied for path".to_string()),
            }
        }
    }
    impl ReadTextFileQuery {
        pub fn path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<ReadTextFileQuery> for super::ReadTextFileQuery {
        type Error = super::error::ConversionError;
        fn try_from(
            value: ReadTextFileQuery,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self { path: value.path? })
        }
    }
    impl ::std::convert::From<super::ReadTextFileQuery> for ReadTextFileQuery {
        fn from(value: super::ReadTextFileQuery) -> Self {
            Self {
                path: Ok(value.path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct ReadTextFileResponse {
        contents: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for ReadTextFileResponse {
        fn default() -> Self {
            Self {
                contents: Err("no value supplied for contents".to_string()),
            }
        }
    }
    impl ReadTextFileResponse {
        pub fn contents<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.contents = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for contents: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<ReadTextFileResponse> for super::ReadTextFileResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: ReadTextFileResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                contents: value.contents?,
            })
        }
    }
    impl ::std::convert::From<super::ReadTextFileResponse> for ReadTextFileResponse {
        fn from(value: super::ReadTextFileResponse) -> Self {
            Self {
                contents: Ok(value.contents),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct RoiBbox {
        h: ::std::result::Result<u32, ::std::string::String>,
        roi: ::std::result::Result<u32, ::std::string::String>,
        w: ::std::result::Result<u32, ::std::string::String>,
        x: ::std::result::Result<u32, ::std::string::String>,
        y: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for RoiBbox {
        fn default() -> Self {
            Self {
                h: Err("no value supplied for h".to_string()),
                roi: Err("no value supplied for roi".to_string()),
                w: Err("no value supplied for w".to_string()),
                x: Err("no value supplied for x".to_string()),
                y: Err("no value supplied for y".to_string()),
            }
        }
    }
    impl RoiBbox {
        pub fn h<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.h = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for h: {e}"));
            self
        }
        pub fn roi<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.roi = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for roi: {e}"));
            self
        }
        pub fn w<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.w = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for w: {e}"));
            self
        }
        pub fn x<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.x = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for x: {e}"));
            self
        }
        pub fn y<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.y = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for y: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<RoiBbox> for super::RoiBbox {
        type Error = super::error::ConversionError;
        fn try_from(value: RoiBbox) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                h: value.h?,
                roi: value.roi?,
                w: value.w?,
                x: value.x?,
                y: value.y?,
            })
        }
    }
    impl ::std::convert::From<super::RoiBbox> for RoiBbox {
        fn from(value: super::RoiBbox) -> Self {
            Self {
                h: Ok(value.h),
                roi: Ok(value.roi),
                w: Ok(value.w),
                x: Ok(value.x),
                y: Ok(value.y),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct RoiFrameAnnotation {
        classification_label_id: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        mask_path: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        updated_at: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
    }
    impl ::std::default::Default for RoiFrameAnnotation {
        fn default() -> Self {
            Self {
                classification_label_id: Err(
                    "no value supplied for classification_label_id".to_string()
                ),
                mask_path: Err("no value supplied for mask_path".to_string()),
                updated_at: Err("no value supplied for updated_at".to_string()),
            }
        }
    }
    impl RoiFrameAnnotation {
        pub fn classification_label_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.classification_label_id = value.try_into().map_err(|e| {
                format!("error converting supplied value for classification_label_id: {e}")
            });
            self
        }
        pub fn mask_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.mask_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for mask_path: {e}"));
            self
        }
        pub fn updated_at<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.updated_at = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for updated_at: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<RoiFrameAnnotation> for super::RoiFrameAnnotation {
        type Error = super::error::ConversionError;
        fn try_from(
            value: RoiFrameAnnotation,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                classification_label_id: value.classification_label_id?,
                mask_path: value.mask_path?,
                updated_at: value.updated_at?,
            })
        }
    }
    impl ::std::convert::From<super::RoiFrameAnnotation> for RoiFrameAnnotation {
        fn from(value: super::RoiFrameAnnotation) -> Self {
            Self {
                classification_label_id: Ok(value.classification_label_id),
                mask_path: Ok(value.mask_path),
                updated_at: Ok(value.updated_at),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct RoiFrameAnnotationPayload {
        classification_label_id: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        mask_base64_png: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
    }
    impl ::std::default::Default for RoiFrameAnnotationPayload {
        fn default() -> Self {
            Self {
                classification_label_id: Err(
                    "no value supplied for classification_label_id".to_string()
                ),
                mask_base64_png: Err("no value supplied for mask_base64_png".to_string()),
            }
        }
    }
    impl RoiFrameAnnotationPayload {
        pub fn classification_label_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.classification_label_id = value.try_into().map_err(|e| {
                format!("error converting supplied value for classification_label_id: {e}")
            });
            self
        }
        pub fn mask_base64_png<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.mask_base64_png = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for mask_base64_png: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<RoiFrameAnnotationPayload> for super::RoiFrameAnnotationPayload {
        type Error = super::error::ConversionError;
        fn try_from(
            value: RoiFrameAnnotationPayload,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                classification_label_id: value.classification_label_id?,
                mask_base64_png: value.mask_base64_png?,
            })
        }
    }
    impl ::std::convert::From<super::RoiFrameAnnotationPayload> for RoiFrameAnnotationPayload {
        fn from(value: super::RoiFrameAnnotationPayload) -> Self {
            Self {
                classification_label_id: Ok(value.classification_label_id),
                mask_base64_png: Ok(value.mask_base64_png),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct RoiFrameRequest {
        channel: ::std::result::Result<u32, ::std::string::String>,
        pos: ::std::result::Result<u32, ::std::string::String>,
        roi: ::std::result::Result<u32, ::std::string::String>,
        time: ::std::result::Result<u32, ::std::string::String>,
        z: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for RoiFrameRequest {
        fn default() -> Self {
            Self {
                channel: Err("no value supplied for channel".to_string()),
                pos: Err("no value supplied for pos".to_string()),
                roi: Err("no value supplied for roi".to_string()),
                time: Err("no value supplied for time".to_string()),
                z: Err("no value supplied for z".to_string()),
            }
        }
    }
    impl RoiFrameRequest {
        pub fn channel<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.channel = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for channel: {e}"));
            self
        }
        pub fn pos<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.pos = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for pos: {e}"));
            self
        }
        pub fn roi<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.roi = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for roi: {e}"));
            self
        }
        pub fn time<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.time = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for time: {e}"));
            self
        }
        pub fn z<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.z = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for z: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<RoiFrameRequest> for super::RoiFrameRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: RoiFrameRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                channel: value.channel?,
                pos: value.pos?,
                roi: value.roi?,
                time: value.time?,
                z: value.z?,
            })
        }
    }
    impl ::std::convert::From<super::RoiFrameRequest> for RoiFrameRequest {
        fn from(value: super::RoiFrameRequest) -> Self {
            Self {
                channel: Ok(value.channel),
                pos: Ok(value.pos),
                roi: Ok(value.roi),
                time: Ok(value.time),
                z: Ok(value.z),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct RoiIndexEntry {
        bbox: ::std::result::Result<super::RoiBbox, ::std::string::String>,
        file_name: ::std::result::Result<::std::string::String, ::std::string::String>,
        roi: ::std::result::Result<u32, ::std::string::String>,
        shape: ::std::result::Result<[u32; 5usize], ::std::string::String>,
    }
    impl ::std::default::Default for RoiIndexEntry {
        fn default() -> Self {
            Self {
                bbox: Err("no value supplied for bbox".to_string()),
                file_name: Err("no value supplied for file_name".to_string()),
                roi: Err("no value supplied for roi".to_string()),
                shape: Err("no value supplied for shape".to_string()),
            }
        }
    }
    impl RoiIndexEntry {
        pub fn bbox<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::RoiBbox>,
            T::Error: ::std::fmt::Display,
        {
            self.bbox = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for bbox: {e}"));
            self
        }
        pub fn file_name<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.file_name = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for file_name: {e}"));
            self
        }
        pub fn roi<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.roi = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for roi: {e}"));
            self
        }
        pub fn shape<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<[u32; 5usize]>,
            T::Error: ::std::fmt::Display,
        {
            self.shape = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for shape: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<RoiIndexEntry> for super::RoiIndexEntry {
        type Error = super::error::ConversionError;
        fn try_from(
            value: RoiIndexEntry,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                bbox: value.bbox?,
                file_name: value.file_name?,
                roi: value.roi?,
                shape: value.shape?,
            })
        }
    }
    impl ::std::convert::From<super::RoiIndexEntry> for RoiIndexEntry {
        fn from(value: super::RoiIndexEntry) -> Self {
            Self {
                bbox: Ok(value.bbox),
                file_name: Ok(value.file_name),
                roi: Ok(value.roi),
                shape: Ok(value.shape),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct RoiIndexFile {
        axis_order: ::std::result::Result<::std::string::String, ::std::string::String>,
        channel_count: ::std::result::Result<u32, ::std::string::String>,
        page_order:
            ::std::result::Result<::std::vec::Vec<::std::string::String>, ::std::string::String>,
        position: ::std::result::Result<u32, ::std::string::String>,
        rois: ::std::result::Result<::std::vec::Vec<super::RoiIndexEntry>, ::std::string::String>,
        source: ::std::result::Result<super::AlignerSource, ::std::string::String>,
        time_count: ::std::result::Result<u32, ::std::string::String>,
        z_count: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for RoiIndexFile {
        fn default() -> Self {
            Self {
                axis_order: Err("no value supplied for axis_order".to_string()),
                channel_count: Err("no value supplied for channel_count".to_string()),
                page_order: Err("no value supplied for page_order".to_string()),
                position: Err("no value supplied for position".to_string()),
                rois: Err("no value supplied for rois".to_string()),
                source: Err("no value supplied for source".to_string()),
                time_count: Err("no value supplied for time_count".to_string()),
                z_count: Err("no value supplied for z_count".to_string()),
            }
        }
    }
    impl RoiIndexFile {
        pub fn axis_order<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.axis_order = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for axis_order: {e}"));
            self
        }
        pub fn channel_count<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.channel_count = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for channel_count: {e}"));
            self
        }
        pub fn page_order<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.page_order = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for page_order: {e}"));
            self
        }
        pub fn position<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.position = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for position: {e}"));
            self
        }
        pub fn rois<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::RoiIndexEntry>>,
            T::Error: ::std::fmt::Display,
        {
            self.rois = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for rois: {e}"));
            self
        }
        pub fn source<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AlignerSource>,
            T::Error: ::std::fmt::Display,
        {
            self.source = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for source: {e}"));
            self
        }
        pub fn time_count<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.time_count = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for time_count: {e}"));
            self
        }
        pub fn z_count<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.z_count = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for z_count: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<RoiIndexFile> for super::RoiIndexFile {
        type Error = super::error::ConversionError;
        fn try_from(
            value: RoiIndexFile,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                axis_order: value.axis_order?,
                channel_count: value.channel_count?,
                page_order: value.page_order?,
                position: value.position?,
                rois: value.rois?,
                source: value.source?,
                time_count: value.time_count?,
                z_count: value.z_count?,
            })
        }
    }
    impl ::std::convert::From<super::RoiIndexFile> for RoiIndexFile {
        fn from(value: super::RoiIndexFile) -> Self {
            Self {
                axis_order: Ok(value.axis_order),
                channel_count: Ok(value.channel_count),
                page_order: Ok(value.page_order),
                position: Ok(value.position),
                rois: Ok(value.rois),
                source: Ok(value.source),
                time_count: Ok(value.time_count),
                z_count: Ok(value.z_count),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct RoiPosExistsQuery {
        pos: ::std::result::Result<u32, ::std::string::String>,
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for RoiPosExistsQuery {
        fn default() -> Self {
            Self {
                pos: Err("no value supplied for pos".to_string()),
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl RoiPosExistsQuery {
        pub fn pos<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.pos = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for pos: {e}"));
            self
        }
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<RoiPosExistsQuery> for super::RoiPosExistsQuery {
        type Error = super::error::ConversionError;
        fn try_from(
            value: RoiPosExistsQuery,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                pos: value.pos?,
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::RoiPosExistsQuery> for RoiPosExistsQuery {
        fn from(value: super::RoiPosExistsQuery) -> Self {
            Self {
                pos: Ok(value.pos),
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct RoiPosExistsResponse {
        exists: ::std::result::Result<bool, ::std::string::String>,
    }
    impl ::std::default::Default for RoiPosExistsResponse {
        fn default() -> Self {
            Self {
                exists: Err("no value supplied for exists".to_string()),
            }
        }
    }
    impl RoiPosExistsResponse {
        pub fn exists<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<bool>,
            T::Error: ::std::fmt::Display,
        {
            self.exists = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for exists: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<RoiPosExistsResponse> for super::RoiPosExistsResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: RoiPosExistsResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                exists: value.exists?,
            })
        }
    }
    impl ::std::convert::From<super::RoiPosExistsResponse> for RoiPosExistsResponse {
        fn from(value: super::RoiPosExistsResponse) -> Self {
            Self {
                exists: Ok(value.exists),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct RoiPositionScan {
        channels: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
        pos: ::std::result::Result<u32, ::std::string::String>,
        rois: ::std::result::Result<::std::vec::Vec<super::RoiIndexEntry>, ::std::string::String>,
        source: ::std::result::Result<super::AlignerSource, ::std::string::String>,
        times: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
        z_slices: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
    }
    impl ::std::default::Default for RoiPositionScan {
        fn default() -> Self {
            Self {
                channels: Err("no value supplied for channels".to_string()),
                pos: Err("no value supplied for pos".to_string()),
                rois: Err("no value supplied for rois".to_string()),
                source: Err("no value supplied for source".to_string()),
                times: Err("no value supplied for times".to_string()),
                z_slices: Err("no value supplied for z_slices".to_string()),
            }
        }
    }
    impl RoiPositionScan {
        pub fn channels<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<u32>>,
            T::Error: ::std::fmt::Display,
        {
            self.channels = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for channels: {e}"));
            self
        }
        pub fn pos<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.pos = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for pos: {e}"));
            self
        }
        pub fn rois<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::RoiIndexEntry>>,
            T::Error: ::std::fmt::Display,
        {
            self.rois = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for rois: {e}"));
            self
        }
        pub fn source<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AlignerSource>,
            T::Error: ::std::fmt::Display,
        {
            self.source = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for source: {e}"));
            self
        }
        pub fn times<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<u32>>,
            T::Error: ::std::fmt::Display,
        {
            self.times = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for times: {e}"));
            self
        }
        pub fn z_slices<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<u32>>,
            T::Error: ::std::fmt::Display,
        {
            self.z_slices = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for z_slices: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<RoiPositionScan> for super::RoiPositionScan {
        type Error = super::error::ConversionError;
        fn try_from(
            value: RoiPositionScan,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                channels: value.channels?,
                pos: value.pos?,
                rois: value.rois?,
                source: value.source?,
                times: value.times?,
                z_slices: value.z_slices?,
            })
        }
    }
    impl ::std::convert::From<super::RoiPositionScan> for RoiPositionScan {
        fn from(value: super::RoiPositionScan) -> Self {
            Self {
                channels: Ok(value.channels),
                pos: Ok(value.pos),
                rois: Ok(value.rois),
                source: Ok(value.source),
                times: Ok(value.times),
                z_slices: Ok(value.z_slices),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct RoiWorkspaceScan {
        positions:
            ::std::result::Result<::std::vec::Vec<super::RoiPositionScan>, ::std::string::String>,
    }
    impl ::std::default::Default for RoiWorkspaceScan {
        fn default() -> Self {
            Self {
                positions: Err("no value supplied for positions".to_string()),
            }
        }
    }
    impl RoiWorkspaceScan {
        pub fn positions<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::RoiPositionScan>>,
            T::Error: ::std::fmt::Display,
        {
            self.positions = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for positions: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<RoiWorkspaceScan> for super::RoiWorkspaceScan {
        type Error = super::error::ConversionError;
        fn try_from(
            value: RoiWorkspaceScan,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                positions: value.positions?,
            })
        }
    }
    impl ::std::convert::From<super::RoiWorkspaceScan> for RoiWorkspaceScan {
        fn from(value: super::RoiWorkspaceScan) -> Self {
            Self {
                positions: Ok(value.positions),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SaveAnnotationLabelsRequest {
        labels:
            ::std::result::Result<::std::vec::Vec<super::AnnotationLabel>, ::std::string::String>,
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for SaveAnnotationLabelsRequest {
        fn default() -> Self {
            Self {
                labels: Err("no value supplied for labels".to_string()),
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl SaveAnnotationLabelsRequest {
        pub fn labels<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::AnnotationLabel>>,
            T::Error: ::std::fmt::Display,
        {
            self.labels = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for labels: {e}"));
            self
        }
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SaveAnnotationLabelsRequest> for super::SaveAnnotationLabelsRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SaveAnnotationLabelsRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                labels: value.labels?,
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::SaveAnnotationLabelsRequest> for SaveAnnotationLabelsRequest {
        fn from(value: super::SaveAnnotationLabelsRequest) -> Self {
            Self {
                labels: Ok(value.labels),
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SaveAssayJsonRequest {
        contents: ::std::result::Result<::std::string::String, ::std::string::String>,
        save_to: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for SaveAssayJsonRequest {
        fn default() -> Self {
            Self {
                contents: Err("no value supplied for contents".to_string()),
                save_to: Err("no value supplied for save_to".to_string()),
            }
        }
    }
    impl SaveAssayJsonRequest {
        pub fn contents<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.contents = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for contents: {e}"));
            self
        }
        pub fn save_to<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.save_to = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for save_to: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SaveAssayJsonRequest> for super::SaveAssayJsonRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SaveAssayJsonRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                contents: value.contents?,
                save_to: value.save_to?,
            })
        }
    }
    impl ::std::convert::From<super::SaveAssayJsonRequest> for SaveAssayJsonRequest {
        fn from(value: super::SaveAssayJsonRequest) -> Self {
            Self {
                contents: Ok(value.contents),
                save_to: Ok(value.save_to),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SaveAssayJsonResponse {
        ok: ::std::result::Result<bool, ::std::string::String>,
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for SaveAssayJsonResponse {
        fn default() -> Self {
            Self {
                ok: Err("no value supplied for ok".to_string()),
                path: Err("no value supplied for path".to_string()),
            }
        }
    }
    impl SaveAssayJsonResponse {
        pub fn ok<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<bool>,
            T::Error: ::std::fmt::Display,
        {
            self.ok = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for ok: {e}"));
            self
        }
        pub fn path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SaveAssayJsonResponse> for super::SaveAssayJsonResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SaveAssayJsonResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                ok: value.ok?,
                path: value.path?,
            })
        }
    }
    impl ::std::convert::From<super::SaveAssayJsonResponse> for SaveAssayJsonResponse {
        fn from(value: super::SaveAssayJsonResponse) -> Self {
            Self {
                ok: Ok(value.ok),
                path: Ok(value.path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SaveBboxRequest {
        align_state: ::std::result::Result<super::SavedAlignState, ::std::string::String>,
        csv: ::std::result::Result<::std::string::String, ::std::string::String>,
        pos: ::std::result::Result<u32, ::std::string::String>,
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for SaveBboxRequest {
        fn default() -> Self {
            Self {
                align_state: Err("no value supplied for align_state".to_string()),
                csv: Err("no value supplied for csv".to_string()),
                pos: Err("no value supplied for pos".to_string()),
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl SaveBboxRequest {
        pub fn align_state<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::SavedAlignState>,
            T::Error: ::std::fmt::Display,
        {
            self.align_state = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for align_state: {e}"));
            self
        }
        pub fn csv<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.csv = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for csv: {e}"));
            self
        }
        pub fn pos<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.pos = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for pos: {e}"));
            self
        }
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SaveBboxRequest> for super::SaveBboxRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SaveBboxRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                align_state: value.align_state?,
                csv: value.csv?,
                pos: value.pos?,
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::SaveBboxRequest> for SaveBboxRequest {
        fn from(value: super::SaveBboxRequest) -> Self {
            Self {
                align_state: Ok(value.align_state),
                csv: Ok(value.csv),
                pos: Ok(value.pos),
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SaveBboxResponse {
        error: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        ok: ::std::result::Result<bool, ::std::string::String>,
    }
    impl ::std::default::Default for SaveBboxResponse {
        fn default() -> Self {
            Self {
                error: Err("no value supplied for error".to_string()),
                ok: Err("no value supplied for ok".to_string()),
            }
        }
    }
    impl SaveBboxResponse {
        pub fn error<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.error = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for error: {e}"));
            self
        }
        pub fn ok<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<bool>,
            T::Error: ::std::fmt::Display,
        {
            self.ok = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for ok: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SaveBboxResponse> for super::SaveBboxResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SaveBboxResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                error: value.error?,
                ok: value.ok?,
            })
        }
    }
    impl ::std::convert::From<super::SaveBboxResponse> for SaveBboxResponse {
        fn from(value: super::SaveBboxResponse) -> Self {
            Self {
                error: Ok(value.error),
                ok: Ok(value.ok),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SaveResultPdfRequest {
        contents_base64: ::std::result::Result<::std::string::String, ::std::string::String>,
        file_name: ::std::result::Result<::std::string::String, ::std::string::String>,
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for SaveResultPdfRequest {
        fn default() -> Self {
            Self {
                contents_base64: Err("no value supplied for contents_base64".to_string()),
                file_name: Err("no value supplied for file_name".to_string()),
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl SaveResultPdfRequest {
        pub fn contents_base64<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.contents_base64 = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for contents_base64: {e}"));
            self
        }
        pub fn file_name<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.file_name = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for file_name: {e}"));
            self
        }
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SaveResultPdfRequest> for super::SaveResultPdfRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SaveResultPdfRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                contents_base64: value.contents_base64?,
                file_name: value.file_name?,
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::SaveResultPdfRequest> for SaveResultPdfRequest {
        fn from(value: super::SaveResultPdfRequest) -> Self {
            Self {
                contents_base64: Ok(value.contents_base64),
                file_name: Ok(value.file_name),
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SaveResultPdfResponse {
        directory: ::std::result::Result<::std::string::String, ::std::string::String>,
        ok: ::std::result::Result<bool, ::std::string::String>,
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for SaveResultPdfResponse {
        fn default() -> Self {
            Self {
                directory: Err("no value supplied for directory".to_string()),
                ok: Err("no value supplied for ok".to_string()),
                path: Err("no value supplied for path".to_string()),
            }
        }
    }
    impl SaveResultPdfResponse {
        pub fn directory<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.directory = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for directory: {e}"));
            self
        }
        pub fn ok<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<bool>,
            T::Error: ::std::fmt::Display,
        {
            self.ok = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for ok: {e}"));
            self
        }
        pub fn path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SaveResultPdfResponse> for super::SaveResultPdfResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SaveResultPdfResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                directory: value.directory?,
                ok: value.ok?,
                path: value.path?,
            })
        }
    }
    impl ::std::convert::From<super::SaveResultPdfResponse> for SaveResultPdfResponse {
        fn from(value: super::SaveResultPdfResponse) -> Self {
            Self {
                directory: Ok(value.directory),
                ok: Ok(value.ok),
                path: Ok(value.path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SaveRoiFrameAnnotationRequest {
        annotation: ::std::result::Result<super::RoiFrameAnnotationPayload, ::std::string::String>,
        request: ::std::result::Result<super::RoiFrameRequest, ::std::string::String>,
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for SaveRoiFrameAnnotationRequest {
        fn default() -> Self {
            Self {
                annotation: Err("no value supplied for annotation".to_string()),
                request: Err("no value supplied for request".to_string()),
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl SaveRoiFrameAnnotationRequest {
        pub fn annotation<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::RoiFrameAnnotationPayload>,
            T::Error: ::std::fmt::Display,
        {
            self.annotation = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for annotation: {e}"));
            self
        }
        pub fn request<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::RoiFrameRequest>,
            T::Error: ::std::fmt::Display,
        {
            self.request = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for request: {e}"));
            self
        }
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SaveRoiFrameAnnotationRequest>
        for super::SaveRoiFrameAnnotationRequest
    {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SaveRoiFrameAnnotationRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                annotation: value.annotation?,
                request: value.request?,
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::SaveRoiFrameAnnotationRequest> for SaveRoiFrameAnnotationRequest {
        fn from(value: super::SaveRoiFrameAnnotationRequest) -> Self {
            Self {
                annotation: Ok(value.annotation),
                request: Ok(value.request),
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SavedAlignState {
        excluded_cells: ::std::result::Result<
            ::std::vec::Vec<super::AlignGridCellCoord>,
            ::std::string::String,
        >,
        grid: ::std::result::Result<super::AlignGridState, ::std::string::String>,
    }
    impl ::std::default::Default for SavedAlignState {
        fn default() -> Self {
            Self {
                excluded_cells: Err("no value supplied for excluded_cells".to_string()),
                grid: Err("no value supplied for grid".to_string()),
            }
        }
    }
    impl SavedAlignState {
        pub fn excluded_cells<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::AlignGridCellCoord>>,
            T::Error: ::std::fmt::Display,
        {
            self.excluded_cells = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for excluded_cells: {e}"));
            self
        }
        pub fn grid<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AlignGridState>,
            T::Error: ::std::fmt::Display,
        {
            self.grid = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for grid: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SavedAlignState> for super::SavedAlignState {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SavedAlignState,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                excluded_cells: value.excluded_cells?,
                grid: value.grid?,
            })
        }
    }
    impl ::std::convert::From<super::SavedAlignState> for SavedAlignState {
        fn from(value: super::SavedAlignState) -> Self {
            Self {
                excluded_cells: Ok(value.excluded_cells),
                grid: Ok(value.grid),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SavedBboxPositionsQuery {
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for SavedBboxPositionsQuery {
        fn default() -> Self {
            Self {
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl SavedBboxPositionsQuery {
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SavedBboxPositionsQuery> for super::SavedBboxPositionsQuery {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SavedBboxPositionsQuery,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::SavedBboxPositionsQuery> for SavedBboxPositionsQuery {
        fn from(value: super::SavedBboxPositionsQuery) -> Self {
            Self {
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct ScanRoiWorkspaceRequest {
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for ScanRoiWorkspaceRequest {
        fn default() -> Self {
            Self {
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl ScanRoiWorkspaceRequest {
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<ScanRoiWorkspaceRequest> for super::ScanRoiWorkspaceRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: ScanRoiWorkspaceRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::ScanRoiWorkspaceRequest> for ScanRoiWorkspaceRequest {
        fn from(value: super::ScanRoiWorkspaceRequest) -> Self {
            Self {
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct ScanSourceRequest {
        source: ::std::result::Result<super::AlignerSource, ::std::string::String>,
    }
    impl ::std::default::Default for ScanSourceRequest {
        fn default() -> Self {
            Self {
                source: Err("no value supplied for source".to_string()),
            }
        }
    }
    impl ScanSourceRequest {
        pub fn source<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AlignerSource>,
            T::Error: ::std::fmt::Display,
        {
            self.source = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for source: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<ScanSourceRequest> for super::ScanSourceRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: ScanSourceRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                source: value.source?,
            })
        }
    }
    impl ::std::convert::From<super::ScanSourceRequest> for ScanSourceRequest {
        fn from(value: super::ScanSourceRequest) -> Self {
            Self {
                source: Ok(value.source),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SmartExcludeRequest {
        cells: ::std::result::Result<
            ::std::vec::Vec<super::AutoExcludePreviewCell>,
            ::std::string::String,
        >,
        contrast: ::std::result::Result<
            ::std::option::Option<super::ContrastWindow>,
            ::std::string::String,
        >,
        request: ::std::result::Result<super::FrameRequest, ::std::string::String>,
        source: ::std::result::Result<super::AlignerSource, ::std::string::String>,
        threshold: ::std::result::Result<::std::option::Option<f64>, ::std::string::String>,
    }
    impl ::std::default::Default for SmartExcludeRequest {
        fn default() -> Self {
            Self {
                cells: Err("no value supplied for cells".to_string()),
                contrast: Err("no value supplied for contrast".to_string()),
                request: Err("no value supplied for request".to_string()),
                source: Err("no value supplied for source".to_string()),
                threshold: Ok(Default::default()),
            }
        }
    }
    impl SmartExcludeRequest {
        pub fn cells<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::AutoExcludePreviewCell>>,
            T::Error: ::std::fmt::Display,
        {
            self.cells = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for cells: {e}"));
            self
        }
        pub fn contrast<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::ContrastWindow>>,
            T::Error: ::std::fmt::Display,
        {
            self.contrast = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for contrast: {e}"));
            self
        }
        pub fn request<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::FrameRequest>,
            T::Error: ::std::fmt::Display,
        {
            self.request = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for request: {e}"));
            self
        }
        pub fn source<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AlignerSource>,
            T::Error: ::std::fmt::Display,
        {
            self.source = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for source: {e}"));
            self
        }
        pub fn threshold<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<f64>>,
            T::Error: ::std::fmt::Display,
        {
            self.threshold = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for threshold: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SmartExcludeRequest> for super::SmartExcludeRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SmartExcludeRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                cells: value.cells?,
                contrast: value.contrast?,
                request: value.request?,
                source: value.source?,
                threshold: value.threshold?,
            })
        }
    }
    impl ::std::convert::From<super::SmartExcludeRequest> for SmartExcludeRequest {
        fn from(value: super::SmartExcludeRequest) -> Self {
            Self {
                cells: Ok(value.cells),
                contrast: Ok(value.contrast),
                request: Ok(value.request),
                source: Ok(value.source),
                threshold: Ok(value.threshold),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SmartExcludeResponse {
        excluded_cells: ::std::result::Result<
            ::std::vec::Vec<super::AlignGridCellCoord>,
            ::std::string::String,
        >,
    }
    impl ::std::default::Default for SmartExcludeResponse {
        fn default() -> Self {
            Self {
                excluded_cells: Err("no value supplied for excluded_cells".to_string()),
            }
        }
    }
    impl SmartExcludeResponse {
        pub fn excluded_cells<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::AlignGridCellCoord>>,
            T::Error: ::std::fmt::Display,
        {
            self.excluded_cells = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for excluded_cells: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SmartExcludeResponse> for super::SmartExcludeResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SmartExcludeResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                excluded_cells: value.excluded_cells?,
            })
        }
    }
    impl ::std::convert::From<super::SmartExcludeResponse> for SmartExcludeResponse {
        fn from(value: super::SmartExcludeResponse) -> Self {
            Self {
                excluded_cells: Ok(value.excluded_cells),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SmartSegmentPoint {
        label: ::std::result::Result<super::SmartSegmentPointLabel, ::std::string::String>,
        x: ::std::result::Result<f64, ::std::string::String>,
        y: ::std::result::Result<f64, ::std::string::String>,
    }
    impl ::std::default::Default for SmartSegmentPoint {
        fn default() -> Self {
            Self {
                label: Err("no value supplied for label".to_string()),
                x: Err("no value supplied for x".to_string()),
                y: Err("no value supplied for y".to_string()),
            }
        }
    }
    impl SmartSegmentPoint {
        pub fn label<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::SmartSegmentPointLabel>,
            T::Error: ::std::fmt::Display,
        {
            self.label = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for label: {e}"));
            self
        }
        pub fn x<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.x = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for x: {e}"));
            self
        }
        pub fn y<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.y = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for y: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SmartSegmentPoint> for super::SmartSegmentPoint {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SmartSegmentPoint,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                label: value.label?,
                x: value.x?,
                y: value.y?,
            })
        }
    }
    impl ::std::convert::From<super::SmartSegmentPoint> for SmartSegmentPoint {
        fn from(value: super::SmartSegmentPoint) -> Self {
            Self {
                label: Ok(value.label),
                x: Ok(value.x),
                y: Ok(value.y),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SmartSegmentRequest {
        contrast: ::std::result::Result<
            ::std::option::Option<super::ContrastWindow>,
            ::std::string::String,
        >,
        points:
            ::std::result::Result<::std::vec::Vec<super::SmartSegmentPoint>, ::std::string::String>,
        request: ::std::result::Result<super::RoiFrameRequest, ::std::string::String>,
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for SmartSegmentRequest {
        fn default() -> Self {
            Self {
                contrast: Err("no value supplied for contrast".to_string()),
                points: Err("no value supplied for points".to_string()),
                request: Err("no value supplied for request".to_string()),
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl SmartSegmentRequest {
        pub fn contrast<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::ContrastWindow>>,
            T::Error: ::std::fmt::Display,
        {
            self.contrast = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for contrast: {e}"));
            self
        }
        pub fn points<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::SmartSegmentPoint>>,
            T::Error: ::std::fmt::Display,
        {
            self.points = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for points: {e}"));
            self
        }
        pub fn request<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::RoiFrameRequest>,
            T::Error: ::std::fmt::Display,
        {
            self.request = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for request: {e}"));
            self
        }
        pub fn workspace_path<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_path = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_path: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SmartSegmentRequest> for super::SmartSegmentRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SmartSegmentRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                contrast: value.contrast?,
                points: value.points?,
                request: value.request?,
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::SmartSegmentRequest> for SmartSegmentRequest {
        fn from(value: super::SmartSegmentRequest) -> Self {
            Self {
                contrast: Ok(value.contrast),
                points: Ok(value.points),
                request: Ok(value.request),
                workspace_path: Ok(value.workspace_path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SmartSegmentResponse {
        mask: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
    }
    impl ::std::default::Default for SmartSegmentResponse {
        fn default() -> Self {
            Self {
                mask: Err("no value supplied for mask".to_string()),
            }
        }
    }
    impl SmartSegmentResponse {
        pub fn mask<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<u32>>,
            T::Error: ::std::fmt::Display,
        {
            self.mask = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for mask: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SmartSegmentResponse> for super::SmartSegmentResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SmartSegmentResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self { mask: value.mask? })
        }
    }
    impl ::std::convert::From<super::SmartSegmentResponse> for SmartSegmentResponse {
        fn from(value: super::SmartSegmentResponse) -> Self {
            Self {
                mask: Ok(value.mask),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct TaskAttempt {
        attempt_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        error:
            ::std::result::Result<::std::option::Option<super::TaskError>, ::std::string::String>,
        finished_at_ms: ::std::result::Result<::std::option::Option<u64>, ::std::string::String>,
        operation_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        started_at_ms: ::std::result::Result<::std::option::Option<u64>, ::std::string::String>,
        status: ::std::result::Result<super::TaskStatus, ::std::string::String>,
        task_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for TaskAttempt {
        fn default() -> Self {
            Self {
                attempt_id: Err("no value supplied for attempt_id".to_string()),
                error: Err("no value supplied for error".to_string()),
                finished_at_ms: Err("no value supplied for finished_at_ms".to_string()),
                operation_id: Err("no value supplied for operation_id".to_string()),
                started_at_ms: Err("no value supplied for started_at_ms".to_string()),
                status: Err("no value supplied for status".to_string()),
                task_id: Err("no value supplied for task_id".to_string()),
            }
        }
    }
    impl TaskAttempt {
        pub fn attempt_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.attempt_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for attempt_id: {e}"));
            self
        }
        pub fn error<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::TaskError>>,
            T::Error: ::std::fmt::Display,
        {
            self.error = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for error: {e}"));
            self
        }
        pub fn finished_at_ms<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<u64>>,
            T::Error: ::std::fmt::Display,
        {
            self.finished_at_ms = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for finished_at_ms: {e}"));
            self
        }
        pub fn operation_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.operation_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for operation_id: {e}"));
            self
        }
        pub fn started_at_ms<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<u64>>,
            T::Error: ::std::fmt::Display,
        {
            self.started_at_ms = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for started_at_ms: {e}"));
            self
        }
        pub fn status<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::TaskStatus>,
            T::Error: ::std::fmt::Display,
        {
            self.status = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for status: {e}"));
            self
        }
        pub fn task_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.task_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for task_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<TaskAttempt> for super::TaskAttempt {
        type Error = super::error::ConversionError;
        fn try_from(
            value: TaskAttempt,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                attempt_id: value.attempt_id?,
                error: value.error?,
                finished_at_ms: value.finished_at_ms?,
                operation_id: value.operation_id?,
                started_at_ms: value.started_at_ms?,
                status: value.status?,
                task_id: value.task_id?,
            })
        }
    }
    impl ::std::convert::From<super::TaskAttempt> for TaskAttempt {
        fn from(value: super::TaskAttempt) -> Self {
            Self {
                attempt_id: Ok(value.attempt_id),
                error: Ok(value.error),
                finished_at_ms: Ok(value.finished_at_ms),
                operation_id: Ok(value.operation_id),
                started_at_ms: Ok(value.started_at_ms),
                status: Ok(value.status),
                task_id: Ok(value.task_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct TaskCancelRequest {
        task_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for TaskCancelRequest {
        fn default() -> Self {
            Self {
                task_id: Err("no value supplied for task_id".to_string()),
            }
        }
    }
    impl TaskCancelRequest {
        pub fn task_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.task_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for task_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<TaskCancelRequest> for super::TaskCancelRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: TaskCancelRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                task_id: value.task_id?,
            })
        }
    }
    impl ::std::convert::From<super::TaskCancelRequest> for TaskCancelRequest {
        fn from(value: super::TaskCancelRequest) -> Self {
            Self {
                task_id: Ok(value.task_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct TaskCommandError {
        code: ::std::result::Result<super::TaskCommandErrorCode, ::std::string::String>,
        current_status: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        entity: ::std::result::Result<super::TaskCommandErrorEntity, ::std::string::String>,
        id: ::std::result::Result<::std::string::String, ::std::string::String>,
        message: ::std::result::Result<::std::string::String, ::std::string::String>,
        tag: ::std::result::Result<super::TaskCommandErrorTag, ::std::string::String>,
    }
    impl ::std::default::Default for TaskCommandError {
        fn default() -> Self {
            Self {
                code: Err("no value supplied for code".to_string()),
                current_status: Err("no value supplied for current_status".to_string()),
                entity: Err("no value supplied for entity".to_string()),
                id: Err("no value supplied for id".to_string()),
                message: Err("no value supplied for message".to_string()),
                tag: Err("no value supplied for tag".to_string()),
            }
        }
    }
    impl TaskCommandError {
        pub fn code<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::TaskCommandErrorCode>,
            T::Error: ::std::fmt::Display,
        {
            self.code = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for code: {e}"));
            self
        }
        pub fn current_status<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.current_status = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for current_status: {e}"));
            self
        }
        pub fn entity<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::TaskCommandErrorEntity>,
            T::Error: ::std::fmt::Display,
        {
            self.entity = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for entity: {e}"));
            self
        }
        pub fn id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for id: {e}"));
            self
        }
        pub fn message<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.message = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for message: {e}"));
            self
        }
        pub fn tag<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::TaskCommandErrorTag>,
            T::Error: ::std::fmt::Display,
        {
            self.tag = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for tag: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<TaskCommandError> for super::TaskCommandError {
        type Error = super::error::ConversionError;
        fn try_from(
            value: TaskCommandError,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                code: value.code?,
                current_status: value.current_status?,
                entity: value.entity?,
                id: value.id?,
                message: value.message?,
                tag: value.tag?,
            })
        }
    }
    impl ::std::convert::From<super::TaskCommandError> for TaskCommandError {
        fn from(value: super::TaskCommandError) -> Self {
            Self {
                code: Ok(value.code),
                current_status: Ok(value.current_status),
                entity: Ok(value.entity),
                id: Ok(value.id),
                message: Ok(value.message),
                tag: Ok(value.tag),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct TaskDependencyBlock {
        error:
            ::std::result::Result<::std::option::Option<super::TaskError>, ::std::string::String>,
        status: ::std::result::Result<super::TaskStatus, ::std::string::String>,
        task_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        task_kind: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for TaskDependencyBlock {
        fn default() -> Self {
            Self {
                error: Err("no value supplied for error".to_string()),
                status: Err("no value supplied for status".to_string()),
                task_id: Err("no value supplied for task_id".to_string()),
                task_kind: Err("no value supplied for task_kind".to_string()),
            }
        }
    }
    impl TaskDependencyBlock {
        pub fn error<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::TaskError>>,
            T::Error: ::std::fmt::Display,
        {
            self.error = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for error: {e}"));
            self
        }
        pub fn status<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::TaskStatus>,
            T::Error: ::std::fmt::Display,
        {
            self.status = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for status: {e}"));
            self
        }
        pub fn task_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.task_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for task_id: {e}"));
            self
        }
        pub fn task_kind<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.task_kind = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for task_kind: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<TaskDependencyBlock> for super::TaskDependencyBlock {
        type Error = super::error::ConversionError;
        fn try_from(
            value: TaskDependencyBlock,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                error: value.error?,
                status: value.status?,
                task_id: value.task_id?,
                task_kind: value.task_kind?,
            })
        }
    }
    impl ::std::convert::From<super::TaskDependencyBlock> for TaskDependencyBlock {
        fn from(value: super::TaskDependencyBlock) -> Self {
            Self {
                error: Ok(value.error),
                status: Ok(value.status),
                task_id: Ok(value.task_id),
                task_kind: Ok(value.task_kind),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct TaskDetail {
        attempts: ::std::result::Result<::std::vec::Vec<super::TaskAttempt>, ::std::string::String>,
        blocked_by: ::std::result::Result<
            ::std::vec::Vec<super::TaskDependencyBlock>,
            ::std::string::String,
        >,
        dependencies:
            ::std::result::Result<::std::vec::Vec<::std::string::String>, ::std::string::String>,
        enqueue_order: ::std::result::Result<u64, ::std::string::String>,
        operation_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        status: ::std::result::Result<super::TaskStatus, ::std::string::String>,
        task_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        task_kind: ::std::result::Result<::std::string::String, ::std::string::String>,
        weight: ::std::result::Result<u32, ::std::string::String>,
        workspace_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for TaskDetail {
        fn default() -> Self {
            Self {
                attempts: Err("no value supplied for attempts".to_string()),
                blocked_by: Err("no value supplied for blocked_by".to_string()),
                dependencies: Err("no value supplied for dependencies".to_string()),
                enqueue_order: Err("no value supplied for enqueue_order".to_string()),
                operation_id: Err("no value supplied for operation_id".to_string()),
                status: Err("no value supplied for status".to_string()),
                task_id: Err("no value supplied for task_id".to_string()),
                task_kind: Err("no value supplied for task_kind".to_string()),
                weight: Err("no value supplied for weight".to_string()),
                workspace_id: Err("no value supplied for workspace_id".to_string()),
            }
        }
    }
    impl TaskDetail {
        pub fn attempts<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::TaskAttempt>>,
            T::Error: ::std::fmt::Display,
        {
            self.attempts = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for attempts: {e}"));
            self
        }
        pub fn blocked_by<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::TaskDependencyBlock>>,
            T::Error: ::std::fmt::Display,
        {
            self.blocked_by = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for blocked_by: {e}"));
            self
        }
        pub fn dependencies<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.dependencies = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for dependencies: {e}"));
            self
        }
        pub fn enqueue_order<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u64>,
            T::Error: ::std::fmt::Display,
        {
            self.enqueue_order = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for enqueue_order: {e}"));
            self
        }
        pub fn operation_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.operation_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for operation_id: {e}"));
            self
        }
        pub fn status<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::TaskStatus>,
            T::Error: ::std::fmt::Display,
        {
            self.status = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for status: {e}"));
            self
        }
        pub fn task_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.task_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for task_id: {e}"));
            self
        }
        pub fn task_kind<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.task_kind = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for task_kind: {e}"));
            self
        }
        pub fn weight<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.weight = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for weight: {e}"));
            self
        }
        pub fn workspace_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<TaskDetail> for super::TaskDetail {
        type Error = super::error::ConversionError;
        fn try_from(
            value: TaskDetail,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                attempts: value.attempts?,
                blocked_by: value.blocked_by?,
                dependencies: value.dependencies?,
                enqueue_order: value.enqueue_order?,
                operation_id: value.operation_id?,
                status: value.status?,
                task_id: value.task_id?,
                task_kind: value.task_kind?,
                weight: value.weight?,
                workspace_id: value.workspace_id?,
            })
        }
    }
    impl ::std::convert::From<super::TaskDetail> for TaskDetail {
        fn from(value: super::TaskDetail) -> Self {
            Self {
                attempts: Ok(value.attempts),
                blocked_by: Ok(value.blocked_by),
                dependencies: Ok(value.dependencies),
                enqueue_order: Ok(value.enqueue_order),
                operation_id: Ok(value.operation_id),
                status: Ok(value.status),
                task_id: Ok(value.task_id),
                task_kind: Ok(value.task_kind),
                weight: Ok(value.weight),
                workspace_id: Ok(value.workspace_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct TaskDetailQuery {
        task_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for TaskDetailQuery {
        fn default() -> Self {
            Self {
                task_id: Err("no value supplied for task_id".to_string()),
            }
        }
    }
    impl TaskDetailQuery {
        pub fn task_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.task_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for task_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<TaskDetailQuery> for super::TaskDetailQuery {
        type Error = super::error::ConversionError;
        fn try_from(
            value: TaskDetailQuery,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                task_id: value.task_id?,
            })
        }
    }
    impl ::std::convert::From<super::TaskDetailQuery> for TaskDetailQuery {
        fn from(value: super::TaskDetailQuery) -> Self {
            Self {
                task_id: Ok(value.task_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct TaskError {
        code: ::std::result::Result<::std::string::String, ::std::string::String>,
        message: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for TaskError {
        fn default() -> Self {
            Self {
                code: Err("no value supplied for code".to_string()),
                message: Err("no value supplied for message".to_string()),
            }
        }
    }
    impl TaskError {
        pub fn code<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.code = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for code: {e}"));
            self
        }
        pub fn message<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.message = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for message: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<TaskError> for super::TaskError {
        type Error = super::error::ConversionError;
        fn try_from(
            value: TaskError,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                code: value.code?,
                message: value.message?,
            })
        }
    }
    impl ::std::convert::From<super::TaskError> for TaskError {
        fn from(value: super::TaskError) -> Self {
            Self {
                code: Ok(value.code),
                message: Ok(value.message),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct TaskRetryRequest {
        task_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for TaskRetryRequest {
        fn default() -> Self {
            Self {
                task_id: Err("no value supplied for task_id".to_string()),
            }
        }
    }
    impl TaskRetryRequest {
        pub fn task_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.task_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for task_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<TaskRetryRequest> for super::TaskRetryRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: TaskRetryRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                task_id: value.task_id?,
            })
        }
    }
    impl ::std::convert::From<super::TaskRetryRequest> for TaskRetryRequest {
        fn from(value: super::TaskRetryRequest) -> Self {
            Self {
                task_id: Ok(value.task_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct Unauthorized {
        message: ::std::result::Result<::std::string::String, ::std::string::String>,
        tag: ::std::result::Result<super::UnauthorizedTag, ::std::string::String>,
    }
    impl ::std::default::Default for Unauthorized {
        fn default() -> Self {
            Self {
                message: Err("no value supplied for message".to_string()),
                tag: Err("no value supplied for tag".to_string()),
            }
        }
    }
    impl Unauthorized {
        pub fn message<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.message = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for message: {e}"));
            self
        }
        pub fn tag<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::UnauthorizedTag>,
            T::Error: ::std::fmt::Display,
        {
            self.tag = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for tag: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<Unauthorized> for super::Unauthorized {
        type Error = super::error::ConversionError;
        fn try_from(
            value: Unauthorized,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                message: value.message?,
                tag: value.tag?,
            })
        }
    }
    impl ::std::convert::From<super::Unauthorized> for Unauthorized {
        fn from(value: super::Unauthorized) -> Self {
            Self {
                message: Ok(value.message),
                tag: Ok(value.tag),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct WorkspaceScan {
        channel_labels:
            ::std::result::Result<::std::vec::Vec<::std::string::String>, ::std::string::String>,
        channels: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
        position_labels:
            ::std::result::Result<::std::vec::Vec<::std::string::String>, ::std::string::String>,
        positions: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
        time_labels:
            ::std::result::Result<::std::vec::Vec<::std::string::String>, ::std::string::String>,
        times: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
        z_slice_labels:
            ::std::result::Result<::std::vec::Vec<::std::string::String>, ::std::string::String>,
        z_slices: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
    }
    impl ::std::default::Default for WorkspaceScan {
        fn default() -> Self {
            Self {
                channel_labels: Ok(Default::default()),
                channels: Err("no value supplied for channels".to_string()),
                position_labels: Ok(Default::default()),
                positions: Err("no value supplied for positions".to_string()),
                time_labels: Ok(Default::default()),
                times: Err("no value supplied for times".to_string()),
                z_slice_labels: Ok(Default::default()),
                z_slices: Err("no value supplied for z_slices".to_string()),
            }
        }
    }
    impl WorkspaceScan {
        pub fn channel_labels<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.channel_labels = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for channel_labels: {e}"));
            self
        }
        pub fn channels<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<u32>>,
            T::Error: ::std::fmt::Display,
        {
            self.channels = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for channels: {e}"));
            self
        }
        pub fn position_labels<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.position_labels = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for position_labels: {e}"));
            self
        }
        pub fn positions<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<u32>>,
            T::Error: ::std::fmt::Display,
        {
            self.positions = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for positions: {e}"));
            self
        }
        pub fn time_labels<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.time_labels = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for time_labels: {e}"));
            self
        }
        pub fn times<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<u32>>,
            T::Error: ::std::fmt::Display,
        {
            self.times = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for times: {e}"));
            self
        }
        pub fn z_slice_labels<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.z_slice_labels = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for z_slice_labels: {e}"));
            self
        }
        pub fn z_slices<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<u32>>,
            T::Error: ::std::fmt::Display,
        {
            self.z_slices = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for z_slices: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<WorkspaceScan> for super::WorkspaceScan {
        type Error = super::error::ConversionError;
        fn try_from(
            value: WorkspaceScan,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                channel_labels: value.channel_labels?,
                channels: value.channels?,
                position_labels: value.position_labels?,
                positions: value.positions?,
                time_labels: value.time_labels?,
                times: value.times?,
                z_slice_labels: value.z_slice_labels?,
                z_slices: value.z_slices?,
            })
        }
    }
    impl ::std::convert::From<super::WorkspaceScan> for WorkspaceScan {
        fn from(value: super::WorkspaceScan) -> Self {
            Self {
                channel_labels: Ok(value.channel_labels),
                channels: Ok(value.channels),
                position_labels: Ok(value.position_labels),
                positions: Ok(value.positions),
                time_labels: Ok(value.time_labels),
                times: Ok(value.times),
                z_slice_labels: Ok(value.z_slice_labels),
                z_slices: Ok(value.z_slices),
            }
        }
    }
}
