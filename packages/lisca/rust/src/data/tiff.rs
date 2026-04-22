use std::fs::File;
use std::io::BufReader;
use std::path::Path;

use tiff::decoder::{Decoder, DecodingResult};

#[derive(Clone, Debug)]
pub struct TiffFrame16 {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u16>,
    #[cfg_attr(not(feature = "viewer"), allow(dead_code))]
    pub max_value: u32,
}

fn to_u16_buffer(width: u32, height: u32, data: DecodingResult) -> Result<(Vec<u16>, u32), String> {
    let expected_len = width as usize * height as usize;
    let collapse_channels = |values: Vec<u16>, max_value: u32| -> Result<(Vec<u16>, u32), String> {
        if values.len() == expected_len {
            return Ok((values, max_value));
        }
        if values.len() == expected_len * 3 || values.len() == expected_len * 4 {
            let channels = values.len() / expected_len;
            let mut collapsed = Vec::with_capacity(expected_len);
            for chunk in values.chunks(channels) {
                let sum: u32 = chunk.iter().map(|value| *value as u32).sum();
                collapsed.push((sum / channels as u32) as u16);
            }
            return Ok((collapsed, max_value));
        }
        Err("Unsupported TIFF sample layout".to_string())
    };

    match data {
        DecodingResult::U8(values) => {
            if values.len() == expected_len {
                Ok((values.into_iter().map(u16::from).collect(), u8::MAX as u32))
            } else if values.len() == expected_len * 3 || values.len() == expected_len * 4 {
                collapse_channels(values.into_iter().map(u16::from).collect(), u8::MAX as u32)
            } else {
                Err("Unsupported TIFF sample layout".to_string())
            }
        }
        DecodingResult::U16(values) => collapse_channels(values, u16::MAX as u32),
        _ => Err("Unsupported TIFF pixel type".to_string()),
    }
}

pub fn load_tiff_frames(path: &Path) -> Result<Vec<TiffFrame16>, String> {
    let file = File::open(path).map_err(|err| err.to_string())?;
    let mut decoder = Decoder::new(BufReader::new(file)).map_err(|err| err.to_string())?;
    let mut frames = Vec::new();

    loop {
        let dimensions = decoder.dimensions().map_err(|err| err.to_string())?;
        let data = decoder.read_image().map_err(|err| err.to_string())?;
        let (pixels, max_value) = to_u16_buffer(dimensions.0, dimensions.1, data)?;
        frames.push(TiffFrame16 {
            width: dimensions.0,
            height: dimensions.1,
            data: pixels,
            max_value,
        });

        if !decoder.more_images() {
            break;
        }
        decoder.next_image().map_err(|err| err.to_string())?;
    }

    Ok(frames)
}

pub fn load_tiff_frame_page(path: &Path, page: usize) -> Result<TiffFrame16, String> {
    let file = File::open(path).map_err(|err| err.to_string())?;
    let mut decoder = Decoder::new(BufReader::new(file)).map_err(|err| err.to_string())?;

    for page_idx in 0..page {
        if !decoder.more_images() {
            return Err(format!(
                "TIFF page {} is out of range for {}",
                page_idx + 1,
                path.display()
            ));
        }
        decoder.next_image().map_err(|err| err.to_string())?;
    }

    let dimensions = decoder.dimensions().map_err(|err| err.to_string())?;
    let data = decoder.read_image().map_err(|err| err.to_string())?;
    let (pixels, max_value) = to_u16_buffer(dimensions.0, dimensions.1, data)?;

    Ok(TiffFrame16 {
        width: dimensions.0,
        height: dimensions.1,
        data: pixels,
        max_value,
    })
}
