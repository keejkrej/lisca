use std::path::Path;

use mplot::prelude::{Figure, FigureBuilder, LineStyle, SaveOptions, Size};
use mplot::Color;

/// Match `transfection` FIGURE_SIZE_IN / FIGURE_DPI / rcParams.
pub const FIGURE_WIDTH_IN: f64 = 12.0;
pub const FIGURE_HEIGHT_IN: f64 = 8.0;
/// Matches transfection `FIGURE_DPI` (library default export is 200).
pub const FIGURE_DPI: u32 = 100;
/// Matches transfection `font.size` / `axes.titlesize` / `axes.labelsize`.
pub const LABEL_FONTSIZE: f64 = 18.0;
pub const TITLE_FONTSIZE: f64 = 18.0;
/// Matches transfection `xtick.labelsize` / `ytick.labelsize`.
pub const TICK_FONTSIZE: f64 = 17.0;

pub fn default_figure_builder() -> FigureBuilder {
    Figure::builder()
        .size(Size::inches(FIGURE_WIDTH_IN, FIGURE_HEIGHT_IN))
        .label_fontsize(LABEL_FONTSIZE)
        .tick_fontsize(TICK_FONTSIZE)
        .title_fontsize(TITLE_FONTSIZE)
        // Matplotlib-like subplot spacing (hspace/wspace).
        .gaps(0.25, 0.30)
}

pub fn trace_line_style(color_name: &str, alpha: f64) -> LineStyle {
    LineStyle::new()
        .color(Color::hex(color_name))
        .alpha(alpha)
        .width(1.5) // matplotlib lines.linewidth default / transfection traces
}

pub fn save_figure(figure: &Figure, path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    figure
        .save(path, SaveOptions::new().dpi(FIGURE_DPI))
        .map_err(|error| error.to_string())
}
