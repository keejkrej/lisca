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
