"""Assay-specific analysis/results helpers (`analysis/PosN/chC.csv`, sample packs).

Folder names come from lisca when exported; path helpers for `roi/PosN` live in
`transfection.core.roi` and call `lisca.core.bbox` / `lisca.core.workspace`.
"""

from __future__ import annotations

import re
from pathlib import Path

from transfection.core.assay import load_assay_for_workspace, named_sample_mapping
from transfection.core.constants import ANALYSIS_DIRNAME, RESULTS_DIRNAME
from transfection.core.slide import SlideMapping

_TRACE_ALPHA = 0.1
_WORKSPACE_METRICS_STEM = re.compile(r"^ch\d+$")
_POS_DIR = re.compile(r"^Pos(\d+)$")
_CH_STEM = re.compile(r"^ch(\d+)$")


def trace_color_alpha_from_fluor_name(name: str) -> tuple[str, float]:
    haystack = name.lower()
    if "egfp" in haystack:
        color = "green"
    elif "mcherry" in haystack:
        color = "red"
    elif "gfp" in haystack:
        color = "green"
    elif "yfp" in haystack:
        color = "yellow"
    elif "bfp" in haystack:
        color = "blue"
    else:
        color = "gray"
    return (color, _TRACE_ALPHA)


def is_workspace_metrics_timeseries_csv(path: Path) -> bool:
    return bool(_WORKSPACE_METRICS_STEM.fullmatch(path.stem))


def workspace_analysis_dir(workspace: Path) -> Path:
    return workspace.resolve() / ANALYSIS_DIRNAME


def workspace_timeseries_dir(workspace: Path) -> Path:
    """On-disk folder is ``analysis/``; CLI verb stays timeseries."""
    return workspace_analysis_dir(workspace)


def workspace_results_dir(workspace: Path) -> Path:
    return workspace.resolve() / RESULTS_DIRNAME


def analysis_position_dir(workspace: Path, position: int) -> Path:
    return workspace_analysis_dir(workspace) / f"Pos{position}"


def default_position_timeseries_csv_path(
    workspace: Path,
    position: int,
    signal_channel: int,
) -> Path:
    return (analysis_position_dir(workspace, position) / f"ch{signal_channel}.csv").resolve()


def analysis_position_table_csv(workspace: Path, position: int, kind: str) -> Path:
    return (analysis_position_dir(workspace, position) / f"{kind}.csv").resolve()


def discover_timeseries_csvs(timeseries_dir: Path) -> list[Path]:
    if not timeseries_dir.is_dir():
        raise ValueError(
            f"Expected {ANALYSIS_DIRNAME}/ directory at {timeseries_dir}. "
            "Run transfection timeseries first."
        )
    csvs = sorted(
        timeseries_dir.glob("Pos*/ch*.csv"),
        key=lambda path: (path.parent.name, path.name),
    )
    if not csvs:
        raise ValueError(f"No CSV metrics files in {timeseries_dir}")
    metrics = [path for path in csvs if is_workspace_metrics_timeseries_csv(path)]
    if not metrics:
        raise ValueError(
            f"No position metrics CSV files (expected Pos{{position}}/ch{{channel}}.csv) in {timeseries_dir}"
        )
    return metrics


def discover_analysis_table_csvs(workspace: Path, kind: str) -> list[Path]:
    analysis_dir = workspace_analysis_dir(workspace)
    if not analysis_dir.is_dir():
        raise ValueError(
            f"Expected {ANALYSIS_DIRNAME}/ directory at {analysis_dir}. "
            f"Run transfection {kind} first."
        )
    csvs = sorted(
        analysis_dir.glob(f"Pos*/{kind}.csv"),
        key=lambda path: path.parent.name,
    )
    if not csvs:
        raise ValueError(
            f"No {kind}.csv files in {analysis_dir}/PosN/. Run transfection {kind} first."
        )
    return csvs


def parse_timeseries_csv_path(csv_path: Path) -> tuple[int, int]:
    """Return ``(position, signal_channel)`` from ``analysis/Pos{n}/ch{n}.csv``."""
    parent_match = _POS_DIR.fullmatch(csv_path.parent.name)
    stem_match = _CH_STEM.fullmatch(csv_path.stem)
    if parent_match is None or stem_match is None:
        raise ValueError(
            f"Expected analysis path Pos{{position}}/ch{{channel}}.csv, got {csv_path}"
        )
    return int(parent_match.group(1)), int(stem_match.group(1))


def parse_analysis_position_dir(path: Path) -> int:
    match = _POS_DIR.fullmatch(path.name)
    if match is None:
        raise ValueError(f"Expected analysis/Pos{{n}} directory, got {path}")
    return int(match.group(1))


def build_position_signal_slide_channel_lookup(mapping: SlideMapping) -> dict[tuple[int, int], int]:
    lookup: dict[tuple[int, int], int] = {}
    for slide_channel, entry in mapping.items():
        for position in entry.positions:
            for signal_channel in entry.signal_channels:
                key = (position, signal_channel)
                if key in lookup and lookup[key] != slide_channel:
                    raise ValueError(
                        f"Ambiguous slide channel for position {position} "
                        f"signal channel {signal_channel}: "
                        f"{lookup[key]} and {slide_channel}"
                    )
                lookup[key] = slide_channel
    return lookup


def resolve_slide_channel(csv_path: Path, mapping: SlideMapping) -> int:
    position, signal_channel = parse_timeseries_csv_path(csv_path)
    lookup = build_position_signal_slide_channel_lookup(mapping)
    key = (position, signal_channel)
    if key not in lookup:
        raise ValueError(
            f"No assay mapping entry for Pos{position} signal channel {signal_channel} ({csv_path})"
        )
    return lookup[key]


def infer_workspace_for_plot_csv(csv_file: Path) -> Path:
    parent = csv_file.parent.resolve()
    if parent.name == RESULTS_DIRNAME:
        return parent.parent
    if parent.parent.name == RESULTS_DIRNAME:
        return parent.parent.parent
    if parent.parent.name == ANALYSIS_DIRNAME:
        return parent.parent.parent
    if parent.name == ANALYSIS_DIRNAME:
        return parent.parent
    return parent


def infer_workspace_for_timeseries_dir(timeseries_dir: Path) -> Path:
    resolved = timeseries_dir.resolve()
    if resolved.name == ANALYSIS_DIRNAME:
        return resolved.parent
    return resolved.parent.resolve()


def infer_workspace_root(path: Path) -> Path:
    resolved = path.expanduser().resolve()
    if resolved.is_file():
        return infer_workspace_for_plot_csv(resolved)
    if (resolved / "assay.json").is_file() or (resolved / ANALYSIS_DIRNAME).is_dir():
        return resolved
    if resolved.name == ANALYSIS_DIRNAME:
        return resolved.parent
    if resolved.parent.name == RESULTS_DIRNAME:
        return resolved.parent.parent
    return resolved


def load_slide_channel_labels(workspace: Path) -> dict[int, str]:
    """Sample names keyed by slide channel, from workspace assay.json (empty if missing)."""
    assay_path = workspace / "assay.json"
    if not assay_path.is_file():
        return {}
    try:
        config = load_assay_for_workspace(workspace)
    except ValueError:
        return {}
    return {slide_channel: entry.sample_name for slide_channel, entry in named_sample_mapping(config).items()}


def boxplot_tick_labels(
    slide_channels: list[int], trace_counts: list[int], slide_labels: dict[int, str]
) -> list[str]:
    # Single-line labels so tilted x-ticks stay readable.
    return [
        f"{slide_labels.get(sc, str(sc))} (n={n})"
        for sc, n in zip(slide_channels, trace_counts, strict=True)
    ]


def boxplot_x_axis_label(slide_labels: dict[int, str]) -> str:
    return "sample" if slide_labels else "slide channel"
