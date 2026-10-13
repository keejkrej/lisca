//! Embedded label-free inference on the Studio router.
//!
//! Health is always mounted. Reference and classify routes mount only with the
//! `label-free` feature. Desktop reaches them through Tauri IPC. Hosted Studio
//! uses same-origin HTTP. The `cuda` feature links the ONNX Runtime CUDA 12
//! libraries for ONNX sessions. EmbeddingGemma stays on the Python host.

mod embed;
mod http;
mod service;

pub use http::{build_references, classify, health, list_references};
