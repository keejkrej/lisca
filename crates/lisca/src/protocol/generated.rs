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
#[doc = "            \"tif\""]
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
#[doc = "            \"jpg\""]
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
    #[serde(rename = "tif")]
    Tif { path: ::std::string::String },
    #[serde(rename = "jpg")]
    Jpg { path: ::std::string::String },
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
#[doc = "`AnalysisProgressMessage`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"progress\","]
#[doc = "    \"type\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"progress\": {"]
#[doc = "      \"$ref\": \"#/definitions/AnalysisProgress\""]
#[doc = "    },"]
#[doc = "    \"type\": {"]
#[doc = "      \"type\": \"string\","]
#[doc = "      \"enum\": ["]
#[doc = "        \"analysisProgress\""]
#[doc = "      ]"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AnalysisProgressMessage {
    pub progress: AnalysisProgress,
    #[serde(rename = "type")]
    pub type_: AnalysisProgressMessageType,
}
impl AnalysisProgressMessage {
    pub fn builder() -> builder::AnalysisProgressMessage {
        Default::default()
    }
}
#[doc = "`AnalysisProgressMessageType`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"analysisProgress\""]
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
pub enum AnalysisProgressMessageType {
    #[serde(rename = "analysisProgress")]
    AnalysisProgress,
}
impl ::std::fmt::Display for AnalysisProgressMessageType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::AnalysisProgress => f.write_str("analysisProgress"),
        }
    }
}
impl ::std::str::FromStr for AnalysisProgressMessageType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "analysisProgress" => Ok(Self::AnalysisProgress),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AnalysisProgressMessageType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AnalysisProgressMessageType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AnalysisProgressMessageType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
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
#[doc = "`AssayBasicInfoStep1`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"dataPath\","]
#[doc = "    \"date\","]
#[doc = "    \"folderFilenameTemplate\","]
#[doc = "    \"folderSubfolderTemplate\","]
#[doc = "    \"name\","]
#[doc = "    \"saveTo\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"dataPath\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"date\": {"]
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
    pub date: ::std::string::String,
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
#[doc = "    \"pattern\","]
#[doc = "    \"selectedFeatures\","]
#[doc = "    \"timelapseAmount\","]
#[doc = "    \"timelapseUnit\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"pattern\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
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
    pub pattern: ::std::string::String,
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
#[doc = "    \"samplesBySlide\","]
#[doc = "    \"selectedSlideId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"samplesBySlide\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssaySamplesBySlide\""]
#[doc = "    },"]
#[doc = "    \"selectedSlideId\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssaySlideId\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssayBasicInfoStep3 {
    #[serde(rename = "samplesBySlide")]
    pub samples_by_slide: AssaySamplesBySlide,
    #[serde(rename = "selectedSlideId")]
    pub selected_slide_id: AssaySlideId,
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
#[doc = "    \"tif\","]
#[doc = "    \"jpg\","]
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
    #[serde(rename = "tif")]
    Tif,
    #[serde(rename = "jpg")]
    Jpg,
    #[serde(rename = "nd2")]
    Nd2,
    #[serde(rename = "czi")]
    Czi,
}
impl ::std::fmt::Display for AssayDataSourceKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Folder => f.write_str("folder"),
            Self::Tif => f.write_str("tif"),
            Self::Jpg => f.write_str("jpg"),
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
            "tif" => Ok(Self::Tif),
            "jpg" => Ok(Self::Jpg),
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
#[doc = "    \"assayId\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayName\""]
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
    #[serde(rename = "assayId")]
    pub assay_id: AssayName,
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
#[doc = "`AssayName`"]
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
pub enum AssayName {
    #[serde(rename = "gene-expression")]
    GeneExpression,
    #[serde(rename = "immune-killing")]
    ImmuneKilling,
    #[serde(rename = "lnp-binding")]
    LnpBinding,
    #[serde(rename = "custom-assay")]
    CustomAssay,
}
impl ::std::fmt::Display for AssayName {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::GeneExpression => f.write_str("gene-expression"),
            Self::ImmuneKilling => f.write_str("immune-killing"),
            Self::LnpBinding => f.write_str("lnp-binding"),
            Self::CustomAssay => f.write_str("custom-assay"),
        }
    }
}
impl ::std::str::FromStr for AssayName {
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
impl ::std::convert::TryFrom<&str> for AssayName {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AssayName {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AssayName {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
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
#[doc = "`AssaySamplesBySlide`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"slide-i\","]
#[doc = "    \"slide-vi\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"slide-i\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AssaySampleRow\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"slide-vi\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AssaySampleRow\""]
#[doc = "      }"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssaySamplesBySlide {
    #[serde(rename = "slide-i")]
    pub slide_i: ::std::vec::Vec<AssaySampleRow>,
    #[serde(rename = "slide-vi")]
    pub slide_vi: ::std::vec::Vec<AssaySampleRow>,
}
impl AssaySamplesBySlide {
    pub fn builder() -> builder::AssaySamplesBySlide {
        Default::default()
    }
}
#[doc = "`AssaySlideId`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"slide-i\","]
#[doc = "    \"slide-vi\""]
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
pub enum AssaySlideId {
    #[serde(rename = "slide-i")]
    SlideI,
    #[serde(rename = "slide-vi")]
    SlideVi,
}
impl ::std::fmt::Display for AssaySlideId {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::SlideI => f.write_str("slide-i"),
            Self::SlideVi => f.write_str("slide-vi"),
        }
    }
}
impl ::std::str::FromStr for AssaySlideId {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "slide-i" => Ok(Self::SlideI),
            "slide-vi" => Ok(Self::SlideVi),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AssaySlideId {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AssaySlideId {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AssaySlideId {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
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
#[doc = "`AutoExcludeHistogramBin`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"count\","]
#[doc = "    \"end\","]
#[doc = "    \"start\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"count\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"end\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"start\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AutoExcludeHistogramBin {
    pub count: u32,
    pub end: f64,
    pub start: f64,
}
impl AutoExcludeHistogramBin {
    pub fn builder() -> builder::AutoExcludeHistogramBin {
        Default::default()
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
#[doc = "`AutoExcludePreviewCellScore`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"i\","]
#[doc = "    \"j\","]
#[doc = "    \"score\""]
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
#[doc = "    },"]
#[doc = "    \"score\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AutoExcludePreviewCellScore {
    #[doc = "an integer"]
    pub i: i32,
    #[doc = "an integer"]
    pub j: i32,
    pub score: f64,
}
impl AutoExcludePreviewCellScore {
    pub fn builder() -> builder::AutoExcludePreviewCellScore {
        Default::default()
    }
}
#[doc = "`AutoExcludePreviewRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"cells\","]
#[doc = "    \"selection\","]
#[doc = "    \"source\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"cells\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AutoExcludePreviewCell\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"selection\": {"]
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
pub struct AutoExcludePreviewRequest {
    pub cells: ::std::vec::Vec<AutoExcludePreviewCell>,
    pub selection: FrameRequest,
    pub source: AlignerSource,
}
impl AutoExcludePreviewRequest {
    pub fn builder() -> builder::AutoExcludePreviewRequest {
        Default::default()
    }
}
#[doc = "`AutoExcludePreviewResponse`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"cellScores\","]
#[doc = "    \"eligibleCellCount\","]
#[doc = "    \"histogramBins\","]
#[doc = "    \"scoreMax\","]
#[doc = "    \"scoreMin\","]
#[doc = "    \"threshold\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"cellScores\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AutoExcludePreviewCellScore\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"eligibleCellCount\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"histogramBins\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AutoExcludeHistogramBin\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"scoreMax\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"scoreMin\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
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
pub struct AutoExcludePreviewResponse {
    #[serde(rename = "cellScores")]
    pub cell_scores: ::std::vec::Vec<AutoExcludePreviewCellScore>,
    #[serde(rename = "eligibleCellCount")]
    pub eligible_cell_count: u32,
    #[serde(rename = "histogramBins")]
    pub histogram_bins: ::std::vec::Vec<AutoExcludeHistogramBin>,
    #[serde(rename = "scoreMax")]
    pub score_max: f64,
    #[serde(rename = "scoreMin")]
    pub score_min: f64,
    pub threshold: f64,
}
impl AutoExcludePreviewResponse {
    pub fn builder() -> builder::AutoExcludePreviewResponse {
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
#[doc = "`CropRoiProgressMessage`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"progress\","]
#[doc = "    \"type\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"progress\": {"]
#[doc = "      \"$ref\": \"#/definitions/CropRoiProgress\""]
#[doc = "    },"]
#[doc = "    \"type\": {"]
#[doc = "      \"type\": \"string\","]
#[doc = "      \"enum\": ["]
#[doc = "        \"cropRoiProgress\""]
#[doc = "      ]"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct CropRoiProgressMessage {
    pub progress: CropRoiProgress,
    #[serde(rename = "type")]
    pub type_: CropRoiProgressMessageType,
}
impl CropRoiProgressMessage {
    pub fn builder() -> builder::CropRoiProgressMessage {
        Default::default()
    }
}
#[doc = "`CropRoiProgressMessageType`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"cropRoiProgress\""]
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
pub enum CropRoiProgressMessageType {
    #[serde(rename = "cropRoiProgress")]
    CropRoiProgress,
}
impl ::std::fmt::Display for CropRoiProgressMessageType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CropRoiProgress => f.write_str("cropRoiProgress"),
        }
    }
}
impl ::std::str::FromStr for CropRoiProgressMessageType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "cropRoiProgress" => Ok(Self::CropRoiProgress),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CropRoiProgressMessageType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CropRoiProgressMessageType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CropRoiProgressMessageType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
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
#[doc = "    \"requestId\","]
#[doc = "    \"status\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
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
#[doc = "`Hello`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"app\","]
#[doc = "    \"version\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"app\": {"]
#[doc = "      \"$ref\": \"#/definitions/AppId\""]
#[doc = "    },"]
#[doc = "    \"version\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct Hello {
    pub app: AppId,
    pub version: ::std::string::String,
}
impl Hello {
    pub fn builder() -> builder::Hello {
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
#[doc = "      \"type\": \"number\""]
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
    pub pos: f64,
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
#[doc = "`ServerWsMessage`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"anyOf\": ["]
#[doc = "    {"]
#[doc = "      \"$ref\": \"#/definitions/Hello\""]
#[doc = "    },"]
#[doc = "    {"]
#[doc = "      \"$ref\": \"#/definitions/CropRoiProgressMessage\""]
#[doc = "    },"]
#[doc = "    {"]
#[doc = "      \"$ref\": \"#/definitions/AnalysisProgressMessage\""]
#[doc = "    }"]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
#[serde(untagged)]
pub enum ServerWsMessage {
    Hello(Hello),
    CropRoiProgressMessage(CropRoiProgressMessage),
    AnalysisProgressMessage(AnalysisProgressMessage),
}
impl ::std::convert::From<Hello> for ServerWsMessage {
    fn from(value: Hello) -> Self {
        Self::Hello(value)
    }
}
impl ::std::convert::From<CropRoiProgressMessage> for ServerWsMessage {
    fn from(value: CropRoiProgressMessage) -> Self {
        Self::CropRoiProgressMessage(value)
    }
}
impl ::std::convert::From<AnalysisProgressMessage> for ServerWsMessage {
    fn from(value: AnalysisProgressMessage) -> Self {
        Self::AnalysisProgressMessage(value)
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
#[doc = "    \"channels\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"integer\","]
#[doc = "        \"format\": \"uint32\","]
#[doc = "        \"minimum\": 0.0"]
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
pub struct WorkspaceScan {
    pub channels: ::std::vec::Vec<u32>,
    pub positions: ::std::vec::Vec<u32>,
    pub times: ::std::vec::Vec<u32>,
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
    pub struct AnalysisProgressMessage {
        progress: ::std::result::Result<super::AnalysisProgress, ::std::string::String>,
        type_: ::std::result::Result<super::AnalysisProgressMessageType, ::std::string::String>,
    }
    impl ::std::default::Default for AnalysisProgressMessage {
        fn default() -> Self {
            Self {
                progress: Err("no value supplied for progress".to_string()),
                type_: Err("no value supplied for type_".to_string()),
            }
        }
    }
    impl AnalysisProgressMessage {
        pub fn progress<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AnalysisProgress>,
            T::Error: ::std::fmt::Display,
        {
            self.progress = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for progress: {e}"));
            self
        }
        pub fn type_<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AnalysisProgressMessageType>,
            T::Error: ::std::fmt::Display,
        {
            self.type_ = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for type_: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AnalysisProgressMessage> for super::AnalysisProgressMessage {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AnalysisProgressMessage,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                progress: value.progress?,
                type_: value.type_?,
            })
        }
    }
    impl ::std::convert::From<super::AnalysisProgressMessage> for AnalysisProgressMessage {
        fn from(value: super::AnalysisProgressMessage) -> Self {
            Self {
                progress: Ok(value.progress),
                type_: Ok(value.type_),
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
    pub struct AssayBasicInfoStep1 {
        data_path: ::std::result::Result<::std::string::String, ::std::string::String>,
        date: ::std::result::Result<::std::string::String, ::std::string::String>,
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
                date: Err("no value supplied for date".to_string()),
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
        pub fn date<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.date = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for date: {e}"));
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
                date: value.date?,
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
                date: Ok(value.date),
                folder_filename_template: Ok(value.folder_filename_template),
                folder_subfolder_template: Ok(value.folder_subfolder_template),
                name: Ok(value.name),
                save_to: Ok(value.save_to),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayBasicInfoStep2 {
        pattern: ::std::result::Result<::std::string::String, ::std::string::String>,
        selected_features:
            ::std::result::Result<::std::vec::Vec<super::AssayFeature>, ::std::string::String>,
        timelapse_amount: ::std::result::Result<::std::option::Option<f64>, ::std::string::String>,
        timelapse_unit: ::std::result::Result<super::AssayTimelapseUnit, ::std::string::String>,
    }
    impl ::std::default::Default for AssayBasicInfoStep2 {
        fn default() -> Self {
            Self {
                pattern: Err("no value supplied for pattern".to_string()),
                selected_features: Err("no value supplied for selected_features".to_string()),
                timelapse_amount: Err("no value supplied for timelapse_amount".to_string()),
                timelapse_unit: Err("no value supplied for timelapse_unit".to_string()),
            }
        }
    }
    impl AssayBasicInfoStep2 {
        pub fn pattern<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.pattern = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for pattern: {e}"));
            self
        }
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
                pattern: value.pattern?,
                selected_features: value.selected_features?,
                timelapse_amount: value.timelapse_amount?,
                timelapse_unit: value.timelapse_unit?,
            })
        }
    }
    impl ::std::convert::From<super::AssayBasicInfoStep2> for AssayBasicInfoStep2 {
        fn from(value: super::AssayBasicInfoStep2) -> Self {
            Self {
                pattern: Ok(value.pattern),
                selected_features: Ok(value.selected_features),
                timelapse_amount: Ok(value.timelapse_amount),
                timelapse_unit: Ok(value.timelapse_unit),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayBasicInfoStep3 {
        samples_by_slide: ::std::result::Result<super::AssaySamplesBySlide, ::std::string::String>,
        selected_slide_id: ::std::result::Result<super::AssaySlideId, ::std::string::String>,
    }
    impl ::std::default::Default for AssayBasicInfoStep3 {
        fn default() -> Self {
            Self {
                samples_by_slide: Err("no value supplied for samples_by_slide".to_string()),
                selected_slide_id: Err("no value supplied for selected_slide_id".to_string()),
            }
        }
    }
    impl AssayBasicInfoStep3 {
        pub fn samples_by_slide<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssaySamplesBySlide>,
            T::Error: ::std::fmt::Display,
        {
            self.samples_by_slide = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for samples_by_slide: {e}"));
            self
        }
        pub fn selected_slide_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssaySlideId>,
            T::Error: ::std::fmt::Display,
        {
            self.selected_slide_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for selected_slide_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssayBasicInfoStep3> for super::AssayBasicInfoStep3 {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssayBasicInfoStep3,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                samples_by_slide: value.samples_by_slide?,
                selected_slide_id: value.selected_slide_id?,
            })
        }
    }
    impl ::std::convert::From<super::AssayBasicInfoStep3> for AssayBasicInfoStep3 {
        fn from(value: super::AssayBasicInfoStep3) -> Self {
            Self {
                samples_by_slide: Ok(value.samples_by_slide),
                selected_slide_id: Ok(value.selected_slide_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayJsonFile {
        assay_id: ::std::result::Result<super::AssayName, ::std::string::String>,
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
        pub fn assay_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayName>,
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
    pub struct AssaySamplesBySlide {
        slide_i:
            ::std::result::Result<::std::vec::Vec<super::AssaySampleRow>, ::std::string::String>,
        slide_vi:
            ::std::result::Result<::std::vec::Vec<super::AssaySampleRow>, ::std::string::String>,
    }
    impl ::std::default::Default for AssaySamplesBySlide {
        fn default() -> Self {
            Self {
                slide_i: Err("no value supplied for slide_i".to_string()),
                slide_vi: Err("no value supplied for slide_vi".to_string()),
            }
        }
    }
    impl AssaySamplesBySlide {
        pub fn slide_i<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::AssaySampleRow>>,
            T::Error: ::std::fmt::Display,
        {
            self.slide_i = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for slide_i: {e}"));
            self
        }
        pub fn slide_vi<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::AssaySampleRow>>,
            T::Error: ::std::fmt::Display,
        {
            self.slide_vi = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for slide_vi: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssaySamplesBySlide> for super::AssaySamplesBySlide {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssaySamplesBySlide,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                slide_i: value.slide_i?,
                slide_vi: value.slide_vi?,
            })
        }
    }
    impl ::std::convert::From<super::AssaySamplesBySlide> for AssaySamplesBySlide {
        fn from(value: super::AssaySamplesBySlide) -> Self {
            Self {
                slide_i: Ok(value.slide_i),
                slide_vi: Ok(value.slide_vi),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AutoExcludeHistogramBin {
        count: ::std::result::Result<u32, ::std::string::String>,
        end: ::std::result::Result<f64, ::std::string::String>,
        start: ::std::result::Result<f64, ::std::string::String>,
    }
    impl ::std::default::Default for AutoExcludeHistogramBin {
        fn default() -> Self {
            Self {
                count: Err("no value supplied for count".to_string()),
                end: Err("no value supplied for end".to_string()),
                start: Err("no value supplied for start".to_string()),
            }
        }
    }
    impl AutoExcludeHistogramBin {
        pub fn count<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.count = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for count: {e}"));
            self
        }
        pub fn end<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.end = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for end: {e}"));
            self
        }
        pub fn start<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.start = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for start: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AutoExcludeHistogramBin> for super::AutoExcludeHistogramBin {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AutoExcludeHistogramBin,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                count: value.count?,
                end: value.end?,
                start: value.start?,
            })
        }
    }
    impl ::std::convert::From<super::AutoExcludeHistogramBin> for AutoExcludeHistogramBin {
        fn from(value: super::AutoExcludeHistogramBin) -> Self {
            Self {
                count: Ok(value.count),
                end: Ok(value.end),
                start: Ok(value.start),
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
    pub struct AutoExcludePreviewCellScore {
        i: ::std::result::Result<i32, ::std::string::String>,
        j: ::std::result::Result<i32, ::std::string::String>,
        score: ::std::result::Result<f64, ::std::string::String>,
    }
    impl ::std::default::Default for AutoExcludePreviewCellScore {
        fn default() -> Self {
            Self {
                i: Err("no value supplied for i".to_string()),
                j: Err("no value supplied for j".to_string()),
                score: Err("no value supplied for score".to_string()),
            }
        }
    }
    impl AutoExcludePreviewCellScore {
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
        pub fn score<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.score = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for score: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AutoExcludePreviewCellScore> for super::AutoExcludePreviewCellScore {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AutoExcludePreviewCellScore,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                i: value.i?,
                j: value.j?,
                score: value.score?,
            })
        }
    }
    impl ::std::convert::From<super::AutoExcludePreviewCellScore> for AutoExcludePreviewCellScore {
        fn from(value: super::AutoExcludePreviewCellScore) -> Self {
            Self {
                i: Ok(value.i),
                j: Ok(value.j),
                score: Ok(value.score),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AutoExcludePreviewRequest {
        cells: ::std::result::Result<
            ::std::vec::Vec<super::AutoExcludePreviewCell>,
            ::std::string::String,
        >,
        selection: ::std::result::Result<super::FrameRequest, ::std::string::String>,
        source: ::std::result::Result<super::AlignerSource, ::std::string::String>,
    }
    impl ::std::default::Default for AutoExcludePreviewRequest {
        fn default() -> Self {
            Self {
                cells: Err("no value supplied for cells".to_string()),
                selection: Err("no value supplied for selection".to_string()),
                source: Err("no value supplied for source".to_string()),
            }
        }
    }
    impl AutoExcludePreviewRequest {
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
        pub fn selection<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::FrameRequest>,
            T::Error: ::std::fmt::Display,
        {
            self.selection = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for selection: {e}"));
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
    impl ::std::convert::TryFrom<AutoExcludePreviewRequest> for super::AutoExcludePreviewRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AutoExcludePreviewRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                cells: value.cells?,
                selection: value.selection?,
                source: value.source?,
            })
        }
    }
    impl ::std::convert::From<super::AutoExcludePreviewRequest> for AutoExcludePreviewRequest {
        fn from(value: super::AutoExcludePreviewRequest) -> Self {
            Self {
                cells: Ok(value.cells),
                selection: Ok(value.selection),
                source: Ok(value.source),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AutoExcludePreviewResponse {
        cell_scores: ::std::result::Result<
            ::std::vec::Vec<super::AutoExcludePreviewCellScore>,
            ::std::string::String,
        >,
        eligible_cell_count: ::std::result::Result<u32, ::std::string::String>,
        histogram_bins: ::std::result::Result<
            ::std::vec::Vec<super::AutoExcludeHistogramBin>,
            ::std::string::String,
        >,
        score_max: ::std::result::Result<f64, ::std::string::String>,
        score_min: ::std::result::Result<f64, ::std::string::String>,
        threshold: ::std::result::Result<f64, ::std::string::String>,
    }
    impl ::std::default::Default for AutoExcludePreviewResponse {
        fn default() -> Self {
            Self {
                cell_scores: Err("no value supplied for cell_scores".to_string()),
                eligible_cell_count: Err("no value supplied for eligible_cell_count".to_string()),
                histogram_bins: Err("no value supplied for histogram_bins".to_string()),
                score_max: Err("no value supplied for score_max".to_string()),
                score_min: Err("no value supplied for score_min".to_string()),
                threshold: Err("no value supplied for threshold".to_string()),
            }
        }
    }
    impl AutoExcludePreviewResponse {
        pub fn cell_scores<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::AutoExcludePreviewCellScore>>,
            T::Error: ::std::fmt::Display,
        {
            self.cell_scores = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for cell_scores: {e}"));
            self
        }
        pub fn eligible_cell_count<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.eligible_cell_count = value.try_into().map_err(|e| {
                format!("error converting supplied value for eligible_cell_count: {e}")
            });
            self
        }
        pub fn histogram_bins<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::AutoExcludeHistogramBin>>,
            T::Error: ::std::fmt::Display,
        {
            self.histogram_bins = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for histogram_bins: {e}"));
            self
        }
        pub fn score_max<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.score_max = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for score_max: {e}"));
            self
        }
        pub fn score_min<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.score_min = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for score_min: {e}"));
            self
        }
        pub fn threshold<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.threshold = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for threshold: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AutoExcludePreviewResponse> for super::AutoExcludePreviewResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AutoExcludePreviewResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                cell_scores: value.cell_scores?,
                eligible_cell_count: value.eligible_cell_count?,
                histogram_bins: value.histogram_bins?,
                score_max: value.score_max?,
                score_min: value.score_min?,
                threshold: value.threshold?,
            })
        }
    }
    impl ::std::convert::From<super::AutoExcludePreviewResponse> for AutoExcludePreviewResponse {
        fn from(value: super::AutoExcludePreviewResponse) -> Self {
            Self {
                cell_scores: Ok(value.cell_scores),
                eligible_cell_count: Ok(value.eligible_cell_count),
                histogram_bins: Ok(value.histogram_bins),
                score_max: Ok(value.score_max),
                score_min: Ok(value.score_min),
                threshold: Ok(value.threshold),
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
    pub struct CropRoiProgressMessage {
        progress: ::std::result::Result<super::CropRoiProgress, ::std::string::String>,
        type_: ::std::result::Result<super::CropRoiProgressMessageType, ::std::string::String>,
    }
    impl ::std::default::Default for CropRoiProgressMessage {
        fn default() -> Self {
            Self {
                progress: Err("no value supplied for progress".to_string()),
                type_: Err("no value supplied for type_".to_string()),
            }
        }
    }
    impl CropRoiProgressMessage {
        pub fn progress<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::CropRoiProgress>,
            T::Error: ::std::fmt::Display,
        {
            self.progress = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for progress: {e}"));
            self
        }
        pub fn type_<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::CropRoiProgressMessageType>,
            T::Error: ::std::fmt::Display,
        {
            self.type_ = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for type_: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<CropRoiProgressMessage> for super::CropRoiProgressMessage {
        type Error = super::error::ConversionError;
        fn try_from(
            value: CropRoiProgressMessage,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                progress: value.progress?,
                type_: value.type_?,
            })
        }
    }
    impl ::std::convert::From<super::CropRoiProgressMessage> for CropRoiProgressMessage {
        fn from(value: super::CropRoiProgressMessage) -> Self {
            Self {
                progress: Ok(value.progress),
                type_: Ok(value.type_),
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
        request_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        status: ::std::result::Result<super::CropRoiStatus, ::std::string::String>,
    }
    impl ::std::default::Default for CropRoiResponse {
        fn default() -> Self {
            Self {
                request_id: Err("no value supplied for request_id".to_string()),
                status: Err("no value supplied for status".to_string()),
            }
        }
    }
    impl CropRoiResponse {
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
                request_id: value.request_id?,
                status: value.status?,
            })
        }
    }
    impl ::std::convert::From<super::CropRoiResponse> for CropRoiResponse {
        fn from(value: super::CropRoiResponse) -> Self {
            Self {
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
    pub struct Hello {
        app: ::std::result::Result<super::AppId, ::std::string::String>,
        version: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for Hello {
        fn default() -> Self {
            Self {
                app: Err("no value supplied for app".to_string()),
                version: Err("no value supplied for version".to_string()),
            }
        }
    }
    impl Hello {
        pub fn app<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AppId>,
            T::Error: ::std::fmt::Display,
        {
            self.app = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for app: {e}"));
            self
        }
        pub fn version<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.version = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for version: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<Hello> for super::Hello {
        type Error = super::error::ConversionError;
        fn try_from(value: Hello) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                app: value.app?,
                version: value.version?,
            })
        }
    }
    impl ::std::convert::From<super::Hello> for Hello {
        fn from(value: super::Hello) -> Self {
            Self {
                app: Ok(value.app),
                version: Ok(value.version),
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
        pos: ::std::result::Result<f64, ::std::string::String>,
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
            T: ::std::convert::TryInto<f64>,
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
    pub struct WorkspaceScan {
        channels: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
        positions: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
        times: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
        z_slices: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
    }
    impl ::std::default::Default for WorkspaceScan {
        fn default() -> Self {
            Self {
                channels: Err("no value supplied for channels".to_string()),
                positions: Err("no value supplied for positions".to_string()),
                times: Err("no value supplied for times".to_string()),
                z_slices: Err("no value supplied for z_slices".to_string()),
            }
        }
    }
    impl WorkspaceScan {
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
    impl ::std::convert::TryFrom<WorkspaceScan> for super::WorkspaceScan {
        type Error = super::error::ConversionError;
        fn try_from(
            value: WorkspaceScan,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                channels: value.channels?,
                positions: value.positions?,
                times: value.times?,
                z_slices: value.z_slices?,
            })
        }
    }
    impl ::std::convert::From<super::WorkspaceScan> for WorkspaceScan {
        fn from(value: super::WorkspaceScan) -> Self {
            Self {
                channels: Ok(value.channels),
                positions: Ok(value.positions),
                times: Ok(value.times),
                z_slices: Ok(value.z_slices),
            }
        }
    }
}
