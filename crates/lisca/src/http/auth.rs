use crate::profile::session;
use crate::protocol::{Unauthorized, UnauthorizedTag};
use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};

#[derive(Debug, Clone)]
pub struct AuthenticatedProfile {
    pub profile_id: String,
}

#[derive(Debug)]
pub struct AuthError {
    message: String,
}

impl AuthError {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let body = Unauthorized {
            message: self.message,
            tag: UnauthorizedTag::Unauthorized,
        };
        (StatusCode::UNAUTHORIZED, Json(body)).into_response()
    }
}

pub fn bearer_token(headers: &axum::http::HeaderMap) -> Result<String, AuthError> {
    let value = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| AuthError::new("missing Authorization header"))?;

    let token = value
        .strip_prefix("Bearer ")
        .or_else(|| value.strip_prefix("bearer "))
        .ok_or_else(|| AuthError::new("Authorization header must use Bearer scheme"))?
        .trim();

    if token.is_empty() {
        return Err(AuthError::new("missing access token"));
    }

    Ok(token.to_string())
}

pub async fn require_bearer_profile(mut req: Request, next: Next) -> Result<Response, AuthError> {
    let token = bearer_token(req.headers())?;
    let profile_id = session::resolve(&token).map_err(|err| AuthError::new(err.message()))?;
    req.extensions_mut()
        .insert(AuthenticatedProfile { profile_id });
    Ok(next.run(req).await)
}
