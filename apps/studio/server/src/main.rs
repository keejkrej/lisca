use lisca::{http, protocol::AppId};

const DEFAULT_PORT: u16 = 8767;

#[tokio::main]
async fn main() {
    http::run_server(AppId::Studio, DEFAULT_PORT, studio_server::app()).await;
}
