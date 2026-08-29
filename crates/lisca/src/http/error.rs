use crate::protocol::{RequestError, RequestErrorTag};
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};

#[derive(Debug)]
pub struct FsError {
    message: String,
    status: StatusCode,
}

impl FsError {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            status: StatusCode::BAD_REQUEST,
        }
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            status: StatusCode::INTERNAL_SERVER_ERROR,
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
        (self.status, Json(body)).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_errors_are_bad_requests() {
        assert_eq!(
            FsError::new("invalid").into_response().status(),
            StatusCode::BAD_REQUEST
        );
    }

    #[test]
    fn internal_errors_are_server_errors() {
        assert_eq!(
            FsError::internal("failed").into_response().status(),
            StatusCode::INTERNAL_SERVER_ERROR
        );
    }
}
