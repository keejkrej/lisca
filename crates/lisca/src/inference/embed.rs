//! OpenRouter multimodal image embedding (`google/gemini-embedding-2`) for
//! label-free reference sets and trajectory classification.
//!
//! There is no CPU fallback: if no OpenRouter API key is configured or the
//! OpenRouter request fails, embedding fails fast.

use std::io::Cursor;
use std::sync::Mutex;

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use image::codecs::png::PngEncoder;
use image::{ExtendedColorType, ImageEncoder};
use serde::{Deserialize, Serialize};

pub const MODEL_ID: &str = "google/gemini-embedding-2";
pub const REVISION: &str = "v1";
pub const ENCODER_ID: &str = "google/gemini-embedding-2:v1:768";
pub const DIMENSIONS: usize = 768;
pub const BATCH_SIZE: usize = 32;

const DEFAULT_OPENROUTER_EMBEDDINGS_URL: &str = "https://openrouter.ai/api/v1/embeddings";

static API_KEY: Mutex<Option<String>> = Mutex::new(None);

pub struct PlaneInput<'a> {
    pub width: u32,
    pub height: u32,
    pub pixels: &'a [u16],
}

#[derive(Serialize)]
struct OpenRouterEmbeddingRequest<'a> {
    model: &'a str,
    dimensions: usize,
    encoding_format: &'a str,
    input: Vec<OpenRouterMultimodalItem>,
}

#[derive(Serialize)]
struct OpenRouterMultimodalItem {
    content: Vec<OpenRouterContentPart>,
}

#[derive(Serialize)]
struct OpenRouterContentPart {
    #[serde(rename = "type")]
    kind: &'static str,
    image_url: OpenRouterImageUrl,
}

#[derive(Serialize)]
struct OpenRouterImageUrl {
    url: String,
}

#[derive(Deserialize)]
struct OpenRouterEmbeddingResponse {
    data: Vec<OpenRouterEmbeddingData>,
}

#[derive(Deserialize)]
struct OpenRouterEmbeddingData {
    index: usize,
    embedding: Vec<f32>,
}

#[derive(Deserialize)]
struct OpenRouterErrorEnvelope {
    error: Option<OpenRouterErrorDetail>,
}

#[derive(Deserialize)]
struct OpenRouterErrorDetail {
    message: Option<String>,
}

pub fn set_api_key(api_key: &str) {
    let trimmed = api_key.trim();
    let mut guard = API_KEY
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    if trimmed.is_empty() {
        *guard = None;
    } else {
        *guard = Some(trimmed.to_string());
    }
}

pub fn has_api_key() -> bool {
    resolve_api_key().is_ok()
}

pub fn resolve_api_key() -> Result<String, String> {
    let in_memory = API_KEY
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone();
    if let Some(key) = in_memory {
        if !key.trim().is_empty() {
            return Ok(key);
        }
    }
    if let Ok(env_key) = std::env::var("OPENROUTER_API_KEY") {
        let trimmed = env_key.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }
    Err("Save an OpenRouter API key in Settings before embedding label-free frames.".to_string())
}

fn embeddings_url() -> String {
    if let Ok(custom) = std::env::var("LISCA_OPENROUTER_EMBEDDINGS_URL") {
        let trimmed = custom.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    DEFAULT_OPENROUTER_EMBEDDINGS_URL.to_string()
}

/// Normalize a 16-bit microscopy plane using 1st-99th percentile linear stretching
/// and encode it as an 8-bit grayscale PNG data URI (`data:image/png;base64,...`).
pub fn plane_to_png_data_uri(width: u32, height: u32, pixels: &[u16]) -> Result<String, String> {
    let expected = (width as usize)
        .checked_mul(height as usize)
        .ok_or_else(|| "ROI frame dimensions overflow".to_string())?;
    if width == 0 || height == 0 || pixels.len() != expected {
        return Err(format!(
            "ROI frame is {width}x{height} but has {} pixels",
            pixels.len()
        ));
    }

    let samples: Vec<f64> = pixels.iter().map(|pixel| f64::from(*pixel)).collect();
    let mut ordered = samples.clone();
    ordered.sort_by(|left, right| left.total_cmp(right));
    let low = percentile_linear(&ordered, 1.0);
    let high = percentile_linear(&ordered, 99.0);
    let span = high - low;
    let bytes: Vec<u8> = if span.abs() < 1e-9 {
        pixels
            .iter()
            .map(|pixel| (*pixel >> 8).min(255) as u8)
            .collect()
    } else {
        samples
            .iter()
            .map(|value| (((value - low) / span).clamp(0.0, 1.0) * 255.0).round() as u8)
            .collect()
    };

    let mut png_bytes = Vec::new();
    PngEncoder::new(Cursor::new(&mut png_bytes))
        .write_image(&bytes, width, height, ExtendedColorType::L8)
        .map_err(|error| format!("failed to encode ROI frame PNG: {error}"))?;
    Ok(format!("data:image/png;base64,{}", BASE64.encode(png_bytes)))
}

pub fn embed_planes(planes: &[PlaneInput<'_>]) -> Result<Vec<Vec<f32>>, String> {
    if planes.is_empty() {
        return Ok(Vec::new());
    }
    let api_key = resolve_api_key()?;
    let url = embeddings_url();

    let mut data_uris = Vec::with_capacity(planes.len());
    for plane in planes {
        data_uris.push(plane_to_png_data_uri(
            plane.width,
            plane.height,
            plane.pixels,
        )?);
    }

    let mut all_vectors = Vec::with_capacity(planes.len());
    for chunk in data_uris.chunks(BATCH_SIZE) {
        let input = chunk
            .iter()
            .map(|uri| OpenRouterMultimodalItem {
                content: vec![OpenRouterContentPart {
                    kind: "image_url",
                    image_url: OpenRouterImageUrl { url: uri.clone() },
                }],
            })
            .collect();
        let payload = OpenRouterEmbeddingRequest {
            model: MODEL_ID,
            dimensions: DIMENSIONS,
            encoding_format: "float",
            input,
        };
        let body = serde_json::to_string(&payload)
            .map_err(|error| format!("failed to serialize OpenRouter request: {error}"))?;

        let response = ureq::post(&url)
            .header("Authorization", &format!("Bearer {api_key}"))
            .header("Content-Type", "application/json")
            .config()
            .http_status_as_error(false)
            .build()
            .send(&body)
            .map_err(|error| format!("OpenRouter request failed: {error}"))?;

        let status = response.status().as_u16();
        let response_text = response
            .into_body()
            .read_to_string()
            .map_err(|error| format!("failed to read OpenRouter response: {error}"))?;

        if !(200..300).contains(&status) {
            let detail = serde_json::from_str::<OpenRouterErrorEnvelope>(&response_text)
                .ok()
                .and_then(|envelope| envelope.error)
                .and_then(|error| error.message)
                .unwrap_or_else(|| response_text.trim().to_string());
            return Err(format!("OpenRouter returned HTTP {status}: {detail}"));
        }

        let mut parsed: OpenRouterEmbeddingResponse = serde_json::from_str(&response_text)
            .map_err(|error| format!("invalid OpenRouter embedding response: {error}"))?;
        if parsed.data.len() != chunk.len() {
            return Err(format!(
                "OpenRouter returned {} embeddings for {} input frames",
                parsed.data.len(),
                chunk.len()
            ));
        }
        parsed.data.sort_by_key(|item| item.index);
        for (expected_index, item) in parsed.data.into_iter().enumerate() {
            if item.index != expected_index {
                return Err(format!(
                    "OpenRouter embedding index mismatch: expected {expected_index}, got {}",
                    item.index
                ));
            }
            let normalized = normalize_vector(item.embedding)?;
            all_vectors.push(normalized);
        }
    }

    Ok(all_vectors)
}

pub fn normalize_vector(mut vector: Vec<f32>) -> Result<Vec<f32>, String> {
    if vector.len() != DIMENSIONS {
        return Err(format!(
            "expected {DIMENSIONS}-dimensional embedding from {MODEL_ID}, got {}",
            vector.len()
        ));
    }
    if vector.iter().any(|value| !value.is_finite()) {
        return Err("embedding contains non-finite values".to_string());
    }
    let norm = vector.iter().map(|value| value * value).sum::<f32>().sqrt();
    if !norm.is_finite() || norm == 0.0 {
        return Err("embedding norm is zero or non-finite".to_string());
    }
    for value in &mut vector {
        *value /= norm;
    }
    Ok(vector)
}

fn percentile_linear(sorted: &[f64], percentile: f64) -> f64 {
    if sorted.len() <= 1 {
        return sorted.first().copied().unwrap_or(0.0);
    }
    let index = (percentile / 100.0) * (sorted.len() - 1) as f64;
    let low = index.floor() as usize;
    let high = index.ceil() as usize;
    let fraction = index - low as f64;
    sorted[low] * (1.0 - fraction) + sorted[high] * fraction
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plane_to_png_data_uri_encodes_grayscale_png() {
        let uri = plane_to_png_data_uri(2, 2, &[0, 100, 200, 300]).expect("png uri");
        assert!(uri.starts_with("data:image/png;base64,"));
        let dark = plane_to_png_data_uri(2, 2, &[0, 0, 0, 0]).expect("dark uri");
        let bright = plane_to_png_data_uri(2, 2, &[65535, 65535, 65535, 65535]).expect("bright uri");
        assert_ne!(dark, bright);
    }

    #[test]
    fn rejects_a_plane_with_the_wrong_length() {
        let error = plane_to_png_data_uri(2, 2, &[1, 2, 3]).expect_err("short plane");
        assert!(error.contains("has 3 pixels"), "{error}");
    }

    #[test]
    fn normalize_vector_enforces_unit_length_and_dimensions() {
        let mut raw = vec![0.0_f32; DIMENSIONS];
        raw[0] = 3.0;
        raw[1] = 4.0;
        let unit = normalize_vector(raw).expect("unit vector");
        let norm = unit.iter().map(|v| v * v).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 1e-5, "norm {norm}");
        assert!((unit[0] - 0.6).abs() < 1e-5);
        assert!((unit[1] - 0.8).abs() < 1e-5);
    }
}
