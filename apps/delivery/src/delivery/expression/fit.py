from __future__ import annotations

import math
import os
from concurrent.futures import ProcessPoolExecutor
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
    "intensity_offset",
    "protein_decay_rate",
    "mrna_decay_rate",
    "expression_onset",
    "expression_amplitude",
    "expression_slope",
    "success",
)
HELP = (
    "Fit each ROI trace to y=intensity_offset + expression_amplitude * "
    "(exp(-protein_decay_rate*t) - exp(-mrna_decay_rate*t)), where t is measured "
    "in minutes from t * --interval. expression_onset is fixed at 0 unless "
    "--max-onset-minutes enables second-pass onset search."
)

app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help=HELP,
)

RATE_COARSE_CANDIDATE_COUNT = 24
RATE_REFINE_CANDIDATE_COUNT = 12
RATE_REFINE_PASSES = 2
FIXED_EXPRESSION_ONSET = 0.0


@dataclass(frozen=True)
class FitResult:
    intensity_offset: float
    protein_decay_rate: float
    mrna_decay_rate: float
    expression_onset: float
    expression_amplitude: float


def run_fit(timeseries_csvs: list[Path], *, interval: float, output_csv: Path | None) -> Path:
    return run_fit_with_jobs(
        timeseries_csvs,
        interval=interval,
        output_csv=output_csv,
        max_onset_minutes=0.0,
        jobs=1,
    )


def run_fit_with_jobs(
    timeseries_csvs: list[Path],
    *,
    interval: float,
    output_csv: Path | None,
    max_onset_minutes: float | None,
    jobs: int,
) -> Path:
    if interval <= 0:
        raise ValueError(f"--interval must be > 0, got {interval}")
    if max_onset_minutes is not None and max_onset_minutes < 0:
        raise ValueError(f"--max-onset-minutes must be >= 0, got {max_onset_minutes}")
    if jobs < 1:
        raise ValueError(f"--jobs must be >= 1, got {jobs}")

    resolved_csvs = sorted((csv_path.resolve() for csv_path in timeseries_csvs), key=lambda path: path.name)
    fit_df = compute_fit_table(
        resolved_csvs,
        interval=interval,
        max_onset_minutes=max_onset_minutes,
        jobs=jobs,
    )
    resolved_output_csv = default_output_csv_path(resolved_csvs, output_csv)
    write_fit_csv(fit_df, resolved_output_csv)
    return resolved_output_csv


def default_output_csv_path(timeseries_csvs: list[Path], output_csv: Path | None) -> Path:
    if output_csv is not None:
        return output_csv.resolve()
    stem = auc.aggregate_output_stem(timeseries_csvs)
    return timeseries_csvs[0].with_name(f"{stem}_fit.csv").resolve()


def fit_trace(
    trace_df: pd.DataFrame,
    *,
    interval: float,
    fixed_protein_decay_rate: float | None = None,
    max_onset_minutes: float | None = 0.0,
) -> FitResult | None:
    sorted_df = trace_df.sort_values("t").reset_index(drop=True)
    if len(sorted_df) < 3:
        return None

    times = sorted_df["t"].astype(float).to_numpy(dtype=float) * interval
    values = sorted_df["corrected"].astype(float).to_numpy(dtype=float)
    if not np.isfinite(times).all() or not np.isfinite(values).all():
        return None
    if np.allclose(times, times[0]) or np.ptp(values) <= 1e-12:
        return None

    return _fit_trace_points(
        times,
        values,
        fixed_protein_decay_rate=fixed_protein_decay_rate,
        max_onset_minutes=max_onset_minutes,
    )


def _fit_trace_points(
    times: np.ndarray,
    values: np.ndarray,
    *,
    fixed_protein_decay_rate: float | None = None,
    max_onset_minutes: float | None = 0.0,
) -> FitResult | None:
    positive_diffs = np.diff(times)
    positive_diffs = positive_diffs[positive_diffs > 0]
    if len(positive_diffs) == 0:
        return None

    max_time = max(float(times.max()), float(positive_diffs.min()), 1.0)
    min_positive_dt = float(positive_diffs.min())
    min_rate = max(1e-6, 1e-4 / max_time)
    max_rate = max(min_rate * 10.0, 10.0 / min_positive_dt)

    if fixed_protein_decay_rate is not None:
        return _fit_trace_points_with_fixed_protein(
            times,
            values,
            fixed_protein_decay_rate=fixed_protein_decay_rate,
            min_rate=min_rate,
            max_rate=max_rate,
            max_onset_minutes=max_onset_minutes,
        )

    protein_lower = math.log(min_rate)
    protein_upper = math.log(max_rate)
    mrna_lower = math.log(min_rate)
    mrna_upper = math.log(max_rate)

    best_result: FitResult | None = None
    best_sse: float | None = None
    for candidate_count in (
        RATE_COARSE_CANDIDATE_COUNT,
        *(RATE_REFINE_CANDIDATE_COUNT for _ in range(RATE_REFINE_PASSES)),
    ):
        protein_logs = np.linspace(protein_lower, protein_upper, candidate_count, dtype=float)
        mrna_logs = np.linspace(mrna_lower, mrna_upper, candidate_count, dtype=float)

        stage_best: tuple[float, FitResult] | None = None
        best_indices: tuple[int, int] | None = None
        for protein_index, protein_log in enumerate(protein_logs):
            protein_decay_rate = math.exp(float(protein_log))
            for mrna_index, mrna_log in enumerate(mrna_logs):
                mrna_decay_rate = math.exp(float(mrna_log))
                if mrna_decay_rate <= protein_decay_rate:
                    continue
                candidate = _evaluate_rate_candidate(
                    times,
                    values,
                    protein_decay_rate=protein_decay_rate,
                    mrna_decay_rate=mrna_decay_rate,
                )
                if candidate is None:
                    continue
                if stage_best is None or candidate[0] < stage_best[0]:
                    stage_best = candidate
                    best_indices = (protein_index, mrna_index)

        if stage_best is None or best_indices is None:
            break
        if best_sse is None or stage_best[0] < best_sse:
            best_sse = stage_best[0]
            best_result = stage_best[1]

        if candidate_count <= 1:
            break
        protein_index, mrna_index = best_indices
        protein_lower = float(protein_logs[max(protein_index - 1, 0)])
        protein_upper = float(protein_logs[min(protein_index + 1, len(protein_logs) - 1)])
        mrna_lower = float(mrna_logs[max(mrna_index - 1, 0)])
        mrna_upper = float(mrna_logs[min(mrna_index + 1, len(mrna_logs) - 1)])
        if not (protein_upper > protein_lower and mrna_upper > mrna_lower):
            break

    return best_result


def _fit_trace_points_with_fixed_protein(
    times: np.ndarray,
    values: np.ndarray,
    *,
    fixed_protein_decay_rate: float,
    min_rate: float,
    max_rate: float,
    max_onset_minutes: float | None,
) -> FitResult | None:
    if not math.isfinite(fixed_protein_decay_rate) or fixed_protein_decay_rate <= 0:
        return None

    mrna_min_rate = max(min_rate, fixed_protein_decay_rate * 1.001)
    if mrna_min_rate >= max_rate:
        return None

    best_result: FitResult | None = None
    best_sse: float | None = None
    for onset_index in _candidate_onset_indices(times, max_onset_minutes=max_onset_minutes):
        t_onset = float(times[onset_index])
        if np.count_nonzero(times >= t_onset) < 2:
            continue

        mrna_lower = math.log(mrna_min_rate)
        mrna_upper = math.log(max_rate)
        onset_best: tuple[float, FitResult] | None = None
        for candidate_count in (
            RATE_COARSE_CANDIDATE_COUNT,
            *(RATE_REFINE_CANDIDATE_COUNT for _ in range(RATE_REFINE_PASSES)),
        ):
            mrna_logs = np.linspace(mrna_lower, mrna_upper, candidate_count, dtype=float)
            stage_best: tuple[float, FitResult] | None = None
            best_index: int | None = None
            for index, mrna_log in enumerate(mrna_logs):
                candidate = _evaluate_rate_candidate(
                    times,
                    values,
                    protein_decay_rate=fixed_protein_decay_rate,
                    mrna_decay_rate=math.exp(float(mrna_log)),
                    expression_onset=t_onset,
                )
                if candidate is None:
                    continue
                if stage_best is None or candidate[0] < stage_best[0]:
                    stage_best = candidate
                    best_index = index

            if stage_best is None or best_index is None:
                break
            if onset_best is None or stage_best[0] < onset_best[0]:
                onset_best = stage_best

            if candidate_count <= 1:
                break
            mrna_lower = float(mrna_logs[max(best_index - 1, 0)])
            mrna_upper = float(mrna_logs[min(best_index + 1, len(mrna_logs) - 1)])
            if not mrna_upper > mrna_lower:
                break

        if onset_best is None:
            continue
        if best_sse is None or onset_best[0] < best_sse:
            best_sse = onset_best[0]
            best_result = onset_best[1]

    return best_result


def _evaluate_rate_candidate(
    times: np.ndarray,
    values: np.ndarray,
    *,
    protein_decay_rate: float,
    mrna_decay_rate: float,
    expression_onset: float = FIXED_EXPRESSION_ONSET,
) -> tuple[float, FitResult] | None:
    dt = np.maximum(times - expression_onset, 0.0)
    basis = np.exp(-protein_decay_rate * dt) - np.exp(-mrna_decay_rate * dt)
    basis[times < expression_onset] = 0.0
    if not np.isfinite(basis).all():
        return None

    design = np.column_stack([np.ones_like(times), basis])
    coefficients, *_ = np.linalg.lstsq(design, values, rcond=None)
    intensity_offset = float(coefficients[0])
    expression_amplitude = float(coefficients[1])
    if not math.isfinite(intensity_offset) or not math.isfinite(expression_amplitude):
        return None
    if expression_amplitude <= 0:
        return None

    predicted = intensity_offset + expression_amplitude * basis
    if not np.isfinite(predicted).all():
        return None

    sse = float(np.square(predicted - values).sum())
    if not math.isfinite(sse):
        return None

    return sse, FitResult(
        intensity_offset=intensity_offset,
        protein_decay_rate=float(protein_decay_rate),
        mrna_decay_rate=float(mrna_decay_rate),
        expression_onset=float(expression_onset),
        expression_amplitude=expression_amplitude,
    )


def _candidate_onset_indices(times: np.ndarray, *, max_onset_minutes: float | None) -> range:
    if max_onset_minutes is None or max_onset_minutes <= 0:
        return range(1)

    last_candidate_index = max(len(times) - 2, 0)
    matching_indices = np.flatnonzero(times <= max_onset_minutes)
    if len(matching_indices) == 0:
        return range(1)
    last_candidate_index = min(last_candidate_index, int(matching_indices[-1]))
    return range(last_candidate_index + 1)


def derive_parameters(result: FitResult) -> dict[str, float]:
    expression_slope = result.expression_amplitude * (result.mrna_decay_rate - result.protein_decay_rate)
    return {
        "intensity_offset": result.intensity_offset,
        "protein_decay_rate": result.protein_decay_rate,
        "mrna_decay_rate": result.mrna_decay_rate,
        "expression_onset": result.expression_onset,
        "expression_amplitude": result.expression_amplitude,
        "expression_slope": expression_slope,
    }


def compute_fit_table(
    timeseries_csvs: list[Path],
    *,
    interval: float,
    max_onset_minutes: float | None = 0.0,
    jobs: int = 1,
) -> pd.DataFrame:
    if jobs < 1:
        raise ValueError(f"--jobs must be >= 1, got {jobs}")

    tasks: list[tuple[int | None, dict[str, int], list[float], list[float], float]] = []
    for csv_path in timeseries_csvs:
        df = load_timeseries_csv(csv_path)
        slide_channel = auc.parse_slide_channel(csv_path)
        group_columns = [column for column in auc.GROUP_COLUMNS if column in df.columns]
        if not group_columns:
            raise ValueError(f"{csv_path} has no supported grouping columns: {auc.GROUP_COLUMNS}")

        for group_key, trace_df in df.groupby(group_columns, sort=True):
            if not isinstance(group_key, tuple):
                group_key = (group_key,)
            tasks.append(
                (
                    slide_channel,
                    {column: int(value) for column, value in zip(group_columns, group_key, strict=True)},
                    trace_df["t"].astype(float).tolist(),
                    trace_df["corrected"].astype(float).tolist(),
                    interval,
                )
            )

    if not tasks:
        raise ValueError("No fit rows produced")

    first_pass_results = _run_fit_tasks(tasks, jobs=jobs, fixed_protein_decay_rate=None)
    shared_protein_decay_rate = _pooled_protein_decay_rate(first_pass_results)
    if shared_protein_decay_rate is None:
        rows = [_failed_fit_row(slide_channel, group_values) for slide_channel, group_values, *_ in tasks]
    else:
        rows = _run_fit_tasks(
            tasks,
            jobs=jobs,
            fixed_protein_decay_rate=shared_protein_decay_rate,
            max_onset_minutes=max_onset_minutes,
        )

    result = pd.DataFrame(rows)
    sort_columns = [column for column in ("slide_channel", *auc.GROUP_COLUMNS) if column in result.columns]
    return result.sort_values(sort_columns).reset_index(drop=True).loc[:, list(OUTPUT_COLUMNS)]


def _run_fit_tasks(
    tasks: list[tuple[int | None, dict[str, int], list[float], list[float], float]],
    *,
    jobs: int,
    fixed_protein_decay_rate: float | None,
    max_onset_minutes: float | None = 0.0,
) -> list[dict[str, object]]:
    if jobs == 1 or len(tasks) <= 1:
        return [_fit_trace_task((task, fixed_protein_decay_rate, max_onset_minutes)) for task in tasks]

    max_workers = min(jobs, len(tasks), os.cpu_count() or jobs)
    payloads = ((task, fixed_protein_decay_rate, max_onset_minutes) for task in tasks)
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        return list(executor.map(_fit_trace_task, payloads))


def _pooled_protein_decay_rate(rows: list[dict[str, object]]) -> float | None:
    successful_rates = [
        float(row["protein_decay_rate"])
        for row in rows
        if bool(row["success"]) and row.get("protein_decay_rate") is not None
    ]
    if not successful_rates:
        return None
    return float(np.median(np.asarray(successful_rates, dtype=float)))


def _failed_fit_row(slide_channel: int | None, group_values: dict[str, int]) -> dict[str, object]:
    return {
        "slide_channel": slide_channel,
        **group_values,
        "intensity_offset": None,
        "protein_decay_rate": None,
        "mrna_decay_rate": None,
        "expression_onset": None,
        "expression_amplitude": None,
        "expression_slope": None,
        "success": False,
    }


def _fit_trace_task(
    payload: tuple[
        tuple[int | None, dict[str, int], list[float], list[float], float],
        float | None,
        float | None,
    ]
) -> dict[str, object]:
    task, fixed_protein_decay_rate, max_onset_minutes = payload
    slide_channel, group_values, raw_times, raw_values, interval = task
    row: dict[str, object] = {"slide_channel": slide_channel, **group_values}
    trace_df = pd.DataFrame({"t": raw_times, "corrected": raw_values})
    fit_result = fit_trace(
        trace_df,
        interval=interval,
        fixed_protein_decay_rate=fixed_protein_decay_rate,
        max_onset_minutes=max_onset_minutes,
    )
    if fit_result is None:
        row.update(_failed_fit_row(slide_channel, group_values))
    else:
        row.update(
            {
                **derive_parameters(fit_result),
                "success": True,
            }
        )
    return row


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
            "Frame interval in minutes used to convert t into time for fitting "
            "y=intensity_offset + expression_amplitude * "
            "(exp(-protein_decay_rate*t) - exp(-mrna_decay_rate*t))."
        ),
    ),
    output_csv: Path | None = typer.Option(
        None,
        "--output-csv",
        help="Output CSV path. Default: derive a shared <stem>_fit.csv path.",
    ),
    max_onset_minutes: float | None = typer.Option(
        None,
        "--max-onset-minutes",
        min=0.0,
        help=(
            "Optional cap on second-pass candidate expression_onset values in minutes. "
            "Default: keep expression_onset fixed at 0."
        ),
    ),
    jobs: int = typer.Option(
        max(1, os.cpu_count() or 1),
        "--jobs",
        min=1,
        help="Number of worker processes to use across independent trace fits.",
    ),
) -> None:
    resolved_output_csv = run_fit_with_jobs(
        timeseries_csvs,
        interval=interval,
        output_csv=output_csv,
        max_onset_minutes=max_onset_minutes,
        jobs=jobs,
    )
    print(format_written_fit_csv_message(resolved_output_csv))


def main(argv: list[str] | None = None, *, prog_name: str = "delivery expression fit") -> None:
    app(args=argv, prog_name=prog_name)


if __name__ == "__main__":
    main()
