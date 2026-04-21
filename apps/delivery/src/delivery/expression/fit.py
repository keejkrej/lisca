from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import typer

from lisca.analysis.roi import load_timeseries_csv

from . import auc


OUTPUT_COLUMNS = (
    "slide_channel",
    "pos",
    "roi",
    "d",
    "b",
    "t_onset",
    "amplitude",
    "c",
    "intensity_offset",
    "mrna_decay_rate",
    "expression_onset",
    "expression_amplitude",
    "success",
)
HELP = (
    "Fit each ROI trace to a frame-grid onset model: y=d before onset and "
    "y=d+amplitude*(1-exp(-b*(t-t_onset))) after onset, where t is measured in "
    "minutes from t * --interval."
)

app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help=HELP,
)

ASYMPTOTE_COARSE_CANDIDATE_COUNT = 64
ASYMPTOTE_REFINE_CANDIDATE_COUNT = 32
ASYMPTOTE_REFINE_PASSES = 2


@dataclass(frozen=True)
class FitResult:
    d: float
    b: float
    t_onset: float
    amplitude: float
    c: float


def run_fit(timeseries_csvs: list[Path], *, interval: float, output_csv: Path | None) -> Path:
    if interval <= 0:
        raise ValueError(f"--interval must be > 0, got {interval}")

    resolved_csvs = sorted((csv_path.resolve() for csv_path in timeseries_csvs), key=lambda path: path.name)
    fit_df = compute_fit_table(resolved_csvs, interval=interval)
    resolved_output_csv = default_output_csv_path(resolved_csvs, output_csv)
    write_fit_csv(fit_df, resolved_output_csv)
    return resolved_output_csv


def default_output_csv_path(timeseries_csvs: list[Path], output_csv: Path | None) -> Path:
    if output_csv is not None:
        return output_csv.resolve()

    normalized_stems = {auc.normalize_output_stem(csv_path) for csv_path in timeseries_csvs}
    if len(normalized_stems) == 1:
        stem = next(iter(normalized_stems))
    elif len(timeseries_csvs) == 1:
        stem = timeseries_csvs[0].stem
    else:
        stem = "timeseries"
    return timeseries_csvs[0].with_name(f"{stem}_fit.csv").resolve()


def fit_trace(trace_df: pd.DataFrame, *, interval: float) -> FitResult | None:
    sorted_df = trace_df.sort_values("t").reset_index(drop=True)
    if len(sorted_df) < 3:
        return None

    times = sorted_df["t"].astype(float).to_numpy(dtype=float) * interval
    values = sorted_df["corrected"].astype(float).to_numpy(dtype=float)
    if not np.isfinite(times).all() or not np.isfinite(values).all():
        return None
    if np.allclose(times, times[0]) or np.ptp(values) <= 1e-12:
        return None

    return _fit_trace_points(times, values)


def _fit_trace_points(times: np.ndarray, values: np.ndarray) -> FitResult | None:
    best_result: FitResult | None = None
    best_sse: float | None = None
    candidate_count = len(times)

    for onset_index in range(max(candidate_count - 1, 0)):
        candidate = _evaluate_onset_candidate(times, values, onset_index)
        if candidate is None:
            continue
        sse, fit_result = candidate
        if best_sse is None or sse < best_sse:
            best_sse = sse
            best_result = fit_result

    return best_result


def _evaluate_onset_candidate(
    times: np.ndarray,
    values: np.ndarray,
    onset_index: int,
) -> tuple[float, FitResult] | None:
    post_times = times[onset_index:]
    post_values = values[onset_index:]
    if len(post_times) < 2 or np.allclose(post_times, post_times[0]):
        return None

    if onset_index == 0:
        candidate_d = float(values[0])
    else:
        candidate_d = float(np.median(values[:onset_index]))
    if not math.isfinite(candidate_d):
        return None

    dt = post_times - post_times[0]
    post_max = float(post_values.max())
    span = max(post_max - float(post_values.min()), 0.0)
    scale = max(abs(post_max), abs(candidate_d), span, 1.0)
    min_gap = max(span * 1e-6, scale * 1e-9, 1e-12)
    max_gap = max(scale * 1e6, span * 1e6, 1.0)
    lower = math.log(min_gap)
    upper = math.log(max_gap)

    best_candidate: tuple[float, FitResult] | None = None
    for candidate_count in (
        ASYMPTOTE_COARSE_CANDIDATE_COUNT,
        *(ASYMPTOTE_REFINE_CANDIDATE_COUNT for _ in range(ASYMPTOTE_REFINE_PASSES)),
    ):
        if candidate_count <= 1:
            log_gaps = np.array([(lower + upper) * 0.5], dtype=float)
        else:
            log_gaps = np.linspace(lower, upper, candidate_count, dtype=float)

        stage_best: tuple[float, FitResult] | None = None
        best_index: int | None = None
        for index, log_gap in enumerate(log_gaps):
            candidate_c = post_max + math.exp(float(log_gap))
            candidate = _evaluate_asymptote_candidate(
                times,
                values,
                dt,
                post_values,
                candidate_d,
                float(post_times[0]),
                candidate_c,
            )
            if candidate is None:
                continue
            if stage_best is None or candidate[0] < stage_best[0]:
                stage_best = candidate
                best_index = index

        if stage_best is None or best_index is None:
            break
        if best_candidate is None or stage_best[0] < best_candidate[0]:
            best_candidate = stage_best

        if len(log_gaps) <= 1:
            break
        lower = float(log_gaps[max(best_index - 1, 0)])
        upper = float(log_gaps[min(best_index + 1, len(log_gaps) - 1)])
        if not upper > lower:
            break

    return best_candidate


def _evaluate_asymptote_candidate(
    times: np.ndarray,
    values: np.ndarray,
    dt: np.ndarray,
    post_values: np.ndarray,
    candidate_d: float,
    t_onset: float,
    candidate_c: float,
) -> tuple[float, FitResult] | None:
    deltas = candidate_c - post_values
    if not np.isfinite(deltas).all() or np.any(deltas <= 0):
        return None

    log_deltas = np.log(deltas)
    dt_mean = float(dt.mean())
    centered_dt = dt - dt_mean
    denominator = float(np.square(centered_dt).sum())
    if denominator <= 0:
        return None

    log_delta_mean = float(log_deltas.mean())
    slope = float((centered_dt * (log_deltas - log_delta_mean)).sum() / denominator)
    intercept = log_delta_mean - slope * dt_mean
    if not math.isfinite(intercept):
        return None

    b = -slope
    if not math.isfinite(b) or b <= 0:
        return None

    amplitude = candidate_c - candidate_d
    if not math.isfinite(amplitude) or amplitude <= 0:
        return None

    expected_intercept = math.log(amplitude)
    if not math.isfinite(expected_intercept):
        return None

    # Use the continuity-constrained amplitude implied by d and c. The regression
    # is only used to estimate b and score the candidate asymptote.
    predicted_post = candidate_d + amplitude * (1.0 - np.exp(-b * dt))
    onset_mask = times >= t_onset
    predicted = np.full_like(values, candidate_d)
    predicted[onset_mask] = predicted_post
    if not np.isfinite(predicted).all():
        return None

    sse = float(np.square(predicted - values).sum())
    if not math.isfinite(sse):
        return None

    # Penalize asymptote candidates that are incompatible with the continuity
    # constraint in log-space, while keeping SSE dominant for exact fits.
    intercept_error = (intercept - expected_intercept) ** 2
    score = sse + intercept_error * 1e-12
    return score, FitResult(
        d=float(candidate_d),
        b=float(b),
        t_onset=float(t_onset),
        amplitude=float(amplitude),
        c=float(candidate_c),
    )


def derive_parameters(result: FitResult) -> dict[str, float]:
    return {
        "intensity_offset": result.d,
        "mrna_decay_rate": result.b,
        "expression_onset": result.t_onset,
        "expression_amplitude": result.amplitude,
    }


def compute_fit_table(timeseries_csvs: list[Path], *, interval: float) -> pd.DataFrame:
    rows: list[dict[str, object]] = []
    for csv_path in timeseries_csvs:
        df = load_timeseries_csv(csv_path)
        slide_channel = auc.parse_slide_channel(csv_path)
        group_columns = [column for column in auc.GROUP_COLUMNS if column in df.columns]
        if not group_columns:
            raise ValueError(f"{csv_path} has no supported grouping columns: {auc.GROUP_COLUMNS}")

        for group_key, trace_df in df.groupby(group_columns, sort=True):
            if not isinstance(group_key, tuple):
                group_key = (group_key,)
            row: dict[str, object] = dict(zip(group_columns, group_key, strict=True))
            fit_result = fit_trace(trace_df, interval=interval)
            row.update({"slide_channel": slide_channel})
            if fit_result is None:
                row.update(
                    {
                        "d": None,
                        "b": None,
                        "t_onset": None,
                        "amplitude": None,
                        "c": None,
                        "intensity_offset": None,
                        "mrna_decay_rate": None,
                        "expression_onset": None,
                        "expression_amplitude": None,
                        "success": False,
                    }
                )
            else:
                row.update(
                    {
                        "d": fit_result.d,
                        "b": fit_result.b,
                        "t_onset": fit_result.t_onset,
                        "amplitude": fit_result.amplitude,
                        "c": fit_result.c,
                        **derive_parameters(fit_result),
                        "success": True,
                    }
                )
            rows.append(row)

    if not rows:
        raise ValueError("No fit rows produced")

    result = pd.DataFrame(rows)
    sort_columns = [column for column in ("slide_channel", *auc.GROUP_COLUMNS) if column in result.columns]
    return result.sort_values(sort_columns).reset_index(drop=True).loc[:, list(OUTPUT_COLUMNS)]


def write_fit_csv(df: pd.DataFrame, output_csv: Path) -> None:
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    output_df = df.copy()
    output_df["success"] = output_df["success"].map(lambda value: "true" if bool(value) else "false")
    output_df.to_csv(output_csv, index=False)


def format_written_fit_csv_message(output_csv: Path) -> str:
    return f"Wrote fit CSV: {output_csv}"


@app.command()
def cli(
    timeseries_csvs: list[Path] = typer.Argument(
        ...,
        exists=True,
        dir_okay=False,
        help="One or more long-form ROI timeseries CSV files to fit.",
    ),
    interval: float = typer.Option(
        ...,
        "--interval",
        min=0.0,
        help=(
            "Frame interval in minutes used to convert t into time for fitting y=d before onset "
            "and y=d+amplitude*(1-exp(-b*(t-t_onset))) after onset."
        ),
    ),
    output_csv: Path | None = typer.Option(
        None,
        "--output-csv",
        help="Output CSV path. Default: derive a shared <stem>_fit.csv path.",
    ),
) -> None:
    resolved_output_csv = run_fit(timeseries_csvs, interval=interval, output_csv=output_csv)
    print(format_written_fit_csv_message(resolved_output_csv))


def main(argv: list[str] | None = None, *, prog_name: str = "delivery expression fit") -> None:
    app(args=argv, prog_name=prog_name)


if __name__ == "__main__":
    main()
