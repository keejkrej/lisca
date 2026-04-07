from __future__ import annotations

import csv
from pathlib import Path

from .config import DEFAULT_THRESHOLD
from .model import default_scores_plot_path


def plot_score_series(
    scores_csv_path: Path,
    *,
    output_png_path: Path | None = None,
    title: str | None = None,
) -> Path:
    resolved_scores_csv = scores_csv_path.resolve()
    resolved_output_png = (
        output_png_path.resolve()
        if output_png_path is not None
        else default_scores_plot_path(resolved_scores_csv)
    )

    time_indices: list[int] = []
    dead_probabilities: list[float] = []
    with resolved_scores_csv.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            time_indices.append(int(row["time_index"]))
            dead_probabilities.append(float(row["dead_probability"]))
    if not time_indices:
        raise ValueError(f"No rows found in {resolved_scores_csv}")

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    figure, axis = plt.subplots(figsize=(10, 4))
    axis.plot(time_indices, dead_probabilities, color="#c42121", linewidth=2)
    axis.axhline(DEFAULT_THRESHOLD, color="#555555", linestyle="--", linewidth=1)
    axis.set_xlabel("Time Index")
    axis.set_ylabel("Dead Probability")
    axis.set_ylim(-0.02, 1.02)
    axis.set_title(title or resolved_scores_csv.stem)
    axis.grid(True, alpha=0.25)
    figure.tight_layout()
    resolved_output_png.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(resolved_output_png, dpi=160)
    plt.close(figure)
    return resolved_output_png
