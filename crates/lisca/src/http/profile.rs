use axum::{
    extract::{Extension, Query},
    middleware::from_fn,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;

use crate::http::auth::{require_bearer_profile, AuthError, AuthenticatedProfile};
use crate::profile::store;
use crate::protocol::{
    MemoryKind, MemoryRecentResponse, MemoryTouchRequest, MemoryTouchResponse,
    ProfileCreateRequest, ProfileListResponse, ProfileSessionResponse, ProfileSignInRequest,
    ProfileSignOutResponse,
};

use super::error::FsError;

#[derive(Debug, Deserialize)]
struct RecentMemoryQuery {
    #[serde(rename = "type")]
    kind: MemoryKind,
}

pub fn router<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    let protected = Router::new()
        .route("/memory/recent", get(get_recent_memory_handler))
        .route("/memory/touch", post(touch_memory_handler))
        .route("/profile/sign-out", post(sign_out_profile_handler))
        .layer(from_fn(require_bearer_profile));

    Router::new()
        .route("/profile/list", get(list_profiles_handler))
        .route("/profile/create", post(create_profile_handler))
        .route("/profile/sign-in", post(sign_in_profile_handler))
        .merge(protected)
}

async fn list_profiles_handler() -> Result<Json<ProfileListResponse>, FsError> {
    store::list_profiles().map(Json)
}

async fn create_profile_handler(
    Json(body): Json<ProfileCreateRequest>,
) -> Result<Json<ProfileSessionResponse>, FsError> {
    store::create_profile(&body.display_name).map(Json)
}

async fn sign_in_profile_handler(
    Json(body): Json<ProfileSignInRequest>,
) -> Result<Json<ProfileSessionResponse>, FsError> {
    store::sign_in_profile(&body.display_name).map(Json)
}

async fn sign_out_profile_handler(
    Extension(AuthenticatedProfile { profile_id: _ }): Extension<AuthenticatedProfile>,
    req: axum::extract::Request,
) -> Result<Json<ProfileSignOutResponse>, AuthError> {
    let token = crate::http::auth::bearer_token(req.headers())?;
    store::sign_out_profile(&token).map_err(|err| AuthError::new(err.message()))?;
    Ok(Json(ProfileSignOutResponse { ok: true }))
}

async fn get_recent_memory_handler(
    Extension(AuthenticatedProfile { profile_id }): Extension<AuthenticatedProfile>,
    Query(query): Query<RecentMemoryQuery>,
) -> Result<Json<MemoryRecentResponse>, FsError> {
    store::get_recent(&profile_id, query.kind).map(Json)
}

async fn touch_memory_handler(
    Extension(AuthenticatedProfile { profile_id }): Extension<AuthenticatedProfile>,
    Json(body): Json<MemoryTouchRequest>,
) -> Result<Json<MemoryTouchResponse>, FsError> {
    store::touch_memory(&profile_id, body).map(Json)
}

#[cfg(test)]
mod tests {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    use crate::config::test_lock::TEST_CONFIG_LOCK;
    use crate::profile::store;

    fn set_temp_config_dir() -> std::path::PathBuf {
        let dir =
            std::env::temp_dir().join(format!("lisca-auth-http-test-{}", uuid::Uuid::new_v4()));
        std::env::set_var("LISCA_CONFIG_DIR", dir.to_string_lossy().to_string());
        dir
    }

    #[test]
    fn memory_recent_requires_bearer_token() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let _dir = set_temp_config_dir();

        let app = super::router::<()>();
        let request = Request::builder()
            .uri("/memory/recent?type=workspace")
            .body(Body::empty())
            .unwrap();
        let response = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(app.oneshot(request))
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn memory_recent_accepts_bearer_token() {
        let _guard = TEST_CONFIG_LOCK.lock().unwrap();
        let _dir = set_temp_config_dir();

        let created = store::create_profile("http-user").unwrap();
        let app = super::router::<()>();
        let request = Request::builder()
            .uri("/memory/recent?type=workspace")
            .header(
                axum::http::header::AUTHORIZATION,
                format!("Bearer {}", created.access_token),
            )
            .body(Body::empty())
            .unwrap();
        let response = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(app.oneshot(request))
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }
}
