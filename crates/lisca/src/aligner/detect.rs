//! Automatic micropattern-lattice detection ("auto-align").
//!
//! The Aligner UI can place the pattern lattice with pointer gestures or with
//! Auto-detect (`align/detect-grid`). Both load [`AlignGridState`] into the
//! editable session; persist stays `align/save-bbox`. `lisca-align` and MCP
//! `align_detect_grid` share this kernel so agents invoke the same control as
//! a human click. Detection recovers the same [`AlignGridState`] from a single
//! frame:
//!
//! 1. downsample the frame to a workable width,
//! 2. threshold the micropattern islands (both polarities) and label components,
//! 3. cluster the nearest-neighbour island displacements into two lattice basis
//!    vectors (hexagonal or rectangular),
//! 4. refine basis + origin by least squares over integer lattices indices,
//! 5. enumerate clipped [`AlignGridPatternBox`] rows, matching the UI's
//!    `origin = frame centre + (tx, ty)` convention.
//!
//! Nothing here mutates the workspace: callers persist the result with
//! `aligner::save_bbox`.

use std::collections::HashMap;

use crate::image_source::RawFrame;
use crate::protocol::{AlignGridPatternBox, AlignGridShape, AlignGridState};

/// Longest side of the work image used for detection.
const DOWNSAMPLE_TARGET: f64 = 512.0;
/// Default pattern box size as a fraction of the lattice pitch.
const DEFAULT_PATTERN_FRACTION: f64 = 0.8;
/// Grid opacity persisted with a detected grid (matches the UI default).
const GRID_OPACITY: f64 = 0.35;
/// A centroid counts as lattice-fit when it lands this close to its node.
const RESIDUAL_CONFIDENCE_FRACTION: f64 = 0.12;

#[derive(Debug, Clone, Default)]
pub struct DetectOptions {
    /// Force a lattice geometry instead of inferring hex vs. rect.
    pub shape: Option<AlignGridShape>,
    pub pattern_width: Option<f64>,
    pub pattern_height: Option<f64>,
    /// Shortest accepted lattice pitch in source pixels.
    pub min_spacing: Option<f64>,
    /// Longest accepted lattice pitch in source pixels.
    pub max_spacing: Option<f64>,
}

#[derive(Debug, Clone)]
pub struct GridDetection {
    pub grid: AlignGridState,
    pub patterns: Vec<AlignGridPatternBox>,
    /// `roi,x,y,w,h` CSV ready for `align/save-bbox`.
    pub csv: String,
    /// Fraction of island centroids that landed within a tenth of a pitch.
    pub confidence: f64,
    /// Median centroid distance to its lattice node, in source pixels.
    pub residual_px: f64,
    pub islands: u32,
}

#[derive(Debug, Clone, Copy)]
struct Centroid {
    x: f64,
    y: f64,
}

#[derive(Debug, Clone, Copy)]
struct Vec2 {
    x: f64,
    y: f64,
}

impl Vec2 {
    fn length(self) -> f64 {
        (self.x * self.x + self.y * self.y).sqrt()
    }
}

/// Detect the pattern lattice on one frame.
pub fn detect_grid(raw: &RawFrame, options: &DetectOptions) -> Result<GridDetection, String> {
    if raw.width < 32 || raw.height < 32 {
        return Err(format!(
            "a {}x{} frame is too small to detect a micropattern lattice",
            raw.width, raw.height
        ));
    }

    let work = WorkImage::from_frame(raw);
    let min_spacing = options
        .min_spacing
        .unwrap_or_else(|| (4.0 * work.scale).max(4.0));
    let max_spacing = options
        .max_spacing
        .unwrap_or_else(|| 0.25 * raw.width.min(raw.height) as f64);
    if max_spacing <= min_spacing {
        return Err(format!(
            "maxSpacing ({max_spacing}) must exceed minSpacing ({min_spacing})"
        ));
    }

    let (centroids, polarity) = work
        .island_centroids()
        .into_iter()
        .max_by_key(|(list, _)| list.len())
        .ok_or_else(|| "no micropattern islands found on this frame".to_string())?;
    if centroids.len() < 6 {
        return Err(format!(
            "found only {} islands on this frame; need at least 6 to fit a lattice",
            centroids.len()
        ));
    }

    let displacements = neighbour_vectors(&centroids, min_spacing, max_spacing);
    if displacements.len() < 8 {
        return Err(format!(
            "found only {} island-to-island displacements between {min_spacing:.1} and {max_spacing:.1} px; cannot infer a lattice",
            displacements.len()
        ));
    }

    let inferred = infer_basis(&displacements, &centroids, min_spacing, max_spacing)?;
    let shape = options.shape.unwrap_or(inferred.shape);
    let fitted = fit_lattice(&centroids, inferred.a, inferred.b, raw.width, raw.height)?;

    let mut grid = AlignGridState {
        enabled: true,
        shape,
        tx: fitted.origin.x - raw.width as f64 / 2.0,
        ty: fitted.origin.y - raw.height as f64 / 2.0,
        rotation: fitted.a.y.atan2(fitted.a.x),
        spacing_a: fitted.a.length(),
        spacing_b: fitted.b.length(),
        pattern_width: 0.0,
        pattern_height: 0.0,
        opacity: GRID_OPACITY,
    };
    normalize_rotation(&mut grid);
    let pitch = grid.spacing_a.min(grid.spacing_b);
    grid.pattern_width = options
        .pattern_width
        .unwrap_or(DEFAULT_PATTERN_FRACTION * pitch)
        .max(1.0);
    grid.pattern_height = options
        .pattern_height
        .unwrap_or(DEFAULT_PATTERN_FRACTION * pitch)
        .max(1.0);

    let patterns = enumerate_patterns(&grid, raw.width, raw.height);
    if patterns.is_empty() {
        return Err("detected lattice has no pattern inside the frame".to_string());
    }

    let mut residuals = fitted.residuals.clone();
    let residual_px = median(residuals.as_mut_slice());
    let close = fitted
        .residuals
        .iter()
        .filter(|residual| **residual <= RESIDUAL_CONFIDENCE_FRACTION * pitch)
        .count();
    let confidence = close as f64 / fitted.residuals.len().max(1) as f64;

    let detected = GridDetection {
        grid,
        csv: pattern_csv(&patterns),
        patterns,
        confidence,
        residual_px,
        islands: centroids.len() as u32,
    };
    let _ = polarity;
    Ok(detected)
}

/// Downsampled frame plus its island segmentation.
struct WorkImage {
    values: Vec<f32>,
    width: usize,
    height: usize,
    /// Source pixels per work pixel.
    scale: f64,
}

impl WorkImage {
    fn from_frame(raw: &RawFrame) -> Self {
        let width = raw.width as usize;
        let height = raw.height as usize;
        let scale = (raw.width.max(raw.height) as f64 / DOWNSAMPLE_TARGET)
            .ceil()
            .max(1.0);
        let step = scale as usize;
        let work_width = width.div_ceil(step);
        let work_height = height.div_ceil(step);
        let mut values = Vec::with_capacity(work_width * work_height);
        for work_y in 0..work_height {
            for work_x in 0..work_width {
                let x0 = work_x * step;
                let y0 = work_y * step;
                let x1 = (x0 + step).min(width);
                let y1 = (y0 + step).min(height);
                let mut sum = 0.0_f64;
                let mut count = 0_u32;
                for y in y0..y1 {
                    let row = y * width;
                    for x in x0..x1 {
                        sum += f64::from(raw.data[row + x]);
                        count += 1;
                    }
                }
                values.push(if count == 0 {
                    0.0
                } else {
                    (sum / f64::from(count)) as f32
                });
            }
        }
        Self {
            values,
            width: work_width,
            height: work_height,
            scale,
        }
    }

    /// Island centroids for the brighter-islands and the darker-islands guess,
    /// in source pixels. The caller keeps whichever guess explains more islands.
    fn island_centroids(&self) -> Vec<(Vec<Centroid>, bool)> {
        let threshold = otsu_threshold(&self.values);
        let mut guesses = Vec::new();
        for bright in [true, false] {
            let mask: Vec<bool> = self
                .values
                .iter()
                .map(|value| {
                    if bright {
                        *value > threshold
                    } else {
                        *value <= threshold
                    }
                })
                .collect();
            let components = label_components(&mask, self.width, self.height);
            let mut centroids = Vec::new();
            let total = (self.width * self.height) as f64;
            for component in components {
                if component.area < 6
                    || f64::from(component.area) > 0.05 * total
                    || component.bbox_width() < 2
                    || component.bbox_height() < 2
                {
                    continue;
                }
                let aspect = component.bbox_width() as f64 / component.bbox_height() as f64;
                if !(0.25..=4.0).contains(&aspect) {
                    continue;
                }
                let center_x = component.sum_x / component.area as f64;
                let center_y = component.sum_y / component.area as f64;
                centroids.push(Centroid {
                    x: (center_x + 0.5) * self.scale,
                    y: (center_y + 0.5) * self.scale,
                });
            }
            guesses.push((centroids, bright));
        }
        guesses
    }
}

struct Component {
    area: u32,
    sum_x: f64,
    sum_y: f64,
    min_x: usize,
    max_x: usize,
    min_y: usize,
    max_y: usize,
}

impl Component {
    fn bbox_width(&self) -> usize {
        self.max_x - self.min_x + 1
    }

    fn bbox_height(&self) -> usize {
        self.max_y - self.min_y + 1
    }
}

/// Otsu threshold over the work image.
fn otsu_threshold(values: &[f32]) -> f32 {
    let mut min = f32::INFINITY;
    let mut max = f32::NEG_INFINITY;
    for value in values {
        min = min.min(*value);
        max = max.max(*value);
    }
    if !min.is_finite() || !max.is_finite() || max <= min {
        return 0.0;
    }
    let bins = 256;
    let span = max - min;
    let mut histogram = vec![0_u64; bins];
    for value in values {
        let index = (((value - min) / span) * (bins - 1) as f32).round() as usize;
        histogram[index.min(bins - 1)] += 1;
    }
    let total: u64 = histogram.iter().sum();
    let mut sum_all = 0.0_f64;
    for (index, count) in histogram.iter().enumerate() {
        sum_all += index as f64 * *count as f64;
    }
    let mut weight_background = 0.0_f64;
    let mut sum_background = 0.0_f64;
    let mut best_variance = -1.0_f64;
    let mut best_index = 0_usize;
    for (index, count) in histogram.iter().enumerate() {
        weight_background += *count as f64;
        if weight_background == 0.0 {
            continue;
        }
        let weight_foreground = total as f64 - weight_background;
        if weight_foreground == 0.0 {
            break;
        }
        sum_background += index as f64 * *count as f64;
        let mean_background = sum_background / weight_background;
        let mean_foreground = (sum_all - sum_background) / weight_foreground;
        let variance =
            weight_background * weight_foreground * (mean_background - mean_foreground).powi(2);
        if variance > best_variance {
            best_variance = variance;
            best_index = index;
        }
    }
    min + span * (best_index as f32 / (bins - 1) as f32)
}

/// Four-connected component labelling with per-component geometry.
fn label_components(mask: &[bool], width: usize, height: usize) -> Vec<Component> {
    let mut parent: Vec<usize> = (0..mask.len()).collect();
    fn find(parent: &mut [usize], mut index: usize) -> usize {
        while parent[index] != index {
            parent[index] = parent[parent[index]];
            index = parent[index];
        }
        index
    }
    for y in 0..height {
        for x in 0..width {
            let index = y * width + x;
            if !mask[index] {
                continue;
            }
            if x + 1 < width && mask[index + 1] {
                let left = find(&mut parent, index);
                let right = find(&mut parent, index + 1);
                if left != right {
                    parent[right] = left;
                }
            }
            if y + 1 < height && mask[index + width] {
                let top = find(&mut parent, index);
                let bottom = find(&mut parent, index + width);
                if top != bottom {
                    parent[bottom] = top;
                }
            }
        }
    }

    let mut components: HashMap<usize, Component> = HashMap::new();
    for y in 0..height {
        for x in 0..width {
            let index = y * width + x;
            if !mask[index] {
                continue;
            }
            let root = find(&mut parent, index);
            let entry = components.entry(root).or_insert(Component {
                area: 0,
                sum_x: 0.0,
                sum_y: 0.0,
                min_x: x,
                max_x: x,
                min_y: y,
                max_y: y,
            });
            entry.area += 1;
            entry.sum_x += x as f64;
            entry.sum_y += y as f64;
            entry.min_x = entry.min_x.min(x);
            entry.max_x = entry.max_x.max(x);
            entry.min_y = entry.min_y.min(y);
            entry.max_y = entry.max_y.max(y);
        }
    }
    components.into_values().collect()
}

fn neighbour_vectors(centroids: &[Centroid], min_spacing: f64, max_spacing: f64) -> Vec<Vec2> {
    let mut vectors = Vec::new();
    for (index, start) in centroids.iter().enumerate() {
        for end in centroids.iter().skip(index + 1) {
            let dx = end.x - start.x;
            let dy = end.y - start.y;
            let length = (dx * dx + dy * dy).sqrt();
            if length >= min_spacing && length <= max_spacing {
                vectors.push(Vec2 { x: dx, y: dy });
                vectors.push(Vec2 { x: -dx, y: -dy });
            }
        }
    }
    vectors
}

struct BasisGuess {
    a: Vec2,
    b: Vec2,
    shape: AlignGridShape,
}

/// Cluster nearest-neighbour displacements into the two lattice basis vectors.
fn infer_basis(
    vectors: &[Vec2],
    centroids: &[Centroid],
    min_spacing: f64,
    max_spacing: f64,
) -> Result<BasisGuess, String> {
    let pitch = nearest_neighbour_pitch(centroids, min_spacing, max_spacing)?;

    let near_pitch: Vec<Vec2> = vectors
        .iter()
        .copied()
        .filter(|vector| (vector.length() - pitch).abs() <= 0.2 * pitch)
        .collect();
    if near_pitch.len() < 4 {
        return Err(format!(
            "only {} displacements match the {pitch:.1} px nearest-neighbour pitch",
            near_pitch.len()
        ));
    }

    let primary = dominant_direction_deg(&near_pitch)
        .ok_or_else(|| "no lattice direction to cluster".to_string())?;
    let a = mean_vector(&near_pitch, primary, 12.0).unwrap_or(Vec2 {
        x: pitch * primary.to_radians().cos(),
        y: pitch * primary.to_radians().sin(),
    });

    let second_rect = (primary + 90.0) % 180.0;
    let second_hex = (primary + 60.0) % 180.0;
    let second_hex_extra = (primary + 120.0) % 180.0;
    let rect = mean_vector(&near_pitch, second_rect, 12.0)
        .or_else(|| mean_vector(vectors, second_rect, 12.0));
    let hex = mean_vector(&near_pitch, second_hex, 12.0)
        .or_else(|| mean_vector(&near_pitch, second_hex_extra, 12.0))
        .or_else(|| mean_vector(vectors, second_hex, 6.0));
    let (b, shape) = match (rect, hex) {
        (Some(rect), Some(hex)) => {
            if count_near(vectors, second_hex, 12.0) + count_near(vectors, second_hex_extra, 12.0)
                > count_near(vectors, second_rect, 12.0)
            {
                (hex, AlignGridShape::Hex)
            } else {
                (rect, AlignGridShape::Rect)
            }
        }
        (Some(rect), None) => (rect, AlignGridShape::Rect),
        (None, Some(hex)) => (hex, AlignGridShape::Hex),
        (None, None) => (
            Vec2 {
                x: pitch * second_rect.to_radians().cos(),
                y: pitch * second_rect.to_radians().sin(),
            },
            AlignGridShape::Rect,
        ),
    };
    Ok(BasisGuess { a, b, shape })
}

/// Lattice pitch from the median nearest-neighbour island distance.
fn nearest_neighbour_pitch(
    centroids: &[Centroid],
    min_spacing: f64,
    max_spacing: f64,
) -> Result<f64, String> {
    if centroids.len() < 2 {
        return Err("need at least two islands to measure a pitch".to_string());
    }
    let mut distances = Vec::with_capacity(centroids.len());
    for (index, start) in centroids.iter().enumerate() {
        let mut nearest = f64::INFINITY;
        for (other_index, end) in centroids.iter().enumerate() {
            if index == other_index {
                continue;
            }
            let distance = ((end.x - start.x).powi(2) + (end.y - start.y).powi(2)).sqrt();
            if distance < nearest {
                nearest = distance;
            }
        }
        if nearest.is_finite() && nearest >= min_spacing && nearest <= max_spacing {
            distances.push(nearest);
        }
    }
    if distances.len() < 4 {
        return Err("no island neighbours inside the spacing window".to_string());
    }
    // Mode, not median: border-clipped islands sit closer to their inward
    // neighbour than to a full pitch, and they can rival the true shell count.
    let mut bins: HashMap<i64, (f64, usize)> = HashMap::new();
    for distance in &distances {
        let key = (distance / 2.0).round() as i64;
        let entry = bins.entry(key).or_insert((0.0, 0));
        entry.0 += *distance;
        entry.1 += 1;
    }
    let (&bin, _) = bins
        .iter()
        .max_by_key(|(_, (_, count))| *count)
        .ok_or_else(|| "no island neighbours inside the spacing window".to_string())?;
    let (sum, count) = bins[&bin];
    let _ = median(distances.as_mut_slice());
    Ok(sum / count as f64)
}

/// Dominant undirected direction (degrees, 0..180) of a displacement cloud.
fn dominant_direction_deg(vectors: &[Vec2]) -> Option<f64> {
    let mut bins: HashMap<i64, usize> = HashMap::new();
    for vector in vectors {
        let doubled = 2.0 * vector.y.atan2(vector.x).to_degrees().rem_euclid(360.0);
        let key = (doubled / 2.0).round() as i64 % 180;
        *bins.entry(key).or_insert(0) += 1;
    }
    let (&peak, _) = bins.iter().max_by_key(|(_, count)| *count)?;
    mean_direction_deg(vectors, peak as f64, 4.0).or(Some(peak as f64))
}

/// Mean direction (degrees, undirected 0..180) of the vectors near `target_deg`.
fn mean_direction_deg(vectors: &[Vec2], target_deg: f64, tolerance: f64) -> Option<f64> {
    let mut sum_sin = 0.0;
    let mut sum_cos = 0.0;
    let mut count = 0_usize;
    for vector in vectors {
        if angle_distance_deg(vector_angle_deg(*vector), target_deg) > tolerance {
            continue;
        }
        let doubled = 2.0 * vector.y.atan2(vector.x);
        sum_sin += doubled.sin();
        sum_cos += doubled.cos();
        count += 1;
    }
    if count == 0 {
        None
    } else {
        Some(
            (sum_sin.atan2(sum_cos) / 2.0)
                .to_degrees()
                .rem_euclid(180.0),
        )
    }
}

/// Mean basis vector in one lattice direction: median length, circular mean angle.
fn mean_vector(vectors: &[Vec2], target_degrees: f64, tolerance: f64) -> Option<Vec2> {
    let mut lengths = Vec::new();
    for vector in vectors {
        if angle_distance_deg(vector_angle_deg(*vector), target_degrees) <= tolerance {
            lengths.push(vector.length());
        }
    }
    if lengths.is_empty() {
        return None;
    }
    let length = median(lengths.as_mut_slice());
    let direction = mean_direction_deg(vectors, target_degrees, tolerance)?;
    Some(Vec2 {
        x: length * direction.to_radians().cos(),
        y: length * direction.to_radians().sin(),
    })
}

fn count_near(vectors: &[Vec2], target_degrees: f64, tolerance: f64) -> usize {
    vectors
        .iter()
        .filter(|vector| {
            angle_distance_deg(vector_angle_deg(**vector), target_degrees) <= tolerance
        })
        .count()
}

fn vector_angle_deg(vector: Vec2) -> f64 {
    let mut angle = vector.y.atan2(vector.x).to_degrees();
    while angle < 0.0 {
        angle += 180.0;
    }
    while angle >= 180.0 {
        angle -= 180.0;
    }
    angle
}

fn angle_distance_deg(left: f64, right: f64) -> f64 {
    let difference = (left - right).rem_euclid(180.0);
    difference.min(180.0 - difference)
}

struct FittedLattice {
    origin: Vec2,
    a: Vec2,
    b: Vec2,
    residuals: Vec<f64>,
}

/// Least-squares lattice fit: `p ≈ origin + i·a + j·b` over integer indices.
fn fit_lattice(
    centroids: &[Centroid],
    a: Vec2,
    b: Vec2,
    width: u32,
    height: u32,
) -> Result<FittedLattice, String> {
    let mut origin = Vec2 { x: 0.0, y: 0.0 };
    let mut best_distance = f64::INFINITY;
    for centroid in centroids {
        let distance =
            (centroid.x - width as f64 / 2.0).powi(2) + (centroid.y - height as f64 / 2.0).powi(2);
        if distance < best_distance {
            best_distance = distance;
            origin = Vec2 {
                x: centroid.x,
                y: centroid.y,
            };
        }
    }
    let radius = 0.5 * f64::from(width.min(height));
    let mut basis_a = a;
    let mut basis_b = b;
    let mut assignments: Vec<(f64, f64, Centroid)> = Vec::new();

    for _ in 0..4 {
        let determinant = basis_a.x * basis_b.y - basis_a.y * basis_b.x;
        if determinant.abs() < 1e-6 {
            return Err("degenerate lattice basis".to_string());
        }
        assignments.clear();
        for centroid in centroids {
            let dx = centroid.x - origin.x;
            let dy = centroid.y - origin.y;
            if (dx * dx + dy * dy).sqrt() > radius {
                continue;
            }
            let i = (dx * basis_b.y - dy * basis_b.x) / determinant;
            let j = (basis_a.x * dy - basis_a.y * dx) / determinant;
            let rounded_i = i.round();
            let rounded_j = j.round();
            if rounded_i.abs() > 64.0 || rounded_j.abs() > 64.0 {
                continue;
            }
            assignments.push((rounded_i, rounded_j, *centroid));
        }
        if assignments.len() < 4 {
            return Err("too few islands near the lattice centre to fit a grid".to_string());
        }
        let (fitted_origin, fitted_a, fitted_b) = least_squares(&assignments)?;
        origin = fitted_origin;
        basis_a = fitted_a;
        basis_b = fitted_b;
    }

    let residuals: Vec<f64> = assignments
        .iter()
        .map(|(i, j, centroid)| {
            let predicted_x = origin.x + i * basis_a.x + j * basis_b.x;
            let predicted_y = origin.y + i * basis_a.y + j * basis_b.y;
            ((centroid.x - predicted_x).powi(2) + (centroid.y - predicted_y).powi(2)).sqrt()
        })
        .collect();

    Ok(FittedLattice {
        origin,
        a: basis_a,
        b: basis_b,
        residuals,
    })
}

fn least_squares(assignments: &[(f64, f64, Centroid)]) -> Result<(Vec2, Vec2, Vec2), String> {
    let count = assignments.len() as f64;
    let mut normal = [[0.0_f64; 3]; 3];
    let mut rhs_x = [0.0_f64; 3];
    let mut rhs_y = [0.0_f64; 3];
    for (i, j, centroid) in assignments {
        let row = [1.0, *i, *j];
        for row_index in 0..3 {
            for column_index in 0..3 {
                normal[row_index][column_index] += row[row_index] * row[column_index];
            }
            rhs_x[row_index] += row[row_index] * centroid.x;
            rhs_y[row_index] += row[row_index] * centroid.y;
        }
    }
    let _ = count;
    let solved_x = solve_3x3(normal, rhs_x)?;
    let solved_y = solve_3x3(normal, rhs_y)?;
    Ok((
        Vec2 {
            x: solved_x[0],
            y: solved_y[0],
        },
        Vec2 {
            x: solved_x[1],
            y: solved_y[1],
        },
        Vec2 {
            x: solved_x[2],
            y: solved_y[2],
        },
    ))
}

fn solve_3x3(matrix: [[f64; 3]; 3], rhs: [f64; 3]) -> Result<[f64; 3], String> {
    let determinant = determinant_3x3(matrix);
    if determinant.abs() < 1e-9 {
        return Err("singular lattice normal equations".to_string());
    }
    let mut solution = [0.0_f64; 3];
    for column in 0..3 {
        let mut replaced = matrix;
        for row in 0..3 {
            replaced[row][column] = rhs[row];
        }
        solution[column] = determinant_3x3(replaced) / determinant;
    }
    Ok(solution)
}

fn determinant_3x3(matrix: [[f64; 3]; 3]) -> f64 {
    matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1])
        - matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0])
        + matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0])
}

// Fold the rotation into the smallest equivalent angle for the lattice symmetry.
///
/// A square lattice repeats every 90 degrees and a hexagonal one every 60, so a
/// reported rotation of 1.57 rad is the same grid as 0 and only confuses callers.
fn normalize_rotation(grid: &mut AlignGridState) {
    if (grid.spacing_a - grid.spacing_b).abs() > 0.02 * grid.spacing_a {
        return;
    }
    let symmetry = if matches!(grid.shape, AlignGridShape::Rect | AlignGridShape::Square) {
        90.0
    } else {
        60.0
    };
    let degrees = grid.rotation.to_degrees();
    let folded = (degrees + symmetry / 2.0).rem_euclid(symmetry) - symmetry / 2.0;
    grid.rotation = folded.to_radians();
}

/// Enumerate pattern boxes for a grid, clipped to the frame, sorted by `(y, x)`.
fn enumerate_patterns(grid: &AlignGridState, width: u32, height: u32) -> Vec<AlignGridPatternBox> {
    let is_rect = matches!(grid.shape, AlignGridShape::Rect | AlignGridShape::Square);
    let second_angle = grid.rotation
        + if is_rect {
            std::f64::consts::FRAC_PI_2
        } else {
            std::f64::consts::FRAC_PI_3
        };
    let a = Vec2 {
        x: grid.rotation.cos() * grid.spacing_a,
        y: grid.rotation.sin() * grid.spacing_a,
    };
    let b = Vec2 {
        x: second_angle.cos() * grid.spacing_b,
        y: second_angle.sin() * grid.spacing_b,
    };
    let origin = Vec2 {
        x: f64::from(width) / 2.0 + grid.tx,
        y: f64::from(height) / 2.0 + grid.ty,
    };
    let pitch = grid.spacing_a.min(grid.spacing_b).max(1.0);
    let range = (f64::from(width.max(height)) / pitch).ceil() as i32 + 2;

    let mut boxes: Vec<AlignGridPatternBox> = Vec::new();
    for j in -range..=range {
        for i in -range..=range {
            let center_x = origin.x + i as f64 * a.x + j as f64 * b.x;
            let center_y = origin.y + i as f64 * a.y + j as f64 * b.y;
            if center_x < 0.0
                || center_y < 0.0
                || center_x >= f64::from(width)
                || center_y >= f64::from(height)
            {
                continue;
            }
            let left = center_x - grid.pattern_width / 2.0;
            let top = center_y - grid.pattern_height / 2.0;
            let x0 = left.round().max(0.0) as u32;
            let y0 = top.round().max(0.0) as u32;
            let x1 = (left + grid.pattern_width)
                .round()
                .clamp(0.0, f64::from(width)) as u32;
            let y1 = (top + grid.pattern_height)
                .round()
                .clamp(0.0, f64::from(height)) as u32;
            if x1 <= x0 || y1 <= y0 {
                continue;
            }
            boxes.push(AlignGridPatternBox {
                i,
                j,
                x: x0,
                y: y0,
                w: x1 - x0,
                h: y1 - y0,
            });
        }
    }
    boxes.sort_by(|left, right| {
        left.y
            .cmp(&right.y)
            .then(left.x.cmp(&right.x))
            .then(left.i.cmp(&right.i))
            .then(left.j.cmp(&right.j))
    });
    boxes
}

/// `roi,x,y,w,h` CSV, the shape `align/save-bbox` expects.
pub fn pattern_csv(patterns: &[AlignGridPatternBox]) -> String {
    let mut csv = String::from("roi,x,y,w,h\n");
    for (roi, pattern) in patterns.iter().enumerate() {
        csv.push_str(&format!(
            "{roi},{},{},{},{}\n",
            pattern.x, pattern.y, pattern.w, pattern.h
        ));
    }
    csv
}

fn median(values: &mut [f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    values.sort_by(|left, right| left.total_cmp(right));
    values[values.len() / 2]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::protocol::ContrastWindow;

    #[allow(clippy::too_many_arguments)]
    fn synthetic_lattice(
        width: u32,
        height: u32,
        pitch: f64,
        rotation: f64,
        shape: AlignGridShape,
        pattern: f64,
        background: u16,
        foreground: u16,
    ) -> RawFrame {
        let mut data = vec![background; (width * height) as usize];
        let is_rect = matches!(shape, AlignGridShape::Rect | AlignGridShape::Square);
        let second = rotation
            + if is_rect {
                std::f64::consts::FRAC_PI_2
            } else {
                std::f64::consts::FRAC_PI_3
            };
        let a = (rotation.cos() * pitch, rotation.sin() * pitch);
        let b = (second.cos() * pitch, second.sin() * pitch);
        let half = pattern / 2.0;
        for j in -20..=20 {
            for i in -20..=20 {
                let center_x = f64::from(width) / 2.0 + i as f64 * a.0 + j as f64 * b.0;
                let center_y = f64::from(height) / 2.0 + i as f64 * a.1 + j as f64 * b.1;
                // Only fully inside islands, so clipped border islands do not skew the
                // nearest-neighbour pitch used by the detector.
                if center_x - half < 0.0
                    || center_y - half < 0.0
                    || center_x + half > f64::from(width)
                    || center_y + half > f64::from(height)
                {
                    continue;
                }
                for dy in -half.ceil() as i32..=half.ceil() as i32 {
                    for dx in -half.ceil() as i32..=half.ceil() as i32 {
                        let x = center_x + f64::from(dx);
                        let y = center_y + f64::from(dy);
                        if x < 0.0 || y < 0.0 || x >= f64::from(width) || y >= f64::from(height) {
                            continue;
                        }
                        let offset_x = x + 0.5 - center_x;
                        let offset_y = y + 0.5 - center_y;
                        let local_x = offset_x * rotation.cos() + offset_y * rotation.sin();
                        let local_y = -offset_x * rotation.sin() + offset_y * rotation.cos();
                        if local_x.abs() <= half && local_y.abs() <= half {
                            data[(y as u32 * width + x as u32) as usize] = foreground;
                        }
                    }
                }
            }
        }
        RawFrame {
            width,
            height,
            data,
            contrast_domain: ContrastWindow {
                min: 0,
                max: u32::from(foreground),
            },
        }
    }

    #[test]
    fn recovers_a_hexagonal_lattice() {
        let frame = synthetic_lattice(480, 480, 40.0, 0.21, AlignGridShape::Hex, 30.0, 100, 900);
        let detection = detect_grid(&frame, &DetectOptions::default()).expect("detect");
        assert_eq!(detection.grid.shape, AlignGridShape::Hex);
        assert!(
            (detection.grid.spacing_a - 40.0).abs() < 2.0,
            "spacingA {}",
            detection.grid.spacing_a
        );
        assert!(
            (detection.grid.spacing_b - 40.0).abs() < 2.0,
            "spacingB {}",
            detection.grid.spacing_b
        );
        let shape_change = (detection.grid.spacing_a - detection.grid.spacing_b).abs() < 1.0;
        assert!(shape_change);
        assert!(detection.confidence > 0.8, "{}", detection.confidence);
        assert!(
            detection.patterns.len() > 80,
            "{}",
            detection.patterns.len()
        );
        assert!(detection.csv.starts_with("roi,x,y,w,h\n"));
    }

    #[test]
    fn honors_a_forced_rectangular_shape() {
        let frame = synthetic_lattice(480, 480, 40.0, 0.21, AlignGridShape::Hex, 30.0, 100, 900);
        let detection = detect_grid(
            &frame,
            &DetectOptions {
                shape: Some(AlignGridShape::Rect),
                ..DetectOptions::default()
            },
        )
        .expect("detect");
        assert_eq!(detection.grid.shape, AlignGridShape::Rect);
    }

    #[test]
    fn recovers_a_rectangular_lattice_from_dark_islands() {
        let frame = synthetic_lattice(512, 512, 64.0, 0.0, AlignGridShape::Rect, 50.0, 700, 200);
        let detection = detect_grid(&frame, &DetectOptions::default()).expect("detect");
        assert_eq!(detection.grid.shape, AlignGridShape::Rect);
        assert!(
            (detection.grid.spacing_a - 64.0).abs() < 2.0,
            "spacingA {}",
            detection.grid.spacing_a
        );
        assert!((detection.grid.rotation.abs()) < 0.05);
        assert!(
            detection.patterns.len() > 40,
            "{}",
            detection.patterns.len()
        );
    }

    #[test]
    fn pattern_boxes_are_clipped_to_the_frame() {
        let boxes = enumerate_patterns(
            &AlignGridState {
                enabled: true,
                shape: AlignGridShape::Rect,
                tx: 0.0,
                ty: 0.0,
                rotation: 0.0,
                spacing_a: 100.0,
                spacing_b: 100.0,
                pattern_width: 80.0,
                pattern_height: 80.0,
                opacity: 0.35,
            },
            250,
            250,
        );
        assert!(!boxes.is_empty());
        for bbox in &boxes {
            assert!(bbox.x + bbox.w <= 250);
            assert!(bbox.y + bbox.h <= 250);
        }
    }

    #[test]
    fn csv_has_one_row_per_pattern() {
        let csv = pattern_csv(&[AlignGridPatternBox {
            i: 0,
            j: 0,
            x: 1,
            y: 2,
            w: 3,
            h: 4,
        }]);
        assert_eq!(csv, "roi,x,y,w,h\n0,1,2,3,4\n");
    }
}
