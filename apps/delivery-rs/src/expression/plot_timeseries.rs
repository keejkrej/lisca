use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use clap::Args;
use plotters::prelude::*;

use lisca::analysis::roi::load_timeseries_csv;

pub const HELP: &str = "Plot one or more ROI timeseries CSVs as subplots in a single PNG.";
const PYTHON_TIMESERIES_WIDTH_PER_COLUMN: u32 = 900;
const PYTHON_TIMESERIES_HEIGHT_PER_ROW: u32 = 720;
const PYTHON_TITLE_FONT_SIZE: i32 = 25;
const PYTHON_LABEL_FONT_SIZE: i32 = 21;

#[derive(Clone, Debug, Args)]
#[command(about = HELP)]
pub struct PlotTimeseriesArgs {
    #[arg(help = "One or more long-form ROI timeseries CSV files to plot together.")]
    pub timeseries_csvs: Vec<PathBuf>,
    #[arg(
        long,
        help = "Output PNG path. Default: derive a shared <stem>_combined.png path."
    )]
    pub output_plot: Option<PathBuf>,
    #[arg(
        long,
        default_value_t = 3,
        help = "Number of subplot columns in the output grid."
    )]
    pub columns: usize,
    #[arg(long, default_value_t = 0.12, help = "Per-trace opacity.")]
    pub alpha: f64,
    #[arg(long, default_value_t = 1.0, help = "Per-trace line width.")]
    pub linewidth: f64,
    #[arg(long, default_value = "#c03a2b", help = "Plot color for all traces.")]
    pub color: String,
    #[arg(long, help = "Optional figure title.")]
    pub title: Option<String>,
}

pub fn run_plot_timeseries(
    timeseries_csvs: &[PathBuf],
    output_plot: Option<&Path>,
    columns: usize,
    alpha: f64,
    linewidth: f64,
    color: &str,
    title: Option<&str>,
) -> Result<PathBuf, String> {
    let mut csvs = timeseries_csvs.to_vec();
    csvs.sort_by(|a, b| a.file_name().cmp(&b.file_name()));
    let output = default_output_plot_path(&csvs, output_plot);
    write_subplot_grid(&csvs, &output, columns, alpha, linewidth, color, title)?;
    Ok(output)
}

pub fn default_output_plot_path(
    timeseries_csvs: &[PathBuf],
    output_plot: Option<&Path>,
) -> PathBuf {
    if let Some(path) = output_plot {
        return path.to_path_buf();
    }
    let stems = timeseries_csvs
        .iter()
        .map(|path| super::auc::normalize_output_stem(path))
        .collect::<std::collections::BTreeSet<_>>();
    let stem = if stems.len() == 1 {
        stems.into_iter().next().unwrap()
    } else if timeseries_csvs.len() == 1 {
        timeseries_csvs[0]
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("timeseries")
            .to_string()
    } else {
        "timeseries".to_string()
    };
    timeseries_csvs[0].with_file_name(format!("{stem}_combined.png"))
}

pub fn subplot_title(csv_path: &Path, trace_count: Option<usize>) -> String {
    let label = super::auc::parse_slide_channel(csv_path)
        .map(|value| format!("slide channel {value}"))
        .unwrap_or_else(|| {
            csv_path
                .file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("timeseries")
                .to_string()
        });
    match trace_count {
        Some(value) => format!("{label} ({value} traces)"),
        None => label,
    }
}

pub fn write_subplot_grid(
    timeseries_csvs: &[PathBuf],
    output_plot: &Path,
    columns: usize,
    alpha: f64,
    linewidth: f64,
    color: &str,
    title: Option<&str>,
) -> Result<(), String> {
    let columns = columns.max(1);
    let rows = (timeseries_csvs.len() + columns - 1) / columns;
    let root = BitMapBackend::new(
        output_plot,
        (
            columns as u32 * PYTHON_TIMESERIES_WIDTH_PER_COLUMN,
            rows as u32 * PYTHON_TIMESERIES_HEIGHT_PER_ROW,
        ),
    )
    .into_drawing_area();
    root.fill(&WHITE).map_err(|err| err.to_string())?;
    if let Some(parent) = output_plot.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    if let Some(title) = title {
        root.draw(&Text::new(
            title.to_string(),
            (20, 25),
            ("sans-serif", PYTHON_TITLE_FONT_SIZE).into_font(),
        ))
        .map_err(|err| err.to_string())?;
    }
    let content = if title.is_some() {
        root.margin(50, 10, 10, 10)
    } else {
        root.margin(10, 10, 10, 10)
    };
    let areas = content.split_evenly((rows, columns));
    let series_color = parse_color(color)?.mix(alpha.clamp(0.0, 1.0));
    let stroke_width = linewidth.max(1.0).round() as u32;

    for (area, csv_path) in areas.into_iter().zip(timeseries_csvs.iter()) {
        let rows = load_timeseries_csv(csv_path)?;
        let mut grouped = BTreeMap::<(u32, u32), Vec<(f64, f64)>>::new();
        let mut x_min = f64::INFINITY;
        let mut x_max = f64::NEG_INFINITY;
        let mut y_min = f64::INFINITY;
        let mut y_max = f64::NEG_INFINITY;
        for row in rows {
            let point = (row.t as f64, row.corrected);
            x_min = x_min.min(point.0);
            x_max = x_max.max(point.0);
            y_min = y_min.min(point.1);
            y_max = y_max.max(point.1);
            grouped
                .entry((row.pos.unwrap_or(0), row.roi))
                .or_default()
                .push(point);
        }
        let (x_min, x_max) = padded_range(x_min, x_max);
        let (y_min, y_max) = padded_range(y_min, y_max);
        let trace_count = grouped.len();

        let mut chart = ChartBuilder::on(&area)
            .margin(10)
            .caption(
                subplot_title(csv_path, Some(trace_count)),
                ("sans-serif", PYTHON_TITLE_FONT_SIZE),
            )
            .set_label_area_size(LabelAreaPosition::Left, 90)
            .set_label_area_size(LabelAreaPosition::Bottom, 55)
            .build_cartesian_2d(x_min..x_max, y_min..y_max)
            .map_err(|err| err.to_string())?;
        chart
            .configure_mesh()
            .x_desc("frame")
            .y_desc("corrected intensity")
            .label_style(("sans-serif", PYTHON_LABEL_FONT_SIZE))
            .axis_desc_style(("sans-serif", PYTHON_LABEL_FONT_SIZE))
            .y_label_formatter(&scientific_tick_label)
            .disable_mesh()
            .draw()
            .map_err(|err| err.to_string())?;
        for (_, mut trace) in grouped {
            trace.sort_by(|a, b| a.0.total_cmp(&b.0));
            chart
                .draw_series(LineSeries::new(
                    trace,
                    ShapeStyle::from(&series_color).stroke_width(stroke_width),
                ))
                .map_err(|err| err.to_string())?;
        }
    }
    root.present().map_err(|err| err.to_string())
}

pub fn format_written_timeseries_plot_message(output_plot: &Path) -> String {
    format!("Wrote plot: {}", output_plot.display())
}

pub fn execute(args: PlotTimeseriesArgs) -> Result<(), String> {
    let output = run_plot_timeseries(
        &args.timeseries_csvs,
        args.output_plot.as_deref(),
        args.columns,
        args.alpha,
        args.linewidth,
        &args.color,
        args.title.as_deref(),
    )?;
    println!("{}", format_written_timeseries_plot_message(&output));
    Ok(())
}

pub(crate) fn parse_color(value: &str) -> Result<RGBColor, String> {
    let normalized = value.trim();
    if let Some(hex) = normalized.strip_prefix('#') {
        if hex.len() == 6 {
            let red = u8::from_str_radix(&hex[0..2], 16)
                .map_err(|_| format!("Invalid color {value:?}"))?;
            let green = u8::from_str_radix(&hex[2..4], 16)
                .map_err(|_| format!("Invalid color {value:?}"))?;
            let blue = u8::from_str_radix(&hex[4..6], 16)
                .map_err(|_| format!("Invalid color {value:?}"))?;
            return Ok(RGBColor(red, green, blue));
        }
    }
    match normalized.to_ascii_lowercase().as_str() {
        "black" => Ok(BLACK),
        "red" => Ok(RED),
        "blue" => Ok(BLUE),
        "green" => Ok(GREEN),
        _ => Err(format!("Unsupported color {value:?}")),
    }
}

pub(crate) fn scientific_tick_label(value: &f64) -> String {
    format!("{value:.2e}")
}

fn padded_range(min: f64, max: f64) -> (f64, f64) {
    if !min.is_finite() || !max.is_finite() {
        return (0.0, 1.0);
    }
    if (max - min).abs() < f64::EPSILON {
        (min, min + 1.0)
    } else {
        let padding = (max - min) * 0.05;
        (min - padding, max + padding)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_output_plot_path_strips_slide_channel_segment() {
        let csvs = vec![
            PathBuf::from("/tmp/slide_sc0_ch001_timeseries.csv"),
            PathBuf::from("/tmp/slide_sc2_ch001_timeseries.csv"),
        ];
        let output = default_output_plot_path(&csvs, None);
        assert!(output.ends_with("slide_ch001_timeseries_combined.png"));
    }

    #[test]
    fn subplot_title_includes_trace_count() {
        let title = subplot_title(Path::new("/tmp/slide_sc3_ch001_timeseries.csv"), Some(42));
        assert_eq!(title, "slide channel 3 (42 traces)");
    }

    #[test]
    fn scientific_tick_label_uses_exponential_notation() {
        assert_eq!(scientific_tick_label(&12345.0), "1.23e4");
    }
}
