use axum::{
    extract::Query,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;

use crate::profile::store;
use crate::protocol::{
    MemoryKind, MemoryRecentResponse, MemoryTouchResponse, ProfileCreateRequest,
    ProfileListResponse, ProfileResponse, ProfileSignInRequest,
};

use super::error::FsError;

#[derive(Debug, Deserialize)]
struct RecentMemoryQuery {
    profile_id: String,
    #[serde(rename = "type")]
    kind: MemoryKind,
}

pub fn router<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    Router::new()
        .route("/profile/list", get(list_profiles_handler))
        .route("/profile/create", post(create_profile_handler))
        .route("/profile/sign-in", post(sign_in_profile_handler))
        .route("/memory/recent", get(get_recent_memory_handler))
        .route("/memory/touch", post(touch_memory_handler))
}

async fn list_profiles_handler() -> Result<Json<ProfileListResponse>, FsError> {
    store::list_profiles().map(Json)
}

async fn create_profile_handler(
    Json(body): Json<ProfileCreateRequest>,
) -> Result<Json<ProfileResponse>, FsError> {
    store::create_profile(&body.display_name).map(Json)
}

async fn sign_in_profile_handler(
    Json(body): Json<ProfileSignInRequest>,
) -> Result<Json<ProfileResponse>, FsError> {
    store::sign_in_profile(&body.display_name).map(Json)
}

async fn get_recent_memory_handler(
    Query(query): Query<RecentMemoryQuery>,
) -> Result<Json<MemoryRecentResponse>, FsError> {
    store::get_recent(&query.profile_id, query.kind).map(Json)
}

async fn touch_memory_handler(
    Json(body): Json<store::MemoryTouchBody>,
) -> Result<Json<MemoryTouchResponse>, FsError> {
    store::touch_memory(body).map(Json)
}
