fn main() {
    // `tauri_build::build()` does not emit `rerun-if-changed` for bundle icons unless
    // `CodegenContext` is wired up; without this, swapping `icons/*` does not re-run
    // `generate_context!()` and the app keeps the previous embedded window icon.
    println!("cargo:rerun-if-changed=icons/icon.png");
    println!("cargo:rerun-if-changed=icons/icon.ico");
    tauri_build::build()
}
