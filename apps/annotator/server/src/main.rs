use lisca::{http, protocol::AppId};

const DEFAULT_PORT: u16 = 8766;

#[tokio::main]
async fn main() {
    http::run_server(AppId::Annotator, DEFAULT_PORT, annotator_server::app()).await;
}
