use std::collections::VecDeque;

use ndarray::ArrayView2;

use crate::analysis::array::{otsu_on_histogram, Frame2D};

pub fn variation_filter_2d(frame: &Frame2D, radius: u32) -> Frame2D {
    if radius == 0 {
        return frame.clone();
    }
    let view = frame.as_view();
    let mean = box_mean_2d(view, radius);
    let squared = view.mapv(|value| value * value);
    let mean_square = box_mean_2d(squared.view(), radius);
    let out: Vec<f64> = mean
        .iter()
        .zip(mean_square.iter())
        .map(|(m, ms)| (ms - m * m).max(0.0).sqrt())
        .collect();
    Frame2D::from_vec(out, frame.width, frame.height).expect("filtered frame matches dimensions")
}

fn box_mean_2d(image: ArrayView2<f64>, radius: u32) -> Vec<f64> {
    let height = image.nrows();
    let width = image.ncols();
    let window = (radius * 2 + 1) as usize;
    let padded_w = width + 2 * radius as usize;
    let padded_h = height + 2 * radius as usize;
    let mut padded = vec![0.0; padded_w * padded_h];
    for y in 0..height {
        for x in 0..width {
            padded[(y + radius as usize) * padded_w + (x + radius as usize)] = image[[y, x]];
        }
    }
    for y in 0..radius as usize {
        for x in 0..width {
            let src = image[[0, x]];
            padded[y * padded_w + (x + radius as usize)] = src;
            padded[(padded_h - 1 - y) * padded_w + (x + radius as usize)] = src;
        }
    }
    for y in 0..padded_h {
        for x in 0..radius as usize {
            let src = padded[y * padded_w + (x + radius as usize)];
            padded[y * padded_w + x] = src;
            padded[y * padded_w + (padded_w - 1 - x)] = src;
        }
    }

    let mut integral = vec![0.0; (padded_h + 1) * (padded_w + 1)];
    for y in 0..padded_h {
        let mut row_sum = 0.0;
        for x in 0..padded_w {
            row_sum += padded[y * padded_w + x];
            integral[(y + 1) * (padded_w + 1) + (x + 1)] =
                integral[y * (padded_w + 1) + (x + 1)] + row_sum;
        }
    }

    let mut out = vec![0.0; width * height];
    let area = (window * window) as f64;
    for y in 0..height {
        for x in 0..width {
            let y0 = y;
            let x0 = x;
            let y1 = y + window;
            let x1 = x + window;
            let sum = integral[y1 * (padded_w + 1) + x1]
                - integral[y0 * (padded_w + 1) + x1]
                - integral[y1 * (padded_w + 1) + x0]
                + integral[y0 * (padded_w + 1) + x0];
            out[y * width + x] = sum / area;
        }
    }
    out
}

pub fn gaussian_filter_2d(frame: &Frame2D, sigma: f64) -> Frame2D {
    if sigma < 0.0 {
        return frame.clone();
    }
    let kernel = gaussian_kernel_1d(sigma);
    let row_filtered = convolve_axis_reflect(frame.as_view(), &kernel, true);
    let row_view = ArrayView2::from_shape((frame.height, frame.width), &row_filtered)
        .expect("row filter matches frame dimensions");
    let filtered = convolve_axis_reflect(row_view, &kernel, false);
    Frame2D::from_vec(filtered, frame.width, frame.height).expect("filtered frame matches dimensions")
}

fn gaussian_kernel_1d(sigma: f64) -> Vec<f64> {
    if sigma <= 0.0 {
        return vec![1.0];
    }
    let radius = (sigma * 3.0).ceil().max(1.0) as i32;
    let mut kernel = Vec::new();
    let mut sum = 0.0;
    for x in -radius..=radius {
        let value = (-(x as f64 * x as f64) / (2.0 * sigma * sigma)).exp();
        kernel.push(value);
        sum += value;
    }
    kernel.iter_mut().for_each(|value| *value /= sum);
    kernel
}

fn convolve_axis_reflect(image: ArrayView2<f64>, kernel: &[f64], horizontal: bool) -> Vec<f64> {
    let width = image.ncols();
    let height = image.nrows();
    let pad = kernel.len() / 2;
    if pad == 0 {
        return image.iter().copied().collect();
    }
    let mut out = vec![0.0; width * height];
    if horizontal {
        for y in 0..height {
            for x in 0..width {
                let mut sum = 0.0;
                for (k, weight) in kernel.iter().enumerate() {
                    let offset = k as i32 - pad as i32;
                    let sample_x = reflect_index(x as i32 + offset, width as i32);
                    sum += image[[y, sample_x as usize]] * weight;
                }
                out[y * width + x] = sum;
            }
        }
    } else {
        for y in 0..height {
            for x in 0..width {
                let mut sum = 0.0;
                for (k, weight) in kernel.iter().enumerate() {
                    let offset = k as i32 - pad as i32;
                    let sample_y = reflect_index(y as i32 + offset, height as i32);
                    sum += image[[sample_y as usize, x]] * weight;
                }
                out[y * width + x] = sum;
            }
        }
    }
    out
}

fn reflect_index(index: i32, size: i32) -> i32 {
    if size <= 0 {
        return 0;
    }
    let mut value = index;
    while value < 0 || value >= size {
        if value < 0 {
            value = -value - 1;
        } else {
            value = 2 * size - value - 1;
        }
    }
    value
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

pub fn fill_binary_holes_2d(mask: &[bool], width: usize, height: usize) -> Vec<bool> {
    let background = mask.iter().map(|value| !*value).collect::<Vec<_>>();
    let mut exterior = vec![false; width * height];
    let mut stack = VecDeque::new();

    for x in 0..width {
        if background[x] {
            stack.push_back((0, x));
        }
        if height > 1 && background[(height - 1) * width + x] {
            stack.push_back((height - 1, x));
        }
    }
    for y in 0..height {
        if background[y * width] {
            stack.push_back((y, 0));
        }
        if width > 1 && background[y * width + width - 1] {
            stack.push_back((y, width - 1));
        }
    }

    while let Some((y, x)) = stack.pop_back() {
        let index = y * width + x;
        if exterior[index] || !background[index] {
            continue;
        }
        exterior[index] = true;
        if y > 0 {
            stack.push_back((y - 1, x));
        }
        if y + 1 < height {
            stack.push_back((y + 1, x));
        }
        if x > 0 {
            stack.push_back((y, x - 1));
        }
        if x + 1 < width {
            stack.push_back((y, x + 1));
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
}
