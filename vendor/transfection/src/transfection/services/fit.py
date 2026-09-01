from __future__ import annotations

import math
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from transfection import core as paths
from transfection.core import (
    load_assay_for_workspace,
    load_timeseries_csv,
    parse_timeseries_csv_path,
)
from transfection.core.export import write_csv_only
from transfection.core.kinetics import LN2, half_life_minutes
from transfection.core.parallel import worker_count
from transfection.core.workspace import analysis_position_table_csv


# Fit CSV columns — Müller et al. 2024 basic model (no maturation).
# Written tables store paper observables only. Optimizer structs still hold
# β, δ, and amplitude internally; those are not exported.
#
#   onset_time                 t0  (minutes after acquisition start)
#   expression_rate            m0·kTL  (initial protein-production slope)
#   mrna_lifetime              ln(2)/δ  (half-life of delivered mRNA, minutes)
#   protein_lifetime           ln(2)/β  (half-life of reporter protein, minutes)
#   baseline_intensity         additive baseline (not a kinetic rate)
# Recover at plot/fit-curve time: β = ln(2)/protein_lifetime,
# δ = ln(2)/mrna_lifetime, amplitude = expression_rate / (δ − β).
# Paper Eq. (4): AUC = (ln 2)^2 · m0 k_TL · τ_mRNA · τ_EGFP holds only for these
# half-lives. Trace-integrated AUC from fluorescence is a separate quantity.
OUTPUT_COLUMNS = (
    "roi",
    "baseline_intensity",
    "onset_time",
    "expression_rate",
    "mrna_lifetime",
    "protein_lifetime",
    "success",
)
OUTPUT_COLUMNS_WITH_CHANNEL = ("channel", *OUTPUT_COLUMNS)

RATE_COARSE_CANDIDATE_COUNT = 24
RATE_REFINE_CANDIDATE_COUNT = 12
RATE_REFINE_PASSES = 2
FIXED_ONSET_TIME = 0.0


@dataclass(frozen=True)
class FitResult:
    baseline_intensity: float
    protein_degradation_rate: float
    mrna_degradation_rate: float
    onset_time: float
    expression_amplitude: float


def run_fit_with_jobs(
    timeseries_csvs: list[Path],
    *,
    interval: float,
    output_csv: Path | None,
    max_onset_minutes: float | None,
    results_workspace: Path | None = None,
) -> list[Path]:
    if interval <= 0:
        raise ValueError(f"--interval must be > 0, got {interval}")
    if max_onset_minutes is not None and max_onset_minutes < 0:
        raise ValueError(f"--max-onset-minutes must be >= 0, got {max_onset_minutes}")

    resolved_csvs = sorted(
        (csv_path.resolve() for csv_path in timeseries_csvs),
        key=lambda path: (path.parent.name, path.name),
    )
    fit_df = compute_fit_table(
        resolved_csvs,
        interval=interval,
        max_onset_minutes=max_onset_minutes,
    )
    workspace = results_workspace
    if workspace is None:
        if output_csv is not None:
            raise ValueError("fit writes analysis/PosN/fit.csv; pass results_workspace")
        raise ValueError("fit requires a workspace to write analysis/PosN/fit.csv")
    return _write_position_fit_tables(fit_df, workspace=workspace)


def integrate_fit_csvs(
    timeseries_csvs: list[Path],
    *,
    interval: float,
    output_csv: Path | None,
) -> list[Path]:
    return run_fit_with_jobs(
        timeseries_csvs,
        interval=interval,
        output_csv=output_csv,
        max_onset_minutes=0.0,
    )


def fit_trace(
    trace_df: pd.DataFrame,
    *,
    interval: float,
    fixed_protein_degradation_rate: float | None = None,
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
        fixed_protein_degradation_rate=fixed_protein_degradation_rate,
        max_onset_minutes=max_onset_minutes,
    )


def _fit_trace_points(
    times: np.ndarray,
    values: np.ndarray,
    *,
    fixed_protein_degradation_rate: float | None = None,
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

    if fixed_protein_degradation_rate is not None:
        return _fit_trace_points_with_fixed_protein(
            times,
            values,
            fixed_protein_degradation_rate=fixed_protein_degradation_rate,
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
            protein_degradation_rate = math.exp(float(protein_log))
            for mrna_index, mrna_log in enumerate(mrna_logs):
                mrna_degradation_rate = math.exp(float(mrna_log))
                if mrna_degradation_rate <= protein_degradation_rate:
                    continue
                candidate = _evaluate_rate_candidate(
                    times,
                    values,
                    protein_degradation_rate=protein_degradation_rate,
                    mrna_degradation_rate=mrna_degradation_rate,
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
    fixed_protein_degradation_rate: float,
    min_rate: float,
    max_rate: float,
    max_onset_minutes: float | None,
) -> FitResult | None:
    if not math.isfinite(fixed_protein_degradation_rate) or fixed_protein_degradation_rate <= 0:
        return None

    mrna_min_rate = max(min_rate, fixed_protein_degradation_rate * 1.001)
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
                    protein_degradation_rate=fixed_protein_degradation_rate,
                    mrna_degradation_rate=math.exp(float(mrna_log)),
                    onset_time=t_onset,
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
    protein_degradation_rate: float,
    mrna_degradation_rate: float,
    onset_time: float = FIXED_ONSET_TIME,
) -> tuple[float, FitResult] | None:
    dt = np.maximum(times - onset_time, 0.0)
    basis = np.exp(-protein_degradation_rate * dt) - np.exp(-mrna_degradation_rate * dt)
    basis[times < onset_time] = 0.0
    if not np.isfinite(basis).all():
        return None

    design = np.column_stack([np.ones_like(times), basis])
    coefficients, *_ = np.linalg.lstsq(design, values, rcond=None)
    baseline_intensity = float(coefficients[0])
    expression_amplitude = float(coefficients[1])
    if not math.isfinite(baseline_intensity) or not math.isfinite(expression_amplitude):
        return None
    if expression_amplitude <= 0:
        return None

    predicted = baseline_intensity + expression_amplitude * basis
    if not np.isfinite(predicted).all():
        return None

    sse = float(np.square(predicted - values).sum())
    if not math.isfinite(sse):
        return None

    return sse, FitResult(
        baseline_intensity=baseline_intensity,
        protein_degradation_rate=float(protein_degradation_rate),
        mrna_degradation_rate=float(mrna_degradation_rate),
        onset_time=float(onset_time),
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


def auc_from_fit_half_lives(
    expression_rate: float,
    mrna_lifetime: float,
    protein_lifetime: float,
) -> float:
    """Paper Eq. (4): AUC = (ln 2)^2 · m0 k_TL · τ_mRNA · τ_EGFP.

    ``mrna_lifetime`` and ``protein_lifetime`` must be half-lives (ln(2)/rate).
    This is not the trace-integrated fluorescence AUC written to ``auc.csv``.
    """
    return (LN2**2) * expression_rate * mrna_lifetime * protein_lifetime


def derive_parameters(result: FitResult) -> dict[str, float]:
    expression_rate = result.expression_amplitude * (
        result.mrna_degradation_rate - result.protein_degradation_rate
    )
    protein_lifetime = half_life_minutes(result.protein_degradation_rate)
    mrna_lifetime = half_life_minutes(result.mrna_degradation_rate)
    return {
        "baseline_intensity": result.baseline_intensity,
        "protein_degradation_rate": result.protein_degradation_rate,
        "protein_lifetime": protein_lifetime,
        "mrna_degradation_rate": result.mrna_degradation_rate,
        "mrna_lifetime": mrna_lifetime,
        "onset_time": result.onset_time,
        "expression_amplitude": result.expression_amplitude,
        "expression_rate": expression_rate,
    }


def compute_fit_table(
    timeseries_csvs: list[Path],
    *,
    interval: float,
    max_onset_minutes: float | None = 0.0,
) -> pd.DataFrame:
    tasks: list[tuple[int, int, dict[str, int], list[float], list[float], float]] = []
    for csv_path in timeseries_csvs:
        df = load_timeseries_csv(csv_path)
        position, signal_channel = parse_timeseries_csv_path(csv_path)
        if "roi" not in df.columns:
            raise ValueError(f"{csv_path} has no roi column")

        for group_key, trace_df in df.groupby(["roi"], sort=True):
            if not isinstance(group_key, tuple):
                group_key = (group_key,)
            group_values = {"roi": int(group_key[0]), "pos": int(position), "channel": int(signal_channel)}
            tasks.append(
                (
                    position,
                    signal_channel,
                    group_values,
                    trace_df["t"].astype(float).tolist(),
                    trace_df["corrected"].astype(float).tolist(),
                    interval,
                )
            )

    if not tasks:
        raise ValueError("No fit rows produced")

    first_pass_results = _run_fit_tasks(tasks, fixed_protein_degradation_rate=None)
    shared_protein_degradation_rate = _pooled_protein_degradation_rate(first_pass_results)
    if shared_protein_degradation_rate is None:
        rows = [_failed_fit_row(group_values) for _pos, _ch, group_values, *_ in tasks]
    else:
        rows = _run_fit_tasks(
            tasks,
            fixed_protein_degradation_rate=shared_protein_degradation_rate,
            max_onset_minutes=max_onset_minutes,
        )

    result = pd.DataFrame(rows)
    sort_columns = [column for column in ("pos", "channel", "roi") if column in result.columns]
    return result.sort_values(sort_columns).reset_index(drop=True)


def _run_fit_tasks(
    tasks: list[tuple[int, int, dict[str, int], list[float], list[float], float]],
    *,
    fixed_protein_degradation_rate: float | None,
    max_onset_minutes: float | None = 0.0,
) -> list[dict[str, object]]:
    max_workers = worker_count(len(tasks))
    payloads = ((task, fixed_protein_degradation_rate, max_onset_minutes) for task in tasks)
    if max_workers == 1:
        return [_fit_trace_task(payload) for payload in payloads]

    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        return list(executor.map(_fit_trace_task, payloads))


def _pooled_protein_degradation_rate(rows: list[dict[str, object]]) -> float | None:
    successful_rates = [
        float(row["protein_degradation_rate"])
        for row in rows
        if bool(row["success"]) and row.get("protein_degradation_rate") is not None
    ]
    if not successful_rates:
        return None
    return float(np.median(np.asarray(successful_rates, dtype=float)))


def _failed_fit_row(group_values: dict[str, int]) -> dict[str, object]:
    return {
        **group_values,
        "baseline_intensity": None,
        "protein_degradation_rate": None,
        "protein_lifetime": None,
        "mrna_degradation_rate": None,
        "mrna_lifetime": None,
        "onset_time": None,
        "expression_amplitude": None,
        "expression_rate": None,
        "success": False,
    }


def _fit_trace_task(
    payload: tuple[
        tuple[int, int, dict[str, int], list[float], list[float], float],
        float | None,
        float | None,
    ]
) -> dict[str, object]:
    task, fixed_protein_degradation_rate, max_onset_minutes = payload
    _position, _channel, group_values, raw_times, raw_values, interval = task
    row: dict[str, object] = dict(group_values)
    trace_df = pd.DataFrame({"t": raw_times, "corrected": raw_values})
    fit_result = fit_trace(
        trace_df,
        interval=interval,
        fixed_protein_degradation_rate=fixed_protein_degradation_rate,
        max_onset_minutes=max_onset_minutes,
    )
    if fit_result is None:
        row.update(_failed_fit_row(group_values))
    else:
        row.update(
            {
                **derive_parameters(fit_result),
                "success": True,
            }
        )
    return row


def _write_position_fit_tables(fit_df: pd.DataFrame, *, workspace: Path) -> list[Path]:
    written: list[Path] = []
    for position, part in fit_df.groupby("pos", sort=True):
        include_channel = part["channel"].nunique() > 1
        columns = OUTPUT_COLUMNS_WITH_CHANNEL if include_channel else OUTPUT_COLUMNS
        table = part.loc[:, [column for column in columns if column in part.columns]].copy()
        table["success"] = table["success"].map(lambda value: "true" if bool(value) else "false")
        output_csv = analysis_position_table_csv(workspace, int(position), "fit")
        write_csv_only(table, output_csv)
        written.append(output_csv)
    return written


def format_written_fit_csv_message(output_csvs: list[Path]) -> str:
    return "\n".join(f"Wrote analysis fit CSV: {path}" for path in output_csvs)


def run_fit(
    *,
    workspace: Path,
    interval: float,
    max_onset_minutes: float = 0.0,
    assay: Path | None = None,
) -> list[Path]:
    timeseries_csvs = paths.discover_timeseries_csvs(paths.workspace_timeseries_dir(workspace))
    return run_fit_with_jobs(
        timeseries_csvs,
        interval=interval,
        output_csv=None,
        max_onset_minutes=max_onset_minutes,
        results_workspace=workspace,
    )
