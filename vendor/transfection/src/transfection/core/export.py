from __future__ import annotations

from pathlib import Path

import pandas as pd

XLSX_EXTENSION = ".xlsx"


def parallel_xlsx_path(csv_path: Path) -> Path:
    return csv_path.with_suffix(XLSX_EXTENSION)


def write_csv_only(df: pd.DataFrame, output_csv: Path) -> Path:
    """Write a CSV with no companion XLSX (analysis/ intermediates)."""
    output_csv = output_csv.resolve()
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_csv, index=False)
    return output_csv


def write_xlsx_only(df: pd.DataFrame, output_xlsx: Path) -> Path:
    """Write an XLSX with no companion CSV (results/<sample>/ tables)."""
    output_xlsx = output_xlsx.resolve()
    if output_xlsx.suffix.lower() != XLSX_EXTENSION:
        output_xlsx = output_xlsx.with_suffix(XLSX_EXTENSION)
    output_xlsx.parent.mkdir(parents=True, exist_ok=True)
    df.to_excel(output_xlsx, index=False, engine="openpyxl")
    return output_xlsx


def write_csv_and_parallel_xlsx(df: pd.DataFrame, output_csv: Path) -> Path:
    output_csv = output_csv.resolve()
    output_xlsx = parallel_xlsx_path(output_csv)
    write_csv_only(df, output_csv)
    write_xlsx_only(df, output_xlsx)
    return output_xlsx
