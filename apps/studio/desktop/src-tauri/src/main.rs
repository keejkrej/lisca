fn main() {
    lisca_tauri::run(
        lisca_tauri::ProductConfig {
            product: "studio",
            product_name: "Lisca Studio",
        },
        tauri::generate_context!(),
        studio_server::app,
    );
}
