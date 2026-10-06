"""Compare two finished transfection Workspaces.

Not an analysis stage. Harmonizing is optional: pass a Control sample name
for each Workspace only when both contain the same expressing Sample.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from lisca.core.paths import ANALYSIS_DIR, ASSAY_JSON

FIT_COLUMNS = (
    "baseline_intensity",
    "onset_time",
    "expression_rate",
    "mrna_lifetime",
    "protein_lifetime",
)
_TRUE = {"1", "true", "yes"}
_FALSE = {"0", "false", "no"}


class BridgeError(Exception):
    """The two Workspaces cannot be put on one intensity scale."""


@dataclass(frozen=True)
class ControlScale:
    baseline_intensity: float
    expression_rate: float
    n: int


@dataclass(frozen=True)
class IntensityBridge:
    gain: float
    offset: float


@dataclass(frozen=True)
class FitRow:
    batch: str
    sample: str
    pos: int
    roi: int
    channel: str
    baseline_intensity: float
    onset_time: float
    expression_rate: float
    mrna_lifetime: float
    protein_lifetime: float
    success: bool


@dataclass(frozen=True)
class TraceRow:
    batch: str
    sample: str
    pos: int
    roi: int
    channel: str
    t: float
    corrected: float


def median(values: list[float]) -> float | None:
    finite = [value for value in values if math.isfinite(value)]
    if not finite:
        return None
    return float(np.quantile(np.asarray(finite, dtype=np.float64), 0.5))


def control_scale(
    baseline_intensity: list[float],
    expression_rate: list[float],
) -> ControlScale:
    baseline = median(baseline_intensity)
    rate = median(expression_rate)
    if baseline is None or rate is None:
        raise BridgeError(
            "control sample has no finite baseline intensity and expression rate"
        )
    if rate <= 0.0:
        raise BridgeError(
            "control expression rate must be positive to bridge microscope gain"
        )
    return ControlScale(
        baseline_intensity=baseline,
        expression_rate=rate,
        n=min(len(baseline_intensity), len(expression_rate)),
    )


def bridge_onto(reference: ControlScale, query: ControlScale) -> IntensityBridge:
    if reference.expression_rate <= 0.0 or query.expression_rate <= 0.0:
        raise BridgeError(
            "control expression rate must be positive to bridge microscope gain"
        )
    gain = reference.expression_rate / query.expression_rate
    offset = reference.baseline_intensity - gain * query.baseline_intensity
    return IntensityBridge(gain=gain, offset=offset)


def harmonize_intensity(bridge: IntensityBridge, intensity: float) -> float:
    return bridge.gain * intensity + bridge.offset


def parse_positions(raw: str) -> list[int]:
    collected: list[int] = []
    seen: set[int] = set()
    for token in raw.split(","):
        token = token.strip()
        if not token:
            continue
        parts = [part.strip() for part in token.split(":")]
        if len(parts) == 1:
            position = int(parts[0])
        elif len(parts) in (2, 3):
            start = int(parts[0])
            stop = int(parts[1])
            step = int(parts[2]) if len(parts) == 3 else 1
            if step == 0 or stop < start:
                raise BridgeError(f"invalid position range: {token}")
            position = None
            current = start
            while current <= stop:
                if current not in seen:
                    seen.add(current)
                    collected.append(current)
                current += step
            continue
        else:
            raise BridgeError(f"invalid position range: {token}")
        if position not in seen:
            seen.add(position)
            collected.append(position)
    if not collected:
        raise BridgeError("no valid positions in sample row")
    return collected


def sample_positions(workspace: Path) -> dict[str, list[int]]:
    path = workspace / ASSAY_JSON
    if not path.is_file():
        raise BridgeError(f"missing {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    samples = payload.get("samples")
    if not isinstance(samples, list) or not samples:
        raise BridgeError(f"{path} has no samples")
    mapping: dict[str, list[int]] = {}
    for row in samples:
        name = str(row.get("name", "")).strip()
        if not name:
            raise BridgeError(f"{path} has a sample with no name")
        if name in mapping:
            raise BridgeError(f"duplicate sample name {name!r} in {path}")
        mapping[name] = parse_positions(str(row.get("positions", "")))
    return mapping


def _position_sample(mapping: dict[str, list[int]]) -> dict[int, str]:
    found: dict[int, str] = {}
    for name, positions in mapping.items():
        for position in positions:
            found.setdefault(position, name)
    return found


def _batch_label(workspace: Path, other: Path, mark: str) -> str:
    name = workspace.name
    if name == other.name:
        return f"{name} ({mark})"
    return name


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def _require_float(row: dict[str, str], column: str, path: Path) -> float:
    raw = row.get(column, "").strip()
    try:
        return float(raw)
    except ValueError as error:
        raise BridgeError(f"{path} column {column} is not a number: {raw!r}") from error


def _success(row: dict[str, str]) -> bool:
    raw = row.get("success", "true").strip().lower()
    if raw in _TRUE:
        return True
    if raw in _FALSE:
        return False
    return False


def load_fits(workspace: Path, batch: str) -> list[FitRow]:
    by_position = _position_sample(sample_positions(workspace))
    directory = workspace / ANALYSIS_DIR
    if not directory.is_dir():
        raise BridgeError(f"missing {directory}")
    rows: list[FitRow] = []
    for path in sorted(directory.glob("Pos[0-9]*/fit.csv")):
        pos_text = path.parent.name.removeprefix("Pos")
        if not pos_text.isdigit():
            continue
        position = int(pos_text)
        sample = by_position.get(position, "")
        for record in _read_csv(path):
            rows.append(
                FitRow(
                    batch=batch,
                    sample=sample,
                    pos=position,
                    roi=int(_require_float(record, "roi", path)),
                    channel=record.get("channel", "").strip(),
                    baseline_intensity=_require_float(
                        record, "baseline_intensity", path
                    ),
                    onset_time=_require_float(record, "onset_time", path),
                    expression_rate=_require_float(record, "expression_rate", path),
                    mrna_lifetime=_require_float(record, "mrna_lifetime", path),
                    protein_lifetime=_require_float(record, "protein_lifetime", path),
                    success=_success(record),
                )
            )
    return rows


def load_traces(workspace: Path, batch: str) -> list[TraceRow]:
    by_position = _position_sample(sample_positions(workspace))
    directory = workspace / ANALYSIS_DIR
    rows: list[TraceRow] = []
    for path in sorted(directory.glob("Pos[0-9]*/ch[0-9]*.csv")):
        pos_text = path.parent.name.removeprefix("Pos")
        channel = path.stem.removeprefix("ch")
        if not pos_text.isdigit() or not channel.isdigit():
            continue
        position = int(pos_text)
        sample = by_position.get(position, "")
        for record in _read_csv(path):
            rows.append(
                TraceRow(
                    batch=batch,
                    sample=sample,
                    pos=position,
                    roi=int(_require_float(record, "roi", path)),
                    channel=channel,
                    t=_require_float(record, "t", path),
                    corrected=_require_float(record, "corrected", path),
                )
            )
    return rows


def _control_values(rows: list[FitRow], sample: str, batch: str) -> ControlScale:
    chosen = [
        row
        for row in rows
        if row.batch == batch and row.sample == sample and row.success
    ]
    if not chosen:
        raise BridgeError(f"no successful fits for control {sample!r} in {batch}")
    return control_scale(
        [row.baseline_intensity for row in chosen],
        [row.expression_rate for row in chosen],
    )


def write_comparison(
    out: Path,
    fits_a: list[FitRow],
    fits_b: list[FitRow],
    traces_a: list[TraceRow],
    traces_b: list[TraceRow],
    bridge: IntensityBridge | None,
    control_a: ControlScale | None = None,
    control_b: ControlScale | None = None,
    control_name_a: str | None = None,
    control_name_b: str | None = None,
) -> None:
    out.mkdir(parents=True, exist_ok=True)
    fit_header = [
        "batch",
        "sample",
        "pos",
        "roi",
        "channel",
        *FIT_COLUMNS,
        "success",
    ]
    if bridge is not None:
        fit_header.extend(
            ["baseline_intensity_harmonized", "expression_rate_harmonized"]
        )
    _write_rows(
        out / "fits.csv",
        fit_header,
        [_fit_record(row, bridge, query=False) for row in fits_a]
        + [_fit_record(row, bridge, query=True) for row in fits_b],
    )
    trace_header = ["batch", "sample", "pos", "roi", "channel", "t", "corrected"]
    if bridge is not None:
        trace_header.append("corrected_harmonized")
    _write_rows(
        out / "traces.csv",
        trace_header,
        [_trace_record(row, bridge, query=False) for row in traces_a]
        + [_trace_record(row, bridge, query=True) for row in traces_b],
    )
    bridge_path = out / "bridge.json"
    if bridge is None:
        if bridge_path.exists():
            bridge_path.unlink()
        return
    assert control_a is not None and control_b is not None
    payload = {
        "gain": bridge.gain,
        "offset": bridge.offset,
        "control_a": {
            "sample": control_name_a,
            "baseline_intensity": control_a.baseline_intensity,
            "expression_rate": control_a.expression_rate,
            "n": control_a.n,
        },
        "control_b": {
            "sample": control_name_b,
            "baseline_intensity": control_b.baseline_intensity,
            "expression_rate": control_b.expression_rate,
            "n": control_b.n,
        },
    }
    bridge_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def _fit_record(
    row: FitRow,
    bridge: IntensityBridge | None,
    *,
    query: bool,
) -> dict[str, str]:
    record = {
        "batch": row.batch,
        "sample": row.sample,
        "pos": str(row.pos),
        "roi": str(row.roi),
        "channel": row.channel,
        "baseline_intensity": _format(row.baseline_intensity),
        "onset_time": _format(row.onset_time),
        "expression_rate": _format(row.expression_rate),
        "mrna_lifetime": _format(row.mrna_lifetime),
        "protein_lifetime": _format(row.protein_lifetime),
        "success": "true" if row.success else "false",
    }
    if bridge is not None:
        baseline = row.baseline_intensity
        rate = row.expression_rate
        if query:
            baseline = harmonize_intensity(bridge, baseline)
            rate = bridge.gain * rate
        record["baseline_intensity_harmonized"] = _format(baseline)
        record["expression_rate_harmonized"] = _format(rate)
    return record


def _trace_record(
    row: TraceRow, bridge: IntensityBridge | None, *, query: bool
) -> dict[str, str]:
    corrected = row.corrected
    record = {
        "batch": row.batch,
        "sample": row.sample,
        "pos": str(row.pos),
        "roi": str(row.roi),
        "channel": row.channel,
        "t": _format(row.t),
        "corrected": _format(corrected),
    }
    if bridge is not None:
        if query:
            corrected = harmonize_intensity(bridge, corrected)
        record["corrected_harmonized"] = _format(corrected)
    return record


def _format(value: float) -> str:
    return format(value, ".10g")


def _write_rows(path: Path, header: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=header, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def compare(
    workspace_a: Path,
    workspace_b: Path,
    out: Path,
    control_a: str | None = None,
    control_b: str | None = None,
) -> IntensityBridge | None:
    if (control_a is None) != (control_b is None):
        raise BridgeError("pass both --control-a and --control-b, or neither")
    label_a = _batch_label(workspace_a, workspace_b, "a")
    label_b = _batch_label(workspace_b, workspace_a, "b")
    fits_a = load_fits(workspace_a, label_a)
    fits_b = load_fits(workspace_b, label_b)
    traces_a = load_traces(workspace_a, label_a)
    traces_b = load_traces(workspace_b, label_b)
    bridge: IntensityBridge | None = None
    scale_a: ControlScale | None = None
    scale_b: ControlScale | None = None
    if control_a is not None and control_b is not None:
        scale_a = _control_values(fits_a, control_a, label_a)
        scale_b = _control_values(fits_b, control_b, label_b)
        bridge = bridge_onto(scale_a, scale_b)
    write_comparison(
        out,
        fits_a,
        fits_b,
        traces_a,
        traces_b,
        bridge,
        control_a=scale_a,
        control_b=scale_b,
        control_name_a=control_a,
        control_name_b=control_b,
    )
    return bridge


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Compare two finished transfection workspaces. "
            "Harmonize only when you pass the shared expressing sample in each."
        )
    )
    parser.add_argument(
        "workspace_a",
        type=Path,
        help="Workspace whose intensity scale is kept",
    )
    parser.add_argument(
        "workspace_b",
        type=Path,
        help="Workspace to compare, and to rescale",
    )
    parser.add_argument(
        "--out",
        type=Path,
        required=True,
        help="Directory for the comparison tables",
    )
    parser.add_argument(
        "--control-a",
        default=None,
        help="Expressing sample name in workspace A",
    )
    parser.add_argument(
        "--control-b",
        default=None,
        help="The same sample's name in workspace B",
    )
    args = parser.parse_args(argv)
    try:
        bridge = compare(
            args.workspace_a,
            args.workspace_b,
            args.out,
            control_a=args.control_a,
            control_b=args.control_b,
        )
    except BridgeError as error:
        print(str(error), file=sys.stderr)
        return 1
    if bridge is None:
        print(f"wrote an unscaled comparison to {args.out}")
    else:
        print(
            f"wrote a comparison to {args.out} "
            f"(gain {bridge.gain:.6g}, offset {bridge.offset:.6g})"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
