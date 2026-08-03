use std::path::Path;

use mplot::prelude::{Figure, FigureBuilder, LineStyle, SaveOptions, Size};
use mplot::Color;

/// Single-panel boxplots / one-off charts (inches).
/// Height is a bit taller than the transfection 4.5 in default so tilted
/// category x-labels keep a usable axes box after the bottom gutter.
pub const FIGURE_SINGLE_WIDTH_IN: f64 = 6.5;
pub const FIGURE_SINGLE_HEIGHT_IN: f64 = 5.5;
/// Multi-panel grids (2×3 traces, kill-curve packs, …) (inches).
pub const FIGURE_GRID_WIDTH_IN: f64 = 12.0;
pub const FIGURE_GRID_HEIGHT_IN: f64 = 8.0;

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

/// Multi-panel packs (traces, area, traces_fit, multi-channel grids).
///
/// Gaps are mplot `wspace`/`hspace` fractions of cell size (matplotlib
/// `subplots_adjust`). Keep them tighter than the library default (0.2) so
/// 2×3 assay grids use space for axes, not whitespace.
pub fn figure_builder_grid() -> FigureBuilder {
    figure_builder(FIGURE_GRID_WIDTH_IN, FIGURE_GRID_HEIGHT_IN, 0.12, 0.16)
}

/// Choose single vs grid size from how many data panels will be drawn.
pub fn figure_builder_for_panels(panel_count: usize) -> FigureBuilder {
    if panel_count <= 1 {
        figure_builder_single()
    } else {
        figure_builder_grid()
    }
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
