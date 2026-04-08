from __future__ import annotations

import re
from pathlib import Path

import pandas as pd
import typer

from lisca.analysis.roi import load_timeseries_csv


SLIDE_CHANNEL_PATTERN = re.compile(r"_sc\d+(?=_)")
GROUP_COLUMNS = ("pos", "roi")
OUTPUT_COLUMNS = ("slide_channel", "pos", "roi", "auc")

app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help="Integrate ROI timeseries CSVs and write per-trace area-under-the-curve summaries.",
)


def normalize_output_stem(csv_path: Path) -> str:
    return SLIDE_CHANNEL_PATTERN.sub("", csv_path.stem)


def default_output_csv_path(timeseries_csvs: list[Path], output_csv: Path | None) -> Path:
    if output_csv is not None:
        return output_csv.resolve()

    normalized_stems = {normalize_output_stem(csv_path) for csv_path in timeseries_csvs}
    if len(normalized_stems) == 1:
        stem = next(iter(normalized_stems))
    elif len(timeseries_csvs) == 1:
        stem = timeseries_csvs[0].stem
    else:
        stem = "timeseries"
    return timeseries_csvs[0].with_name(f"{stem}_auc.csv").resolve()


def parse_slide_channel(csv_path: Path) -> int | None:
    match = re.search(r"_sc(\d+)(?=_|$)", csv_path.stem)
    if match is None:
        return None
    return int(match.group(1))


def integrate_trace(trace_df: pd.DataFrame, *, interval: float) -> float:
    sorted_df = trace_df.sort_values("t").reset_index(drop=True)
    if len(sorted_df) < 2:
        return 0.0

    times = sorted_df["t"].astype(float).to_numpy() * interval
    values = sorted_df["corrected"].astype(float).to_numpy()
    widths = times[1:] - times[:-1]
    heights = (values[:-1] + values[1:]) * 0.5
    return float((widths * heights).sum())


def compute_auc_table(timeseries_csvs: list[Path], *, interval: float) -> pd.DataFrame:
    rows: list[dict[str, object]] = []
    for csv_path in timeseries_csvs:
        df = load_timeseries_csv(csv_path)
        slide_channel = parse_slide_channel(csv_path)
        group_columns = [column for column in GROUP_COLUMNS if column in df.columns]
        if not group_columns:
            raise ValueError(f"{csv_path} has no supported grouping columns: {GROUP_COLUMNS}")

        for group_key, trace_df in df.groupby(group_columns, sort=True):
            if not isinstance(group_key, tuple):
                group_key = (group_key,)
            row = dict(zip(group_columns, group_key, strict=True))
            sorted_df = trace_df.sort_values("t").reset_index(drop=True)
            row.update(
                {
                    "slide_channel": slide_channel,
                    "auc": integrate_trace(sorted_df, interval=interval),
                }
            )
            rows.append(row)

    if not rows:
        raise ValueError("No AUC rows produced")

    result = pd.DataFrame(rows)
    sort_columns = [column for column in ("slide_channel", *GROUP_COLUMNS) if column in result.columns]
    return result.sort_values(sort_columns).reset_index(drop=True).loc[:, list(OUTPUT_COLUMNS)]


def write_auc_csv(df: pd.DataFrame, output_csv: Path) -> None:
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_csv, index=False)


@app.command()
def cli(
    timeseries_csvs: list[Path] = typer.Argument(
        ...,
        exists=True,
        dir_okay=False,
        help="One or more long-form ROI timeseries CSV files to integrate.",
    ),
    interval: float = typer.Option(
        ...,
        "--interval",
        min=0.0,
        help="Frame interval in minutes used to convert t into time before integration.",
    ),
    output_csv: Path | None = typer.Option(
        None,
        "--output-csv",
        help="Output CSV path. Default: derive a shared <stem>_auc.csv path.",
    ),
) -> None:
    if interval <= 0:
        raise ValueError(f"--interval must be > 0, got {interval}")

    resolved_csvs = sorted((csv_path.resolve() for csv_path in timeseries_csvs), key=lambda path: path.name)
    auc_df = compute_auc_table(resolved_csvs, interval=interval)
    resolved_output_csv = default_output_csv_path(resolved_csvs, output_csv)
    write_auc_csv(auc_df, resolved_output_csv)
    print(f"Wrote AUC CSV: {resolved_output_csv}")


def main(argv: list[str] | None = None, *, prog_name: str = "delivery expression auc") -> None:
    app(args=argv, prog_name=prog_name)


if __name__ == "__main__":
    main()
