use base64::prelude::{Engine as _, BASE64_STANDARD};

use crate::protocol::{FramePayload, PixelType};

pub fn decode_frame_pixels(payload: &FramePayload) -> Result<Vec<f64>, String> {
    let bytes = BASE64_STANDARD
        .decode(payload.data_base64.as_bytes())
        .map_err(|error| error.to_string())?;
    let pixel_count = (payload.width as usize)
        .checked_mul(payload.height as usize)
        .ok_or_else(|| "invalid frame dimensions".to_string())?;

    match payload.pixel_type {
        PixelType::Uint8 | PixelType::Uint8clamped => {
            if bytes.len() < pixel_count {
                return Err("frame payload is shorter than width * height".to_string());
            }
            Ok(bytes
                .iter()
                .take(pixel_count)
                .map(|value| f64::from(*value))
                .collect())
        }
        PixelType::Uint16 => {
            if bytes.len() < pixel_count * 2 {
                return Err("uint16 frame payload is shorter than width * height".to_string());
            }
            Ok(bytes
                .chunks_exact(2)
                .take(pixel_count)
                .map(|chunk| {
                    let value = u16::from_le_bytes([chunk[0], chunk[1]]);
                    f64::from(value)
                })
                .collect())
        }
        PixelType::Int8 | PixelType::Int16 | PixelType::Uint32 | PixelType::Int32 => Err(
            "smart ML only supports uint8 and uint16 frame payloads".to_string(),
        ),
    }
}

pub fn pixels_to_rgb_u8(
    pixels: &[f64],
    width: u32,
    height: u32,
    pixel_type: &PixelType,
) -> Result<Vec<u8>, String> {
    let count = (width as usize)
        .checked_mul(height as usize)
        .ok_or_else(|| "invalid frame dimensions".to_string())?;
    if pixels.len() < count {
        return Err("frame pixels are shorter than width * height".to_string());
    }

    let _domain_max = match pixel_type {
        PixelType::Uint8 | PixelType::Uint8clamped => 255.0,
        PixelType::Uint16 => 65535.0,
        _ => 65535.0,
    };

    let mut minimum = f64::INFINITY;
    let mut maximum = f64::NEG_INFINITY;
    for value in pixels.iter().take(count) {
        minimum = minimum.min(*value);
        maximum = maximum.max(*value);
    }
    let range = (maximum - minimum).max(1.0);

    let mut rgb = vec![0u8; count * 3];
    for (index, value) in pixels.iter().take(count).enumerate() {
        let normalized = (((*value - minimum) / range) * 255.0).round() as u8;
        let offset = index * 3;
        rgb[offset] = normalized;
        rgb[offset + 1] = normalized;
        rgb[offset + 2] = normalized;
    }
    Ok(rgb)
}
