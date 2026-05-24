use axum::Router;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

pub fn with_standard_layers<S>(router: Router<S>) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    router
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
}
