mod annotation;
mod index;

pub use annotation::{
    load_annotation_labels, load_roi_frame_annotation, save_annotation_labels,
    save_roi_frame_annotation,
};
pub use index::{load_roi_frame, scan_roi_workspace};

#[cfg(test)]
mod tests {
    use std::{
        fs::{self, File},
        io::Cursor,
        path::Path,
        time::{SystemTime, UNIX_EPOCH},
    };

    use base64::prelude::{Engine as _, BASE64_STANDARD};
    use image::{DynamicImage, GrayImage, ImageFormat, Luma};
    use serde_json::json;
    use tiff::encoder::{colortype, TiffEncoder};

    use crate::protocol::{AnnotationLabel, RoiFrameAnnotationPayload, RoiFrameRequest};

    use super::*;

    #[test]
    fn roi_workspace_roundtrip_loads_frame_and_annotation() {
        let workspace = std::env::temp_dir().join(format!(
            "lisca-roi-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        fs::create_dir_all(workspace.join("roi").join("Pos0")).expect("roi dir");
        fs::create_dir_all(workspace.join("annotations")).expect("annotations dir");

        write_roi_tiff(&workspace.join("roi").join("Pos0").join("Roi0.tif"));
        fs::write(
            workspace.join("roi").join("Pos0").join("index.json"),
            serde_json::to_vec_pretty(&json!({
                "source": {
                    "kind": "folder",
                    "path": "source",
                    "subfolderTemplate": "Pos{p}",
                    "filenameTemplate": "img_channel{c}_position{p}_time{t}_z{z}"
                },
                "position": 0,
                "axisOrder": "TCZYX",
                "pageOrder": ["t", "c", "z"],
                "channelCount": 1,
                "timeCount": 1,
                "zCount": 1,
                "rois": [{
                    "roi": 0,
                    "fileName": "Roi0.tif",
                    "bbox": { "roi": 0, "x": 1, "y": 2, "w": 4, "h": 3 },
                    "shape": [1, 1, 1, 3, 4]
                }]
            }))
            .expect("index json"),
        )
        .expect("write index");
        fs::write(
            workspace.join("annotations").join("labels.json"),
            serde_json::to_vec_pretty(&json!({
                "labels": [{ "id": "cell", "name": "Cell", "color": "#22c55e" }]
            }))
            .expect("labels json"),
        )
        .expect("write labels");

        let saved_labels = save_annotation_labels(
            &workspace.to_string_lossy(),
            vec![AnnotationLabel {
                id: "cell".to_string(),
                name: "Cell".to_string(),
                color: "#22c55e".to_string(),
            }],
        )
        .expect("save labels");
        assert_eq!(saved_labels.len(), 1);

        let workspace_path = workspace.to_string_lossy();
        let scan = scan_roi_workspace(&workspace_path).expect("scan");
        assert_eq!(scan.positions.len(), 1);
        assert_eq!(scan.positions[0].rois[0].bbox.w, 4);

        let request = RoiFrameRequest {
            pos: 0,
            roi: 0,
            channel: 0,
            time: 0,
            z: 0,
        };
        let frame = load_roi_frame(&workspace_path, request.clone()).expect("frame");
        assert_eq!((frame.width, frame.height), (4, 3));
        assert_eq!(frame.data[0], 0);
        assert_eq!(frame.data[11], 11);

        let saved = save_roi_frame_annotation(
            &workspace_path,
            request.clone(),
            RoiFrameAnnotationPayload {
                classification_label_id: None,
                mask_base64_png: Some(BASE64_STANDARD.encode(write_mask_png())),
            },
        )
        .expect("save annotation");
        assert!(saved
            .mask_path
            .as_deref()
            .unwrap_or_default()
            .ends_with("C0_T0_Z0.png"));

        let loaded = load_roi_frame_annotation(&workspace_path, request).expect("load annotation");
        assert!(loaded.mask_base64_png.is_some());
        assert!(loaded.annotation.updated_at.is_some());

        fs::remove_dir_all(&workspace).expect("cleanup");
    }

    fn write_roi_tiff(path: &Path) {
        let file = File::create(path).expect("create tiff");
        let mut encoder = TiffEncoder::new(file).expect("encoder");
        let image = encoder
            .new_image::<colortype::Gray8>(4, 3)
            .expect("gray image");
        image
            .write_data(&(0_u8..12).collect::<Vec<_>>())
            .expect("write image");
    }

    fn write_mask_png() -> Vec<u8> {
        let image = GrayImage::from_fn(4, 3, |x, y| {
            if x == 1 && y == 1 {
                Luma([1])
            } else {
                Luma([0])
            }
        });
        let mut bytes = Cursor::new(Vec::new());
        DynamicImage::ImageLuma8(image)
            .write_to(&mut bytes, ImageFormat::Png)
            .expect("write png");
        bytes.into_inner()
    }
}
