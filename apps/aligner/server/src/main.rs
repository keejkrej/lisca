use lisca::{http, protocol::AppId};

const DEFAULT_PORT: u16 = 8765;

#[tokio::main]
async fn main() {
    http::run_server(AppId::Aligner, DEFAULT_PORT, aligner_server::app()).await;
}
