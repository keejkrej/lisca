use std::collections::BTreeMap;
use std::path::Path;

use mplot::prelude::{AxesStyle, GridPos, HistStyle};
use mplot::Color;

use crate::analysis::csv_io::{column_index, parse_f64, read_csv};
use crate::analysis::plot::{
    figure_builder_for_grid, grid_dimensions, sample_labels, save_figure, SAVE_PAD_GRID_INCHES,
};
use crate::analysis::sample::SampleMapping;

const HISTOGRAM_BINS: usize = 20;

pub fn run_plot_death_times(
    workspace: &Path,
    mapping: &SampleMapping,
    interval: f64,
) -> Result<(), String> {
    if interval <= 0.0 {
        return Err(format!("interval must be > 0, got {interval}"));
    }

    let death_csv = workspace.join("results/death_times.csv");
    let (headers, rows) = read_csv(&death_csv)?;
    let death_time_index =
        column_index(&headers, "death_time").ok_or("missing death_time in death_times.csv")?;
    let sample_index =
        column_index(&headers, "sample").ok_or("missing sample in death_times.csv")?;

    let labels = sample_labels(mapping);
    // Keyed by Sample index so panels follow assay order.
    let mut grouped: BTreeMap<usize, Vec<f64>> = BTreeMap::new();
    for row in rows {
        let Some(death_time) = parse_f64(&row[death_time_index]) else {
            continue;
        };
        if death_time <= 0.0 {
            continue;
        }
        let Some(sample) = mapping
            .iter()
            .position(|entry| entry.name == row[sample_index])
        else {
            continue;
        };
        grouped
            .entry(sample)
            .or_default()
            .push(death_time * interval);
    }

    if grouped.is_empty() {
        return Err("no death times to plot".to_string());
    }

    let samples: Vec<usize> = grouped.keys().copied().collect();
    let (rows, cols) = grid_dimensions(samples.len(), 2);
    let mut builder = figure_builder_for_grid(rows, cols);

    for (index, sample) in samples.iter().enumerate() {
        let values = grouped.get(sample).cloned().unwrap_or_default();
        let label = labels.get(sample).cloned().unwrap_or_default();
        let max_count = values.len() as f64;

        builder = builder.panel(GridPos::new(rows, cols, index + 1), move |panel| {
            panel.histogram(
                &values,
                HistStyle::new()
                    .bins(HISTOGRAM_BINS)
                    .color(Color::hex("steelblue"))
                    .label("n crops"),
            );
            panel.axes(
                AxesStyle::new()
                    .title(label)
                    .x_label("time (min)")
                    .y_label("n crops")
                    .y_range(0.0, max_count.max(1.0)),
            );
        });
    }

    for index in samples.len()..(rows * cols) {
        builder = builder.panel(GridPos::new(rows, cols, index + 1), |panel| {
            panel.axes(AxesStyle::new().hide(true));
        });
    }

    let figure = builder.build().map_err(|error| error.to_string())?;
    save_figure(
        &figure,
        &workspace.join("results/death_times.png"),
        SAVE_PAD_GRID_INCHES,
    )
}
