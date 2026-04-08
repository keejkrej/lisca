from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import typer

from lisca.analysis.roi import DEFAULT_QUARTILES, compute_roi_metrics, parse_quartiles, write_metrics_csv
from lisca.data.roi import (
    default_timeseries_csv_path,
    position_dir,
    read_position_index,
    validate_channel_index,
)


app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help=(
        "Read cropped ROI TIFF timelapses from roi/PosN, compute per-ROI intensity "
        "metrics for one channel, and write a long-form CSV."
    ),
)


def _parse_slide_position_entry(entry: object) -> list[int]:
    if isinstance(entry, int):
        if entry < 0:
            raise ValueError(f"Slide positions must be non-negative, got {entry}")
        return [entry]

    if isinstance(entry, str):
        text = entry.strip()
        if not text:
            raise ValueError("Slide position entries cannot be empty")
        if "-" in text:
            start_text, end_text = text.split("-", 1)
            try:
                start = int(start_text)
                end = int(end_text)
            except ValueError as exc:
                raise ValueError(f"Invalid slide range {entry!r}") from exc
            if start < 0 or end < 0:
                raise ValueError(f"Slide ranges must be non-negative, got {entry!r}")
            if start > end:
                raise ValueError(f"Slide ranges must be ascending, got {entry!r}")
            return list(range(start, end + 1))

        try:
            value = int(text)
        except ValueError as exc:
            raise ValueError(f"Invalid slide position entry {entry!r}") from exc
        if value < 0:
            raise ValueError(f"Slide positions must be non-negative, got {entry!r}")
        return [value]

    raise ValueError(f"Unsupported slide position entry {entry!r}")


def load_slide_positions(slide_path: Path, channel: int) -> list[int]:
    raw = json.loads(slide_path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError(f"Slide mapping must be a JSON object: {slide_path}")

    channel_key = str(channel)
    raw_positions = raw.get(channel_key)
    if raw_positions is None:
        available_channels = ", ".join(sorted(str(key) for key in raw)) or "none"
        raise ValueError(
            f"{slide_path} does not define positions for --channel={channel}. "
            f"Available channels: {available_channels}"
        )
    if not isinstance(raw_positions, list):
        raise ValueError(
            f"Slide channel entries must be lists, got {type(raw_positions).__name__} for {channel_key}"
        )

    positions: list[int] = []
    seen: set[int] = set()
    for entry in raw_positions:
        for position in _parse_slide_position_entry(entry):
            if position not in seen:
                seen.add(position)
                positions.append(position)

    if not positions:
        raise ValueError(f"{slide_path} defines no positions for --channel={channel}")
    return positions


def default_slide_timeseries_csv_path(
    dataset_root: Path,
    slide_path: Path,
    channel: int,
    output_csv: Path | None,
) -> Path:
    csv_path = output_csv or (dataset_root / 'timeseries' / f'{slide_path.stem}_ch{channel:03d}_timeseries.csv')
    return csv_path.resolve()


def consolidate_metrics(dataframes: list[pd.DataFrame]) -> pd.DataFrame:
    if not dataframes:
        raise ValueError('No position metrics to consolidate')
    return pd.concat(dataframes, ignore_index=True).sort_values(['pos', 'roi', 't']).reset_index(drop=True)


@app.command()
def cli(
    dataset_root: Path = typer.Argument(
        ...,
        exists=True,
        file_okay=False,
        dir_okay=True,
        help="Dataset root containing roi/PosN/index.json and Roi*.tif files.",
    ),
    pos: int = typer.Option(
        0,
        "--pos",
        min=0,
        help="Position index resolved as roi/PosN under the dataset root.",
    ),
    channel: int = typer.Option(
        ...,
        "--channel",
        min=0,
        help="Channel index in the cropped ROI TIFF timelapses.",
    ),
    slide: Path | None = typer.Option(
        None,
        "--slide",
        exists=True,
        file_okay=True,
        dir_okay=False,
        help=(
            "Optional microscopy slide mapping JSON from channel to position list. "
            "When provided, process every mapped position for the selected channel "
            "and write one consolidated CSV."
        ),
    ),
    output_csv: Path | None = typer.Option(
        None,
        "--output-csv",
        help=(
            "Output CSV path. Default: <dataset_root>/timeseries/PosN/PosN_chCCC_timeseries.csv "
            "for single-position mode, or <dataset_root>/timeseries/<slide_stem>_chCCC_timeseries.csv "
            "for --slide mode."
        ),
    ),
    quartiles: str = typer.Option(
        DEFAULT_QUARTILES,
        "--quartiles",
        help="Comma-separated quantiles to write as qXX columns.",
    ),
) -> None:
    dataset_root = dataset_root.resolve()
    resolved_quartiles = parse_quartiles(quartiles)

    if slide is None:
        pos_dir = position_dir(dataset_root, pos)
        index = read_position_index(pos_dir)
        validate_channel_index(index, channel)
        resolved_output_csv = default_timeseries_csv_path(
            dataset_root=dataset_root,
            pos=pos,
            channel=channel,
            output_csv=output_csv,
        )
        df = compute_roi_metrics(
            pos_dir,
            index,
            channel=channel,
            quartiles=resolved_quartiles,
        )
        write_metrics_csv(df, resolved_output_csv)
        print(f"Wrote metrics CSV: {resolved_output_csv}")
        return

    slide_path = slide.resolve()
    positions = load_slide_positions(slide_path, channel)
    position_frames: list[pd.DataFrame] = []
    for resolved_pos in positions:
        pos_dir = position_dir(dataset_root, resolved_pos)
        index = read_position_index(pos_dir)
        validate_channel_index(index, channel)
        position_frames.append(
            compute_roi_metrics(
                pos_dir,
                index,
                channel=channel,
                quartiles=resolved_quartiles,
            )
        )

    combined_df = consolidate_metrics(position_frames)
    resolved_output_csv = default_slide_timeseries_csv_path(
        dataset_root=dataset_root,
        slide_path=slide_path,
        channel=channel,
        output_csv=output_csv,
    )
    write_metrics_csv(combined_df, resolved_output_csv)
    print(
        f"Wrote consolidated metrics CSV for {len(positions)} positions: {resolved_output_csv}"
    )


def main(argv: list[str] | None = None, *, prog_name: str = "delivery expression timeseries") -> None:
    app(args=argv, prog_name=prog_name)


if __name__ == "__main__":
    main()
