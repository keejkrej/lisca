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
                "position": 0,
                "axisOrder": "TCZYX",
                "channelCount": 1,
                "timeCount": 1,
                "zCount": 1,
                "rois": [{
                    "roi": 0,
                    "fileName": "Roi0.tif",
                    "bbox": { "roi": 0, "x": 1, "y": 2, "w": 4, "h": 3 }
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

    fn write_roi_tiff_pages(path: &Path, width: u32, height: u32, page_values: &[u8]) {
        let file = File::create(path).expect("create tiff");
        let mut encoder = TiffEncoder::new(file).expect("encoder");
        for &value in page_values {
            let image = encoder
                .new_image::<colortype::Gray8>(width, height)
                .expect("gray image");
            image
                .write_data(&vec![value; (width * height) as usize])
                .expect("write image");
        }
    }

    fn roi_index_json(
        time_indices: Option<&[u32]>,
        time_count: u32,
        channel_count: u32,
        z_count: u32,
        width: u32,
        height: u32,
    ) -> serde_json::Value {
        let mut index = json!({
            "position": 0,
            "axisOrder": "TCZYX",
            "channelCount": channel_count,
            "timeCount": time_count,
            "zCount": z_count,
            "rois": [{
                "roi": 0,
                "fileName": "Roi0.tif",
                "bbox": { "roi": 0, "x": 0, "y": 0, "w": width, "h": height }
            }]
        });
        if let Some(indices) = time_indices {
            index["timeIndices"] = json!(indices);
        }
        index
    }

    fn build_roi_workspace(
        tag: &str,
        page_values: &[u8],
        width: u32,
        height: u32,
        index: serde_json::Value,
    ) -> std::path::PathBuf {
        let workspace = std::env::temp_dir().join(format!(
            "lisca-roi-{tag}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        fs::create_dir_all(workspace.join("roi").join("Pos0")).expect("roi dir");
        write_roi_tiff_pages(
            &workspace.join("roi").join("Pos0").join("Roi0.tif"),
            width,
            height,
            page_values,
        );
        fs::write(
            workspace.join("roi").join("Pos0").join("index.json"),
            serde_json::to_vec_pretty(&index).expect("index json"),
        )
        .expect("write index");
        workspace
    }

    #[test]
    fn roi_downsampled_time_indices_load_each_selected_plane() {
        let workspace = build_roi_workspace(
            "downsample",
            &[0, 1, 2, 3],
            2,
            1,
            roi_index_json(Some(&[0, 6, 12, 18]), 4, 1, 1, 2, 1),
        );
        let path = workspace.to_string_lossy();
        let scan = scan_roi_workspace(&path).expect("scan");
        assert_eq!(scan.positions[0].times, vec![0, 6, 12, 18]);

        for (plane, source) in [0_u32, 6, 12, 18].iter().enumerate() {
            let frame = load_roi_frame(
                &path,
                RoiFrameRequest {
                    pos: 0,
                    roi: 0,
                    channel: 0,
                    time: *source,
                    z: 0,
                },
            )
            .expect("downsampled timepoint loads");
            assert_eq!(frame.data, vec![plane as u16, plane as u16]);
        }
        fs::remove_dir_all(&workspace).expect("cleanup");
    }

    #[test]
    fn roi_shifted_time_indices_load_each_selected_plane() {
        let workspace = build_roi_workspace(
            "shifted",
            &[0, 1, 2, 3],
            2,
            1,
            roi_index_json(Some(&[1, 2, 3, 4]), 4, 1, 1, 2, 1),
        );
        let path = workspace.to_string_lossy();
        let scan = scan_roi_workspace(&path).expect("scan");
        assert_eq!(scan.positions[0].times, vec![1, 2, 3, 4]);

        for (plane, source) in [1_u32, 2, 3, 4].iter().enumerate() {
            let frame = load_roi_frame(
                &path,
                RoiFrameRequest {
                    pos: 0,
                    roi: 0,
                    channel: 0,
                    time: *source,
                    z: 0,
                },
            )
            .expect("shifted timepoint loads");
            assert_eq!(frame.data, vec![plane as u16, plane as u16]);
        }
        fs::remove_dir_all(&workspace).expect("cleanup");
    }

    #[test]
    fn roi_load_frame_rejects_time_not_in_published_time_indices() {
        let workspace = build_roi_workspace(
            "reject",
            &[0, 1, 2, 3],
            2,
            1,
            roi_index_json(Some(&[0, 6, 12, 18]), 4, 1, 1, 2, 1),
        );
        let path = workspace.to_string_lossy();

        let silent_before = load_roi_frame(
            &path,
            RoiFrameRequest {
                pos: 0,
                roi: 0,
                channel: 0,
                time: 3,
                z: 0,
            },
        );
        let err = silent_before.expect_err("source time 3 not in published indices");
        assert!(
            err.contains("not in the available time indices"),
            "got: {err}"
        );

        let out_of_range = load_roi_frame(
            &path,
            RoiFrameRequest {
                pos: 0,
                roi: 0,
                channel: 0,
                time: 99,
                z: 0,
            },
        );
        assert!(out_of_range.is_err());

        let frame = load_roi_frame(
            &path,
            RoiFrameRequest {
                pos: 0,
                roi: 0,
                channel: 0,
                time: 12,
                z: 0,
            },
        )
        .expect("source 12 loads plane 2");
        assert_eq!(frame.data, vec![2_u16, 2_u16]);
        fs::remove_dir_all(&workspace).expect("cleanup");
    }

    #[test]
    fn roi_load_frame_page_math_uses_plane_t_across_channels_and_z() {
        let pages: Vec<u8> = (0..8_u8).collect();
        let workspace = build_roi_workspace(
            "pagemath",
            &pages,
            1,
            1,
            roi_index_json(Some(&[10, 20]), 2, 2, 2, 1, 1),
        );
        let path = workspace.to_string_lossy();
        let scan = scan_roi_workspace(&path).expect("scan");
        assert_eq!(scan.positions[0].times, vec![10, 20]);

        for (source_t, plane_t) in [(10_u32, 0_u32), (20, 1)] {
            for channel in 0_u32..2 {
                for z in 0_u32..2 {
                    let expected_page = ((plane_t * 2 + channel) * 2 + z) as u16;
                    let frame = load_roi_frame(
                        &path,
                        RoiFrameRequest {
                            pos: 0,
                            roi: 0,
                            channel,
                            time: source_t,
                            z,
                        },
                    )
                    .expect("frame loads");
                    assert_eq!(
                        frame.data,
                        vec![expected_page],
                        "source_t={source_t} channel={channel} z={z}"
                    );
                }
            }
        }
        fs::remove_dir_all(&workspace).expect("cleanup");
    }
}
