from __future__ import annotations

from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd

from transfection.core import (
    discover_timeseries_csvs,
    load_timeseries_csv,
    parse_timeseries_csv_path,
    workspace_timeseries_dir,
    write_csv_only,
)
from transfection.core.parallel import worker_count
from transfection.core.workspace import analysis_position_table_csv


GROUP_COLUMNS = ("pos", "roi")
ANALYSIS_COLUMNS = ("roi", "auc")
ANALYSIS_COLUMNS_WITH_CHANNEL = ("channel", "roi", "auc")

AucTraceTask = tuple[int, int, dict[str, int], list[float], list[float], float]


def integrate_series(t_values: list[float], corrected: list[float], *, interval: float) -> float:
    if len(t_values) < 2:
        return 0.0

    times = np.asarray(t_values, dtype=float) * interval
    values = np.asarray(corrected, dtype=float)
    order = np.argsort(times, kind="mergesort")
    times = times[order]
    values = values[order]
    widths = times[1:] - times[:-1]
    heights = (values[:-1] + values[1:]) * 0.5
    return float((widths * heights).sum())


def integrate_trace(trace_df: pd.DataFrame, *, interval: float) -> float:
    sorted_df = trace_df.sort_values("t").reset_index(drop=True)
    return integrate_series(
        sorted_df["t"].astype(float).tolist(),
        sorted_df["corrected"].astype(float).tolist(),
        interval=interval,
    )


def _auc_trace_task(task: AucTraceTask) -> dict[str, object]:
    position, channel, group_values, t_values, corrected, interval = task
    return {
        "pos": position,
        "channel": channel,
        **group_values,
        "auc": integrate_series(t_values, corrected, interval=interval),
    }


def _run_auc_tasks(tasks: list[AucTraceTask]) -> list[dict[str, object]]:
    max_workers = worker_count(len(tasks))
    if max_workers == 1:
        return [_auc_trace_task(task) for task in tasks]

    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        return list(executor.map(_auc_trace_task, tasks))


def compute_auc_table(
    timeseries_csvs: list[Path],
    *,
    interval: float,
) -> pd.DataFrame:
    tasks: list[AucTraceTask] = []
    for csv_path in timeseries_csvs:
        df = load_timeseries_csv(csv_path)
        position, signal_channel = parse_timeseries_csv_path(csv_path)
        group_columns = [column for column in ("roi",) if column in df.columns]
        if not group_columns:
            raise ValueError(f"{csv_path} has no roi column")

        for group_key, trace_df in df.groupby(group_columns, sort=True):
            if not isinstance(group_key, tuple):
                group_key = (group_key,)
            row = dict(zip(group_columns, group_key, strict=True))
            row.setdefault("pos", position)
            sorted_df = trace_df.sort_values("t").reset_index(drop=True)
            tasks.append(
                (
                    position,
                    signal_channel,
                    {column: int(value) for column, value in row.items()},
                    sorted_df["t"].astype(float).tolist(),
                    sorted_df["corrected"].astype(float).tolist(),
                    interval,
                )
            )

    if not tasks:
        raise ValueError("No AUC rows produced")

    result = pd.DataFrame(_run_auc_tasks(tasks))
    sort_columns = [column for column in ("pos", "channel", "roi") if column in result.columns]
    return result.sort_values(sort_columns).reset_index(drop=True)


def _write_position_auc_tables(auc_df: pd.DataFrame, *, workspace: Path) -> list[Path]:
    written: list[Path] = []
    for position, part in auc_df.groupby("pos", sort=True):
        include_channel = part["channel"].nunique() > 1
        columns = ANALYSIS_COLUMNS_WITH_CHANNEL if include_channel else ANALYSIS_COLUMNS
        table = part.loc[:, [column for column in columns if column in part.columns]].reset_index(drop=True)
        output_csv = analysis_position_table_csv(workspace, int(position), "auc")
        write_csv_only(table, output_csv)
        written.append(output_csv)
    return written


def format_written_auc_csv_message(output_csvs: list[Path]) -> str:
    return "\n".join(f"Wrote analysis AUC CSV: {path}" for path in output_csvs)


def run_auc(*, workspace: Path, interval: float, assay: Path | None = None) -> list[Path]:
    if interval <= 0:
        raise ValueError(f"--interval must be > 0, got {interval}")
    timeseries_csvs = discover_timeseries_csvs(workspace_timeseries_dir(workspace))
    auc_df = compute_auc_table(timeseries_csvs, interval=interval)
    written = _write_position_auc_tables(auc_df, workspace=workspace)
    if not written:
        raise ValueError("No AUC rows produced")
    return written
