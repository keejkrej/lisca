//! OpenRouter label-free inference on the Studio router.
//!
//! Studio ships as a single build where all `/studio/label-free/*` routes are
//! mounted unconditionally. Desktop reaches them through Tauri IPC; hosted
//! Studio uses same-origin HTTP. Image embeddings are computed via OpenRouter
//! (`google/gemini-embedding-2`) using the API key configured in Studio
//! Settings (or `OPENROUTER_API_KEY`).

mod embed;
mod http;
mod service;

pub use http::{build_references, classify, health, list_references, save_key};
