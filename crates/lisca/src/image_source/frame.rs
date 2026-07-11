use std::path::Path;

use image::{DynamicImage, ImageReader};

use crate::{
    protocol::ContrastWindow,
    tiff_io::{self, TiffFrame16},
};

use super::RawFrame;

pub(super) fn load_image_frame(path: &Path) -> Result<RawFrame, String> {
    let ext = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase());

    match ext.as_deref() {
        Some("tif" | "tiff") => tiff_io::load_tiff_frame_page(path, 0).map(raw_frame_from_tiff),
        Some("png" | "jpg" | "jpeg") => load_raster_frame(path),
        _ => Err(format!(
            "unsupported source image extension for {}",
            path.display()
        )),
    }
}

fn raw_frame_from_tiff(frame: TiffFrame16) -> RawFrame {
    RawFrame {
        width: frame.width,
        height: frame.height,
        data: frame.data,
        contrast_domain: ContrastWindow {
            min: 0,
            max: frame.max_value,
        },
    }
}

fn load_raster_frame(path: &Path) -> Result<RawFrame, String> {
    let image = ImageReader::open(path)
        .map_err(|error| error.to_string())?
        .decode()
        .map_err(|error| error.to_string())?;
    Ok(raw_frame_from_dynamic_image(image))
}

fn raw_frame_from_dynamic_image(image: DynamicImage) -> RawFrame {
    match image {
        DynamicImage::ImageLuma8(buffer) => RawFrame {
            width: buffer.width(),
            height: buffer.height(),
            data: buffer.into_raw().into_iter().map(u16::from).collect(),
            contrast_domain: ContrastWindow {
                min: 0,
                max: u8::MAX as u32,
            },
        },
        DynamicImage::ImageLuma16(buffer) => RawFrame {
            width: buffer.width(),
            height: buffer.height(),
            data: buffer.into_raw(),
            contrast_domain: ContrastWindow {
                min: 0,
                max: u16::MAX as u32,
            },
        },
        other => {
            let buffer = other.into_luma8();
            RawFrame {
                width: buffer.width(),
                height: buffer.height(),
                data: buffer.into_raw().into_iter().map(u16::from).collect(),
                contrast_domain: ContrastWindow {
                    min: 0,
                    max: u8::MAX as u32,
                },
            }
        }
    }
}
