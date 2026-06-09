//! Shared plotting helpers used across assay pipelines.

mod mplot_config;
mod util;

pub use mplot_config::{default_figure_builder, save_figure, trace_line_style};
pub use util::{
    boxplot_tick_label, boxplot_x_axis_label, expand_degenerate_ylim, grid_dimensions,
    parse_slide_channel, percentile_ylim, quartile_axis_upper, slide_channel_labels,
    subplot_title, trace_color_alpha, trace_naming_haystack, DEFAULT_PLOT_COLUMNS,
};
