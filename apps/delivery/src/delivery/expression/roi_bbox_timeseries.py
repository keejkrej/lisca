from __future__ import annotations

from pathlib import Path

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
    output_csv: Path | None = typer.Option(
        None,
        "--output-csv",
        help="Output CSV path. Default: <dataset_root>/roi/PosN/PosN_chCCC_timeseries.csv",
    ),
    quartiles: str = typer.Option(
        DEFAULT_QUARTILES,
        "--quartiles",
        help="Comma-separated quantiles to write as qXX columns.",
    ),
) -> None:
    dataset_root = dataset_root.resolve()
    resolved_quartiles = parse_quartiles(quartiles)
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


def main(argv: list[str] | None = None, *, prog_name: str = "delivery expression roi-bbox-timeseries") -> None:
    app(args=argv, prog_name=prog_name)


if __name__ == "__main__":
    main()
