fn main() {
    lisca_tauri::run(
        lisca_tauri::ProductConfig {
            product: "studio",
            product_name: "Lisca Studio",
            port: 8767,
            backend_port: 9767,
            server_binary: "studio-server",
            cargo_package: "studio-server",
        },
        tauri::generate_context!(),
    );
}
