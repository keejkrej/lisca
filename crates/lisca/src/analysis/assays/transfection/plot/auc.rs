use std::collections::BTreeMap;
use std::path::Path;

use mplot::prelude::{AxesStyle, BoxplotStyle, GridPos, Scale, TickFormat, TickLabelRotation};

use crate::analysis::csv_io::{column_index, parse_f64, read_csv};
use crate::analysis::plot::{
    boxplot_tick_label, boxplot_x_axis_label, figure_builder_single, percentile_ylim, save_figure,
    slide_channel_labels, SAVE_PAD_SINGLE_INCHES,
};
use crate::analysis::slide::SlideMapping;

pub fn run_plot_auc(workspace: &Path, mapping: &SlideMapping) -> Result<(), String> {
    let auc_csv = workspace.join("results").join("auc.csv");
    let (headers, rows) = read_csv(&auc_csv)?;
    let slide_channel_index = column_index(&headers, "slide").ok_or("missing slide")?;
    let auc_index = column_index(&headers, "auc").ok_or("missing auc")?;

    let labels = slide_channel_labels(mapping);
    let mut grouped: BTreeMap<u32, Vec<f64>> = BTreeMap::new();
    for row in rows {
        let Some(channel) = parse_f64(&row[slide_channel_index]).map(|value| value as u32) else {
            continue;
        };
        let Some(auc) = parse_f64(&row[auc_index]) else {
            continue;
        };
        if auc > 0.0 {
            grouped.entry(channel).or_default().push(auc);
        }
    }
    if grouped.is_empty() {
        return Err("No positive AUC values available for plotting".to_string());
    }

    let channels: Vec<u32> = grouped.keys().copied().collect();
    let grouped_values: Vec<Vec<f64>> = channels
        .iter()
        .map(|channel| grouped.get(channel).cloned().unwrap_or_default())
        .collect();

    let results_dir = workspace.join("results");
    write_auc_boxplot(
        &results_dir.join("auc.png"),
        &channels,
        &grouped_values,
        &labels,
        false,
    )?;
    write_auc_boxplot(
        &results_dir.join("auc_log.png"),
        &channels,
        &grouped_values,
        &labels,
        true,
    )
}

fn write_auc_boxplot(
    output_plot: &Path,
    channels: &[u32],
    grouped_values: &[Vec<f64>],
    labels: &BTreeMap<u32, String>,
    log_scale: bool,
) -> Result<(), String> {
    let ticks: Vec<i32> = (1..=channels.len()).map(|index| index as i32).collect();
    let tick_labels: Vec<String> = channels
        .iter()
        .enumerate()
        .map(|(index, channel)| boxplot_tick_label(*channel, grouped_values[index].len(), labels))
        .collect();

    let figure = figure_builder_single()
        .panel(GridPos::new(1, 1, 1), |p| {
            let mut axes = AxesStyle::new()
                .x_label(boxplot_x_axis_label(labels))
                .y_label("AUC")
                .x_tick_labels(&ticks, &tick_labels)
                .x_tick_label_rotation(TickLabelRotation::Degrees(-30))
                .y_tick_format(TickFormat::Scientific);
            if log_scale {
                axes = axes.y_scale(Scale::Log);
            } else {
                let all_values: Vec<f64> = grouped_values.iter().flatten().copied().collect();
                let (y_low, y_high) = percentile_ylim(&all_values);
                axes = axes.y_range(y_low, y_high);
            }
            p.boxplot(grouped_values, BoxplotStyle::new()).axes(axes);
        })
        .build()
        .map_err(|error| error.to_string())?;

    save_figure(&figure, output_plot, SAVE_PAD_SINGLE_INCHES)
}
