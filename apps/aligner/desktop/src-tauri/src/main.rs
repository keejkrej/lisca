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
