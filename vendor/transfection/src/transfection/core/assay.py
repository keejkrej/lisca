"""Workspace `assay.json` — single config for the transfection pipeline.

Schema matches LiSCA Studio / `@lisca/contracts` (`AssayJsonFile`). Agents write
this file directly; there is no generator CLI in this package. See `AGENTS.md`.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from transfection.core.slide import (
    SlideChannelMapping,
    SlideMapping,
    parse_position_spec,
    validate_slide_mapping,
)

ASSAY_FILENAME = "assay.json"
# Defaults when assay.json omits fields (transfection assay only — this package).
DEFAULT_INTERVAL_MINUTES = 10.0
# Second-pass onset-time (t0) search cap (minutes). Explicit 0 still means onset fixed at 0.
# Basic translation–degradation model only (no protein maturation).
DEFAULT_MAX_ONSET_MINUTES = 120.0


MISSING_SAMPLES_FOR_PLOT = (
    "plot/results stages require assay.json samples[] with a non-empty name "
    "to group analysis/ into results/<sample>/. timeseries, auc, and fit do not "
    "need sample names (they write analysis/PosN/*.csv from roi/ + analysis.channels)."
)


@dataclass(frozen=True)
class AssayConfig:
    path: Path
    assay_type: str
    name: str
    data_path: str
    mapping: SlideMapping
    mask_channel: int
    signal_channels: tuple[int, ...]
    interval_minutes: float | None
    max_onset_minutes: float
    skip_segment: bool


def resolve_assay_path(workspace: Path, assay: Path | None = None) -> Path:
    if assay is None:
        return (workspace / ASSAY_FILENAME).resolve()
    return assay.expanduser().resolve()


def load_assay(path: Path | str) -> AssayConfig:
    path = Path(path).expanduser().resolve()
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ValueError(f"missing assay.json at {path}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid assay.json {path}: {exc}") from exc
    if not isinstance(raw, dict):
        raise ValueError(f"assay.json must be a JSON object: {path}")
    return _parse_assay(raw, path=path)


def load_assay_for_workspace(workspace: Path, assay: Path | None = None) -> AssayConfig:
    return load_assay(resolve_assay_path(workspace, assay))


def build_slide_mapping_from_assay(
    samples: list[Any],
    analysis: dict[str, Any] | None,
    *,
    source: Path | str,
) -> SlideMapping:
    if not isinstance(samples, list):
        raise ValueError(f"{source}: samples must be an array")

    default_mask, default_signal = _parse_default_channels(analysis, source=source)
    overrides = _parse_sample_channel_overrides(analysis, source=source)

    mapping: SlideMapping = {}
    for index, row in enumerate(samples):
        if not isinstance(row, dict):
            raise ValueError(f"{source}: samples[{index}] must be an object")

        sample_name = str(row.get("name", "")).strip()

        slide_channel = _require_nonneg_int_field(
            row, "slideChannel", source=source, index=index, where="samples"
        )
        if slide_channel in overrides:
            mask_channel, signal_channels = overrides[slide_channel]
        elif default_mask is not None and default_signal is not None:
            mask_channel, signal_channels = default_mask, default_signal
        else:
            raise ValueError(
                f"{source}: missing analysis.channels (and no sampleChannels override) "
                f"for samples[{index}] slideChannel {slide_channel}"
            )

        positions_raw = row.get("positions")
        if positions_raw is None or str(positions_raw).strip() == "":
            raise ValueError(f"{source}: samples[{index}] missing positions")
        try:
            positions = parse_position_spec(str(positions_raw))
        except ValueError as exc:
            raise ValueError(f"{source}: samples[{index}] positions: {exc}") from exc

        mapping[slide_channel] = SlideChannelMapping(
            positions=positions,
            signal_channels=list(signal_channels),
            mask_channel=mask_channel,
            sample_name=sample_name,
        )

    return validate_slide_mapping(mapping)


def build_slide_mapping_from_samples(samples: list[Any], *, source: Path | str) -> SlideMapping:
    """Deprecated alias — prefer :func:`build_slide_mapping_from_assay` with analysis."""
    return build_slide_mapping_from_assay(samples, analysis=None, source=source)


def parse_interval_minutes(amount: object, unit: object) -> float | None:
    if amount is None:
        return None
    try:
        value = float(amount)
    except (TypeError, ValueError):
        return None
    if value <= 0:
        return None
    unit_str = "minute" if unit is None else str(unit)
    factor = {
        "second": 1.0 / 60.0,
        "minute": 1.0,
        "hour": 60.0,
    }.get(unit_str)
    if factor is None:
        return None
    return value * factor


def require_interval_minutes(config: AssayConfig, *, override: float | None = None) -> float:
    if override is not None:
        if override <= 0:
            raise ValueError(f"--interval must be > 0, got {override}")
        return override
    if config.interval_minutes is None:
        raise ValueError(
            f"missing --interval and could not read a positive interval.value from {config.path}"
        )
    return config.interval_minutes


def resolve_interval_minutes(
    workspace: Path,
    *,
    assay: Path | None = None,
    override: float | None = None,
) -> float:
    """Interval from ``--interval`` or assay.json; errors if neither is available."""
    if override is not None:
        if override <= 0:
            raise ValueError(f"--interval must be > 0, got {override}")
        return override
    assay_path = resolve_assay_path(workspace, assay)
    if not assay_path.is_file():
        raise ValueError(
            f"missing --interval and no assay.json at {assay_path} "
            "(pass --interval when replotting a copied sample folder)"
        )
    return require_interval_minutes(load_assay(assay_path))


def named_sample_mapping(config: AssayConfig) -> SlideMapping:
    """Named ``samples[]`` rows only. Empty names are ignored (analysis still ran)."""
    return {
        slide_channel: entry
        for slide_channel, entry in config.mapping.items()
        if entry.sample_name
    }


def require_named_samples(config: AssayConfig) -> SlideMapping:
    """Plot/results grouping. Fails if no non-empty ``samples[].name``."""
    named = named_sample_mapping(config)
    if not named:
        raise ValueError(f"{config.path}: {MISSING_SAMPLES_FOR_PLOT}")
    return named


def _parse_assay(raw: dict[str, Any], *, path: Path) -> AssayConfig:
    assay_type = str(raw.get("type") or "").strip() or "unknown"
    name = str(raw.get("name") or "").strip() or assay_type

    data = raw.get("data") if isinstance(raw.get("data"), dict) else {}
    data_path = str(data.get("path") or "").strip() if isinstance(data, dict) else ""

    samples = raw.get("samples")
    analysis = raw.get("analysis") if isinstance(raw.get("analysis"), dict) else {}
    if samples is None:
        mapping = {}
    elif not isinstance(samples, list):
        raise ValueError(f"{path}: samples must be an array")
    elif not samples:
        mapping = {}
    else:
        mapping = build_slide_mapping_from_assay(
            samples, analysis if isinstance(analysis, dict) else None, source=path
        )

    default_mask, default_signal = _parse_default_channels(
        analysis if isinstance(analysis, dict) else None, source=path
    )
    if default_mask is None or default_signal is None:
        raise ValueError(f"{path}: missing analysis.channels")
    signal_channels = tuple(default_signal)
    extra_signals = _parse_sample_channel_overrides(
        analysis if isinstance(analysis, dict) else None, source=path
    )
    if extra_signals:
        merged = list(signal_channels)
        for _slide, (_mask, signals) in extra_signals.items():
            for channel in signals:
                if channel not in merged:
                    merged.append(channel)
        signal_channels = tuple(merged)

    interval_obj = raw.get("interval") if isinstance(raw.get("interval"), dict) else {}
    interval = parse_interval_minutes(
        interval_obj.get("value") if isinstance(interval_obj, dict) else None,
        interval_obj.get("unit") if isinstance(interval_obj, dict) else None,
    )
    if interval is None:
        interval = DEFAULT_INTERVAL_MINUTES

    max_onset = DEFAULT_MAX_ONSET_MINUTES
    if isinstance(analysis, dict) and analysis.get("maxOnsetMinutes") is not None:
        try:
            max_onset = float(analysis["maxOnsetMinutes"])
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{path}: analysis.maxOnsetMinutes must be a number") from exc
        if max_onset < 0:
            raise ValueError(f"{path}: analysis.maxOnsetMinutes must be >= 0")

    skip_segment = False
    if isinstance(analysis, dict) and analysis.get("skipSegment") is not None:
        skip_raw = analysis["skipSegment"]
        if not isinstance(skip_raw, bool):
            raise ValueError(f"{path}: analysis.skipSegment must be a boolean")
        skip_segment = skip_raw

    return AssayConfig(
        path=path,
        assay_type=assay_type,
        name=name,
        data_path=data_path,
        mapping=mapping,
        mask_channel=default_mask,
        signal_channels=signal_channels,
        interval_minutes=interval,
        max_onset_minutes=max_onset,
        skip_segment=skip_segment,
    )


def _parse_default_channels(
    analysis: dict[str, Any] | None,
    *,
    source: Path | str,
) -> tuple[int | None, list[int] | None]:
    if not isinstance(analysis, dict):
        return None, None
    channels = analysis.get("channels")
    if channels is None:
        return None, None
    if not isinstance(channels, dict):
        raise ValueError(f"{source}: analysis.channels must be an object")
    mask = _require_nonneg_int_value(channels.get("mask"), field="analysis.channels.mask", source=source)
    signal = _require_signal_list(channels.get("signal"), field="analysis.channels.signal", source=source)
    return mask, signal


def _parse_sample_channel_overrides(
    analysis: dict[str, Any] | None,
    *,
    source: Path | str,
) -> dict[int, tuple[int, list[int]]]:
    if not isinstance(analysis, dict):
        return {}
    rows = analysis.get("sampleChannels")
    if rows is None:
        return {}
    if not isinstance(rows, list):
        raise ValueError(f"{source}: analysis.sampleChannels must be an array")

    overrides: dict[int, tuple[int, list[int]]] = {}
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f"{source}: analysis.sampleChannels[{index}] must be an object")
        slide_channel = _require_nonneg_int_field(
            row, "slideChannel", source=source, index=index, where="analysis.sampleChannels"
        )
        mask = _require_nonneg_int_field(
            row, "mask", source=source, index=index, where="analysis.sampleChannels"
        )
        signal = _require_signal_list(
            row.get("signal"),
            field=f"analysis.sampleChannels[{index}].signal",
            source=source,
        )
        overrides[slide_channel] = (mask, signal)
    return overrides


def _require_signal_list(raw: object, *, field: str, source: Path | str) -> list[int]:
    if not isinstance(raw, list) or len(raw) == 0:
        raise ValueError(f"{source}: {field} must be a non-empty array of integers")
    values: list[int] = []
    for item in raw:
        try:
            value = int(item)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{source}: {field} must contain integers, got {item!r}") from exc
        if value < 0:
            raise ValueError(f"{source}: {field} values must be non-negative, got {value}")
        values.append(value)
    return values


def _require_nonneg_int_value(raw: object, *, field: str, source: Path | str) -> int:
    if raw is None:
        raise ValueError(f"{source}: missing {field}")
    try:
        value = int(raw) if not isinstance(raw, str) else int(raw.strip())
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{source}: {field} must be an integer, got {raw!r}") from exc
    if value < 0:
        raise ValueError(f"{source}: {field} must be non-negative, got {value}")
    return value


def _require_nonneg_int_field(
    row: dict[str, Any],
    field: str,
    *,
    source: Path | str,
    index: int,
    where: str,
) -> int:
    if field not in row:
        raise ValueError(f"{source}: {where}[{index}] missing {field}")
    return _require_nonneg_int_value(
        row[field],
        field=f"{where}[{index}].{field}",
        source=source,
    )
