"""Per-sample results under ``results/<sample>/`` (XLSX + PNG).

``analysis/Pos{n}/`` is the CSV-only scratch layout. ``publish_sample_*_xlsx``
writes XLSX packs. Plot services write PNG only; CLI ``plot-*`` and pipeline
call the publishers explicitly so a one-shot still produces tables + plots.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd

from transfection.core.assay import require_named_samples
from transfection.core.constants import ANALYSIS_DIRNAME, RESULTS_DIRNAME
from transfection.core.export import write_xlsx_only
from transfection.core.metrics import load_timeseries_csv
from transfection.core.slide import SlideMapping
from transfection.core.workspace import (
    discover_analysis_table_csvs,
    discover_timeseries_csvs,
    parse_analysis_position_dir,
    parse_timeseries_csv_path,
    resolve_slide_channel,
    workspace_analysis_dir,
    workspace_results_dir,
)

TRACES_KIND = "traces"
AUC_KIND = "auc"
FIT_KIND = "fit"
# Written XLSX identity is the sample folder. Plots may still attach
# slide_channel in memory when concatenating.
XLSX_DROP_COLUMNS = (
    "slide_channel",
    "sample",
    "protein_degradation_rate",
    "mrna_degradation_rate",
    "expression_amplitude",
)
TRACES_TABLE_COLUMNS = (
    "pos",
    "roi",
    "t",
    "area",
    "background",
    "sum",
    "corrected",
)
TRACES_TABLE_COLUMNS_WITH_CHANNEL = (
    "pos",
    "channel",
    "roi",
    "t",
    "area",
    "background",
    "sum",
    "corrected",
)
AUC_TABLE_COLUMNS = ("pos", "roi", "auc")
AUC_TABLE_COLUMNS_WITH_CHANNEL = ("pos", "channel", "roi", "auc")
FIT_TABLE_COLUMNS = (
    "pos",
    "roi",
    "baseline_intensity",
    "onset_time",
    "expression_rate",
    "mrna_lifetime",
    "protein_lifetime",
    "success",
)
FIT_TABLE_COLUMNS_WITH_CHANNEL = (
    "pos",
    "channel",
    "roi",
    "baseline_intensity",
    "onset_time",
    "expression_rate",
    "mrna_lifetime",
    "protein_lifetime",
    "success",
)

_ILLEGAL = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')
_WHITESPACE = re.compile(r"\s+")

MISSING_NAMED_SAMPLES = (
    "plot/results stages require assay.json samples[] with a non-empty name "
    "to group analysis/ into results/<sample>/. timeseries, auc, and fit do not "
    "need sample names."
)


def filesystem_safe_sample_name(name: str) -> str:
    text = _WHITESPACE.sub("_", name.strip())
    text = _ILLEGAL.sub("_", text)
    text = text.strip(" ._").lstrip(".")
    return text or "sample"


def sample_pack_dirnames(mapping: SlideMapping) -> dict[int, str]:
    """Map each named slide channel to a unique filesystem-safe pack directory.

    Uses the assay ``sample_name``. When two slide channels sanitize to the same
    path, prefix with ``slide_channel`` so they stay distinct.
    """
    named = {
        slide_channel: entry
        for slide_channel, entry in mapping.items()
        if entry.sample_name
    }
    if not named:
        raise ValueError(MISSING_NAMED_SAMPLES)
    sanitized = {
        slide_channel: filesystem_safe_sample_name(entry.sample_name)
        for slide_channel, entry in named.items()
    }
    counts = Counter(sanitized.values())
    return {
        slide_channel: (f"{slide_channel}_{name}" if counts[name] > 1 else name)
        for slide_channel, name in sanitized.items()
    }


def sample_display_names(mapping: SlideMapping) -> dict[int, str]:
    return {
        slide_channel: entry.sample_name
        for slide_channel, entry in mapping.items()
        if entry.sample_name
    }


def sample_pack_dir(workspace: Path, dirname: str) -> Path:
    return workspace_results_dir(workspace) / dirname


def sample_table_xlsx_path(workspace: Path, dirname: str, kind: str) -> Path:
    return sample_pack_dir(workspace, dirname) / f"{kind}.xlsx"


def require_plot_mapping(mapping: SlideMapping | None = None, *, config=None) -> SlideMapping:
    if config is not None:
        return require_named_samples(config)
    if mapping is None:
        raise ValueError(MISSING_NAMED_SAMPLES)
    named = {sc: entry for sc, entry in mapping.items() if entry.sample_name}
    if not named:
        raise ValueError(MISSING_NAMED_SAMPLES)
    return named


def _order_columns(df: pd.DataFrame, preferred: tuple[str, ...]) -> pd.DataFrame:
    columns = [column for column in preferred if column in df.columns]
    extras = [column for column in df.columns if column not in columns]
    return df.loc[:, [*columns, *extras]]


def _xlsx_export_table(df: pd.DataFrame, preferred: tuple[str, ...]) -> pd.DataFrame:
    drop = [column for column in XLSX_DROP_COLUMNS if column in df.columns]
    table = df.drop(columns=drop) if drop else df
    columns = [column for column in preferred if column in table.columns]
    return table.loc[:, columns]


def _table_columns_for_kind(kind: str, include_channel: bool) -> tuple[str, ...]:
    if kind == AUC_KIND:
        return AUC_TABLE_COLUMNS_WITH_CHANNEL if include_channel else AUC_TABLE_COLUMNS
    if kind == FIT_KIND:
        return FIT_TABLE_COLUMNS_WITH_CHANNEL if include_channel else FIT_TABLE_COLUMNS
    if kind == TRACES_KIND:
        return TRACES_TABLE_COLUMNS_WITH_CHANNEL if include_channel else TRACES_TABLE_COLUMNS
    identity = ("pos", "channel", "roi") if include_channel else ("pos", "roi")
    return identity


def concat_sample_traces(workspace: Path, mapping: SlideMapping) -> dict[int, pd.DataFrame]:
    named = require_plot_mapping(mapping)
    csvs = discover_timeseries_csvs(workspace_analysis_dir(workspace))
    names = sample_display_names(named)
    frames: dict[int, list[pd.DataFrame]] = defaultdict(list)
    multi_channel = False
    for csv_path in csvs:
        try:
            slide_channel = resolve_slide_channel(csv_path, named)
        except ValueError:
            continue
        position, signal = parse_timeseries_csv_path(csv_path)
        if signal not in named[slide_channel].signal_channels:
            continue
        df = load_timeseries_csv(csv_path)
        if "pos" not in df.columns:
            df = df.assign(pos=int(position))
        df = df.assign(
            slide_channel=int(slide_channel),
            sample=names[slide_channel],
            channel=int(signal),
        )
        frames[slide_channel].append(df)
        if len(named[slide_channel].signal_channels) > 1:
            multi_channel = True

    out: dict[int, pd.DataFrame] = {}
    preferred = TRACES_TABLE_COLUMNS_WITH_CHANNEL if multi_channel else TRACES_TABLE_COLUMNS
    for slide_channel, parts in frames.items():
        combined = pd.concat(parts, ignore_index=True)
        if not multi_channel and "channel" in combined.columns:
            combined = combined.drop(columns=["channel"])
        sort_cols = [column for column in ("slide_channel", "pos", "channel", "roi", "t") if column in combined.columns]
        out[slide_channel] = (
            _order_columns(combined, preferred)
            .sort_values(sort_cols)
            .reset_index(drop=True)
        )
    return out


def publish_sample_traces_xlsx(workspace: Path, mapping: SlideMapping) -> list[Path]:
    tables = concat_sample_traces(workspace, mapping)
    dirnames = sample_pack_dirnames(mapping)
    written: list[Path] = []
    for slide_channel, table in tables.items():
        dirname = dirnames.get(slide_channel)
        if dirname is None:
            continue
        path = sample_table_xlsx_path(workspace, dirname, TRACES_KIND)
        preferred = (
            TRACES_TABLE_COLUMNS_WITH_CHANNEL
            if "channel" in table.columns
            else TRACES_TABLE_COLUMNS
        )
        write_xlsx_only(_xlsx_export_table(table, preferred), path)
        written.append(path)
    if not written:
        raise ValueError("No analysis traces matched named samples[]")
    return written


def concat_sample_tables(
    workspace: Path,
    mapping: SlideMapping,
    kind: str,
) -> dict[int, pd.DataFrame]:
    named = require_plot_mapping(mapping)
    csvs = discover_analysis_table_csvs(workspace, kind)
    names = sample_display_names(named)
    position_to_channel: dict[int, int] = {}
    for slide_channel, entry in named.items():
        for position in entry.positions:
            if position in position_to_channel and position_to_channel[position] != slide_channel:
                raise ValueError(
                    f"Position {position} is assigned to more than one named sample"
                )
            position_to_channel[position] = slide_channel

    frames: dict[int, list[pd.DataFrame]] = defaultdict(list)
    for csv_path in csvs:
        position = parse_analysis_position_dir(csv_path.parent)
        slide_channel = position_to_channel.get(position)
        if slide_channel is None:
            continue
        df = pd.read_csv(csv_path)
        if "pos" not in df.columns:
            df = df.assign(pos=int(position))
        df = df.assign(slide_channel=int(slide_channel), sample=names[slide_channel])
        if "channel" in df.columns:
            allowed = set(named[slide_channel].signal_channels)
            df = df.loc[df["channel"].astype(int).isin(allowed)].copy()
        frames[slide_channel].append(df)

    any_channel = any("channel" in part.columns for parts in frames.values() for part in parts)
    out: dict[int, pd.DataFrame] = {}
    preferred_identity = (
        "slide_channel",
        "sample",
        "pos",
        "channel",
        "roi",
    )
    for slide_channel, parts in frames.items():
        combined = pd.concat(parts, ignore_index=True)
        if not any_channel and "channel" in combined.columns:
            combined = combined.drop(columns=["channel"])
        sort_cols = [column for column in preferred_identity if column in combined.columns]
        table_preferred = _table_columns_for_kind(kind, any_channel)
        in_memory_preferred = ("slide_channel", "sample", *table_preferred)
        out[slide_channel] = (
            _order_columns(combined, in_memory_preferred)
            .sort_values(sort_cols)
            .reset_index(drop=True)
        )
    return out


def publish_sample_tables_xlsx(
    workspace: Path,
    mapping: SlideMapping,
    kind: str,
) -> list[Path]:
    tables = concat_sample_tables(workspace, mapping, kind)
    dirnames = sample_pack_dirnames(mapping)
    written: list[Path] = []
    for slide_channel, table in tables.items():
        dirname = dirnames.get(slide_channel)
        if dirname is None:
            continue
        path = sample_table_xlsx_path(workspace, dirname, kind)
        preferred = _table_columns_for_kind(kind, "channel" in table.columns)
        write_xlsx_only(_xlsx_export_table(table, preferred), path)
        written.append(path)
    if not written:
        raise ValueError(f"No analysis {kind} rows matched named samples[]")
    return written


def discover_sample_xlsx(workspace: Path, kind: str) -> list[Path]:
    results = workspace_results_dir(workspace)
    if not results.is_dir():
        return []
    return sorted(
        path
        for path in results.glob(f"*/{kind}.xlsx")
        if path.is_file() and path.parent.parent.resolve() == results.resolve()
    )


def is_sample_pack_dir(path: Path) -> bool:
    resolved = path.resolve()
    if not resolved.is_dir():
        return False
    return any((resolved / f"{kind}.xlsx").is_file() for kind in (TRACES_KIND, AUC_KIND, FIT_KIND))


def resolve_plot_workspace(path: Path) -> Path:
    resolved = path.expanduser().resolve()
    if resolved.is_file():
        parent = resolved.parent
        if parent.parent.name == RESULTS_DIRNAME:
            return parent.parent.parent
        if parent.parent.name == ANALYSIS_DIRNAME:
            return parent.parent.parent
        if parent.name == ANALYSIS_DIRNAME:
            return parent.parent
        if parent.name == RESULTS_DIRNAME:
            return parent.parent
        return parent
    if (resolved / "assay.json").is_file() or (resolved / ANALYSIS_DIRNAME).is_dir():
        return resolved
    if resolved.name == ANALYSIS_DIRNAME:
        return resolved.parent
    if resolved.parent.name == RESULTS_DIRNAME:
        return resolved.parent.parent
    return resolved


def labels_from_sample_column(df: pd.DataFrame) -> dict[int, str]:
    if "slide_channel" not in df.columns or "sample" not in df.columns:
        return {}
    labels: dict[int, str] = {}
    for slide_channel, group in df.groupby("slide_channel", sort=True):
        name = str(group["sample"].iloc[0]).strip()
        if name:
            labels[int(slide_channel)] = name
    return labels
