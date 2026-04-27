use thiserror::Error;

#[derive(Error, Debug)]
pub enum Nd2Error {
    #[error("file error: {source}")]
    File { source: FileError },

    #[error("input error: {source}")]
    Input { source: InputError },

    #[error("internal error: {source}")]
    Internal { source: InternalError },

    #[error("unsupported: {source}")]
    Unsupported { source: UnsupportedError },
}

#[derive(Error, Debug)]
pub enum FileError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Invalid ND2 file: {context}")]
    InvalidFormat { context: String },

    #[error("SDK call failed: {function} returned {code}")]
    SdkCall { function: &'static str, code: i32 },

    #[error("SDK returned null from {function}")]
    NullPointer { function: &'static str },

    #[error("JSON parse error in {context}: {source}")]
    Json {
        context: &'static str,
        source: serde_json::Error,
    },

    #[error("UTF-8 decoding error in {context}: {source}")]
    Utf8 {
        context: &'static str,
        source: std::str::Utf8Error,
    },
}

#[derive(Error, Debug)]
pub enum InputError {
    #[error("{field} index out of range: got {index}, max {max}")]
    OutOfRange {
        field: String,
        index: usize,
        max: usize,
    },

    #[error("Invalid input for {field}: {detail}")]
    InvalidArgument { field: String, detail: String },
}

#[derive(Error, Debug)]
pub enum InternalError {
    #[error("Arithmetic overflow during {operation}")]
    Overflow { operation: String },

    #[error("Internal invariant violation: {detail}")]
    InvariantViolation { detail: String },
}

#[derive(Error, Debug)]
pub enum UnsupportedError {
    #[error("Unsupported pixel format: {detail}")]
    PixelFormat { detail: String },
}

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum ErrorSource {
    File,
    Input,
    Internal,
    Unsupported,
}

impl Nd2Error {
    pub fn source(&self) -> ErrorSource {
        match self {
            Self::File { .. } => ErrorSource::File,
            Self::Input { .. } => ErrorSource::Input,
            Self::Internal { .. } => ErrorSource::Internal,
            Self::Unsupported { .. } => ErrorSource::Unsupported,
        }
    }

    pub fn is_file(&self) -> bool {
        matches!(self, Self::File { .. })
    }

    pub fn is_input(&self) -> bool {
        matches!(self, Self::Input { .. })
    }

    pub fn is_internal(&self) -> bool {
        matches!(self, Self::Internal { .. })
    }

    pub fn is_unsupported(&self) -> bool {
        matches!(self, Self::Unsupported { .. })
    }

    pub(crate) fn file_invalid_format(context: impl Into<String>) -> Self {
        Self::File {
            source: FileError::InvalidFormat {
                context: context.into(),
            },
        }
    }

    pub(crate) fn sdk_call(function: &'static str, code: i32) -> Self {
        Self::File {
            source: FileError::SdkCall { function, code },
        }
    }

    pub(crate) fn sdk_null(function: &'static str) -> Self {
        Self::File {
            source: FileError::NullPointer { function },
        }
    }

    pub(crate) fn file_json(context: &'static str, source: serde_json::Error) -> Self {
        Self::File {
            source: FileError::Json { context, source },
        }
    }

    pub(crate) fn file_utf8(context: &'static str, source: std::str::Utf8Error) -> Self {
        Self::File {
            source: FileError::Utf8 { context, source },
        }
    }

    pub(crate) fn input_out_of_range(field: impl Into<String>, index: usize, max: usize) -> Self {
        Self::Input {
            source: InputError::OutOfRange {
                field: field.into(),
                index,
                max,
            },
        }
    }

    pub(crate) fn input_argument(field: impl Into<String>, detail: impl Into<String>) -> Self {
        Self::Input {
            source: InputError::InvalidArgument {
                field: field.into(),
                detail: detail.into(),
            },
        }
    }

    pub(crate) fn internal_overflow(operation: impl Into<String>) -> Self {
        Self::Internal {
            source: InternalError::Overflow {
                operation: operation.into(),
            },
        }
    }

    pub(crate) fn unsupported_pixel_format(detail: impl Into<String>) -> Self {
        Self::Unsupported {
            source: UnsupportedError::PixelFormat {
                detail: detail.into(),
            },
        }
    }
}

impl From<std::io::Error> for Nd2Error {
    fn from(value: std::io::Error) -> Self {
        Self::File {
            source: FileError::Io(value),
        }
    }
}

pub type Result<T> = std::result::Result<T, Nd2Error>;
