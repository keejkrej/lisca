use ndarray::Array2;
use ndarray_ndimage::{gaussian_filter, uniform_filter, BorderMode};

use crate::analysis::array::{otsu_on_histogram, Frame2D};

const REFLECT_BORDER: BorderMode<f64> = BorderMode::Reflect;
const GAUSSIAN_TRUNCATE: usize = 4;

pub fn variation_filter_2d(frame: &Frame2D, radius: u32) -> Frame2D {
    if radius == 0 {
        return frame.clone();
    }
    let mean = uniform_mean_2d(frame.as_view(), radius);
    let squared = frame.as_view().mapv(|value| value * value);
    let mean_square = uniform_mean_2d(squared.view(), radius);
    let variation = (&mean_square - &mean * &mean).mapv(|value| value.max(0.0).sqrt());
    frame_from_array(variation, frame.width, frame.height)
}

fn uniform_mean_2d(image: ndarray::ArrayView2<f64>, radius: u32) -> Array2<f64> {
    let size = (radius * 2 + 1) as usize;
    uniform_filter(&image, size, REFLECT_BORDER)
}

pub fn gaussian_filter_2d(frame: &Frame2D, sigma: f64) -> Frame2D {
    if sigma < 0.0 {
        return frame.clone();
    }
    if sigma == 0.0 {
        return frame.clone();
    }
    let filtered = gaussian_filter(
        &frame.as_view(),
        sigma,
        0,
        REFLECT_BORDER,
        GAUSSIAN_TRUNCATE,
    );
    frame_from_array(filtered, frame.width, frame.height)
}

fn frame_from_array(array: Array2<f64>, width: usize, height: usize) -> Frame2D {
    let (data, _offset) = array.into_raw_vec_and_offset();
    Frame2D::from_vec(data, width, height).expect("filtered frame matches dimensions")
}

pub fn otsu_threshold(frame: &Frame2D, bins: usize) -> f64 {
    let finite: Vec<f64> = frame
        .as_slice()
        .iter()
        .copied()
        .filter(|value| value.is_finite())
        .collect();
    if finite.is_empty() {
        return 0.0;
    }
    let min_value = finite.iter().copied().fold(f64::INFINITY, f64::min);
    let max_value = finite.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    if (max_value - min_value).abs() <= f64::EPSILON {
        return min_value;
    }

    let mut hist = vec![0f64; bins];
    let scale = (bins - 1) as f64 / (max_value - min_value);
    for value in finite {
        let bin = ((value - min_value) * scale).round() as usize;
        hist[bin.min(bins - 1)] += 1.0;
    }
    let bin_width = (max_value - min_value) / bins as f64;
    let centers: Vec<f64> = (0..bins)
        .map(|index| min_value + (index as f64 + 0.5) * bin_width)
        .collect();
    otsu_on_histogram(&hist, &centers)
}

/// Fill interior background holes using exterior flood-fill (scipy `binary_fill_holes` parity).
pub fn fill_binary_holes_2d(mask: &[bool], width: usize, height: usize) -> Vec<bool> {
    let background = mask.iter().map(|value| !*value).collect::<Vec<_>>();
    let mut exterior = vec![false; width * height];
    let mut stack = Vec::new();

    for x in 0..width {
        if background[x] {
            stack.push((0, x));
        }
        if height > 1 && background[(height - 1) * width + x] {
            stack.push((height - 1, x));
        }
    }
    for y in 0..height {
        if background[y * width] {
            stack.push((y, 0));
        }
        if width > 1 && background[y * width + width - 1] {
            stack.push((y, width - 1));
        }
    }

    while let Some((y, x)) = stack.pop() {
        let index = y * width + x;
        if exterior[index] || !background[index] {
            continue;
        }
        exterior[index] = true;
        if y > 0 {
            stack.push((y - 1, x));
        }
        if y + 1 < height {
            stack.push((y + 1, x));
        }
        if x > 0 {
            stack.push((y, x - 1));
        }
        if x + 1 < width {
            stack.push((y, x + 1));
        }
    }

    mask.iter()
        .zip(background.iter())
        .zip(exterior.iter())
        .map(|((mask, bg), ext)| *mask || (*bg && !*ext))
        .collect()
}

pub fn segment_frame(
    frame: &Frame2D,
    variation_radius: u32,
    gaussian_sigma: f64,
) -> Vec<bool> {
    let varied = variation_filter_2d(frame, variation_radius);
    let smoothed = gaussian_filter_2d(&varied, gaussian_sigma);
    let threshold = otsu_threshold(&smoothed, 256);
    let raw_mask = smoothed
        .as_slice()
        .iter()
        .map(|value| *value > threshold)
        .collect::<Vec<_>>();
    fill_binary_holes_2d(&raw_mask, frame.width, frame.height)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn checkerboard_frame(width: usize, height: usize, block: usize) -> Frame2D {
        let mut data = vec![0.0; width * height];
        for y in 0..height {
            for x in 0..width {
                let value = if ((x / block) + (y / block)) % 2 == 0 {
                    10.0
                } else {
                    200.0
                };
                data[y * width + x] = value;
            }
        }
        Frame2D::from_vec(data, width, height).unwrap()
    }

    #[test]
    fn otsu_splits_bimodal_image() {
        let mut data = vec![0.0; 100];
        for value in data.iter_mut().take(50) {
            *value = 10.0;
        }
        for value in data.iter_mut().skip(50) {
            *value = 200.0;
        }
        let frame = Frame2D::from_vec(data, 10, 10).unwrap();
        let threshold = otsu_threshold(&frame, 256);
        assert!(threshold > 10.0 && threshold < 200.0);
    }

    #[test]
    fn fill_binary_holes_closes_interior_gaps() {
        let width = 5;
        let height = 5;
        let mut mask = vec![false; width * height];
        for x in 0..width {
            mask[x] = true;
            mask[(height - 1) * width + x] = true;
        }
        for y in 0..height {
            mask[y * width] = true;
            mask[y * width + width - 1] = true;
        }
        let filled = fill_binary_holes_2d(&mask, width, height);
        assert!(filled[2 * width + 2]);
    }

    #[test]
    fn variation_filter_reduces_checkerboard_contrast() {
        let frame = checkerboard_frame(16, 16, 2);
        let filtered = variation_filter_2d(&frame, 2);
        let center = filtered.as_slice()[8 * 16 + 8];
        assert!(center > 0.0);
        assert!(center < 95.0);
    }

    #[test]
    fn gaussian_filter_smooths_spike() {
        let mut data = vec![0.0; 25];
        data[12] = 100.0;
        let frame = Frame2D::from_vec(data, 5, 5).unwrap();
        let filtered = gaussian_filter_2d(&frame, 1.0);
        let peak = filtered.as_slice().iter().copied().fold(0.0f64, f64::max);
        assert!(peak < 100.0);
        assert!(peak > 1.0);
    }

    #[test]
    fn segment_frame_produces_foreground_on_bright_blob() {
        let mut data = vec![5.0; 400];
        for y in 6..14 {
            for x in 6..14 {
                data[y * 20 + x] = 180.0;
            }
        }
        let frame = Frame2D::from_vec(data, 20, 20).unwrap();
        let mask = segment_frame(&frame, 2, 1.0);
        assert!(mask.iter().filter(|value| **value).count() > 20);
    }
}
