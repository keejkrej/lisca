use std::path::Path;

use mplot::prelude::{Figure, FigureBuilder, LineStyle, SaveOptions, Size};
use mplot::Color;

/// Single-panel boxplots / one-off charts (inches).
/// Height is a bit taller than the transfection 4.5 in default so tilted
/// category x-labels keep a usable axes box after the bottom gutter.
pub const FIGURE_SINGLE_WIDTH_IN: f64 = 6.5;
pub const FIGURE_SINGLE_HEIGHT_IN: f64 = 5.5;
/// Multi-panel grids fallback size when layout is unknown (inches).
#[allow(dead_code)] // public API / historical fixed grid
pub const FIGURE_GRID_WIDTH_IN: f64 = 12.0;
#[allow(dead_code)]
pub const FIGURE_GRID_HEIGHT_IN: f64 = 8.0;
/// Approximate inches per subplot cell (transfection Python parity).
const PANEL_WIDTH_IN: f64 = 5.5;
const PANEL_HEIGHT_IN: f64 = 4.0;

/// Matches transfection `FIGURE_DPI`.
pub const FIGURE_DPI: u32 = 100;
/// Matches transfection `font.size` / `axes.titlesize` / `axes.labelsize`.
pub const LABEL_FONTSIZE: f64 = 18.0;
pub const TITLE_FONTSIZE: f64 = 18.0;
/// Matches transfection `xtick.labelsize` / `ytick.labelsize`.
pub const TICK_FONTSIZE: f64 = 17.0;

/// One axes (AUC / fit parameter boxplots).
pub fn figure_builder_single() -> FigureBuilder {
    figure_builder(FIGURE_SINGLE_WIDTH_IN, FIGURE_SINGLE_HEIGHT_IN, 0.2, 0.2)
}

/// Multi-panel packs at the historical fixed 12×8 size.
///
/// Prefer [`figure_builder_for_grid`] so size tracks sample-aware layouts.
#[allow(dead_code)] // public API
pub fn figure_builder_grid() -> FigureBuilder {
    figure_builder(FIGURE_GRID_WIDTH_IN, FIGURE_GRID_HEIGHT_IN, 0.12, 0.16)
}

/// Figure size in inches for an ``nrows`` × ``ncols`` subplot pack.
pub fn figure_size_for_grid(nrows: usize, ncols: usize) -> (f64, f64) {
    let rows = nrows.max(1);
    let cols = ncols.max(1);
    if rows == 1 && cols == 1 {
        return (FIGURE_SINGLE_WIDTH_IN, FIGURE_SINGLE_HEIGHT_IN);
    }
    let panel_slots = rows * cols;
    let scale = if panel_slots >= 12 {
        0.75
    } else if panel_slots >= 8 {
        0.85
    } else {
        1.0
    };
    (
        PANEL_WIDTH_IN * cols as f64 * scale,
        PANEL_HEIGHT_IN * rows as f64 * scale,
    )
}

/// Multi-panel figure sized for a concrete grid shape.
pub fn figure_builder_for_grid(nrows: usize, ncols: usize) -> FigureBuilder {
    let (width_in, height_in) = figure_size_for_grid(nrows, ncols);
    figure_builder(width_in, height_in, 0.12, 0.16)
}

/// Choose size from panel count via auto layout (1–12 sample table).
#[allow(dead_code)] // public API; call sites prefer [`figure_builder_for_grid`]
pub fn figure_builder_for_panels(panel_count: usize) -> FigureBuilder {
    let (rows, cols) = super::util::subplot_grid_shape(panel_count.max(1));
    figure_builder_for_grid(rows, cols)
}

fn figure_builder(width_in: f64, height_in: f64, h_gap: f64, v_gap: f64) -> FigureBuilder {
    Figure::builder()
        .size(Size::inches(width_in, height_in))
        .label_fontsize(LABEL_FONTSIZE)
        .tick_fontsize(TICK_FONTSIZE)
        .title_fontsize(TITLE_FONTSIZE)
        .gaps(h_gap, v_gap)
}

pub fn trace_line_style(color_name: &str, alpha: f64) -> LineStyle {
    LineStyle::new()
        .color(Color::hex(color_name))
        .alpha(alpha)
        .width(1.5) // matplotlib lines.linewidth default / transfection traces
}

/// Outer figure pad for multi-panel grids (`SaveOptions::pad_inches`).
/// Matplotlib default `savefig.pad_inches` is 0.1.
pub const SAVE_PAD_GRID_INCHES: f64 = 0.1;
/// Outer figure pad for single-panel charts (AUC, fit params, …).
/// Larger than the grid pad so tilted category labels and spines aren't
/// flush with the PNG edge.
pub const SAVE_PAD_SINGLE_INCHES: f64 = 0.25;

/// Save a figure, passing `pad_inches` through to mplot (`SaveOptions::pad_inches`).
///
/// Use [`SAVE_PAD_SINGLE_INCHES`] for one-axes plots and [`SAVE_PAD_GRID_INCHES`]
/// for multi-panel packs. Do not change mplot defaults for assay-specific padding.
pub fn save_figure(figure: &Figure, path: &Path, pad_inches: f64) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    figure
        .save(
            path,
            SaveOptions::new().dpi(FIGURE_DPI).pad_inches(pad_inches),
        )
        .map_err(|error| error.to_string())
}
