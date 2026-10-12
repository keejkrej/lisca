// Packaged Windows apps should open only their GUI; keep the console in dev builds.
#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

fn main() {
    lisca_tauri::run(
        lisca_tauri::ProductConfig {
            product: "annotator",
            product_name: "Lisca Annotator",
        },
        tauri::generate_context!(),
        annotator_server::app,
    );
}
