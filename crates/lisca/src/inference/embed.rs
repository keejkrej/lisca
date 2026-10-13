//! Frozen CPU embedding for label-free reference sets.
//!
//! This is not EmbeddingGemma. The Python host loads that model from
//! `lisca-killing-assay`. The vector here is deterministic and runs on any
//! laptop: a 4×4 block summary of a percentile-normalized plane, an 8-bin
//! histogram, and the raw 16-bit mean and standard deviation so two flat
//! intensities stay apart.

pub const MODEL_ID: &str = "cpu-microscopy";
pub const REVISION: &str = "v1";
pub const ENCODER_ID: &str = "cpu-microscopy-v1";
pub const DIMENSIONS: usize = 43;
const GRID: u32 = 4;
const BINS: usize = 8;
const INTENSITY_SCALE: f64 = 65535.0;

pub fn embed_plane(width: u32, height: u32, pixels: &[u16]) -> Result<Vec<f32>, String> {
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
    let normalized: Vec<f64> = if span.abs() < 1e-9 {
        vec![0.5; samples.len()]
    } else {
        samples
            .iter()
            .map(|value| ((value - low) / span).clamp(0.0, 1.0))
            .collect()
    };

    let mut features = Vec::with_capacity(DIMENSIONS);
    for gy in 0..GRID {
        for gx in 0..GRID {
            let (mean, std) = block_stats(width, height, &normalized, gx, gy);
            features.push(mean);
            features.push(std);
        }
    }
    let mut histogram = [0.0; BINS];
    for value in &normalized {
        let bin = ((*value * BINS as f64).floor() as usize).min(BINS - 1);
        histogram[bin] += 1.0;
    }
    let count = samples.len() as f64;
    for bin in histogram {
        features.push(bin / count);
    }

    let mean = samples.iter().sum::<f64>() / count;
    let variance = samples
        .iter()
        .map(|value| {
            let delta = value - mean;
            delta * delta
        })
        .sum::<f64>()
        / count;
    features.push(mean / INTENSITY_SCALE);
    features.push(variance.sqrt() / INTENSITY_SCALE);
    features.push(1.0);

    let mut vector: Vec<f32> = features.iter().map(|value| *value as f32).collect();
    let norm = vector.iter().map(|value| value * value).sum::<f32>().sqrt();
    if !norm.is_finite() || norm == 0.0 {
        return Err("microscopy embedding norm is not usable".to_string());
    }
    for value in &mut vector {
        *value /= norm;
    }
    if vector.len() != DIMENSIONS || vector.iter().any(|value| !value.is_finite()) {
        return Err("microscopy embedding is invalid".to_string());
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

fn block_stats(width: u32, height: u32, pixels: &[f64], gx: u32, gy: u32) -> (f64, f64) {
    let Some((y0, y1)) = block_bounds(gy, height) else {
        return (0.0, 0.0);
    };
    let Some((x0, x1)) = block_bounds(gx, width) else {
        return (0.0, 0.0);
    };
    let mut sum = 0.0;
    let mut count = 0.0;
    for y in y0..y1 {
        for x in x0..x1 {
            sum += pixels[y * width as usize + x];
            count += 1.0;
        }
    }
    if count == 0.0 {
        return (0.0, 0.0);
    }
    let mean = sum / count;
    let mut variance = 0.0;
    for y in y0..y1 {
        for x in x0..x1 {
            let delta = pixels[y * width as usize + x] - mean;
            variance += delta * delta;
        }
    }
    (mean, (variance / count).sqrt())
}

fn block_bounds(index: u32, size: u32) -> Option<(usize, usize)> {
    let start = index * size / GRID;
    let mut end = (index + 1) * size / GRID;
    if end <= start {
        if start >= size {
            return None;
        }
        end = start + 1;
    }
    let end = end.min(size);
    if start >= end {
        return None;
    }
    Some((start as usize, end as usize))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedding_is_unit_length_and_stable() {
        let first = embed_plane(2, 2, &[0, 10, 20, 30]).expect("embed");
        let second = embed_plane(2, 2, &[0, 10, 20, 30]).expect("embed");
        assert_eq!(first.len(), DIMENSIONS);
        assert_eq!(first, second);
        let norm = first.iter().map(|value| value * value).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 1e-5, "norm {norm}");
    }

    #[test]
    fn flat_planes_keep_their_intensity() {
        let dark = embed_plane(2, 2, &[0, 0, 0, 0]).expect("dark");
        let bright = embed_plane(2, 2, &[1000, 1000, 1000, 1000]).expect("bright");
        assert_ne!(dark, bright);
    }

    #[test]
    fn rejects_a_plane_with_the_wrong_length() {
        let error = embed_plane(2, 2, &[1, 2, 3]).expect_err("short plane");
        assert!(error.contains("has 3 pixels"), "{error}");
    }
}
