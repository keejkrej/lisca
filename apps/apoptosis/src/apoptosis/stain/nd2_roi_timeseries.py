from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import nd2
import numpy as np
import pandas as pd
import typer

from lisca.analysis.roi import (
    DEFAULT_CORRECTED_QUANTILE,
    DEFAULT_QUARTILES,
    parse_quartiles,
    quantile_column_name,
    validate_corrected_quantile,
    write_metrics_csv,
)
from lisca.data.bbox import RoiBox, clip_roi, read_bbox_csv
from lisca.data.nd2 import (
    FrameLookup,
    build_frame_lookup,
    channel_name,
    read_frame_2d,
    relative_time_ms,
    validate_nd2_indices,
)


app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help=(
        "Read an ND2 file directly, sum stain-channel intensity within ROI "
        "bounding boxes, apply quantile-based background correction, and "
        "write a long-form CSV."
    ),
)

def default_output_csv_path(bbox_csv: Path, pos: int, channel: int, output_csv: Path | None) -> Path:
    suffix = f"_pos{pos:03d}_ch{channel:03d}_timeseries"
    csv_path = output_csv or bbox_csv.with_name(f"{bbox_csv.stem}{suffix}.csv")
    return csv_path.resolve()


def compute_metrics(
    handle: Any,
    lookup: FrameLookup,
    rois: list[RoiBox],
    *,
    pos: int,
    channel: int,
    quartiles: list[float],
    corrected_quantile: float = DEFAULT_CORRECTED_QUANTILE,
) -> pd.DataFrame:
    validate_corrected_quantile(quartiles, corrected_quantile)

    n_time = handle.sizes.get("T", 1)
    sample = read_frame_2d(handle, lookup, pos, 0, channel, 0)
    height, width = sample.shape

    roi_slices = {roi.roi: clip_roi(roi, height=height, width=width) for roi in rois}
    corrected_column = quantile_column_name(corrected_quantile)
    current_channel_name = channel_name(handle, channel)

    rows: list[dict[str, int | float | str | None]] = []
    for timepoint in range(n_time):
        frame = read_frame_2d(handle, lookup, pos, timepoint, channel, 0)
        t_ms = relative_time_ms(handle, lookup, pos, timepoint, channel)
        for roi in rois:
            y_slice, x_slice, clipped_w, clipped_h = roi_slices[roi.roi]
            patch = np.asarray(frame[y_slice, x_slice], dtype=np.uint64)
            quantile_values = np.quantile(patch, quartiles, method="linear")
            metrics = {
                quantile_column_name(quartile): float(quantile_value)
                for quartile, quantile_value in zip(quartiles, np.atleast_1d(quantile_values))
            }
            sum_value = int(patch.sum(dtype=np.uint64))
            rows.append(
                {
                    "pos": pos,
                    "channel": channel,
                    "channel_name": current_channel_name,
                    "t": timepoint,
                    "t_ms": t_ms,
                    "t_min": t_ms / 60000.0,
                    "roi": roi.roi,
                    "x": roi.x,
                    "y": roi.y,
                    "w": roi.w,
                    "h": roi.h,
                    "clipped_w": clipped_w,
                    "clipped_h": clipped_h,
                    "area": int(patch.size),
                    "sum": sum_value,
                    **metrics,
                    "corrected": float(sum_value - patch.size * metrics[corrected_column]),
                }
            )

    if not rows:
        raise ValueError("No rows produced")
    return pd.DataFrame(rows).sort_values(["roi", "t"]).reset_index(drop=True)

@app.command()
def cli(
    input_nd2: Path = typer.Argument(
        ...,
        exists=True,
        dir_okay=False,
        help="Path to the ND2 file.",
    ),
    bbox_csv: Path = typer.Argument(
        ...,
        exists=True,
        dir_okay=False,
        help="CSV with columns roi,x,y,w,h for one position.",
    ),
    pos: int = typer.Option(
        0,
        "--pos",
        min=0,
        help="Position index in the ND2 file.",
    ),
    channel: int = typer.Option(
        ...,
        "--channel",
        min=0,
        help="Channel index in the ND2 file.",
    ),
    output_csv: Path | None = typer.Option(
        None,
        "--output-csv",
        help="Output CSV path. Default: <bbox_stem>_posPPP_chCCC_timeseries.csv",
    ),
    quartiles: str = typer.Option(
        DEFAULT_QUARTILES,
        "--quartiles",
        help="Comma-separated quantiles to write as qXX columns.",
    ),
) -> None:
    input_nd2 = input_nd2.resolve()
    bbox_csv = bbox_csv.resolve()
    resolved_quartiles = parse_quartiles(quartiles)
    rois = read_bbox_csv(bbox_csv)
    resolved_output_csv = default_output_csv_path(
        bbox_csv=bbox_csv,
        pos=pos,
        channel=channel,
        output_csv=output_csv,
    )

    with nd2.ND2File(str(input_nd2)) as handle:
        validate_nd2_indices(handle, pos, channel)
        lookup = build_frame_lookup(handle)
        df = compute_metrics(
            handle,
            lookup,
            rois,
            pos=pos,
            channel=channel,
            quartiles=resolved_quartiles,
        )

    write_metrics_csv(df, resolved_output_csv)
    print(f"Wrote metrics CSV: {resolved_output_csv}")


def main(argv: list[str] | None = None, *, prog_name: str = "apoptosis stain roi-timeseries") -> None:
    app(args=argv, prog_name=prog_name)


class _FakeHandle:
    def __init__(
        self,
        *,
        sizes: dict[str, int],
        loop_indices: tuple[dict[str, int], ...],
        frames: list[np.ndarray],
        metadata_channels: list[str] | None = None,
        relative_times_ms: list[float] | None = None,
    ) -> None:
        self.sizes = sizes
        self.loop_indices = loop_indices
        self._frames = frames
        names = metadata_channels or [f"channel_{i}" for i in range(sizes.get("C", 1))]
        self.metadata = SimpleNamespace(
            channels=[SimpleNamespace(channel=SimpleNamespace(name=name)) for name in names]
        )
        self._relative_times_ms = relative_times_ms or [
            float(i) for i in range(sizes.get("T", 1))
        ]

    def read_frame(self, index: int) -> np.ndarray:
        return self._frames[index]

    def frame_metadata(self, index: int) -> Any:
        if "T" in {axis for frame in self.loop_indices for axis in frame}:
            timepoint = self.loop_indices[index].get("T", 0)
        else:
            timepoint = 0
        t_ms = self._relative_times_ms[timepoint]
        return SimpleNamespace(
            channels=[
                SimpleNamespace(time=SimpleNamespace(relativeTimeMs=t_ms))
                for _ in range(self.sizes.get("C", 1))
            ]
        )
