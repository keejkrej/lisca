//! Shared contracts and WebSocket server utilities for Lisca.

pub mod protocol;
pub mod server;

pub use protocol::AppId;
pub use server::run_ws_server;
