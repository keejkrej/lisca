from __future__ import annotations

import csv
from pathlib import Path

from .model import default_plot_path


def plot_readout_series(
    readout_csv_path: Path,
    *,
    output_png_path: Path | None = None,
    title: str | None = None,
) -> Path:
    resolved_readout_csv = readout_csv_path.resolve()
    resolved_output_png = (
        output_png_path.resolve()
        if output_png_path is not None
        else default_plot_path(resolved_readout_csv)
    )

    time_indices: list[int] = []
    live_fractions: list[float] = []
    killing_efficiencies: list[float] = []
    with resolved_readout_csv.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            time_indices.append(int(row["time_index"]))
            live_fractions.append(float(row["live_fraction"]))
            killing_efficiencies.append(float(row["killing_efficiency"]))
    if not time_indices:
        raise ValueError(f"No rows found in {resolved_readout_csv}")

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    figure, axis = plt.subplots(figsize=(10, 4))
    axis.plot(time_indices, live_fractions, color="#17803d", linewidth=2, label="Live fraction")
    axis.plot(time_indices, killing_efficiencies, color="#c42121", linewidth=2, label="Killing efficiency")
    axis.set_xlabel("Time Index")
    axis.set_ylabel("Fraction")
    axis.set_ylim(-0.02, 1.02)
    axis.set_title(title or resolved_readout_csv.stem)
    axis.grid(True, alpha=0.25)
    axis.legend()
    figure.tight_layout()
    resolved_output_png.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(resolved_output_png, dpi=160)
    plt.close(figure)
    return resolved_output_png
