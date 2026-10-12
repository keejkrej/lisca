// Packaged Windows apps should open only their GUI; keep the console in dev builds.
#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

fn main() {
    lisca_tauri::run(
        lisca_tauri::ProductConfig {
            product: "aligner",
            product_name: "Lisca Aligner",
        },
        tauri::generate_context!(),
        aligner_server::app,
    );
}
