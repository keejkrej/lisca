use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use mplot::prelude::{AxesStyle, BoxplotStyle, GridPos, Scale};

use crate::analysis::assays::gene_expression::auc::discover_timeseries_csvs;
use crate::analysis::csv_io::{column_index, parse_f64, read_csv};
use crate::analysis::plot::{
    boxplot_tick_label, boxplot_x_axis_label, default_figure_builder, grid_dimensions,
    parse_slide_channel, percentile_ylim, quartile_axis_upper, save_figure,
    slide_channel_labels, subplot_title, trace_color_alpha, trace_line_style,
    trace_naming_haystack,
};
use crate::analysis::slide::SlideMapping;

const PLOTTED_PARAMETERS: [(&str, &str); 5] = [
    ("intensity_offset", "intensity offset"),
    ("protein_lifetime", "protein lifetime"),
    ("mrna_lifetime", "mRNA lifetime"),
    ("translation_onset", "translation onset"),
    ("transfection_efficiency", "transfection efficiency"),
];

#[derive(Debug, Clone)]
struct FitPlotRow {
    slide_channel: u32,
    pos: i64,
    roi: i64,
    success: bool,
    intensity_offset: Option<f64>,
    protein_decay_rate: Option<f64>,
    mrna_decay_rate: Option<f64>,
    translation_onset: Option<f64>,
    expression_amplitude: Option<f64>,
    protein_lifetime: Option<f64>,
    mrna_lifetime: Option<f64>,
    transfection_efficiency: Option<f64>,
}

pub fn run_plot_fit(
    workspace: &Path,
    mapping: &SlideMapping,
    interval: f64,
    columns: usize,
) -> Result<(), String> {
    let fit_csv = workspace.join("results").join("fit.csv");
    let rows = load_fit_rows(&fit_csv)?;
    let labels = slide_channel_labels(mapping);
    let results_dir = workspace.join("results");

    for (parameter, label) in PLOTTED_PARAMETERS {
        write_fit_boxplot(
            &rows,
            parameter,
            label,
            &results_dir.join(format!("{parameter}.png")),
            &labels,
        )?;
    }

    let timeseries_csvs = discover_timeseries_csvs(&workspace.join("timeseries"))?;
    write_fitted_trace_grid(
        &rows,
        &timeseries_csvs,
        &results_dir.join("traces_fit.png"),
        interval,
        columns,
        &labels,
    )?;
    Ok(())
}

fn load_fit_rows(path: &Path) -> Result<Vec<FitPlotRow>, String> {
    let (headers, rows) = read_csv(path)?;
    let slide_channel_index =
        column_index(&headers, "slide_channel").ok_or("missing slide_channel")?;
    let pos_index = column_index(&headers, "pos").ok_or("missing pos")?;
    let roi_index = column_index(&headers, "roi").ok_or("missing roi")?;
    let success_index = column_index(&headers, "success").ok_or("missing success")?;

    let read_opt = |row: &Vec<String>, name: &str| -> Option<f64> {
        column_index(&headers, name).and_then(|index| parse_f64(&row[index]))
    };

    let mut parsed = Vec::new();
    for row in rows {
        let Some(slide_channel) = parse_f64(&row[slide_channel_index]).map(|value| value as u32)
        else {
            continue;
        };
        let pos = parse_f64(&row[pos_index]).ok_or("invalid pos")? as i64;
        let roi = parse_f64(&row[roi_index]).ok_or("invalid roi")? as i64;
        let success = row[success_index].trim().eq_ignore_ascii_case("true");
        let protein_decay_rate = read_opt(&row, "protein_decay_rate");
        let mrna_decay_rate = read_opt(&row, "mrna_decay_rate");
        let expression_amplitude = read_opt(&row, "expression_amplitude");
        parsed.push(FitPlotRow {
            slide_channel,
            pos,
            roi,
            success,
            intensity_offset: read_opt(&row, "intensity_offset"),
            protein_decay_rate,
            mrna_decay_rate,
            translation_onset: read_opt(&row, "translation_onset"),
            expression_amplitude,
            protein_lifetime: read_opt(&row, "protein_lifetime")
                .or_else(|| protein_decay_rate.map(|rate| 1.0 / rate)),
            mrna_lifetime: read_opt(&row, "mrna_lifetime")
                .or_else(|| mrna_decay_rate.map(|rate| 1.0 / rate)),
            transfection_efficiency: read_opt(&row, "transfection_efficiency").or_else(|| {
                match (expression_amplitude, mrna_decay_rate, protein_decay_rate) {
                    (Some(amp), Some(mrna), Some(protein)) => Some(amp * (mrna - protein)),
                    _ => None,
                }
            }),
        });
    }
    if parsed.is_empty() {
        return Err(format!(
            "{} has no fit rows with slide_channel values",
            path.display()
        ));
    }
    Ok(parsed)
}

fn parameter_value(row: &FitPlotRow, parameter: &str) -> Option<f64> {
    match parameter {
        "intensity_offset" => row.intensity_offset,
        "protein_lifetime" => row.protein_lifetime,
        "mrna_lifetime" => row.mrna_lifetime,
        "translation_onset" => row.translation_onset,
        "transfection_efficiency" => row.transfection_efficiency,
        _ => None,
    }
}

fn write_fit_boxplot(
    rows: &[FitPlotRow],
    parameter: &str,
    ylabel: &str,
    output_plot: &Path,
    labels: &BTreeMap<u32, String>,
) -> Result<(), String> {
    let use_log_scale = parameter == "transfection_efficiency";
    let mut grouped: BTreeMap<u32, Vec<f64>> = BTreeMap::new();
    for row in rows {
        let Some(value) = parameter_value(row, parameter) else {
            continue;
        };
        if use_log_scale && value <= 0.0 {
            continue;
        }
        grouped.entry(row.slide_channel).or_default().push(value);
    }
    if grouped.is_empty() {
        return Err(format!("No finite rows available to plot parameter {parameter:?}"));
    }

    let channels: Vec<u32> = grouped.keys().copied().collect();
    let grouped_values: Vec<Vec<f64>> = channels
        .iter()
        .map(|channel| grouped.get(channel).cloned().unwrap_or_default())
        .collect();
    let ticks: Vec<i32> = (1..=channels.len()).map(|index| index as i32).collect();
    let tick_labels: Vec<String> = channels
        .iter()
        .enumerate()
        .map(|(index, channel)| {
            boxplot_tick_label(*channel, grouped_values[index].len(), labels)
        })
        .collect();
    let y_upper = quartile_axis_upper(&grouped_values);
    let x_label = boxplot_x_axis_label(labels).to_string();
    let ylabel = ylabel.to_string();

    let figure = default_figure_builder()
        .panel(GridPos::new(1, 1, 1), move |p| {
            let mut axes = AxesStyle::new()
                .x_label(x_label)
                .y_label(ylabel)
                .x_tick_labels(&ticks, &tick_labels);
            if use_log_scale {
                axes = axes.y_scale(Scale::Log);
            } else {
                axes = axes.y_range(0.0, y_upper);
            }
            p.boxplot(&grouped_values, BoxplotStyle::new()).axes(axes);
        })
        .build()
        .map_err(|error| error.to_string())?;

    save_figure(&figure, output_plot)
}

fn write_fitted_trace_grid(
    fit_rows: &[FitPlotRow],
    timeseries_csvs: &[PathBuf],
    output_plot: &Path,
    interval: f64,
    columns: usize,
    labels: &BTreeMap<u32, String>,
) -> Result<(), String> {
    let fit_lookup: BTreeMap<(Option<u32>, i64, i64), &FitPlotRow> = fit_rows
        .iter()
        .filter(|row| row.success)
        .map(|row| ((Some(row.slide_channel), row.pos, row.roi), row))
        .collect();

    let (rows, cols) = grid_dimensions(timeseries_csvs.len(), columns);
    let mut builder = default_figure_builder();
    let mut plotted_trace_count = 0usize;

    for (index, csv_path) in timeseries_csvs.iter().enumerate() {
        let (headers, data_rows) = read_csv(csv_path)?;
        let t_index = column_index(&headers, "t").ok_or("missing t column")?;
        let corrected_index =
            column_index(&headers, "corrected").ok_or("missing corrected column")?;
        let pos_index = column_index(&headers, "pos");
        let roi_index = column_index(&headers, "roi").ok_or("missing roi column")?;
        let slide_channel = parse_slide_channel(csv_path);

        let mut groups: BTreeMap<(i64, i64), Vec<(f64, f64)>> = BTreeMap::new();
        let mut corrected_values = Vec::new();
        for row in data_rows {
            let pos = pos_index
                .and_then(|idx| parse_f64(&row[idx]))
                .map(|value| value as i64)
                .unwrap_or(0);
            let roi = parse_f64(&row[roi_index]).ok_or("invalid roi")? as i64;
            let t = parse_f64(&row[t_index]).ok_or("invalid t")?;
            let corrected = parse_f64(&row[corrected_index]).ok_or("invalid corrected")?;
            groups.entry((pos, roi)).or_default().push((t, corrected));
            corrected_values.push(corrected);
        }

        let (y_low, y_high) = percentile_ylim(&corrected_values);
        let max_t = groups
            .values()
            .flat_map(|trace| trace.iter().map(|point| point.0))
            .fold(0.0f64, f64::max)
            * interval;
        let (color, alpha) = trace_color_alpha(&trace_naming_haystack(csv_path, labels));
        let mut matched_traces = 0usize;
        let mut series: Vec<(Vec<f64>, Vec<f64>)> = Vec::new();

        for ((pos, roi), mut trace) in groups {
            let Some(fit_row) = fit_lookup.get(&(slide_channel, pos, roi)) else {
                continue;
            };
            trace.sort_by(|left, right| {
                left.0
                    .partial_cmp(&right.0)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            let x: Vec<f64> = trace.iter().map(|(t, _)| *t * interval).collect();
            let y: Vec<f64> = trace
                .iter()
                .map(|(t, _)| fitted_trace_value(*t * interval, fit_row))
                .collect();
            series.push((x, y));
            matched_traces += 1;
            plotted_trace_count += 1;
        }

        let title = subplot_title(csv_path, matched_traces, labels);
        builder = builder.panel(GridPos::new(rows, cols, index + 1), move |p| {
            for (x, y) in &series {
                p.line(x, y, trace_line_style(color, alpha));
            }
            p.axes(
                AxesStyle::new()
                    .title(title)
                    .x_label("minutes")
                    .y_label("corrected intensity")
                    .y_range(y_low, y_high)
                    .x_range(0.0, max_t.max(interval)),
            );
        });
    }

    for index in timeseries_csvs.len()..(rows * cols) {
        builder = builder.panel(GridPos::new(rows, cols, index + 1), |p| {
            p.axes(AxesStyle::new().hide(true));
        });
    }

    if plotted_trace_count == 0 {
        return Err("No successful fit rows matched the inferred timeseries CSVs".to_string());
    }

    let figure = builder.build().map_err(|error| error.to_string())?;
    save_figure(&figure, output_plot)
}

fn fitted_trace_value(time_minutes: f64, row: &FitPlotRow) -> f64 {
    let intensity_offset = row.intensity_offset.unwrap_or(0.0);
    let protein_decay_rate = row.protein_decay_rate.unwrap_or(0.0);
    let mrna_decay_rate = row.mrna_decay_rate.unwrap_or(0.0);
    let translation_onset = row.translation_onset.unwrap_or(0.0);
    let expression_amplitude = row.expression_amplitude.unwrap_or(0.0);
    if time_minutes < translation_onset {
        return intensity_offset;
    }
    let dt = time_minutes - translation_onset;
    intensity_offset
        + expression_amplitude
            * ((-protein_decay_rate * dt).exp() - (-mrna_decay_rate * dt).exp())
}
