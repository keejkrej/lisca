//! Label-free inference on the Studio router.
//!
//! Studio ships as a single build where all `/studio/label-free/*` routes are
//! mounted unconditionally. Desktop reaches them through Tauri IPC; hosted
//! Studio uses same-origin HTTP. Image embeddings come either from OpenRouter
//! (`google/gemini-embedding-2`, ADR-0013) or from a local Ollama server, chosen
//! in Settings → Inference or with `LISCA_EMBEDDING_PROVIDER`.

mod embed;
mod http;
mod service;

pub use http::{build_references, classify, health, list_references, save_key};

/// Serialize tests that mutate the process-wide provider selection.
#[cfg(test)]
pub(crate) fn provider_test_lock() -> std::sync::MutexGuard<'static, ()> {
    static LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}
