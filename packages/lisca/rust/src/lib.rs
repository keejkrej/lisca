//! Rust pipeline layer for LISCA native workflows.
//!
//! The crate currently exposes the native `viewer` backend plus shared
//! delivery-oriented data loading and analysis helpers used by the Rust
//! `delivery` CLI.

pub mod analysis;
pub mod data;
pub mod viewer;
