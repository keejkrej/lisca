use std::path::Path;

use mplot::prelude::{Figure, FigureBuilder, LineStyle, SaveOptions, Size};
use mplot::Color;

pub const FIGURE_WIDTH_IN: f64 = 12.0;
pub const FIGURE_HEIGHT_IN: f64 = 8.0;

pub fn default_figure_builder() -> FigureBuilder {
    Figure::builder().size(Size::inches(FIGURE_WIDTH_IN, FIGURE_HEIGHT_IN))
}

pub fn trace_line_style(color_name: &str, alpha: f64) -> LineStyle {
    LineStyle::new()
        .color(Color::hex(color_name))
        .alpha(alpha)
        .width(1.0)
}

pub fn save_figure(figure: &Figure, path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    figure
        .save(path, SaveOptions::default())
        .map_err(|error| error.to_string())
}
