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
#[doc = "`AlignDrift`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"interpolation\","]
#[doc = "    \"keyframes\","]
#[doc = "    \"referenceTime\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"interpolation\": {"]
#[doc = "      \"type\": \"string\","]
#[doc = "      \"enum\": ["]
#[doc = "        \"linear\""]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"keyframes\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/DriftKeyframe\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"referenceTime\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AlignDrift {
    pub interpolation: AlignDriftInterpolation,
    pub keyframes: ::std::vec::Vec<DriftKeyframe>,
    #[serde(rename = "referenceTime")]
    pub reference_time: u32,
}
impl AlignDrift {
    pub fn builder() -> builder::AlignDrift {
        Default::default()
    }
}
#[doc = "`AlignDriftInterpolation`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"linear\""]
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
pub enum AlignDriftInterpolation {
    #[serde(rename = "linear")]
    Linear,
}
impl ::std::fmt::Display for AlignDriftInterpolation {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Linear => f.write_str("linear"),
        }
    }
}
impl ::std::str::FromStr for AlignDriftInterpolation {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "linear" => Ok(Self::Linear),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AlignDriftInterpolation {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AlignDriftInterpolation {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AlignDriftInterpolation {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`AlignGridPatternBox`"]
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
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"int32\""]
#[doc = "    },"]
#[doc = "    \"j\": {"]
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
pub struct AlignGridPatternBox {
    pub h: u32,
    pub i: i32,
    pub j: i32,
    pub w: u32,
    pub x: u32,
    pub y: u32,
}
impl AlignGridPatternBox {
    pub fn builder() -> builder::AlignGridPatternBox {
        Default::default()
    }
}
#[doc = "`AlignGridPatternCoord`"]
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
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"int32\""]
#[doc = "    },"]
#[doc = "    \"j\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"int32\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AlignGridPatternCoord {
    pub i: i32,
    pub j: i32,
}
impl AlignGridPatternCoord {
    pub fn builder() -> builder::AlignGridPatternCoord {
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
#[doc = "    \"enabled\","]
#[doc = "    \"opacity\","]
#[doc = "    \"patternHeight\","]
#[doc = "    \"patternWidth\","]
#[doc = "    \"rotation\","]
#[doc = "    \"shape\","]
#[doc = "    \"spacingA\","]
#[doc = "    \"spacingB\","]
#[doc = "    \"tx\","]
#[doc = "    \"ty\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"enabled\": {"]
#[doc = "      \"type\": \"boolean\""]
#[doc = "    },"]
#[doc = "    \"opacity\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"patternHeight\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"patternWidth\": {"]
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
    pub enabled: bool,
    pub opacity: f64,
    #[serde(rename = "patternHeight")]
    pub pattern_height: f64,
    #[serde(rename = "patternWidth")]
    pub pattern_width: f64,
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
#[doc = "    \"traces\","]
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
    #[serde(rename = "traces")]
    Traces,
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
            Self::Traces => f.write_str("traces"),
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
            "traces" => Ok(Self::Traces),
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
#[doc = "    \"channels\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayChannels\""]
#[doc = "    },"]
#[doc = "    \"maxOnsetMinutes\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"sampleChannels\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AssaySampleChannels\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"segmentationMode\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssaySegmentationMode\""]
#[doc = "    },"]
#[doc = "    \"skipSegment\": {"]
#[doc = "      \"type\": \"boolean\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssayAnalysisConfig {
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub channels: ::std::option::Option<AssayChannels>,
    #[serde(
        rename = "maxOnsetMinutes",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub max_onset_minutes: ::std::option::Option<f64>,
    #[serde(
        rename = "sampleChannels",
        default,
        skip_serializing_if = "::std::vec::Vec::is_empty"
    )]
    pub sample_channels: ::std::vec::Vec<AssaySampleChannels>,
    #[serde(
        rename = "segmentationMode",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub segmentation_mode: ::std::option::Option<AssaySegmentationMode>,
    #[serde(
        rename = "skipSegment",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub skip_segment: ::std::option::Option<bool>,
}
impl ::std::default::Default for AssayAnalysisConfig {
    fn default() -> Self {
        Self {
            channels: Default::default(),
            max_onset_minutes: Default::default(),
            sample_channels: Default::default(),
            segmentation_mode: Default::default(),
            skip_segment: Default::default(),
        }
    }
}
impl AssayAnalysisConfig {
    pub fn builder() -> builder::AssayAnalysisConfig {
        Default::default()
    }
}
#[doc = "`AssayChannels`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"segmentation\","]
#[doc = "    \"signal\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"segmentation\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"signal\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssaySignalChannels\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssayChannels {
    pub segmentation: u32,
    pub signal: AssaySignalChannels,
}
impl AssayChannels {
    pub fn builder() -> builder::AssayChannels {
        Default::default()
    }
}
#[doc = "`AssayData`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"oneOf\": ["]
#[doc = "    {"]
#[doc = "      \"type\": \"object\","]
#[doc = "      \"required\": ["]
#[doc = "        \"path\","]
#[doc = "        \"template\","]
#[doc = "        \"type\""]
#[doc = "      ],"]
#[doc = "      \"properties\": {"]
#[doc = "        \"path\": {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        \"template\": {"]
#[doc = "          \"$ref\": \"#/definitions/AssayFolderTemplate\""]
#[doc = "        },"]
#[doc = "        \"type\": {"]
#[doc = "          \"type\": \"string\","]
#[doc = "          \"enum\": ["]
#[doc = "            \"folder\""]
#[doc = "          ]"]
#[doc = "        }"]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    {"]
#[doc = "      \"type\": \"object\","]
#[doc = "      \"required\": ["]
#[doc = "        \"path\","]
#[doc = "        \"type\""]
#[doc = "      ],"]
#[doc = "      \"properties\": {"]
#[doc = "        \"path\": {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        \"type\": {"]
#[doc = "          \"type\": \"string\","]
#[doc = "          \"enum\": ["]
#[doc = "            \"nd2\""]
#[doc = "          ]"]
#[doc = "        }"]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    {"]
#[doc = "      \"type\": \"object\","]
#[doc = "      \"required\": ["]
#[doc = "        \"path\","]
#[doc = "        \"type\""]
#[doc = "      ],"]
#[doc = "      \"properties\": {"]
#[doc = "        \"path\": {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        \"type\": {"]
#[doc = "          \"type\": \"string\","]
#[doc = "          \"enum\": ["]
#[doc = "            \"czi\""]
#[doc = "          ]"]
#[doc = "        }"]
#[doc = "      }"]
#[doc = "    }"]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
#[serde(tag = "type")]
pub enum AssayData {
    #[serde(rename = "folder")]
    Folder {
        path: ::std::string::String,
        template: AssayFolderTemplate,
    },
    #[serde(rename = "nd2")]
    Nd2 { path: ::std::string::String },
    #[serde(rename = "czi")]
    Czi { path: ::std::string::String },
}
#[doc = "`AssayDataCzi`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"path\","]
#[doc = "    \"type\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"path\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"type\": {"]
#[doc = "      \"type\": \"string\","]
#[doc = "      \"enum\": ["]
#[doc = "        \"czi\""]
#[doc = "      ]"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssayDataCzi {
    pub path: ::std::string::String,
    #[serde(rename = "type")]
    pub type_: AssayDataCziType,
}
impl AssayDataCzi {
    pub fn builder() -> builder::AssayDataCzi {
        Default::default()
    }
}
#[doc = "`AssayDataCziType`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
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
pub enum AssayDataCziType {
    #[serde(rename = "czi")]
    Czi,
}
impl ::std::fmt::Display for AssayDataCziType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Czi => f.write_str("czi"),
        }
    }
}
impl ::std::str::FromStr for AssayDataCziType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "czi" => Ok(Self::Czi),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AssayDataCziType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AssayDataCziType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AssayDataCziType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`AssayDataFolder`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"path\","]
#[doc = "    \"template\","]
#[doc = "    \"type\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"path\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"template\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayFolderTemplate\""]
#[doc = "    },"]
#[doc = "    \"type\": {"]
#[doc = "      \"type\": \"string\","]
#[doc = "      \"enum\": ["]
#[doc = "        \"folder\""]
#[doc = "      ]"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssayDataFolder {
    pub path: ::std::string::String,
    pub template: AssayFolderTemplate,
    #[serde(rename = "type")]
    pub type_: AssayDataFolderType,
}
impl AssayDataFolder {
    pub fn builder() -> builder::AssayDataFolder {
        Default::default()
    }
}
#[doc = "`AssayDataFolderType`"]
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
pub enum AssayDataFolderType {
    #[serde(rename = "folder")]
    Folder,
}
impl ::std::fmt::Display for AssayDataFolderType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Folder => f.write_str("folder"),
        }
    }
}
impl ::std::str::FromStr for AssayDataFolderType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "folder" => Ok(Self::Folder),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AssayDataFolderType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AssayDataFolderType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AssayDataFolderType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`AssayDataNd2`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"path\","]
#[doc = "    \"type\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"path\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"type\": {"]
#[doc = "      \"type\": \"string\","]
#[doc = "      \"enum\": ["]
#[doc = "        \"nd2\""]
#[doc = "      ]"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssayDataNd2 {
    pub path: ::std::string::String,
    #[serde(rename = "type")]
    pub type_: AssayDataNd2Type,
}
impl AssayDataNd2 {
    pub fn builder() -> builder::AssayDataNd2 {
        Default::default()
    }
}
#[doc = "`AssayDataNd2Type`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"nd2\""]
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
pub enum AssayDataNd2Type {
    #[serde(rename = "nd2")]
    Nd2,
}
impl ::std::fmt::Display for AssayDataNd2Type {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Nd2 => f.write_str("nd2"),
        }
    }
}
impl ::std::str::FromStr for AssayDataNd2Type {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "nd2" => Ok(Self::Nd2),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AssayDataNd2Type {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AssayDataNd2Type {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AssayDataNd2Type {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`AssayFolderTemplate`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"filename\","]
#[doc = "    \"subfolder\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"filename\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"subfolder\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssayFolderTemplate {
    pub filename: ::std::string::String,
    pub subfolder: ::std::string::String,
}
impl AssayFolderTemplate {
    pub fn builder() -> builder::AssayFolderTemplate {
        Default::default()
    }
}
#[doc = "`AssayInterval`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"unit\","]
#[doc = "    \"value\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"unit\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayIntervalUnit\""]
#[doc = "    },"]
#[doc = "    \"value\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"number\","]
#[doc = "          \"format\": \"double\""]
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
pub struct AssayInterval {
    pub unit: AssayIntervalUnit,
    pub value: ::std::option::Option<f64>,
}
impl AssayInterval {
    pub fn builder() -> builder::AssayInterval {
        Default::default()
    }
}
#[doc = "`AssayIntervalUnit`"]
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
pub enum AssayIntervalUnit {
    #[serde(rename = "second")]
    Second,
    #[serde(rename = "minute")]
    Minute,
    #[serde(rename = "hour")]
    Hour,
}
impl ::std::fmt::Display for AssayIntervalUnit {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Second => f.write_str("second"),
            Self::Minute => f.write_str("minute"),
            Self::Hour => f.write_str("hour"),
        }
    }
}
impl ::std::str::FromStr for AssayIntervalUnit {
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
impl ::std::convert::TryFrom<&str> for AssayIntervalUnit {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AssayIntervalUnit {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AssayIntervalUnit {
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
#[doc = "    \"data\","]
#[doc = "    \"interval\","]
#[doc = "    \"name\","]
#[doc = "    \"samples\","]
#[doc = "    \"type\","]
#[doc = "    \"workspace\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"analysis\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayAnalysisConfig\""]
#[doc = "    },"]
#[doc = "    \"data\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayData\""]
#[doc = "    },"]
#[doc = "    \"interval\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayInterval\""]
#[doc = "    },"]
#[doc = "    \"name\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"samples\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssaySamples\""]
#[doc = "    },"]
#[doc = "    \"type\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayType\""]
#[doc = "    },"]
#[doc = "    \"workspace\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssayWorkspace\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssayJsonFile {
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub analysis: ::std::option::Option<AssayAnalysisConfig>,
    pub data: AssayData,
    pub interval: AssayInterval,
    pub name: ::std::string::String,
    pub samples: AssaySamples,
    #[serde(rename = "type")]
    pub type_: AssayType,
    pub workspace: AssayWorkspace,
}
impl AssayJsonFile {
    pub fn builder() -> builder::AssayJsonFile {
        Default::default()
    }
}
#[doc = "`AssaySampleChannels`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"sample\","]
#[doc = "    \"segmentation\","]
#[doc = "    \"signal\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"sample\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"segmentation\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"signal\": {"]
#[doc = "      \"$ref\": \"#/definitions/AssaySignalChannels\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssaySampleChannels {
    pub sample: ::std::string::String,
    pub segmentation: u32,
    pub signal: AssaySignalChannels,
}
impl AssaySampleChannels {
    pub fn builder() -> builder::AssaySampleChannels {
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
#[doc = "    \"name\","]
#[doc = "    \"positions\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"name\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"positions\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct AssaySampleRow {
    pub name: ::std::string::String,
    pub positions: ::std::string::String,
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
#[doc = "`AssaySegmentationMode`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"logstd\","]
#[doc = "    \"smart\""]
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
pub enum AssaySegmentationMode {
    #[serde(rename = "logstd")]
    Logstd,
    #[serde(rename = "smart")]
    Smart,
}
impl ::std::fmt::Display for AssaySegmentationMode {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Logstd => f.write_str("logstd"),
            Self::Smart => f.write_str("smart"),
        }
    }
}
impl ::std::str::FromStr for AssaySegmentationMode {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "logstd" => Ok(Self::Logstd),
            "smart" => Ok(Self::Smart),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AssaySegmentationMode {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AssaySegmentationMode {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AssaySegmentationMode {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`AssaySignalChannels`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"array\","]
#[doc = "  \"items\": {"]
#[doc = "    \"type\": \"integer\","]
#[doc = "    \"format\": \"uint32\","]
#[doc = "    \"minimum\": 0.0"]
#[doc = "  },"]
#[doc = "  \"minItems\": 1,"]
#[doc = "  \"prefixItems\": ["]
#[doc = "    {"]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0,"]
#[doc = "      \"type\": \"integer\""]
#[doc = "    }"]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
#[serde(transparent)]
pub struct AssaySignalChannels(pub ::std::vec::Vec<u32>);
impl ::std::ops::Deref for AssaySignalChannels {
    type Target = ::std::vec::Vec<u32>;
    fn deref(&self) -> &::std::vec::Vec<u32> {
        &self.0
    }
}
impl ::std::convert::From<AssaySignalChannels> for ::std::vec::Vec<u32> {
    fn from(value: AssaySignalChannels) -> Self {
        value.0
    }
}
impl ::std::convert::From<::std::vec::Vec<u32>> for AssaySignalChannels {
    fn from(value: ::std::vec::Vec<u32>) -> Self {
        Self(value)
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
#[doc = "    \"transfection\","]
#[doc = "    \"killing\","]
#[doc = "    \"killing-engagement\","]
#[doc = "    \"lnp-binding\""]
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
    #[serde(rename = "transfection")]
    Transfection,
    #[serde(rename = "killing")]
    Killing,
    #[serde(rename = "killing-engagement")]
    KillingEngagement,
    #[serde(rename = "lnp-binding")]
    LnpBinding,
}
impl ::std::fmt::Display for AssayType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Transfection => f.write_str("transfection"),
            Self::Killing => f.write_str("killing"),
            Self::KillingEngagement => f.write_str("killing-engagement"),
            Self::LnpBinding => f.write_str("lnp-binding"),
        }
    }
}
impl ::std::str::FromStr for AssayType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "transfection" => Ok(Self::Transfection),
            "killing" => Ok(Self::Killing),
            "killing-engagement" => Ok(Self::KillingEngagement),
            "lnp-binding" => Ok(Self::LnpBinding),
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
#[doc = "`AssayWorkspace`"]
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
pub struct AssayWorkspace {
    pub path: ::std::string::String,
}
impl AssayWorkspace {
    pub fn builder() -> builder::AssayWorkspace {
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
#[doc = "`DriftKeyframe`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"dx\","]
#[doc = "    \"dy\","]
#[doc = "    \"time\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"dx\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"dy\": {"]
#[doc = "      \"type\": \"number\","]
#[doc = "      \"format\": \"double\""]
#[doc = "    },"]
#[doc = "    \"time\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct DriftKeyframe {
    pub dx: f64,
    pub dy: f64,
    pub time: u32,
}
impl DriftKeyframe {
    pub fn builder() -> builder::DriftKeyframe {
        Default::default()
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
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct HostDrive {
    pub letter: ::std::string::String,
    pub path: ::std::string::String,
}
impl HostDrive {
    pub fn builder() -> builder::HostDrive {
        Default::default()
    }
}
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct HostWindowsDrivesResponse {
    pub drives: ::std::vec::Vec<HostDrive>,
    pub windows: bool,
}
impl HostWindowsDrivesResponse {
    pub fn builder() -> builder::HostWindowsDrivesResponse {
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
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint64\","]
#[doc = "      \"maximum\": 9007199254740991.0,"]
#[doc = "      \"minimum\": 0.0"]
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
    pub last_used_at: u64,
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
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint64\","]
#[doc = "      \"maximum\": 9007199254740991.0,"]
#[doc = "      \"minimum\": 0.0"]
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
    pub last_used_at: u64,
    pub source: AlignerSource,
}
impl MemorySourceEntry {
    pub fn builder() -> builder::MemorySourceEntry {
        Default::default()
    }
}
#[doc = "`MemoryTouchRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"oneOf\": ["]
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
#[doc = "            \"workspace\""]
#[doc = "          ]"]
#[doc = "        },"]
#[doc = "        \"label\": {"]
#[doc = "          \"type\": \"string\""]
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
#[doc = "        \"source\""]
#[doc = "      ],"]
#[doc = "      \"properties\": {"]
#[doc = "        \"kind\": {"]
#[doc = "          \"type\": \"string\","]
#[doc = "          \"enum\": ["]
#[doc = "            \"source\""]
#[doc = "          ]"]
#[doc = "        },"]
#[doc = "        \"label\": {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        \"source\": {"]
#[doc = "          \"$ref\": \"#/definitions/AlignerSource\""]
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
#[doc = "        \"assayLabel\": {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        \"kind\": {"]
#[doc = "          \"type\": \"string\","]
#[doc = "          \"enum\": ["]
#[doc = "            \"assay\""]
#[doc = "          ]"]
#[doc = "        },"]
#[doc = "        \"path\": {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        \"workspacePath\": {"]
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
pub enum MemoryTouchRequest {
    #[serde(rename = "workspace")]
    Workspace {
        #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
        label: ::std::option::Option<::std::string::String>,
        path: ::std::string::String,
    },
    #[serde(rename = "source")]
    Source {
        #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
        label: ::std::option::Option<::std::string::String>,
        source: AlignerSource,
    },
    #[serde(rename = "assay")]
    Assay {
        #[serde(
            rename = "assayLabel",
            default,
            skip_serializing_if = "::std::option::Option::is_none"
        )]
        assay_label: ::std::option::Option<::std::string::String>,
        path: ::std::string::String,
        #[serde(
            rename = "workspacePath",
            default,
            skip_serializing_if = "::std::option::Option::is_none"
        )]
        workspace_path: ::std::option::Option<::std::string::String>,
    },
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
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint64\","]
#[doc = "      \"maximum\": 9007199254740991.0,"]
#[doc = "      \"minimum\": 0.0"]
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
    pub last_used_at: u64,
    pub path: ::std::string::String,
}
impl MemoryWorkspaceEntry {
    pub fn builder() -> builder::MemoryWorkspaceEntry {
        Default::default()
    }
}
#[doc = "`NullableCropRoiProgress`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"anyOf\": ["]
#[doc = "    {"]
#[doc = "      \"$ref\": \"#/definitions/CropRoiProgress\""]
#[doc = "    },"]
#[doc = "    {"]
#[doc = "      \"type\": \"null\""]
#[doc = "    }"]
#[doc = "  ]"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
#[serde(transparent)]
pub struct NullableCropRoiProgress(pub ::std::option::Option<CropRoiProgress>);
impl ::std::ops::Deref for NullableCropRoiProgress {
    type Target = ::std::option::Option<CropRoiProgress>;
    fn deref(&self) -> &::std::option::Option<CropRoiProgress> {
        &self.0
    }
}
impl ::std::convert::From<NullableCropRoiProgress> for ::std::option::Option<CropRoiProgress> {
    fn from(value: NullableCropRoiProgress) -> Self {
        value.0
    }
}
impl ::std::convert::From<::std::option::Option<CropRoiProgress>> for NullableCropRoiProgress {
    fn from(value: ::std::option::Option<CropRoiProgress>) -> Self {
        Self(value)
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
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint64\","]
#[doc = "      \"maximum\": 9007199254740991.0,"]
#[doc = "      \"minimum\": 0.0"]
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
    pub created_at: u64,
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
#[doc = "`RequestError`"]
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
#[doc = "        \"RequestError\""]
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
pub struct RequestError {
    pub message: ::std::string::String,
    #[serde(rename = "_tag")]
    pub tag: RequestErrorTag,
}
impl RequestError {
    pub fn builder() -> builder::RequestError {
        Default::default()
    }
}
#[doc = "`RequestErrorTag`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"RequestError\""]
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
pub enum RequestErrorTag {
    RequestError,
}
impl ::std::fmt::Display for RequestErrorTag {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::RequestError => f.write_str("RequestError"),
        }
    }
}
impl ::std::str::FromStr for RequestErrorTag {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "RequestError" => Ok(Self::RequestError),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for RequestErrorTag {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for RequestErrorTag {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for RequestErrorTag {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
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
#[doc = "    \"roi\""]
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
#[doc = "    \"position\","]
#[doc = "    \"rois\","]
#[doc = "    \"timeCount\","]
#[doc = "    \"zCount\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"axisOrder\": {"]
#[doc = "      \"type\": \"string\","]
#[doc = "      \"enum\": ["]
#[doc = "        \"TCZYX\""]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"channelCount\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
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
#[doc = "    \"timeCount\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"timeIndices\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"type\": \"integer\","]
#[doc = "        \"format\": \"uint32\","]
#[doc = "        \"minimum\": 0.0"]
#[doc = "      }"]
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
    pub axis_order: RoiIndexFileAxisOrder,
    #[serde(rename = "channelCount")]
    pub channel_count: u32,
    pub position: u32,
    pub rois: ::std::vec::Vec<RoiIndexEntry>,
    #[serde(rename = "timeCount")]
    pub time_count: u32,
    #[serde(
        rename = "timeIndices",
        default,
        skip_serializing_if = "::std::vec::Vec::is_empty"
    )]
    pub time_indices: ::std::vec::Vec<u32>,
    #[serde(rename = "zCount")]
    pub z_count: u32,
}
impl RoiIndexFile {
    pub fn builder() -> builder::RoiIndexFile {
        Default::default()
    }
}
#[doc = "`RoiIndexFileAxisOrder`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"string\","]
#[doc = "  \"enum\": ["]
#[doc = "    \"TCZYX\""]
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
pub enum RoiIndexFileAxisOrder {
    #[serde(rename = "TCZYX")]
    Tczyx,
}
impl ::std::fmt::Display for RoiIndexFileAxisOrder {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Tczyx => f.write_str("TCZYX"),
        }
    }
}
impl ::std::str::FromStr for RoiIndexFileAxisOrder {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "TCZYX" => Ok(Self::Tczyx),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for RoiIndexFileAxisOrder {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for RoiIndexFileAxisOrder {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for RoiIndexFileAxisOrder {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
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
#[doc = "    \"excludedPatterns\","]
#[doc = "    \"grid\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"drift\": {"]
#[doc = "      \"$ref\": \"#/definitions/AlignDrift\""]
#[doc = "    },"]
#[doc = "    \"excludedPatterns\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AlignGridPatternCoord\""]
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
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub drift: ::std::option::Option<AlignDrift>,
    #[serde(rename = "excludedPatterns")]
    pub excluded_patterns: ::std::vec::Vec<AlignGridPatternCoord>,
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
#[doc = "    \"contrast\","]
#[doc = "    \"patterns\","]
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
#[doc = "    \"patterns\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AlignGridPatternBox\""]
#[doc = "      }"]
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
    pub contrast: ::std::option::Option<ContrastWindow>,
    pub patterns: ::std::vec::Vec<AlignGridPatternBox>,
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
#[doc = "    \"excludedPatterns\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"excludedPatterns\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/AlignGridPatternCoord\""]
#[doc = "      }"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct SmartExcludeResponse {
    #[serde(rename = "excludedPatterns")]
    pub excluded_patterns: ::std::vec::Vec<AlignGridPatternCoord>,
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
#[doc = "`StepAttempt`"]
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
#[doc = "    \"startedAtMs\","]
#[doc = "    \"status\","]
#[doc = "    \"stepId\","]
#[doc = "    \"taskId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"attemptId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"error\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"$ref\": \"#/definitions/StepError\""]
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
#[doc = "      \"$ref\": \"#/definitions/StepStatus\""]
#[doc = "    },"]
#[doc = "    \"stepId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"taskId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct StepAttempt {
    #[serde(rename = "attemptId")]
    pub attempt_id: ::std::string::String,
    pub error: ::std::option::Option<StepError>,
    #[serde(rename = "finishedAtMs")]
    pub finished_at_ms: ::std::option::Option<u64>,
    #[serde(rename = "startedAtMs")]
    pub started_at_ms: ::std::option::Option<u64>,
    pub status: StepStatus,
    #[serde(rename = "stepId")]
    pub step_id: ::std::string::String,
    #[serde(rename = "taskId")]
    pub task_id: ::std::string::String,
}
impl StepAttempt {
    pub fn builder() -> builder::StepAttempt {
        Default::default()
    }
}
#[doc = "`StepCancelRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"stepId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"stepId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct StepCancelRequest {
    #[serde(rename = "stepId")]
    pub step_id: ::std::string::String,
}
impl StepCancelRequest {
    pub fn builder() -> builder::StepCancelRequest {
        Default::default()
    }
}
#[doc = "`StepDependencyBlock`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"error\","]
#[doc = "    \"status\","]
#[doc = "    \"stepId\","]
#[doc = "    \"stepKind\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"error\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"$ref\": \"#/definitions/StepError\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"status\": {"]
#[doc = "      \"$ref\": \"#/definitions/StepStatus\""]
#[doc = "    },"]
#[doc = "    \"stepId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"stepKind\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct StepDependencyBlock {
    pub error: ::std::option::Option<StepError>,
    pub status: StepStatus,
    #[serde(rename = "stepId")]
    pub step_id: ::std::string::String,
    #[serde(rename = "stepKind")]
    pub step_kind: ::std::string::String,
}
impl StepDependencyBlock {
    pub fn builder() -> builder::StepDependencyBlock {
        Default::default()
    }
}
#[doc = "`StepDetail`"]
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
#[doc = "    \"status\","]
#[doc = "    \"stepId\","]
#[doc = "    \"stepKind\","]
#[doc = "    \"taskId\","]
#[doc = "    \"weight\","]
#[doc = "    \"workspaceId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"attempts\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/StepAttempt\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"blockedBy\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/StepDependencyBlock\""]
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
#[doc = "    \"status\": {"]
#[doc = "      \"$ref\": \"#/definitions/StepStatus\""]
#[doc = "    },"]
#[doc = "    \"stepId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"stepKind\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"taskId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"weight\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"workProgress\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"$ref\": \"#/definitions/StepWorkProgress\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"workspaceId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct StepDetail {
    pub attempts: ::std::vec::Vec<StepAttempt>,
    #[serde(rename = "blockedBy")]
    pub blocked_by: ::std::vec::Vec<StepDependencyBlock>,
    pub dependencies: ::std::vec::Vec<::std::string::String>,
    #[serde(rename = "enqueueOrder")]
    pub enqueue_order: u64,
    pub status: StepStatus,
    #[serde(rename = "stepId")]
    pub step_id: ::std::string::String,
    #[serde(rename = "stepKind")]
    pub step_kind: ::std::string::String,
    #[serde(rename = "taskId")]
    pub task_id: ::std::string::String,
    pub weight: u32,
    #[serde(
        rename = "workProgress",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub work_progress: ::std::option::Option<StepWorkProgress>,
    #[serde(rename = "workspaceId")]
    pub workspace_id: ::std::string::String,
}
impl StepDetail {
    pub fn builder() -> builder::StepDetail {
        Default::default()
    }
}
#[doc = "`StepDetailQuery`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"stepId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"stepId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct StepDetailQuery {
    #[serde(rename = "stepId")]
    pub step_id: ::std::string::String,
}
impl StepDetailQuery {
    pub fn builder() -> builder::StepDetailQuery {
        Default::default()
    }
}
#[doc = "`StepError`"]
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
pub struct StepError {
    pub code: ::std::string::String,
    pub message: ::std::string::String,
}
impl StepError {
    pub fn builder() -> builder::StepError {
        Default::default()
    }
}
#[doc = "`StepRetryRequest`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"stepId\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"stepId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct StepRetryRequest {
    #[serde(rename = "stepId")]
    pub step_id: ::std::string::String,
}
impl StepRetryRequest {
    pub fn builder() -> builder::StepRetryRequest {
        Default::default()
    }
}
#[doc = "`StepStatus`"]
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
pub enum StepStatus {
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
impl ::std::fmt::Display for StepStatus {
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
impl ::std::str::FromStr for StepStatus {
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
impl ::std::convert::TryFrom<&str> for StepStatus {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for StepStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for StepStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`StepWorkProgress`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"completed\","]
#[doc = "    \"message\","]
#[doc = "    \"phase\","]
#[doc = "    \"total\","]
#[doc = "    \"unit\","]
#[doc = "    \"updatedAtMs\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"completed\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
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
#[doc = "    \"phase\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"total\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint32\","]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"unit\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"updatedAtMs\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint64\","]
#[doc = "      \"maximum\": 9007199254740991.0,"]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct StepWorkProgress {
    pub completed: u32,
    pub message: ::std::option::Option<::std::string::String>,
    pub phase: ::std::option::Option<::std::string::String>,
    pub total: u32,
    pub unit: ::std::string::String,
    #[serde(rename = "updatedAtMs")]
    pub updated_at_ms: u64,
}
impl StepWorkProgress {
    pub fn builder() -> builder::StepWorkProgress {
        Default::default()
    }
}
#[doc = "`TaskAttention`"]
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
pub enum TaskAttention {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "error")]
    Error,
}
impl ::std::fmt::Display for TaskAttention {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::None => f.write_str("none"),
            Self::Error => f.write_str("error"),
        }
    }
}
impl ::std::str::FromStr for TaskAttention {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "none" => Ok(Self::None),
            "error" => Ok(Self::Error),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for TaskAttention {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for TaskAttention {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for TaskAttention {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
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
#[doc = "        \"task\","]
#[doc = "        \"step\""]
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
#[doc = "    \"task\","]
#[doc = "    \"step\""]
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
    #[serde(rename = "task")]
    Task,
    #[serde(rename = "step")]
    Step,
}
impl ::std::fmt::Display for TaskCommandErrorEntity {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Task => f.write_str("task"),
            Self::Step => f.write_str("step"),
        }
    }
}
impl ::std::str::FromStr for TaskCommandErrorEntity {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "task" => Ok(Self::Task),
            "step" => Ok(Self::Step),
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
#[doc = "`TaskDetail`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"object\","]
#[doc = "  \"required\": ["]
#[doc = "    \"steps\","]
#[doc = "    \"task\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"steps\": {"]
#[doc = "      \"type\": \"array\","]
#[doc = "      \"items\": {"]
#[doc = "        \"$ref\": \"#/definitions/StepDetail\""]
#[doc = "      }"]
#[doc = "    },"]
#[doc = "    \"task\": {"]
#[doc = "      \"$ref\": \"#/definitions/TaskSummary\""]
#[doc = "    }"]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
pub struct TaskDetail {
    pub steps: ::std::vec::Vec<StepDetail>,
    pub task: TaskSummary,
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
#[doc = "`TaskList`"]
#[doc = r""]
#[doc = r" <details><summary>JSON schema</summary>"]
#[doc = r""]
#[doc = r" ```json"]
#[doc = "{"]
#[doc = "  \"type\": \"array\","]
#[doc = "  \"items\": {"]
#[doc = "    \"$ref\": \"#/definitions/TaskSummary\""]
#[doc = "  }"]
#[doc = "}"]
#[doc = r" ```"]
#[doc = r" </details>"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug)]
#[serde(transparent)]
pub struct TaskList(pub ::std::vec::Vec<TaskSummary>);
impl ::std::ops::Deref for TaskList {
    type Target = ::std::vec::Vec<TaskSummary>;
    fn deref(&self) -> &::std::vec::Vec<TaskSummary> {
        &self.0
    }
}
impl ::std::convert::From<TaskList> for ::std::vec::Vec<TaskSummary> {
    fn from(value: TaskList) -> Self {
        value.0
    }
}
impl ::std::convert::From<::std::vec::Vec<TaskSummary>> for TaskList {
    fn from(value: ::std::vec::Vec<TaskSummary>) -> Self {
        Self(value)
    }
}
#[doc = "`TaskProgress`"]
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
pub struct TaskProgress {
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
impl TaskProgress {
    pub fn builder() -> builder::TaskProgress {
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
pub enum TaskStatus {
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
impl ::std::fmt::Display for TaskStatus {
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
impl ::std::str::FromStr for TaskStatus {
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
#[doc = "`TaskSummary`"]
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
#[doc = "    \"progress\","]
#[doc = "    \"status\","]
#[doc = "    \"taskId\","]
#[doc = "    \"updatedAtMs\","]
#[doc = "    \"workspaceId\","]
#[doc = "    \"workspacePath\""]
#[doc = "  ],"]
#[doc = "  \"properties\": {"]
#[doc = "    \"activeStepKind\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"type\": \"string\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
#[doc = "    },"]
#[doc = "    \"attention\": {"]
#[doc = "      \"$ref\": \"#/definitions/TaskAttention\""]
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
#[doc = "    \"progress\": {"]
#[doc = "      \"$ref\": \"#/definitions/TaskProgress\""]
#[doc = "    },"]
#[doc = "    \"status\": {"]
#[doc = "      \"$ref\": \"#/definitions/TaskStatus\""]
#[doc = "    },"]
#[doc = "    \"taskId\": {"]
#[doc = "      \"type\": \"string\""]
#[doc = "    },"]
#[doc = "    \"updatedAtMs\": {"]
#[doc = "      \"type\": \"integer\","]
#[doc = "      \"format\": \"uint64\","]
#[doc = "      \"maximum\": 9007199254740991.0,"]
#[doc = "      \"minimum\": 0.0"]
#[doc = "    },"]
#[doc = "    \"workProgress\": {"]
#[doc = "      \"anyOf\": ["]
#[doc = "        {"]
#[doc = "          \"$ref\": \"#/definitions/StepWorkProgress\""]
#[doc = "        },"]
#[doc = "        {"]
#[doc = "          \"type\": \"null\""]
#[doc = "        }"]
#[doc = "      ]"]
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
pub struct TaskSummary {
    #[serde(
        rename = "activeStepKind",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub active_step_kind: ::std::option::Option<::std::string::String>,
    pub attention: TaskAttention,
    #[serde(rename = "createdAtMs")]
    pub created_at_ms: u64,
    pub kind: ::std::string::String,
    pub mutating: bool,
    pub progress: TaskProgress,
    pub status: TaskStatus,
    #[serde(rename = "taskId")]
    pub task_id: ::std::string::String,
    #[serde(rename = "updatedAtMs")]
    pub updated_at_ms: u64,
    #[serde(
        rename = "workProgress",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub work_progress: ::std::option::Option<StepWorkProgress>,
    #[serde(rename = "workspaceId")]
    pub workspace_id: ::std::string::String,
    #[serde(rename = "workspacePath")]
    pub workspace_path: ::std::string::String,
}
impl TaskSummary {
    pub fn builder() -> builder::TaskSummary {
        Default::default()
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
    pub struct AlignDrift {
        interpolation: ::std::result::Result<super::AlignDriftInterpolation, ::std::string::String>,
        keyframes:
            ::std::result::Result<::std::vec::Vec<super::DriftKeyframe>, ::std::string::String>,
        reference_time: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for AlignDrift {
        fn default() -> Self {
            Self {
                interpolation: Err("no value supplied for interpolation".to_string()),
                keyframes: Err("no value supplied for keyframes".to_string()),
                reference_time: Err("no value supplied for reference_time".to_string()),
            }
        }
    }
    impl AlignDrift {
        pub fn interpolation<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AlignDriftInterpolation>,
            T::Error: ::std::fmt::Display,
        {
            self.interpolation = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for interpolation: {e}"));
            self
        }
        pub fn keyframes<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::DriftKeyframe>>,
            T::Error: ::std::fmt::Display,
        {
            self.keyframes = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for keyframes: {e}"));
            self
        }
        pub fn reference_time<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.reference_time = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for reference_time: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AlignDrift> for super::AlignDrift {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AlignDrift,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                interpolation: value.interpolation?,
                keyframes: value.keyframes?,
                reference_time: value.reference_time?,
            })
        }
    }
    impl ::std::convert::From<super::AlignDrift> for AlignDrift {
        fn from(value: super::AlignDrift) -> Self {
            Self {
                interpolation: Ok(value.interpolation),
                keyframes: Ok(value.keyframes),
                reference_time: Ok(value.reference_time),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AlignGridPatternBox {
        h: ::std::result::Result<u32, ::std::string::String>,
        i: ::std::result::Result<i32, ::std::string::String>,
        j: ::std::result::Result<i32, ::std::string::String>,
        w: ::std::result::Result<u32, ::std::string::String>,
        x: ::std::result::Result<u32, ::std::string::String>,
        y: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for AlignGridPatternBox {
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
    impl AlignGridPatternBox {
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
    impl ::std::convert::TryFrom<AlignGridPatternBox> for super::AlignGridPatternBox {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AlignGridPatternBox,
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
    impl ::std::convert::From<super::AlignGridPatternBox> for AlignGridPatternBox {
        fn from(value: super::AlignGridPatternBox) -> Self {
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
    pub struct AlignGridPatternCoord {
        i: ::std::result::Result<i32, ::std::string::String>,
        j: ::std::result::Result<i32, ::std::string::String>,
    }
    impl ::std::default::Default for AlignGridPatternCoord {
        fn default() -> Self {
            Self {
                i: Err("no value supplied for i".to_string()),
                j: Err("no value supplied for j".to_string()),
            }
        }
    }
    impl AlignGridPatternCoord {
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
    impl ::std::convert::TryFrom<AlignGridPatternCoord> for super::AlignGridPatternCoord {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AlignGridPatternCoord,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                i: value.i?,
                j: value.j?,
            })
        }
    }
    impl ::std::convert::From<super::AlignGridPatternCoord> for AlignGridPatternCoord {
        fn from(value: super::AlignGridPatternCoord) -> Self {
            Self {
                i: Ok(value.i),
                j: Ok(value.j),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AlignGridState {
        enabled: ::std::result::Result<bool, ::std::string::String>,
        opacity: ::std::result::Result<f64, ::std::string::String>,
        pattern_height: ::std::result::Result<f64, ::std::string::String>,
        pattern_width: ::std::result::Result<f64, ::std::string::String>,
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
                enabled: Err("no value supplied for enabled".to_string()),
                opacity: Err("no value supplied for opacity".to_string()),
                pattern_height: Err("no value supplied for pattern_height".to_string()),
                pattern_width: Err("no value supplied for pattern_width".to_string()),
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
        pub fn pattern_height<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.pattern_height = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for pattern_height: {e}"));
            self
        }
        pub fn pattern_width<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.pattern_width = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for pattern_width: {e}"));
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
                enabled: value.enabled?,
                opacity: value.opacity?,
                pattern_height: value.pattern_height?,
                pattern_width: value.pattern_width?,
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
                enabled: Ok(value.enabled),
                opacity: Ok(value.opacity),
                pattern_height: Ok(value.pattern_height),
                pattern_width: Ok(value.pattern_width),
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
        channels: ::std::result::Result<
            ::std::option::Option<super::AssayChannels>,
            ::std::string::String,
        >,
        max_onset_minutes: ::std::result::Result<::std::option::Option<f64>, ::std::string::String>,
        sample_channels: ::std::result::Result<
            ::std::vec::Vec<super::AssaySampleChannels>,
            ::std::string::String,
        >,
        segmentation_mode: ::std::result::Result<
            ::std::option::Option<super::AssaySegmentationMode>,
            ::std::string::String,
        >,
        skip_segment: ::std::result::Result<::std::option::Option<bool>, ::std::string::String>,
    }
    impl ::std::default::Default for AssayAnalysisConfig {
        fn default() -> Self {
            Self {
                channels: Ok(Default::default()),
                max_onset_minutes: Ok(Default::default()),
                sample_channels: Ok(Default::default()),
                segmentation_mode: Ok(Default::default()),
                skip_segment: Ok(Default::default()),
            }
        }
    }
    impl AssayAnalysisConfig {
        pub fn channels<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::AssayChannels>>,
            T::Error: ::std::fmt::Display,
        {
            self.channels = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for channels: {e}"));
            self
        }
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
        pub fn sample_channels<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::AssaySampleChannels>>,
            T::Error: ::std::fmt::Display,
        {
            self.sample_channels = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for sample_channels: {e}"));
            self
        }
        pub fn segmentation_mode<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::AssaySegmentationMode>>,
            T::Error: ::std::fmt::Display,
        {
            self.segmentation_mode = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for segmentation_mode: {e}"));
            self
        }
        pub fn skip_segment<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<bool>>,
            T::Error: ::std::fmt::Display,
        {
            self.skip_segment = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for skip_segment: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssayAnalysisConfig> for super::AssayAnalysisConfig {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssayAnalysisConfig,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                channels: value.channels?,
                max_onset_minutes: value.max_onset_minutes?,
                sample_channels: value.sample_channels?,
                segmentation_mode: value.segmentation_mode?,
                skip_segment: value.skip_segment?,
            })
        }
    }
    impl ::std::convert::From<super::AssayAnalysisConfig> for AssayAnalysisConfig {
        fn from(value: super::AssayAnalysisConfig) -> Self {
            Self {
                channels: Ok(value.channels),
                max_onset_minutes: Ok(value.max_onset_minutes),
                sample_channels: Ok(value.sample_channels),
                segmentation_mode: Ok(value.segmentation_mode),
                skip_segment: Ok(value.skip_segment),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayChannels {
        segmentation: ::std::result::Result<u32, ::std::string::String>,
        signal: ::std::result::Result<super::AssaySignalChannels, ::std::string::String>,
    }
    impl ::std::default::Default for AssayChannels {
        fn default() -> Self {
            Self {
                segmentation: Err("no value supplied for segmentation".to_string()),
                signal: Err("no value supplied for signal".to_string()),
            }
        }
    }
    impl AssayChannels {
        pub fn segmentation<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.segmentation = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for segmentation: {e}"));
            self
        }
        pub fn signal<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssaySignalChannels>,
            T::Error: ::std::fmt::Display,
        {
            self.signal = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for signal: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssayChannels> for super::AssayChannels {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssayChannels,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                segmentation: value.segmentation?,
                signal: value.signal?,
            })
        }
    }
    impl ::std::convert::From<super::AssayChannels> for AssayChannels {
        fn from(value: super::AssayChannels) -> Self {
            Self {
                segmentation: Ok(value.segmentation),
                signal: Ok(value.signal),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayDataCzi {
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
        type_: ::std::result::Result<super::AssayDataCziType, ::std::string::String>,
    }
    impl ::std::default::Default for AssayDataCzi {
        fn default() -> Self {
            Self {
                path: Err("no value supplied for path".to_string()),
                type_: Err("no value supplied for type_".to_string()),
            }
        }
    }
    impl AssayDataCzi {
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
        pub fn type_<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayDataCziType>,
            T::Error: ::std::fmt::Display,
        {
            self.type_ = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for type_: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssayDataCzi> for super::AssayDataCzi {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssayDataCzi,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                path: value.path?,
                type_: value.type_?,
            })
        }
    }
    impl ::std::convert::From<super::AssayDataCzi> for AssayDataCzi {
        fn from(value: super::AssayDataCzi) -> Self {
            Self {
                path: Ok(value.path),
                type_: Ok(value.type_),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayDataFolder {
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
        template: ::std::result::Result<super::AssayFolderTemplate, ::std::string::String>,
        type_: ::std::result::Result<super::AssayDataFolderType, ::std::string::String>,
    }
    impl ::std::default::Default for AssayDataFolder {
        fn default() -> Self {
            Self {
                path: Err("no value supplied for path".to_string()),
                template: Err("no value supplied for template".to_string()),
                type_: Err("no value supplied for type_".to_string()),
            }
        }
    }
    impl AssayDataFolder {
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
        pub fn template<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayFolderTemplate>,
            T::Error: ::std::fmt::Display,
        {
            self.template = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for template: {e}"));
            self
        }
        pub fn type_<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayDataFolderType>,
            T::Error: ::std::fmt::Display,
        {
            self.type_ = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for type_: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssayDataFolder> for super::AssayDataFolder {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssayDataFolder,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                path: value.path?,
                template: value.template?,
                type_: value.type_?,
            })
        }
    }
    impl ::std::convert::From<super::AssayDataFolder> for AssayDataFolder {
        fn from(value: super::AssayDataFolder) -> Self {
            Self {
                path: Ok(value.path),
                template: Ok(value.template),
                type_: Ok(value.type_),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayDataNd2 {
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
        type_: ::std::result::Result<super::AssayDataNd2Type, ::std::string::String>,
    }
    impl ::std::default::Default for AssayDataNd2 {
        fn default() -> Self {
            Self {
                path: Err("no value supplied for path".to_string()),
                type_: Err("no value supplied for type_".to_string()),
            }
        }
    }
    impl AssayDataNd2 {
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
        pub fn type_<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayDataNd2Type>,
            T::Error: ::std::fmt::Display,
        {
            self.type_ = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for type_: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssayDataNd2> for super::AssayDataNd2 {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssayDataNd2,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                path: value.path?,
                type_: value.type_?,
            })
        }
    }
    impl ::std::convert::From<super::AssayDataNd2> for AssayDataNd2 {
        fn from(value: super::AssayDataNd2) -> Self {
            Self {
                path: Ok(value.path),
                type_: Ok(value.type_),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayFolderTemplate {
        filename: ::std::result::Result<::std::string::String, ::std::string::String>,
        subfolder: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for AssayFolderTemplate {
        fn default() -> Self {
            Self {
                filename: Err("no value supplied for filename".to_string()),
                subfolder: Err("no value supplied for subfolder".to_string()),
            }
        }
    }
    impl AssayFolderTemplate {
        pub fn filename<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.filename = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for filename: {e}"));
            self
        }
        pub fn subfolder<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.subfolder = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for subfolder: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssayFolderTemplate> for super::AssayFolderTemplate {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssayFolderTemplate,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                filename: value.filename?,
                subfolder: value.subfolder?,
            })
        }
    }
    impl ::std::convert::From<super::AssayFolderTemplate> for AssayFolderTemplate {
        fn from(value: super::AssayFolderTemplate) -> Self {
            Self {
                filename: Ok(value.filename),
                subfolder: Ok(value.subfolder),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayInterval {
        unit: ::std::result::Result<super::AssayIntervalUnit, ::std::string::String>,
        value: ::std::result::Result<::std::option::Option<f64>, ::std::string::String>,
    }
    impl ::std::default::Default for AssayInterval {
        fn default() -> Self {
            Self {
                unit: Err("no value supplied for unit".to_string()),
                value: Err("no value supplied for value".to_string()),
            }
        }
    }
    impl AssayInterval {
        pub fn unit<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayIntervalUnit>,
            T::Error: ::std::fmt::Display,
        {
            self.unit = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for unit: {e}"));
            self
        }
        pub fn value<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<f64>>,
            T::Error: ::std::fmt::Display,
        {
            self.value = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for value: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssayInterval> for super::AssayInterval {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssayInterval,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                unit: value.unit?,
                value: value.value?,
            })
        }
    }
    impl ::std::convert::From<super::AssayInterval> for AssayInterval {
        fn from(value: super::AssayInterval) -> Self {
            Self {
                unit: Ok(value.unit),
                value: Ok(value.value),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayJsonFile {
        analysis: ::std::result::Result<
            ::std::option::Option<super::AssayAnalysisConfig>,
            ::std::string::String,
        >,
        data: ::std::result::Result<super::AssayData, ::std::string::String>,
        interval: ::std::result::Result<super::AssayInterval, ::std::string::String>,
        name: ::std::result::Result<::std::string::String, ::std::string::String>,
        samples: ::std::result::Result<super::AssaySamples, ::std::string::String>,
        type_: ::std::result::Result<super::AssayType, ::std::string::String>,
        workspace: ::std::result::Result<super::AssayWorkspace, ::std::string::String>,
    }
    impl ::std::default::Default for AssayJsonFile {
        fn default() -> Self {
            Self {
                analysis: Ok(Default::default()),
                data: Err("no value supplied for data".to_string()),
                interval: Err("no value supplied for interval".to_string()),
                name: Err("no value supplied for name".to_string()),
                samples: Err("no value supplied for samples".to_string()),
                type_: Err("no value supplied for type_".to_string()),
                workspace: Err("no value supplied for workspace".to_string()),
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
        pub fn data<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayData>,
            T::Error: ::std::fmt::Display,
        {
            self.data = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for data: {e}"));
            self
        }
        pub fn interval<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayInterval>,
            T::Error: ::std::fmt::Display,
        {
            self.interval = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for interval: {e}"));
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
        pub fn type_<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayType>,
            T::Error: ::std::fmt::Display,
        {
            self.type_ = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for type_: {e}"));
            self
        }
        pub fn workspace<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssayWorkspace>,
            T::Error: ::std::fmt::Display,
        {
            self.workspace = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for workspace: {e}"));
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
                data: value.data?,
                interval: value.interval?,
                name: value.name?,
                samples: value.samples?,
                type_: value.type_?,
                workspace: value.workspace?,
            })
        }
    }
    impl ::std::convert::From<super::AssayJsonFile> for AssayJsonFile {
        fn from(value: super::AssayJsonFile) -> Self {
            Self {
                analysis: Ok(value.analysis),
                data: Ok(value.data),
                interval: Ok(value.interval),
                name: Ok(value.name),
                samples: Ok(value.samples),
                type_: Ok(value.type_),
                workspace: Ok(value.workspace),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssaySampleChannels {
        sample: ::std::result::Result<::std::string::String, ::std::string::String>,
        segmentation: ::std::result::Result<u32, ::std::string::String>,
        signal: ::std::result::Result<super::AssaySignalChannels, ::std::string::String>,
    }
    impl ::std::default::Default for AssaySampleChannels {
        fn default() -> Self {
            Self {
                sample: Err("no value supplied for sample".to_string()),
                segmentation: Err("no value supplied for segmentation".to_string()),
                signal: Err("no value supplied for signal".to_string()),
            }
        }
    }
    impl AssaySampleChannels {
        pub fn sample<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.sample = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for sample: {e}"));
            self
        }
        pub fn segmentation<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<u32>,
            T::Error: ::std::fmt::Display,
        {
            self.segmentation = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for segmentation: {e}"));
            self
        }
        pub fn signal<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::AssaySignalChannels>,
            T::Error: ::std::fmt::Display,
        {
            self.signal = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for signal: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<AssaySampleChannels> for super::AssaySampleChannels {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssaySampleChannels,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                sample: value.sample?,
                segmentation: value.segmentation?,
                signal: value.signal?,
            })
        }
    }
    impl ::std::convert::From<super::AssaySampleChannels> for AssaySampleChannels {
        fn from(value: super::AssaySampleChannels) -> Self {
            Self {
                sample: Ok(value.sample),
                segmentation: Ok(value.segmentation),
                signal: Ok(value.signal),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssaySampleRow {
        name: ::std::result::Result<::std::string::String, ::std::string::String>,
        positions: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for AssaySampleRow {
        fn default() -> Self {
            Self {
                name: Err("no value supplied for name".to_string()),
                positions: Err("no value supplied for positions".to_string()),
            }
        }
    }
    impl AssaySampleRow {
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
    }
    impl ::std::convert::TryFrom<AssaySampleRow> for super::AssaySampleRow {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssaySampleRow,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                name: value.name?,
                positions: value.positions?,
            })
        }
    }
    impl ::std::convert::From<super::AssaySampleRow> for AssaySampleRow {
        fn from(value: super::AssaySampleRow) -> Self {
            Self {
                name: Ok(value.name),
                positions: Ok(value.positions),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct AssayWorkspace {
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for AssayWorkspace {
        fn default() -> Self {
            Self {
                path: Err("no value supplied for path".to_string()),
            }
        }
    }
    impl AssayWorkspace {
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
    impl ::std::convert::TryFrom<AssayWorkspace> for super::AssayWorkspace {
        type Error = super::error::ConversionError;
        fn try_from(
            value: AssayWorkspace,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self { path: value.path? })
        }
    }
    impl ::std::convert::From<super::AssayWorkspace> for AssayWorkspace {
        fn from(value: super::AssayWorkspace) -> Self {
            Self {
                path: Ok(value.path),
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
    pub struct DriftKeyframe {
        dx: ::std::result::Result<f64, ::std::string::String>,
        dy: ::std::result::Result<f64, ::std::string::String>,
        time: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for DriftKeyframe {
        fn default() -> Self {
            Self {
                dx: Err("no value supplied for dx".to_string()),
                dy: Err("no value supplied for dy".to_string()),
                time: Err("no value supplied for time".to_string()),
            }
        }
    }
    impl DriftKeyframe {
        pub fn dx<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.dx = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for dx: {e}"));
            self
        }
        pub fn dy<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<f64>,
            T::Error: ::std::fmt::Display,
        {
            self.dy = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for dy: {e}"));
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
    }
    impl ::std::convert::TryFrom<DriftKeyframe> for super::DriftKeyframe {
        type Error = super::error::ConversionError;
        fn try_from(
            value: DriftKeyframe,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                dx: value.dx?,
                dy: value.dy?,
                time: value.time?,
            })
        }
    }
    impl ::std::convert::From<super::DriftKeyframe> for DriftKeyframe {
        fn from(value: super::DriftKeyframe) -> Self {
            Self {
                dx: Ok(value.dx),
                dy: Ok(value.dy),
                time: Ok(value.time),
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
    pub struct HostDrive {
        letter: ::std::result::Result<::std::string::String, ::std::string::String>,
        path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for HostDrive {
        fn default() -> Self {
            Self {
                letter: Err("no value supplied for letter".to_string()),
                path: Err("no value supplied for path".to_string()),
            }
        }
    }
    impl HostDrive {
        pub fn letter<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.letter = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for letter: {e}"));
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
    impl ::std::convert::TryFrom<HostDrive> for super::HostDrive {
        type Error = super::error::ConversionError;
        fn try_from(value: HostDrive) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                letter: value.letter?,
                path: value.path?,
            })
        }
    }
    impl ::std::convert::From<super::HostDrive> for HostDrive {
        fn from(value: super::HostDrive) -> Self {
            Self {
                letter: Ok(value.letter),
                path: Ok(value.path),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct HostWindowsDrivesResponse {
        drives: ::std::result::Result<::std::vec::Vec<super::HostDrive>, ::std::string::String>,
        windows: ::std::result::Result<bool, ::std::string::String>,
    }
    impl ::std::default::Default for HostWindowsDrivesResponse {
        fn default() -> Self {
            Self {
                drives: Err("no value supplied for drives".to_string()),
                windows: Err("no value supplied for windows".to_string()),
            }
        }
    }
    impl HostWindowsDrivesResponse {
        pub fn drives<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::HostDrive>>,
            T::Error: ::std::fmt::Display,
        {
            self.drives = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for drives: {e}"));
            self
        }
        pub fn windows<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<bool>,
            T::Error: ::std::fmt::Display,
        {
            self.windows = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for windows: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<HostWindowsDrivesResponse> for super::HostWindowsDrivesResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: HostWindowsDrivesResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                drives: value.drives?,
                windows: value.windows?,
            })
        }
    }
    impl ::std::convert::From<super::HostWindowsDrivesResponse> for HostWindowsDrivesResponse {
        fn from(value: super::HostWindowsDrivesResponse) -> Self {
            Self {
                drives: Ok(value.drives),
                windows: Ok(value.windows),
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
        last_used_at: ::std::result::Result<u64, ::std::string::String>,
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
            T: ::std::convert::TryInto<u64>,
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
        last_used_at: ::std::result::Result<u64, ::std::string::String>,
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
            T: ::std::convert::TryInto<u64>,
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
        last_used_at: ::std::result::Result<u64, ::std::string::String>,
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
            T: ::std::convert::TryInto<u64>,
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
        created_at: ::std::result::Result<u64, ::std::string::String>,
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
            T: ::std::convert::TryInto<u64>,
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
    pub struct RequestError {
        message: ::std::result::Result<::std::string::String, ::std::string::String>,
        tag: ::std::result::Result<super::RequestErrorTag, ::std::string::String>,
    }
    impl ::std::default::Default for RequestError {
        fn default() -> Self {
            Self {
                message: Err("no value supplied for message".to_string()),
                tag: Err("no value supplied for tag".to_string()),
            }
        }
    }
    impl RequestError {
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
            T: ::std::convert::TryInto<super::RequestErrorTag>,
            T::Error: ::std::fmt::Display,
        {
            self.tag = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for tag: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<RequestError> for super::RequestError {
        type Error = super::error::ConversionError;
        fn try_from(
            value: RequestError,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                message: value.message?,
                tag: value.tag?,
            })
        }
    }
    impl ::std::convert::From<super::RequestError> for RequestError {
        fn from(value: super::RequestError) -> Self {
            Self {
                message: Ok(value.message),
                tag: Ok(value.tag),
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
    }
    impl ::std::default::Default for RoiIndexEntry {
        fn default() -> Self {
            Self {
                bbox: Err("no value supplied for bbox".to_string()),
                file_name: Err("no value supplied for file_name".to_string()),
                roi: Err("no value supplied for roi".to_string()),
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
            })
        }
    }
    impl ::std::convert::From<super::RoiIndexEntry> for RoiIndexEntry {
        fn from(value: super::RoiIndexEntry) -> Self {
            Self {
                bbox: Ok(value.bbox),
                file_name: Ok(value.file_name),
                roi: Ok(value.roi),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct RoiIndexFile {
        axis_order: ::std::result::Result<super::RoiIndexFileAxisOrder, ::std::string::String>,
        channel_count: ::std::result::Result<u32, ::std::string::String>,
        position: ::std::result::Result<u32, ::std::string::String>,
        rois: ::std::result::Result<::std::vec::Vec<super::RoiIndexEntry>, ::std::string::String>,
        time_count: ::std::result::Result<u32, ::std::string::String>,
        time_indices: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
        z_count: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for RoiIndexFile {
        fn default() -> Self {
            Self {
                axis_order: Err("no value supplied for axis_order".to_string()),
                channel_count: Err("no value supplied for channel_count".to_string()),
                position: Err("no value supplied for position".to_string()),
                rois: Err("no value supplied for rois".to_string()),
                time_count: Err("no value supplied for time_count".to_string()),
                time_indices: Ok(Default::default()),
                z_count: Err("no value supplied for z_count".to_string()),
            }
        }
    }
    impl RoiIndexFile {
        pub fn axis_order<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::RoiIndexFileAxisOrder>,
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
        pub fn time_indices<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<u32>>,
            T::Error: ::std::fmt::Display,
        {
            self.time_indices = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for time_indices: {e}"));
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
                position: value.position?,
                rois: value.rois?,
                time_count: value.time_count?,
                time_indices: value.time_indices?,
                z_count: value.z_count?,
            })
        }
    }
    impl ::std::convert::From<super::RoiIndexFile> for RoiIndexFile {
        fn from(value: super::RoiIndexFile) -> Self {
            Self {
                axis_order: Ok(value.axis_order),
                channel_count: Ok(value.channel_count),
                position: Ok(value.position),
                rois: Ok(value.rois),
                time_count: Ok(value.time_count),
                time_indices: Ok(value.time_indices),
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
        times: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
        z_slices: ::std::result::Result<::std::vec::Vec<u32>, ::std::string::String>,
    }
    impl ::std::default::Default for RoiPositionScan {
        fn default() -> Self {
            Self {
                channels: Err("no value supplied for channels".to_string()),
                pos: Err("no value supplied for pos".to_string()),
                rois: Err("no value supplied for rois".to_string()),
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
        drift:
            ::std::result::Result<::std::option::Option<super::AlignDrift>, ::std::string::String>,
        excluded_patterns: ::std::result::Result<
            ::std::vec::Vec<super::AlignGridPatternCoord>,
            ::std::string::String,
        >,
        grid: ::std::result::Result<super::AlignGridState, ::std::string::String>,
    }
    impl ::std::default::Default for SavedAlignState {
        fn default() -> Self {
            Self {
                drift: Ok(Default::default()),
                excluded_patterns: Err("no value supplied for excluded_patterns".to_string()),
                grid: Err("no value supplied for grid".to_string()),
            }
        }
    }
    impl SavedAlignState {
        pub fn drift<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::AlignDrift>>,
            T::Error: ::std::fmt::Display,
        {
            self.drift = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for drift: {e}"));
            self
        }
        pub fn excluded_patterns<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::AlignGridPatternCoord>>,
            T::Error: ::std::fmt::Display,
        {
            self.excluded_patterns = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for excluded_patterns: {e}"));
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
                drift: value.drift?,
                excluded_patterns: value.excluded_patterns?,
                grid: value.grid?,
            })
        }
    }
    impl ::std::convert::From<super::SavedAlignState> for SavedAlignState {
        fn from(value: super::SavedAlignState) -> Self {
            Self {
                drift: Ok(value.drift),
                excluded_patterns: Ok(value.excluded_patterns),
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
        contrast: ::std::result::Result<
            ::std::option::Option<super::ContrastWindow>,
            ::std::string::String,
        >,
        patterns: ::std::result::Result<
            ::std::vec::Vec<super::AlignGridPatternBox>,
            ::std::string::String,
        >,
        request: ::std::result::Result<super::FrameRequest, ::std::string::String>,
        source: ::std::result::Result<super::AlignerSource, ::std::string::String>,
        threshold: ::std::result::Result<::std::option::Option<f64>, ::std::string::String>,
    }
    impl ::std::default::Default for SmartExcludeRequest {
        fn default() -> Self {
            Self {
                contrast: Err("no value supplied for contrast".to_string()),
                patterns: Err("no value supplied for patterns".to_string()),
                request: Err("no value supplied for request".to_string()),
                source: Err("no value supplied for source".to_string()),
                threshold: Ok(Default::default()),
            }
        }
    }
    impl SmartExcludeRequest {
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
        pub fn patterns<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::AlignGridPatternBox>>,
            T::Error: ::std::fmt::Display,
        {
            self.patterns = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for patterns: {e}"));
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
                contrast: value.contrast?,
                patterns: value.patterns?,
                request: value.request?,
                source: value.source?,
                threshold: value.threshold?,
            })
        }
    }
    impl ::std::convert::From<super::SmartExcludeRequest> for SmartExcludeRequest {
        fn from(value: super::SmartExcludeRequest) -> Self {
            Self {
                contrast: Ok(value.contrast),
                patterns: Ok(value.patterns),
                request: Ok(value.request),
                source: Ok(value.source),
                threshold: Ok(value.threshold),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct SmartExcludeResponse {
        excluded_patterns: ::std::result::Result<
            ::std::vec::Vec<super::AlignGridPatternCoord>,
            ::std::string::String,
        >,
    }
    impl ::std::default::Default for SmartExcludeResponse {
        fn default() -> Self {
            Self {
                excluded_patterns: Err("no value supplied for excluded_patterns".to_string()),
            }
        }
    }
    impl SmartExcludeResponse {
        pub fn excluded_patterns<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::AlignGridPatternCoord>>,
            T::Error: ::std::fmt::Display,
        {
            self.excluded_patterns = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for excluded_patterns: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<SmartExcludeResponse> for super::SmartExcludeResponse {
        type Error = super::error::ConversionError;
        fn try_from(
            value: SmartExcludeResponse,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                excluded_patterns: value.excluded_patterns?,
            })
        }
    }
    impl ::std::convert::From<super::SmartExcludeResponse> for SmartExcludeResponse {
        fn from(value: super::SmartExcludeResponse) -> Self {
            Self {
                excluded_patterns: Ok(value.excluded_patterns),
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
    pub struct StepAttempt {
        attempt_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        error:
            ::std::result::Result<::std::option::Option<super::StepError>, ::std::string::String>,
        finished_at_ms: ::std::result::Result<::std::option::Option<u64>, ::std::string::String>,
        started_at_ms: ::std::result::Result<::std::option::Option<u64>, ::std::string::String>,
        status: ::std::result::Result<super::StepStatus, ::std::string::String>,
        step_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        task_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for StepAttempt {
        fn default() -> Self {
            Self {
                attempt_id: Err("no value supplied for attempt_id".to_string()),
                error: Err("no value supplied for error".to_string()),
                finished_at_ms: Err("no value supplied for finished_at_ms".to_string()),
                started_at_ms: Err("no value supplied for started_at_ms".to_string()),
                status: Err("no value supplied for status".to_string()),
                step_id: Err("no value supplied for step_id".to_string()),
                task_id: Err("no value supplied for task_id".to_string()),
            }
        }
    }
    impl StepAttempt {
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
            T: ::std::convert::TryInto<::std::option::Option<super::StepError>>,
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
            T: ::std::convert::TryInto<super::StepStatus>,
            T::Error: ::std::fmt::Display,
        {
            self.status = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for status: {e}"));
            self
        }
        pub fn step_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.step_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for step_id: {e}"));
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
    impl ::std::convert::TryFrom<StepAttempt> for super::StepAttempt {
        type Error = super::error::ConversionError;
        fn try_from(
            value: StepAttempt,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                attempt_id: value.attempt_id?,
                error: value.error?,
                finished_at_ms: value.finished_at_ms?,
                started_at_ms: value.started_at_ms?,
                status: value.status?,
                step_id: value.step_id?,
                task_id: value.task_id?,
            })
        }
    }
    impl ::std::convert::From<super::StepAttempt> for StepAttempt {
        fn from(value: super::StepAttempt) -> Self {
            Self {
                attempt_id: Ok(value.attempt_id),
                error: Ok(value.error),
                finished_at_ms: Ok(value.finished_at_ms),
                started_at_ms: Ok(value.started_at_ms),
                status: Ok(value.status),
                step_id: Ok(value.step_id),
                task_id: Ok(value.task_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct StepCancelRequest {
        step_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for StepCancelRequest {
        fn default() -> Self {
            Self {
                step_id: Err("no value supplied for step_id".to_string()),
            }
        }
    }
    impl StepCancelRequest {
        pub fn step_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.step_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for step_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<StepCancelRequest> for super::StepCancelRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: StepCancelRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                step_id: value.step_id?,
            })
        }
    }
    impl ::std::convert::From<super::StepCancelRequest> for StepCancelRequest {
        fn from(value: super::StepCancelRequest) -> Self {
            Self {
                step_id: Ok(value.step_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct StepDependencyBlock {
        error:
            ::std::result::Result<::std::option::Option<super::StepError>, ::std::string::String>,
        status: ::std::result::Result<super::StepStatus, ::std::string::String>,
        step_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        step_kind: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for StepDependencyBlock {
        fn default() -> Self {
            Self {
                error: Err("no value supplied for error".to_string()),
                status: Err("no value supplied for status".to_string()),
                step_id: Err("no value supplied for step_id".to_string()),
                step_kind: Err("no value supplied for step_kind".to_string()),
            }
        }
    }
    impl StepDependencyBlock {
        pub fn error<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::StepError>>,
            T::Error: ::std::fmt::Display,
        {
            self.error = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for error: {e}"));
            self
        }
        pub fn status<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::StepStatus>,
            T::Error: ::std::fmt::Display,
        {
            self.status = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for status: {e}"));
            self
        }
        pub fn step_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.step_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for step_id: {e}"));
            self
        }
        pub fn step_kind<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.step_kind = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for step_kind: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<StepDependencyBlock> for super::StepDependencyBlock {
        type Error = super::error::ConversionError;
        fn try_from(
            value: StepDependencyBlock,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                error: value.error?,
                status: value.status?,
                step_id: value.step_id?,
                step_kind: value.step_kind?,
            })
        }
    }
    impl ::std::convert::From<super::StepDependencyBlock> for StepDependencyBlock {
        fn from(value: super::StepDependencyBlock) -> Self {
            Self {
                error: Ok(value.error),
                status: Ok(value.status),
                step_id: Ok(value.step_id),
                step_kind: Ok(value.step_kind),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct StepDetail {
        attempts: ::std::result::Result<::std::vec::Vec<super::StepAttempt>, ::std::string::String>,
        blocked_by: ::std::result::Result<
            ::std::vec::Vec<super::StepDependencyBlock>,
            ::std::string::String,
        >,
        dependencies:
            ::std::result::Result<::std::vec::Vec<::std::string::String>, ::std::string::String>,
        enqueue_order: ::std::result::Result<u64, ::std::string::String>,
        status: ::std::result::Result<super::StepStatus, ::std::string::String>,
        step_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        step_kind: ::std::result::Result<::std::string::String, ::std::string::String>,
        task_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        weight: ::std::result::Result<u32, ::std::string::String>,
        work_progress: ::std::result::Result<
            ::std::option::Option<super::StepWorkProgress>,
            ::std::string::String,
        >,
        workspace_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for StepDetail {
        fn default() -> Self {
            Self {
                attempts: Err("no value supplied for attempts".to_string()),
                blocked_by: Err("no value supplied for blocked_by".to_string()),
                dependencies: Err("no value supplied for dependencies".to_string()),
                enqueue_order: Err("no value supplied for enqueue_order".to_string()),
                status: Err("no value supplied for status".to_string()),
                step_id: Err("no value supplied for step_id".to_string()),
                step_kind: Err("no value supplied for step_kind".to_string()),
                task_id: Err("no value supplied for task_id".to_string()),
                weight: Err("no value supplied for weight".to_string()),
                work_progress: Ok(Default::default()),
                workspace_id: Err("no value supplied for workspace_id".to_string()),
            }
        }
    }
    impl StepDetail {
        pub fn attempts<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::StepAttempt>>,
            T::Error: ::std::fmt::Display,
        {
            self.attempts = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for attempts: {e}"));
            self
        }
        pub fn blocked_by<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::StepDependencyBlock>>,
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
        pub fn status<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::StepStatus>,
            T::Error: ::std::fmt::Display,
        {
            self.status = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for status: {e}"));
            self
        }
        pub fn step_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.step_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for step_id: {e}"));
            self
        }
        pub fn step_kind<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.step_kind = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for step_kind: {e}"));
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
        pub fn work_progress<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::StepWorkProgress>>,
            T::Error: ::std::fmt::Display,
        {
            self.work_progress = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for work_progress: {e}"));
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
    impl ::std::convert::TryFrom<StepDetail> for super::StepDetail {
        type Error = super::error::ConversionError;
        fn try_from(
            value: StepDetail,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                attempts: value.attempts?,
                blocked_by: value.blocked_by?,
                dependencies: value.dependencies?,
                enqueue_order: value.enqueue_order?,
                status: value.status?,
                step_id: value.step_id?,
                step_kind: value.step_kind?,
                task_id: value.task_id?,
                weight: value.weight?,
                work_progress: value.work_progress?,
                workspace_id: value.workspace_id?,
            })
        }
    }
    impl ::std::convert::From<super::StepDetail> for StepDetail {
        fn from(value: super::StepDetail) -> Self {
            Self {
                attempts: Ok(value.attempts),
                blocked_by: Ok(value.blocked_by),
                dependencies: Ok(value.dependencies),
                enqueue_order: Ok(value.enqueue_order),
                status: Ok(value.status),
                step_id: Ok(value.step_id),
                step_kind: Ok(value.step_kind),
                task_id: Ok(value.task_id),
                weight: Ok(value.weight),
                work_progress: Ok(value.work_progress),
                workspace_id: Ok(value.workspace_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct StepDetailQuery {
        step_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for StepDetailQuery {
        fn default() -> Self {
            Self {
                step_id: Err("no value supplied for step_id".to_string()),
            }
        }
    }
    impl StepDetailQuery {
        pub fn step_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.step_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for step_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<StepDetailQuery> for super::StepDetailQuery {
        type Error = super::error::ConversionError;
        fn try_from(
            value: StepDetailQuery,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                step_id: value.step_id?,
            })
        }
    }
    impl ::std::convert::From<super::StepDetailQuery> for StepDetailQuery {
        fn from(value: super::StepDetailQuery) -> Self {
            Self {
                step_id: Ok(value.step_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct StepError {
        code: ::std::result::Result<::std::string::String, ::std::string::String>,
        message: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for StepError {
        fn default() -> Self {
            Self {
                code: Err("no value supplied for code".to_string()),
                message: Err("no value supplied for message".to_string()),
            }
        }
    }
    impl StepError {
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
    impl ::std::convert::TryFrom<StepError> for super::StepError {
        type Error = super::error::ConversionError;
        fn try_from(
            value: StepError,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                code: value.code?,
                message: value.message?,
            })
        }
    }
    impl ::std::convert::From<super::StepError> for StepError {
        fn from(value: super::StepError) -> Self {
            Self {
                code: Ok(value.code),
                message: Ok(value.message),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct StepRetryRequest {
        step_id: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for StepRetryRequest {
        fn default() -> Self {
            Self {
                step_id: Err("no value supplied for step_id".to_string()),
            }
        }
    }
    impl StepRetryRequest {
        pub fn step_id<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.step_id = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for step_id: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<StepRetryRequest> for super::StepRetryRequest {
        type Error = super::error::ConversionError;
        fn try_from(
            value: StepRetryRequest,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                step_id: value.step_id?,
            })
        }
    }
    impl ::std::convert::From<super::StepRetryRequest> for StepRetryRequest {
        fn from(value: super::StepRetryRequest) -> Self {
            Self {
                step_id: Ok(value.step_id),
            }
        }
    }
    #[derive(Clone, Debug)]
    pub struct StepWorkProgress {
        completed: ::std::result::Result<u32, ::std::string::String>,
        message: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        phase: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        total: ::std::result::Result<u32, ::std::string::String>,
        unit: ::std::result::Result<::std::string::String, ::std::string::String>,
        updated_at_ms: ::std::result::Result<u64, ::std::string::String>,
    }
    impl ::std::default::Default for StepWorkProgress {
        fn default() -> Self {
            Self {
                completed: Err("no value supplied for completed".to_string()),
                message: Err("no value supplied for message".to_string()),
                phase: Err("no value supplied for phase".to_string()),
                total: Err("no value supplied for total".to_string()),
                unit: Err("no value supplied for unit".to_string()),
                updated_at_ms: Err("no value supplied for updated_at_ms".to_string()),
            }
        }
    }
    impl StepWorkProgress {
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
        pub fn phase<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.phase = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for phase: {e}"));
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
        pub fn unit<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::string::String>,
            T::Error: ::std::fmt::Display,
        {
            self.unit = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for unit: {e}"));
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
    }
    impl ::std::convert::TryFrom<StepWorkProgress> for super::StepWorkProgress {
        type Error = super::error::ConversionError;
        fn try_from(
            value: StepWorkProgress,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                completed: value.completed?,
                message: value.message?,
                phase: value.phase?,
                total: value.total?,
                unit: value.unit?,
                updated_at_ms: value.updated_at_ms?,
            })
        }
    }
    impl ::std::convert::From<super::StepWorkProgress> for StepWorkProgress {
        fn from(value: super::StepWorkProgress) -> Self {
            Self {
                completed: Ok(value.completed),
                message: Ok(value.message),
                phase: Ok(value.phase),
                total: Ok(value.total),
                unit: Ok(value.unit),
                updated_at_ms: Ok(value.updated_at_ms),
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
    pub struct TaskDetail {
        steps: ::std::result::Result<::std::vec::Vec<super::StepDetail>, ::std::string::String>,
        task: ::std::result::Result<super::TaskSummary, ::std::string::String>,
    }
    impl ::std::default::Default for TaskDetail {
        fn default() -> Self {
            Self {
                steps: Err("no value supplied for steps".to_string()),
                task: Err("no value supplied for task".to_string()),
            }
        }
    }
    impl TaskDetail {
        pub fn steps<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::vec::Vec<super::StepDetail>>,
            T::Error: ::std::fmt::Display,
        {
            self.steps = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for steps: {e}"));
            self
        }
        pub fn task<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::TaskSummary>,
            T::Error: ::std::fmt::Display,
        {
            self.task = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for task: {e}"));
            self
        }
    }
    impl ::std::convert::TryFrom<TaskDetail> for super::TaskDetail {
        type Error = super::error::ConversionError;
        fn try_from(
            value: TaskDetail,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                steps: value.steps?,
                task: value.task?,
            })
        }
    }
    impl ::std::convert::From<super::TaskDetail> for TaskDetail {
        fn from(value: super::TaskDetail) -> Self {
            Self {
                steps: Ok(value.steps),
                task: Ok(value.task),
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
    pub struct TaskProgress {
        blocked: ::std::result::Result<u32, ::std::string::String>,
        cancellation_requested: ::std::result::Result<u32, ::std::string::String>,
        cancelled: ::std::result::Result<u32, ::std::string::String>,
        completed: ::std::result::Result<u32, ::std::string::String>,
        failed: ::std::result::Result<u32, ::std::string::String>,
        queued: ::std::result::Result<u32, ::std::string::String>,
        running: ::std::result::Result<u32, ::std::string::String>,
        total: ::std::result::Result<u32, ::std::string::String>,
    }
    impl ::std::default::Default for TaskProgress {
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
    impl TaskProgress {
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
    impl ::std::convert::TryFrom<TaskProgress> for super::TaskProgress {
        type Error = super::error::ConversionError;
        fn try_from(
            value: TaskProgress,
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
    impl ::std::convert::From<super::TaskProgress> for TaskProgress {
        fn from(value: super::TaskProgress) -> Self {
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
    pub struct TaskSummary {
        active_step_kind: ::std::result::Result<
            ::std::option::Option<::std::string::String>,
            ::std::string::String,
        >,
        attention: ::std::result::Result<super::TaskAttention, ::std::string::String>,
        created_at_ms: ::std::result::Result<u64, ::std::string::String>,
        kind: ::std::result::Result<::std::string::String, ::std::string::String>,
        mutating: ::std::result::Result<bool, ::std::string::String>,
        progress: ::std::result::Result<super::TaskProgress, ::std::string::String>,
        status: ::std::result::Result<super::TaskStatus, ::std::string::String>,
        task_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        updated_at_ms: ::std::result::Result<u64, ::std::string::String>,
        work_progress: ::std::result::Result<
            ::std::option::Option<super::StepWorkProgress>,
            ::std::string::String,
        >,
        workspace_id: ::std::result::Result<::std::string::String, ::std::string::String>,
        workspace_path: ::std::result::Result<::std::string::String, ::std::string::String>,
    }
    impl ::std::default::Default for TaskSummary {
        fn default() -> Self {
            Self {
                active_step_kind: Ok(Default::default()),
                attention: Err("no value supplied for attention".to_string()),
                created_at_ms: Err("no value supplied for created_at_ms".to_string()),
                kind: Err("no value supplied for kind".to_string()),
                mutating: Err("no value supplied for mutating".to_string()),
                progress: Err("no value supplied for progress".to_string()),
                status: Err("no value supplied for status".to_string()),
                task_id: Err("no value supplied for task_id".to_string()),
                updated_at_ms: Err("no value supplied for updated_at_ms".to_string()),
                work_progress: Ok(Default::default()),
                workspace_id: Err("no value supplied for workspace_id".to_string()),
                workspace_path: Err("no value supplied for workspace_path".to_string()),
            }
        }
    }
    impl TaskSummary {
        pub fn active_step_kind<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<::std::string::String>>,
            T::Error: ::std::fmt::Display,
        {
            self.active_step_kind = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for active_step_kind: {e}"));
            self
        }
        pub fn attention<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::TaskAttention>,
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
        pub fn progress<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<super::TaskProgress>,
            T::Error: ::std::fmt::Display,
        {
            self.progress = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for progress: {e}"));
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
        pub fn work_progress<T>(mut self, value: T) -> Self
        where
            T: ::std::convert::TryInto<::std::option::Option<super::StepWorkProgress>>,
            T::Error: ::std::fmt::Display,
        {
            self.work_progress = value
                .try_into()
                .map_err(|e| format!("error converting supplied value for work_progress: {e}"));
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
    impl ::std::convert::TryFrom<TaskSummary> for super::TaskSummary {
        type Error = super::error::ConversionError;
        fn try_from(
            value: TaskSummary,
        ) -> ::std::result::Result<Self, super::error::ConversionError> {
            Ok(Self {
                active_step_kind: value.active_step_kind?,
                attention: value.attention?,
                created_at_ms: value.created_at_ms?,
                kind: value.kind?,
                mutating: value.mutating?,
                progress: value.progress?,
                status: value.status?,
                task_id: value.task_id?,
                updated_at_ms: value.updated_at_ms?,
                work_progress: value.work_progress?,
                workspace_id: value.workspace_id?,
                workspace_path: value.workspace_path?,
            })
        }
    }
    impl ::std::convert::From<super::TaskSummary> for TaskSummary {
        fn from(value: super::TaskSummary) -> Self {
            Self {
                active_step_kind: Ok(value.active_step_kind),
                attention: Ok(value.attention),
                created_at_ms: Ok(value.created_at_ms),
                kind: Ok(value.kind),
                mutating: Ok(value.mutating),
                progress: Ok(value.progress),
                status: Ok(value.status),
                task_id: Ok(value.task_id),
                updated_at_ms: Ok(value.updated_at_ms),
                work_progress: Ok(value.work_progress),
                workspace_id: Ok(value.workspace_id),
                workspace_path: Ok(value.workspace_path),
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
