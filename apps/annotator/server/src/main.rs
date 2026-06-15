use axum::Router;
use lisca::{http, protocol::AppId};

const DEFAULT_PORT: u16 = 8766;

fn build_router() -> Router<()> {
    Router::new()
        .merge(http::fs::router())
        .merge(annotator_server::router())
}

#[tokio::main]
async fn main() {
    http::run_server(AppId::Annotator, DEFAULT_PORT, build_router()).await;
}
