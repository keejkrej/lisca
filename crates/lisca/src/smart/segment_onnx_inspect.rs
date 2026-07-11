#[cfg(test)]
mod tests {
    use ort::session::Session;

    fn workspace_root() -> std::path::PathBuf {
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
    }

    #[test]
    fn print_slimsam_onnx_io() {
        let root = workspace_root();
        for (label, rel) in [
            (
                "encoder",
                "models/smart-segment-slimsam/onnx/vision_encoder_quantized.onnx",
            ),
            (
                "decoder",
                "models/smart-segment-slimsam/onnx/prompt_encoder_mask_decoder_quantized.onnx",
            ),
        ] {
            let path = root.join(rel);
            if !path.is_file() {
                eprintln!("skip {label}: {} missing", path.display());
                continue;
            }
            let session = Session::builder()
                .unwrap()
                .commit_from_file(&path)
                .unwrap_or_else(|error| panic!("load {label}: {error}"));
            eprintln!("=== {label} ===");
            for input in session.inputs() {
                eprintln!("in  {}", input.name());
            }
            for output in session.outputs() {
                eprintln!("out {}", output.name());
            }
        }
    }
}