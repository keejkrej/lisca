fn main() {
    lisca_tauri::run(
        lisca_tauri::ProductConfig {
            product: "annotator",
            product_name: "Lisca Annotator",
            port: 8766,
            backend_port: 9766,
            server_binary: "annotator-server",
            cargo_package: "annotator-server",
        },
        tauri::generate_context!(),
    );
}
