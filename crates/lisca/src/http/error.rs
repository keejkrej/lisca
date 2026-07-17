use crate::protocol::{RequestError, RequestErrorTag};
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};

#[derive(Debug)]
pub struct FsError {
    message: String,
}

impl FsError {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }

    pub fn message(&self) -> &str {
        &self.message
    }
}

impl IntoResponse for FsError {
    fn into_response(self) -> Response {
        let body = RequestError {
            message: self.message,
            tag: RequestErrorTag::RequestError,
        };
        (StatusCode::BAD_REQUEST, Json(body)).into_response()
    }
}
