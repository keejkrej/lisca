"""Plot matched transfection samples from one finished LiSCA workspace."""

from __future__ import annotations

import argparse
import csv
import math
import re
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    import pandas as pd
    from transfection.core.assay import AssayConfig
    from transfection.core.sample import SampleAnalysis

COLORS = ("#0072B2", "#D55E00")


@dataclass(frozen=True)
class Sample:
    name: str
    series: str
    note: str = ""

    def label(self) -> str:
        return f"{self.series} ({self.note})" if self.note else self.series


Layout = dict[str, dict[str, dict[str, Sample]]]


def read_layout(path: Path) -> Layout:
    layout: Layout = {}
    names: set[str] = set()
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        columns = ("sample", "group", "pair", "series")
        if not set(columns).issubset(reader.fieldnames or ()):
            raise ValueError(f"{path}: expected columns {', '.join(columns)}")
        for row in reader:
            name, group, pair, series = ((row[key] or "").strip() for key in columns)
            if not all((name, group, pair, series)):
                raise ValueError(f"{path}:{reader.line_num}: empty required value")
            if name in names:
                raise ValueError(f"{path}:{reader.line_num}: duplicate sample {name!r}")
            names.add(name)
            pair_samples = layout.setdefault(group, {}).setdefault(pair, {})
            if series in pair_samples:
                raise ValueError(
                    f"{path}: duplicate series {series!r} in {group}/{pair}"
                )
            pair_samples[series] = Sample(name, series, (row.get("note") or "").strip())
    if not layout:
        raise ValueError(f"{path}: no samples")
    for group, pairs in layout.items():
        first = next(iter(pairs.values()))
        if len(first) != 2 or any(p.keys() != first.keys() for p in pairs.values()):
            raise ValueError(
                f"{path}: each pair in {group!r} needs the same two series"
            )
    return layout


def iqr_limits(values: Iterable[np.ndarray]) -> tuple[float, float]:
    quartiles = np.array([np.quantile(v, [0.25, 0.75]) for v in values if len(v)])
    low, high = np.log10([quartiles[:, 0].min(), quartiles[:, 1].max()])
    midpoint = (low + high) / 2
    half_span = max((high - low) * 0.67, 0.35)
    return float(10 ** (midpoint - half_span)), float(10 ** (midpoint + half_span))


def group_samples(pairs: dict[str, dict[str, Sample]]) -> list[tuple[str, Sample]]:
    series = next(iter(pairs.values()))
    return [(pair, samples[key]) for key in series for pair, samples in pairs.items()]


def load_workspace(
    workspace: Path, layout: Layout
) -> tuple[AssayConfig, dict[str, SampleAnalysis]]:
    from transfection.core import SampleAnalysis, load_assay

    from lisca.core.assay_positions import load_assay_positions
    from lisca.core.paths import ASSAY_JSON

    config = load_assay(workspace / ASSAY_JSON)
    if config.assay_type != "transfection":
        raise ValueError("Expected a transfection assay")
    positions = load_assay_positions(workspace, migrate=False).samples
    mapping = {}
    for pairs in layout.values():
        for _, sample in group_samples(pairs):
            entry = config.mapping.get(sample.name)
            if entry is None or sample.name not in positions:
                raise ValueError(f"Sample {sample.name!r} is not in assay.json")
            if len(entry.signal_channels) != 1:
                raise ValueError(f"Sample {sample.name!r} must have one signal channel")
            mapping[sample.name] = SampleAnalysis(
                name=sample.name,
                positions=positions[sample.name],
                signal_channels=list(entry.signal_channels),
                segmentation_channel=entry.segmentation_channel,
            )
    return config, mapping


def require_csvs(
    workspace: Path, mapping: dict[str, SampleAnalysis], *, fit: bool
) -> None:
    missing: list[str] = []
    for sample in mapping.values():
        for position in sample.positions:
            parent = workspace / "analysis" / f"Pos{position}"
            name = "fit.csv" if fit else f"ch{sample.signal_channels[0]}.csv"
            if not (parent / name).is_file():
                missing.append(f"{parent.name}/{name}")
    if missing:
        kind = "fit" if fit else "trace"
        raise ValueError(
            f"Missing {len(missing)} {kind} CSVs, e.g. {', '.join(missing[:5])}"
        )


def draw_traces(
    out: Path,
    title: str,
    pairs: dict[str, dict[str, Sample]],
    frames: dict[str, pd.DataFrame],
    interval: float,
    hours: float | None,
) -> None:
    import matplotlib.pyplot as plt
    from matplotlib.lines import Line2D
    from transfection.services.plot_traces import sample_summary_curves

    series = next(iter(pairs.values()))
    fig, axes = plt.subplots(
        1,
        len(pairs),
        figsize=(4 * len(pairs), 4.4),
        squeeze=False,
        sharey=True,
        sharex=True,
        layout="constrained",
    )
    for ax, (pair, samples) in zip(axes.flat, pairs.items(), strict=True):
        labels = []
        for key, color in zip(series, COLORS, strict=True):
            sample = samples[key]
            curves = sample_summary_curves(
                [(Path(), frames[sample.name])], y_column="corrected", interval=interval
            )
            if curves is None:
                raise ValueError(f"No finite traces for {sample.name!r}")
            time, _, median, q25, q75, count = curves
            time = time / 60
            show = (
                time <= hours if hours is not None else np.ones(len(time), dtype=bool)
            )
            if not show.any():
                raise ValueError(
                    f"No frames in the displayed interval for {sample.name!r}"
                )
            ax.plot(time[show], median[show], color=color)
            ax.fill_between(time[show], q25[show], q75[show], color=color, alpha=0.15)
            labels.append(f"{sample.label()} · n={count:,}")
        ax.set_title("\n".join([pair, *labels]), fontsize=10)
        ax.grid(axis="y", alpha=0.2)
    if hours is not None:
        axes[0, 0].set_xlim(0, hours)
    handles = [
        Line2D([], [], color=color, label=key)
        for key, color in zip(series, COLORS, strict=True)
    ]
    fig.legend(handles=handles, loc="outside lower center", ncols=2, frameon=False)
    fig.suptitle(f"{title}\nMedian of individual traces; shading = IQR")
    fig.supxlabel("Time (hours from first frame)")
    fig.supylabel("Corrected intensity")
    fig.savefig(out, dpi=160)
    plt.close(fig)


def valid_fits(frame: pd.DataFrame) -> pd.DataFrame:
    cols = ["onset_time", "expression_rate"]
    points = frame.loc[frame["success"].astype(str).str.lower().eq("true"), cols]
    return points[
        np.isfinite(points).all(axis=1)
        & points.expression_rate.gt(0)
        & points.onset_time.ge(0)
    ]


def draw_kinetics(
    prefix: Path,
    title: str,
    pairs: dict[str, dict[str, Sample]],
    frames: dict[str, pd.DataFrame],
    onset_cap: float,
) -> None:
    import matplotlib.pyplot as plt
    from matplotlib.lines import Line2D

    samples = group_samples(pairs)
    points = [valid_fits(frames[sample.name]) for _, sample in samples]
    if not any(len(part) for part in points):
        raise ValueError(
            f"No successful fits with positive expression rate for {title}"
        )
    fig, axes = plt.subplots(
        2,
        len(pairs),
        figsize=(4 * len(pairs), 7),
        sharex=True,
        sharey=True,
        squeeze=False,
        layout="constrained",
    )
    for ax, (pair, sample), data in zip(axes.flat, samples, points, strict=True):
        bound = data.onset_time.eq(0) | np.isclose(data.onset_time, onset_cap)
        ax.scatter(
            data.onset_time,
            data.expression_rate,
            s=9,
            alpha=0.35,
            c=np.where(bound, COLORS[1], COLORS[0]),
            linewidths=0,
        )
        ax.set_title(f"{pair} · {sample.label()}\nn={len(data):,}", fontsize=10)
        ax.set_yscale("log")
        ax.grid(alpha=0.2)
    fig.legend(
        handles=[
            Line2D(
                [],
                [],
                ls="none",
                marker="o",
                color=COLORS[1],
                label=f"Onset at search bound (0 or {onset_cap:g} min)",
            )
        ],
        loc="outside lower center",
        frameon=False,
    )
    fig.suptitle(title)
    fig.supxlabel("Fitted onset (minutes from first frame)")
    fig.supylabel("Fitted expression rate (intensity/min)")
    fig.savefig(prefix.with_name(f"{prefix.name}-onset-vs-rate.png"), dpi=160)
    plt.close(fig)

    labels = [
        f"{pair}\n{sample.label()}\nn={len(data):,}"
        for (pair, sample), data in zip(samples, points, strict=True)
    ]
    for metric, ylabel in [
        ("onset_time", "Fitted onset (minutes from first frame)"),
        ("expression_rate", "Fitted expression rate (intensity/min)"),
    ]:
        fig, ax = plt.subplots(
            figsize=(max(8, len(samples) * 1.4), 5), layout="constrained"
        )
        values = [part[metric].to_numpy() for part in points]
        rate = metric == "expression_rate"
        ax.boxplot(values, showfliers=not rate)
        ax.set_xticks(range(1, len(samples) + 1), labels, fontsize=9)
        ax.set_ylabel(ylabel)
        ax.grid(axis="y", alpha=0.2)
        fig.suptitle(title)
        if rate:
            ax.set_yscale("log")
            ax.set_ylim(*iqr_limits(values))
            ax.set_title(
                "Zoomed to IQRs; whiskers may be clipped and outliers are hidden",
                fontsize=9,
            )
        fig.savefig(prefix.with_name(f"{prefix.name}-{metric}.png"), dpi=160)
        plt.close(fig)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument(
        "layout", type=Path, help="CSV: sample,group,pair,series[,note]"
    )
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument(
        "--hours", type=float, help="Limit trace plots to the first N hours"
    )
    parser.add_argument("--plots", choices=("all", "traces", "kinetics"), default="all")
    args = parser.parse_args()
    if args.hours is not None and (not math.isfinite(args.hours) or args.hours <= 0):
        parser.error("--hours must be finite and positive")

    import matplotlib
    from transfection.core.sample_pack import concat_sample_tables, concat_sample_traces

    matplotlib.use("Agg")
    try:
        layout = read_layout(args.layout)
        config, mapping = load_workspace(args.workspace, layout)
        interval = config.interval_minutes
        traces = fits = None
        if args.plots != "kinetics":
            if interval is None or not math.isfinite(interval) or interval <= 0:
                raise ValueError("Set a positive frame interval in assay.json")
            require_csvs(args.workspace, mapping, fit=False)
            traces = concat_sample_traces(args.workspace, mapping)
        if args.plots != "traces":
            require_csvs(args.workspace, mapping, fit=True)
            fits = concat_sample_tables(args.workspace, mapping, "fit")
        args.out.mkdir(parents=True, exist_ok=True)
        for index, (group, pairs) in enumerate(layout.items(), start=1):
            slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", group).strip("-")[:60]
            prefix = args.out / f"{index:02d}-{slug or 'group'}"
            title = f"{args.workspace.resolve().name} · {group}"
            if traces is not None and interval is not None:
                draw_traces(
                    prefix.with_name(f"{prefix.name}-traces.png"),
                    title,
                    pairs,
                    traces,
                    interval,
                    args.hours,
                )
            if fits is not None:
                draw_kinetics(prefix, title, pairs, fits, config.max_onset_minutes)
    except (OSError, ValueError, KeyError) as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
