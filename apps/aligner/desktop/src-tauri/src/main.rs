fn main() {
    lisca_tauri::run(
        lisca_tauri::ProductConfig {
            product: "aligner",
            product_name: "Lisca Aligner",
            port: 8765,
            backend_port: 9765,
            server_binary: "aligner-server",
            cargo_package: "aligner-server",
        },
        tauri::generate_context!(),
    );
}
