mod crop;
mod routes;

use axum::Router;

pub use crop::{CropJobState, HasCropJobs};
pub use routes::{crop_router, router};

/// Build the transport-neutral Aligner application.
pub fn app() -> Router {
    Router::new()
        .merge(lisca::http::fs::router())
        .merge(router())
}
