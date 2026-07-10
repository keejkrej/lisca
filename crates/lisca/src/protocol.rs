//! Cross-language wire + on-disk contract types.
//!
//! Effect Schema in `@lisca/contracts` is the single source of truth. Types are
//! generated from the contract JSON Schema (via `typify`) into [`generated`]
//! and re-exported here. `gen-rust-schema.ts` normalizes union encoding
//! (`anyOf` + `$ref` → inline `oneOf`) so typify emits internally-tagged
//! enums like `AlignerSource`.

mod generated;

pub use generated::*;

pub type ImageSource = AlignerSource;

impl AppId {
    pub const fn as_str(self) -> &'static str {
        match self {
            AppId::Aligner => "aligner",
            AppId::Annotator => "annotator",
            AppId::Studio => "studio",
        }
    }
}

impl AssayTimelapseUnit {
    pub const fn as_str(self) -> &'static str {
        match self {
            AssayTimelapseUnit::Second => "second",
            AssayTimelapseUnit::Minute => "minute",
            AssayTimelapseUnit::Hour => "hour",
        }
    }
}

#[cfg(test)]
mod contract_tests {
    //! Locks the cross-language wire shape of the generated types against the
    //! Effect contract. If the contract changes shape, these round-trips break
    //! and signal that protocol types must be regenerated
    //! (`bun run --cwd packages/contracts rust-types`).
    use super::*;
    use serde_json::json;

    #[test]
    fn aligner_source_is_internally_tagged() {
        let source = AlignerSource::Folder {
            path: "/data".into(),
            subfolder_template: "Pos{p}".into(),
            filename_template: "img_{t}".into(),
        };
        let value = serde_json::to_value(&source).unwrap();
        assert_eq!(value["kind"], "folder");
        assert_eq!(value["subfolderTemplate"], "Pos{p}");
        let back: AlignerSource = serde_json::from_value(value.clone()).unwrap();
        assert_eq!(serde_json::to_value(&back).unwrap(), value);
    }

    #[test]
    fn frame_payload_uses_camel_case_and_pixel_type_enum() {
        let value = json!({
            "width": 4,
            "height": 4,
            "dataBase64": "AA==",
            "pixelType": "uint8",
            "contrastDomain": { "min": 0, "max": 255 },
            "suggestedContrast": { "min": 0, "max": 255 },
            "appliedContrast": { "min": 0, "max": 255 },
        });
        let payload: FramePayload = serde_json::from_value(value).unwrap();
        assert_eq!(payload.pixel_type, PixelType::Uint8);
        let reser = serde_json::to_value(&payload).unwrap();
        assert_eq!(reser["pixelType"], "uint8");
    }

    #[test]
    fn roi_index_entry_shape_is_fixed_array() {
        let entry: RoiIndexEntry = serde_json::from_value(json!({
            "roi": 0,
            "fileName": "roi0.tif",
            "bbox": { "roi": 0, "x": 1, "y": 2, "w": 3, "h": 4 },
            "shape": [5, 1, 1, 4, 3],
        }))
        .unwrap();
        let shape: [u32; 5] = entry.shape;
        assert_eq!(shape, [5, 1, 1, 4, 3]);
    }
}
