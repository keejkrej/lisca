from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd
import typer

from lisca.analysis.roi import (
    compute_roi_metrics,
    quantile_column_name,
    write_metrics_csv,
)
from lisca.data.roi import position_dir, read_position_index, validate_channel_index
from lisca.data.slide import load_slide_mapping


app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help=(
        "Read cropped ROI TIFF timelapses from roi/PosN, compute per-ROI intensity "
        "metrics for one channel, and write a long-form CSV."
    ),
)

OUTPUT_COLUMNS = ("pos", "roi", "t", "corrected")
DELIVERY_CORRECTION_QUARTILE = 0.25


@dataclass(frozen=True)
class SlideTimeseriesRunResult:
    written_outputs: list[tuple[int, Path, int]]
    skipped_positions: dict[int, list[int]]


load_slide_position_groups = load_slide_mapping


def default_slide_timeseries_csv_path(
    dataset_root: Path,
    slide_path: Path,
    slide_channel: int,
    channel: int,
    output_csv: Path | None,
) -> Path:
    if output_csv is None:
        csv_path = dataset_root / 'timeseries' / f'{slide_path.stem}_sc{slide_channel}_ch{channel:03d}_timeseries.csv'
        return csv_path.resolve()

    if output_csv.suffix:
        csv_path = output_csv.with_name(
            f'{output_csv.stem}_sc{slide_channel}_ch{channel:03d}{output_csv.suffix}'
        )
    else:
        csv_path = output_csv / f'{slide_path.stem}_sc{slide_channel}_ch{channel:03d}_timeseries.csv'
    return csv_path.resolve()


def consolidate_metrics(dataframes: list[pd.DataFrame]) -> pd.DataFrame:
    if not dataframes:
        raise ValueError('No position metrics to consolidate')
    return pd.concat(dataframes, ignore_index=True).sort_values(['pos', 'roi', 't']).reset_index(drop=True)


def simplify_metrics(df: pd.DataFrame) -> pd.DataFrame:
    return df.loc[:, list(OUTPUT_COLUMNS)].sort_values(['pos', 'roi', 't']).reset_index(drop=True)


def apply_delivery_correction(df: pd.DataFrame, *, correction_quartile: float = DELIVERY_CORRECTION_QUARTILE) -> pd.DataFrame:
    corrected_column = quantile_column_name(correction_quartile)
    if corrected_column not in df.columns:
        raise ValueError(
            f"Quartiles must include {correction_quartile:.2f} so delivery corrected intensity can be computed"
        )

    corrected_df = df.copy()
    corrected_df["corrected"] = corrected_df["sum"] - corrected_df["area"] * corrected_df[corrected_column]
    return corrected_df


def run_slide_timeseries(
    dataset_root: Path,
    *,
    slide: Path,
    channel: int,
    output_csv: Path | None,
    correction_quartile: float = DELIVERY_CORRECTION_QUARTILE,
) -> SlideTimeseriesRunResult:
    dataset_root = dataset_root.resolve()
    slide_path = slide.resolve()
    quantile_column_name(correction_quartile)
    skipped_positions: dict[int, list[int]] = {}
    slide_positions = load_slide_mapping(slide_path)
    written_outputs: list[tuple[int, Path, int]] = []

    for slide_channel, positions in slide_positions.items():
        position_frames: list[pd.DataFrame] = []
        for resolved_pos in positions:
            try:
                pos_dir = position_dir(dataset_root, resolved_pos)
            except ValueError:
                skipped_positions.setdefault(slide_channel, []).append(resolved_pos)
                continue
            index = read_position_index(pos_dir)
            validate_channel_index(index, channel)
            position_frames.append(
                compute_roi_metrics(
                    pos_dir,
                    index,
                    channel=channel,
                    quartiles=[correction_quartile],
                )
            )

        if not position_frames:
            continue

        combined_df = consolidate_metrics(position_frames)
        resolved_output_csv = default_slide_timeseries_csv_path(
            dataset_root=dataset_root,
            slide_path=slide_path,
            slide_channel=slide_channel,
            channel=channel,
            output_csv=output_csv,
        )
        write_metrics_csv(
            simplify_metrics(
                apply_delivery_correction(combined_df, correction_quartile=correction_quartile)
            ),
            resolved_output_csv,
        )
        written_outputs.append((slide_channel, resolved_output_csv, len(position_frames)))

    if not written_outputs:
        if skipped_positions:
            skipped_summary = "; ".join(
                f"slide channel {slide_channel} -> {', '.join(str(pos) for pos in positions)}"
                for slide_channel, positions in sorted(skipped_positions.items())
            )
            raise ValueError(
                f"No ROI directories found for positions in {slide_path}. "
                f"Skipped positions: {skipped_summary}"
            )
        raise ValueError(f"{slide_path} defines no valid positions")

    return SlideTimeseriesRunResult(
        written_outputs=written_outputs,
        skipped_positions=skipped_positions,
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
    channel: int = typer.Option(
        ...,
        "--channel",
        min=0,
        help="Channel index in the cropped ROI TIFF timelapses.",
    ),
    slide: Path = typer.Option(
        ...,
        "--slide",
        exists=True,
        file_okay=True,
        dir_okay=False,
        help=(
            "Microscopy slide mapping JSON from slide channel to position list. "
            "Process every position from every slide channel in the file and write "
            "one CSV per slide channel."
        ),
    ),
    output_csv: Path | None = typer.Option(
        None,
        "--output-csv",
        help=(
            "Output CSV path or directory. Default: one CSV per slide channel named "
            "<slide_stem>_scS_chCCC_timeseries.csv under <dataset_root>/timeseries. "
            "When a custom .csv path is provided, _scS_chCCC is appended to the stem "
            "for each output file."
        ),
    ),
    correction_quartile: float = typer.Option(
        DELIVERY_CORRECTION_QUARTILE,
        "--correction-quartile",
        help="Single quartile used to compute the corrected intensity column.",
    ),
) -> None:
    result = run_slide_timeseries(
        dataset_root,
        slide=slide,
        channel=channel,
        output_csv=output_csv,
        correction_quartile=correction_quartile,
    )
    if result.skipped_positions:
        total_skipped_positions = sum(len(positions) for positions in result.skipped_positions.values())
        skipped_summary = "; ".join(
            f"slide channel {slide_channel} -> {', '.join(str(pos) for pos in positions)}"
            for slide_channel, positions in sorted(result.skipped_positions.items())
        )
        print(
            f"Skipped {total_skipped_positions} missing positions from slide mapping: {skipped_summary}"
        )
    for slide_channel, resolved_output_csv, position_count in result.written_outputs:
        print(
            f"Wrote metrics CSV for slide channel {slide_channel} with {position_count} positions: "
            f"{resolved_output_csv}"
        )


def main(argv: list[str] | None = None, *, prog_name: str = "delivery expression timeseries") -> None:
    app(args=argv, prog_name=prog_name)


if __name__ == "__main__":
    main()
