use std::collections::BTreeMap;
use std::path::Path;

use mplot::prelude::{AxesStyle, BoxplotStyle, GridPos, Scale};

use super::super::csv_io::{column_index, parse_f64, read_csv};
use super::super::slide::SlideMapping;
use super::mplot_config::{default_figure_builder, save_figure};
use super::util::{boxplot_tick_label, boxplot_x_axis_label, slide_channel_labels};

pub fn run_plot_auc(workspace: &Path, mapping: &SlideMapping) -> Result<(), String> {
    let auc_csv = workspace.join("results").join("auc.csv");
    let (headers, rows) = read_csv(&auc_csv)?;
    let slide_channel_index =
        column_index(&headers, "slide_channel").ok_or("missing slide_channel")?;
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
        return Err("No positive AUC values available for log-scale plotting".to_string());
    }

    let channels: Vec<u32> = grouped.keys().copied().collect();
    let grouped_values: Vec<Vec<f64>> = channels
        .iter()
        .map(|channel| grouped.get(channel).cloned().unwrap_or_default())
        .collect();

    write_auc_boxplot(
        &workspace.join("results").join("auc.png"),
        &channels,
        &grouped_values,
        &labels,
    )
}

fn write_auc_boxplot(
    output_plot: &Path,
    channels: &[u32],
    grouped_values: &[Vec<f64>],
    labels: &BTreeMap<u32, String>,
) -> Result<(), String> {
    let ticks: Vec<i32> = (1..=channels.len()).map(|index| index as i32).collect();
    let tick_labels: Vec<String> = channels
        .iter()
        .enumerate()
        .map(|(index, channel)| {
            boxplot_tick_label(*channel, grouped_values[index].len(), labels)
        })
        .collect();

    let figure = default_figure_builder()
        .panel(GridPos::new(1, 1, 1), |p| {
            p.boxplot(grouped_values, BoxplotStyle::new()).axes(
                AxesStyle::new()
                    .x_label(boxplot_x_axis_label(labels))
                    .y_label("AUC")
                    .y_scale(Scale::Log)
                    .x_tick_labels(&ticks, &tick_labels),
            );
        })
        .build()
        .map_err(|error| error.to_string())?;

    save_figure(&figure, output_plot)
}
