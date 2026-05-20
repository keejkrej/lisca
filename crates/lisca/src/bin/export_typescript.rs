//! Export protocol types to TypeScript for `@lisca/contracts`.
//!
//! Run: `cargo run -p lisca --features export-typescript --bin export-typescript`

fn main() {
    lisca::export_typescript_bindings().expect("failed to export TypeScript bindings");
}
