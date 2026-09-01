from __future__ import annotations

import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from mpl_toolkits.axes_grid1 import make_axes_locatable

from transfection import core as plot_layout
from transfection.services import plot_timeseries
from transfection.core import (
    boxplot_tick_labels,
    boxplot_x_axis_label,
    infer_workspace_root,
    load_assay_for_workspace,
    require_named_samples,
    trace_color_alpha_from_fluor_name,
    workspace_results_dir,
)
from transfection.core.kinetics import (
    BASELINE_INTENSITY_AXIS_LABEL,
    EXPRESSION_RATE_AXIS_LABEL,
    MINUTES_PER_HOUR,
    MRNA_LIFETIME_AXIS_LABEL,
    ONSET_TIME_AXIS_LABEL,
    PROTEIN_LIFETIME_AXIS_LABEL,
    degradation_rate_per_minute,
    expression_amplitude_from_observables,
    half_life_minutes,
)
from transfection.core.sample_pack import (
    concat_sample_tables,
    concat_sample_traces,
    labels_from_sample_column,
    sample_pack_dir,
    sample_pack_dirnames,
)

# Display labels match Müller et al. 2024 (basic model, no maturation).
# Time-valued kinetics (onset, lifetimes) are stored in minutes and converted
# to hours for PNG axes only.
PLOTTED_PARAMETERS = (
    ("baseline_intensity", BASELINE_INTENSITY_AXIS_LABEL, False),
    ("protein_lifetime", PROTEIN_LIFETIME_AXIS_LABEL, True),
    ("mrna_lifetime", MRNA_LIFETIME_AXIS_LABEL, True),
    ("onset_time", ONSET_TIME_AXIS_LABEL, True),
    ("expression_rate", EXPRESSION_RATE_AXIS_LABEL, False),
)
# Paper observables stored on disk. traces_fit reconstructs β, δ, and
# amplitude at plot time and does not require those columns to exist.
FIT_TABLE_PARAMETERS = (
    "baseline_intensity",
    "protein_lifetime",
    "mrna_lifetime",
    "onset_time",
    "expression_rate",
)
FIT_TRACE_PARAMETERS = (
    "baseline_intensity",
    "protein_degradation_rate",
    "mrna_degradation_rate",
    "onset_time",
    "expression_amplitude",
)
ONSET_SCATTER_PNG = "expression_rate_vs_onset_time.png"
LIFETIME_SCATTER_PNG = "expression_rate_vs_mrna_lifetime.png"

# Log-log joint plots (scatter + attached x/y histograms). Percentiles of the
# positive bulk, then pad in log10 space so the cloud sits in the frame center.
JOINT_FIGSIZE_IN = (6.5, 6.5)
JOINT_PERCENTILE_LO = 5.0
JOINT_PERCENTILE_HI = 95.0
JOINT_LOG10_PAD = 0.4
JOINT_HIST_BINS = 18
JOINT_HIST_FRAC = 0.22
JOINT_HIST_PAD = 0.08
JOINT_HIST_ALPHA = 0.75


def run_plot_fit(
    fit_csv: Path,
    *,
    output: Path | None,
    interval: float,
    columns: int | None,
) -> list[Path]:
    if interval <= 0:
        raise ValueError(f"--interval must be > 0, got {interval}")
    workspace = infer_workspace_root(fit_csv)
    config = load_assay_for_workspace(workspace)
    mapping = require_named_samples(config)
    tables = concat_sample_tables(workspace, mapping, "fit")
    traces = concat_sample_traces(workspace, mapping)
    dirnames = sample_pack_dirnames(mapping)
    names = {sc: entry.sample_name for sc, entry in mapping.items()}
    written_paths: list[Path] = []
    loaded_tables: list[pd.DataFrame] = []
    _ = columns
    corrected_arrays = [
        plot_timeseries.panel_values(table, "corrected")
        for table in traces.values()
        if table is not None and not table.empty and "corrected" in table.columns
    ]
    shared_fit_ylim = (
        plot_timeseries.percentile_ylim(np.concatenate(corrected_arrays))
        if corrected_arrays
        else None
    )
    for slide_channel, table in tables.items():
        dirname = dirnames.get(slide_channel)
        if dirname is None:
            continue
        dest_dir = sample_pack_dir(workspace, dirname)
        if output is not None and len(tables) == 1:
            dest_dir = output.resolve()
        df = load_fit_table(table)
        loaded_tables.append(df)
        names_for_sample = {**names, **labels_from_sample_column(df)}
        written_paths.extend(
            write_fitted_trace_plots(
                df,
                dest_dir / "traces_fit.png",
                interval=interval,
                slide_channel_names=names_for_sample,
                traces_df=traces.get(slide_channel),
                shared_ylim=shared_fit_ylim,
            )
        )
        onset_scatter = dest_dir / ONSET_SCATTER_PNG
        if _write_kinetic_joint_scatter(
            df,
            onset_scatter,
            x_column="onset_time",
            y_column="expression_rate",
            xlabel=ONSET_TIME_AXIS_LABEL,
            ylabel=EXPRESSION_RATE_AXIS_LABEL,
            empty_message="No successful finite positive fits available to plot expression rate vs onset time",
            slide_channel_names=names_for_sample,
            missing_ok=True,
            x_as_hours=True,
        ):
            written_paths.append(onset_scatter)
        lifetime_scatter = dest_dir / LIFETIME_SCATTER_PNG
        if _write_kinetic_joint_scatter(
            df,
            lifetime_scatter,
            x_column="mrna_lifetime",
            y_column="expression_rate",
            xlabel=MRNA_LIFETIME_AXIS_LABEL,
            ylabel=EXPRESSION_RATE_AXIS_LABEL,
            empty_message="No successful finite positive fits available to plot expression rate vs mRNA lifetime",
            slide_channel_names=names_for_sample,
            missing_ok=True,
            x_as_hours=True,
        ):
            written_paths.append(lifetime_scatter)
    if loaded_tables:
        combined = pd.concat(loaded_tables, ignore_index=True)
        names_all = {**names, **labels_from_sample_column(combined)}
        results_dir = workspace_results_dir(workspace)
        for parameter, label, as_hours in PLOTTED_PARAMETERS:
            output_plot = results_dir / f"{parameter}.png"
            write_fit_boxplot(
                combined,
                parameter=parameter,
                ylabel=label,
                output_plot=output_plot,
                slide_channel_names=names_all,
                log_scale=False,
                as_hours=as_hours,
            )
            written_paths.append(output_plot)
    if not written_paths:
        raise ValueError("no fit panels to plot")
    return written_paths


def load_fit_table(df: pd.DataFrame) -> pd.DataFrame:
    keep_columns = [column for column in df.columns]
    out = df.loc[:, keep_columns].copy()
    if "slide_channel" in out.columns:
        out = out.dropna(subset=["slide_channel"])
        out["slide_channel"] = out["slide_channel"].astype(int)
    if out.empty:
        raise ValueError("fit table has no rows")

    if "pos" in out.columns:
        out["pos"] = pd.to_numeric(out["pos"], errors="coerce").astype("Int64")
    out["roi"] = pd.to_numeric(out["roi"], errors="coerce").astype("Int64")
    out["success"] = out["success"].astype(str).str.lower().eq("true")
    _ensure_fit_model_columns(out)
    required = {"roi", "success", *FIT_TABLE_PARAMETERS}
    missing = required.difference(out.columns)
    if missing:
        raise ValueError(f"fit table is missing required columns: {sorted(missing)}")
    for parameter in (*FIT_TABLE_PARAMETERS, *FIT_TRACE_PARAMETERS):
        if parameter in out.columns:
            out[parameter] = pd.to_numeric(out[parameter], errors="coerce")
    sort_columns = [column for column in ("slide_channel", "pos", "roi") if column in out.columns]
    return out.sort_values(sort_columns).reset_index(drop=True)


def _series_or_none(df: pd.DataFrame, name: str) -> pd.Series | None:
    if name not in df.columns:
        return None
    return pd.to_numeric(df[name], errors="coerce")


def _ensure_fit_model_columns(df: pd.DataFrame) -> None:
    """Fill missing lifetimes, rates, amplitude, and expression_rate in place.

    Written tables store paper observables. traces_fit needs β, δ, and
    amplitude, which are recovered as ln(2)/lifetime and
    expression_rate / (δ − β). If a dropped column is present (older files),
    derive the stored observable from it instead of requiring both.
    """
    protein_lifetime = _series_or_none(df, "protein_lifetime")
    mrna_lifetime = _series_or_none(df, "mrna_lifetime")
    protein_rate = _series_or_none(df, "protein_degradation_rate")
    mrna_rate = _series_or_none(df, "mrna_degradation_rate")
    amplitude = _series_or_none(df, "expression_amplitude")
    expression_rate = _series_or_none(df, "expression_rate")

    if protein_lifetime is None and protein_rate is not None:
        df["protein_lifetime"] = half_life_minutes_series(protein_rate)
        protein_lifetime = df["protein_lifetime"]
    if protein_rate is None and protein_lifetime is not None:
        df["protein_degradation_rate"] = protein_lifetime.map(
            lambda value: degradation_rate_per_minute(float(value)) if pd.notna(value) else np.nan
        )
        protein_rate = df["protein_degradation_rate"]

    if mrna_lifetime is None and mrna_rate is not None:
        df["mrna_lifetime"] = half_life_minutes_series(mrna_rate)
        mrna_lifetime = df["mrna_lifetime"]
    if mrna_rate is None and mrna_lifetime is not None:
        df["mrna_degradation_rate"] = mrna_lifetime.map(
            lambda value: degradation_rate_per_minute(float(value)) if pd.notna(value) else np.nan
        )
        mrna_rate = df["mrna_degradation_rate"]

    if expression_rate is None and amplitude is not None and mrna_rate is not None and protein_rate is not None:
        df["expression_rate"] = amplitude * (mrna_rate - protein_rate)
        expression_rate = df["expression_rate"]
    if amplitude is None and expression_rate is not None and mrna_lifetime is not None and protein_lifetime is not None:
        df["expression_amplitude"] = [
            (
                expression_amplitude_from_observables(float(rate), float(mrna), float(protein))
                if pd.notna(rate) and pd.notna(mrna) and pd.notna(protein)
                else np.nan
            )
            for rate, mrna, protein in zip(expression_rate, mrna_lifetime, protein_lifetime, strict=True)
        ]


def load_fit_csv(fit_csv: Path) -> pd.DataFrame:
    return load_fit_table(pd.read_csv(fit_csv))


def default_output_plot_paths_for_dir(destination_dir: Path) -> dict[str, Path]:
    return {parameter: destination_dir / f"{parameter}.png" for parameter, _, _ in PLOTTED_PARAMETERS}


def default_output_plot_paths(fit_csv: Path, output: Path | None) -> dict[str, Path]:
    destination_dir = fit_csv.parent if output is None else output.resolve()
    return default_output_plot_paths_for_dir(destination_dir)


def default_trace_plot_path(fit_csv: Path, output: Path | None) -> Path:
    destination_dir = fit_csv.parent if output is None else output.resolve()
    return destination_dir / "traces_fit.png"


def default_scatter_plot_path(fit_csv: Path, output: Path | None) -> Path:
    destination_dir = fit_csv.parent if output is None else output.resolve()
    return destination_dir / ONSET_SCATTER_PNG


def half_life_minutes_series(rates: pd.Series) -> pd.Series:
    return rates.map(lambda rate: half_life_minutes(float(rate)) if pd.notna(rate) else np.nan)


def default_mrna_lifetime_scatter_plot_path(fit_csv: Path, output: Path | None) -> Path:
    destination_dir = fit_csv.parent if output is None else output.resolve()
    return destination_dir / LIFETIME_SCATTER_PNG


def write_fit_boxplot(
    df: pd.DataFrame,
    *,
    parameter: str,
    ylabel: str,
    output_plot: Path,
    slide_channel_names: dict[int, str],
    log_scale: bool,
    as_hours: bool = False,
) -> None:
    parameter_df = df.dropna(subset=[parameter]).copy()
    if as_hours:
        parameter_df[parameter] = parameter_df[parameter] / MINUTES_PER_HOUR
    if log_scale:
        parameter_df = parameter_df.loc[parameter_df[parameter] > 0].copy()
    if parameter_df.empty:
        raise ValueError(f"No finite rows available to plot parameter {parameter!r}")

    slide_channels = sorted(parameter_df["slide_channel"].unique().tolist())
    trace_counts = [
        int(parameter_df.loc[parameter_df["slide_channel"] == slide_channel, parameter].shape[0])
        for slide_channel in slide_channels
    ]
    grouped_values = [
        parameter_df.loc[parameter_df["slide_channel"] == slide_channel, parameter].to_numpy(dtype=float)
        for slide_channel in slide_channels
    ]

    fig, ax = plt.subplots(figsize=plot_layout.FIGURE_SIZE_SINGLE_IN)
    ax.boxplot(
        grouped_values,
        tick_labels=boxplot_tick_labels(slide_channels, trace_counts, slide_channel_names),
    )

    ax.set_xlabel(boxplot_x_axis_label(slide_channel_names))
    ax.set_ylabel(ylabel)
    ax.tick_params(axis="x", labelrotation=45)
    for label in ax.get_xticklabels():
        label.set_ha("right")
    if log_scale:
        ax.set_yscale("log")
    else:
        arrays = [values for values in grouped_values if values.size]
        y_low, y_high = plot_timeseries.percentile_ylim(
            np.concatenate(arrays) if arrays else np.array([])
        )
        ax.set_ylim(y_low, y_high)

    output_plot.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_plot, dpi=plot_layout.FIGURE_DPI, bbox_inches="tight")
    plt.close(fig)


def successful_finite_fit_df(df: pd.DataFrame, *parameters: str) -> pd.DataFrame:
    """Successful rows with finite values — the same keep rule as fit boxplots, plus ``success``.

    Boxplots drop NA/non-finite parameter values; failed fits write those as empty,
    so this is the scatter equivalent of that filter.
    """
    parameter_df = df.loc[df["success"]].dropna(subset=list(parameters)).copy()
    for parameter in parameters:
        parameter_df = parameter_df.loc[np.isfinite(parameter_df[parameter].to_numpy(dtype=float))].copy()
    return parameter_df


def pearson_r(x: np.ndarray, y: np.ndarray) -> float | None:
    if x.size != y.size or x.size < 2:
        return None
    if not np.isfinite(x).all() or not np.isfinite(y).all():
        return None
    if float(np.std(x, ddof=0)) == 0.0 or float(np.std(y, ddof=0)) == 0.0:
        return None
    r = float(np.corrcoef(x, y)[0, 1])
    if not math.isfinite(r):
        return None
    return r


def pearson_annotation(r: float | None, n: int) -> str:
    if r is None:
        return f"n = {n}"
    return f"r = {r:.2f}\nn = {n}"


def log_joint_limits(values: np.ndarray) -> tuple[float, float]:
    """Log-axis limits that keep the positive bulk centered in the frame.

    Uses the 5th–95th percentile of finite *positive* values, then pads
    ``JOINT_LOG10_PAD`` decades on each side so the cloud sits in the middle
    instead of filling the axes. Limits are always > 0.
    """
    finite = np.asarray(values, dtype=float)
    finite = finite[np.isfinite(finite) & (finite > 0)]
    if finite.size == 0:
        return (1.0, 10.0)
    if finite.size == 1:
        center = float(finite[0])
        return (center / 10.0**JOINT_LOG10_PAD, center * 10.0**JOINT_LOG10_PAD)
    low, high = np.percentile(finite, [JOINT_PERCENTILE_LO, JOINT_PERCENTILE_HI])
    low_f, high_f = float(low), float(high)
    if low_f <= 0.0 or high_f <= low_f:
        center = float(np.exp(np.mean(np.log(finite))))
        return (center / 10.0**JOINT_LOG10_PAD, center * 10.0**JOINT_LOG10_PAD)
    return (
        10.0 ** (math.log10(low_f) - JOINT_LOG10_PAD),
        10.0 ** (math.log10(high_f) + JOINT_LOG10_PAD),
    )


def positive_finite_xy(x: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Drop non-finite or non-positive pairs; log axes cannot show zeros."""
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    mask = np.isfinite(x) & np.isfinite(y) & (x > 0) & (y > 0)
    return x[mask], y[mask]


def _show_all_spines(ax: plt.Axes, *, color: str = "black", linewidth: float = 0.8) -> None:
    for side in ("top", "right", "bottom", "left"):
        ax.spines[side].set_visible(True)
        ax.spines[side].set_color(color)
        ax.spines[side].set_linewidth(linewidth)


def _scatter_title_color(
    scatter_df: pd.DataFrame,
    slide_channel_names: dict[int, str],
) -> tuple[str, str]:
    if "slide_channel" in scatter_df.columns:
        slide_channel = int(scatter_df["slide_channel"].iloc[0])
        label = slide_channel_names.get(slide_channel, f"slide channel {slide_channel}")
        title = plot_timeseries.subplot_title(slide_channel, slide_channel_names=slide_channel_names)
    else:
        label = next(iter(slide_channel_names.values()), "sample")
        title = label
    color, _trace_alpha = trace_color_alpha_from_fluor_name(label)
    return title, color


def make_log_joint_figure(
    x: np.ndarray,
    y: np.ndarray,
    *,
    xlabel: str,
    ylabel: str,
    color: str,
    title: str,
) -> plt.Figure:
    """Scatter in the center with log-log axes and attached x/y histograms."""
    x_low, x_high = log_joint_limits(x)
    y_low, y_high = log_joint_limits(y)
    fig, ax = plt.subplots(figsize=JOINT_FIGSIZE_IN)
    divider = make_axes_locatable(ax)
    ax_top = divider.append_axes("top", size=f"{JOINT_HIST_FRAC * 100:.0f}%", pad=JOINT_HIST_PAD, sharex=ax)
    ax_right = divider.append_axes(
        "right", size=f"{JOINT_HIST_FRAC * 100:.0f}%", pad=JOINT_HIST_PAD, sharey=ax
    )

    ax.scatter(x, y, s=18, alpha=0.55, color=color, zorder=3, linewidths=0)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlim(x_low, x_high)
    ax.set_ylim(y_low, y_high)
    ax.grid(False)
    _show_all_spines(ax)
    ax.text(
        0.05,
        0.95,
        pearson_annotation(pearson_r(x, y), int(x.size)),
        transform=ax.transAxes,
        va="top",
        ha="left",
    )

    x_bins = np.logspace(np.log10(x_low), np.log10(x_high), JOINT_HIST_BINS + 1)
    y_bins = np.logspace(np.log10(y_low), np.log10(y_high), JOINT_HIST_BINS + 1)
    ax_top.hist(x, bins=x_bins, color=color, alpha=JOINT_HIST_ALPHA, edgecolor=color, linewidth=0)
    ax_right.hist(
        y,
        bins=y_bins,
        orientation="horizontal",
        color=color,
        alpha=JOINT_HIST_ALPHA,
        edgecolor=color,
        linewidth=0,
    )
    ax_top.set_title(title)
    ax_top.tick_params(axis="x", labelbottom=False, bottom=False)
    ax_right.tick_params(axis="y", labelleft=False, left=False)
    for marginal_ax in (ax_top, ax_right):
        marginal_ax.set_facecolor("white")
        marginal_ax.grid(False)
        _show_all_spines(marginal_ax)
    return fig


def write_log_joint_scatter(
    x: np.ndarray,
    y: np.ndarray,
    output_plot: Path,
    *,
    xlabel: str,
    ylabel: str,
    color: str,
    title: str,
) -> None:
    fig = make_log_joint_figure(x, y, xlabel=xlabel, ylabel=ylabel, color=color, title=title)
    output_plot.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_plot, dpi=plot_layout.FIGURE_DPI, bbox_inches="tight")
    plt.close(fig)


def _write_kinetic_joint_scatter(
    df: pd.DataFrame,
    output_plot: Path,
    *,
    x_column: str,
    y_column: str,
    xlabel: str,
    ylabel: str,
    empty_message: str,
    slide_channel_names: dict[int, str],
    missing_ok: bool = False,
    x_as_hours: bool = False,
) -> bool:
    scatter_df = successful_finite_fit_df(df, x_column, y_column)
    x, y = positive_finite_xy(
        scatter_df[x_column].to_numpy(dtype=float) if not scatter_df.empty else np.array([]),
        scatter_df[y_column].to_numpy(dtype=float) if not scatter_df.empty else np.array([]),
    )
    if x_as_hours:
        x = x / MINUTES_PER_HOUR
    if x.size == 0:
        if missing_ok:
            return False
        raise ValueError(empty_message)
    title, color = _scatter_title_color(scatter_df, slide_channel_names)
    write_log_joint_scatter(
        x,
        y,
        output_plot,
        xlabel=xlabel,
        ylabel=ylabel,
        color=color,
        title=title,
    )
    return True


def write_expression_rate_vs_onset_scatter(
    df: pd.DataFrame,
    output_plot: Path,
    *,
    slide_channel_names: dict[int, str],
    columns: int | None = None,
) -> None:
    _ = columns
    _write_kinetic_joint_scatter(
        df,
        output_plot,
        x_column="onset_time",
        y_column="expression_rate",
        xlabel=ONSET_TIME_AXIS_LABEL,
        ylabel=EXPRESSION_RATE_AXIS_LABEL,
        empty_message="No successful finite positive fits available to plot expression rate vs onset time",
        slide_channel_names=slide_channel_names,
        x_as_hours=True,
    )


def write_expression_rate_vs_mrna_lifetime_scatter(
    df: pd.DataFrame,
    output_plot: Path,
    *,
    slide_channel_names: dict[int, str],
    columns: int | None = None,
) -> None:
    _ = columns
    _write_kinetic_joint_scatter(
        df,
        output_plot,
        x_column="mrna_lifetime",
        y_column="expression_rate",
        xlabel=MRNA_LIFETIME_AXIS_LABEL,
        ylabel=EXPRESSION_RATE_AXIS_LABEL,
        empty_message="No successful finite positive fits available to plot expression rate vs mRNA lifetime",
        slide_channel_names=slide_channel_names,
        x_as_hours=True,
    )


def fitted_trace_values(times_minutes: np.ndarray, fit_row: pd.Series) -> np.ndarray:
    baseline_intensity = float(fit_row["baseline_intensity"])
    onset_time = float(fit_row["onset_time"])
    protein_degradation_rate, mrna_degradation_rate, expression_amplitude = _kinetic_model_terms(
        fit_row
    )
    dt = np.maximum(times_minutes - onset_time, 0.0)
    predicted = baseline_intensity + expression_amplitude * (
        np.exp(-protein_degradation_rate * dt) - np.exp(-mrna_degradation_rate * dt)
    )
    predicted[times_minutes < onset_time] = baseline_intensity
    return predicted


def _optional_float(fit_row: pd.Series, name: str) -> float | None:
    if name not in fit_row.index or pd.isna(fit_row[name]):
        return None
    value = float(fit_row[name])
    return value if math.isfinite(value) else None


def _kinetic_model_terms(fit_row: pd.Series) -> tuple[float, float, float]:
    protein_lifetime = _optional_float(fit_row, "protein_lifetime")
    mrna_lifetime = _optional_float(fit_row, "mrna_lifetime")
    protein_degradation_rate = _optional_float(fit_row, "protein_degradation_rate")
    mrna_degradation_rate = _optional_float(fit_row, "mrna_degradation_rate")
    expression_amplitude = _optional_float(fit_row, "expression_amplitude")
    expression_rate = _optional_float(fit_row, "expression_rate")
    if protein_degradation_rate is None and protein_lifetime is not None:
        protein_degradation_rate = degradation_rate_per_minute(protein_lifetime)
    if mrna_degradation_rate is None and mrna_lifetime is not None:
        mrna_degradation_rate = degradation_rate_per_minute(mrna_lifetime)
    if expression_amplitude is None and expression_rate is not None and protein_lifetime is not None and mrna_lifetime is not None:
        expression_amplitude = expression_amplitude_from_observables(
            expression_rate, mrna_lifetime, protein_lifetime
        )
    if protein_degradation_rate is None or mrna_degradation_rate is None or expression_amplitude is None:
        raise ValueError("fit row is missing lifetimes or expression_rate needed to reconstruct the kinetic curve")
    return protein_degradation_rate, mrna_degradation_rate, expression_amplitude


def write_fitted_trace_plots(
    fit_df: pd.DataFrame,
    output_plot: Path,
    *,
    interval: float,
    slide_channel_names: dict[int, str],
    traces_df: pd.DataFrame | None,
    shared_ylim: tuple[float, float] | None = None,
) -> list[Path]:
    """Write one-panel `traces_fit.png` and optional `traces_fit_shared_y.png`."""
    if traces_df is None or traces_df.empty:
        raise ValueError("No analysis traces matched this sample for traces_fit")
    df = traces_df.reset_index(drop=True)
    ylim = plot_timeseries.percentile_ylim(plot_timeseries.panel_values(df, "corrected"))
    write_fitted_trace_panel(
        fit_df,
        df,
        output_plot,
        interval=interval,
        slide_channel_names=slide_channel_names,
        ylim=ylim,
    )
    written = [output_plot]
    if shared_ylim is not None:
        shared_plot = plot_timeseries.metric_shared_y_output_path(output_plot)
        write_fitted_trace_panel(
            fit_df,
            df,
            shared_plot,
            interval=interval,
            slide_channel_names=slide_channel_names,
            ylim=shared_ylim,
        )
        written.append(shared_plot)
    return written


def write_fitted_trace_panel(
    fit_df: pd.DataFrame,
    traces_df: pd.DataFrame,
    output_plot: Path,
    *,
    interval: float,
    slide_channel_names: dict[int, str],
    ylim: tuple[float, float],
) -> None:
    fig, ax = plt.subplots(figsize=plot_layout.FIGURE_SIZE_SINGLE_IN)
    if "slide_channel" in traces_df.columns:
        slide_channel = int(traces_df["slide_channel"].dropna().iloc[0])
    elif "slide_channel" in fit_df.columns:
        slide_channel = int(fit_df["slide_channel"].dropna().iloc[0])
    else:
        slide_channel = next(iter(slide_channel_names), 0)
    lookup_cols = [column for column in ("pos", "roi") if column in fit_df.columns]
    if "roi" not in lookup_cols:
        raise ValueError("fit table is missing roi")
    fit_lookup = (
        fit_df.loc[fit_df["success"]]
        .set_index(lookup_cols, drop=False)
        .sort_index()
    )
    frames = [(output_plot, traces_df)]
    trace_color, trace_alpha = trace_color_alpha_from_fluor_name(
        plot_timeseries.trace_naming_haystack(slide_channel, frames, slide_channel_names)
    )
    matched_traces = 0
    trace_groups = traces_df.groupby(plot_timeseries.trace_group_columns(traces_df), sort=True, dropna=False)
    for group_key, trace_df in trace_groups:
        if not isinstance(group_key, tuple):
            group_key = (group_key,)
        group_values = dict(zip(plot_timeseries.trace_group_columns(traces_df), group_key, strict=True))
        pos = int(group_values["pos"]) if "pos" in group_values else None
        roi = int(group_values["roi"])
        if "pos" in lookup_cols and pos is not None:
            lookup_key = (pos, roi)
        else:
            lookup_key = roi
        if lookup_key not in fit_lookup.index:
            continue
        fit_row = fit_lookup.loc[lookup_key]
        if isinstance(fit_row, pd.DataFrame):
            fit_row = fit_row.iloc[0]
        times_minutes = trace_df["t"].astype(float).to_numpy(dtype=float) * interval
        predicted = fitted_trace_values(times_minutes, fit_row)
        ax.plot(times_minutes, predicted, color=trace_color, alpha=trace_alpha)
        matched_traces += 1

    if matched_traces == 0:
        plt.close(fig)
        raise ValueError("No successful fit rows matched the inferred timeseries CSVs")

    ax.set_title(
        plot_timeseries.subplot_title(
            slide_channel,
            matched_traces,
            slide_channel_names=slide_channel_names,
        )
    )
    ax.set_xlabel("time (min)")
    ax.set_ylabel("intensity")
    ax.set_ylim(*ylim)
    output_plot.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_plot, dpi=plot_layout.FIGURE_DPI, bbox_inches="tight")
    plt.close(fig)


def format_written_fit_plot_messages(output_plots: list[Path]) -> list[str]:
    return [f"Wrote plot: {output_plot}" for output_plot in output_plots]
