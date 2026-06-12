use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

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
        // Matches the Effect `RequestError` tagged-error envelope so the
        // generated HttpApiClient can decode failures structurally.
        let body = json!({ "_tag": "RequestError", "message": self.message });
        (StatusCode::BAD_REQUEST, Json(body)).into_response()
    }
}
