"""Rewrite ``assay.json`` so Samples are identified by name.

Old shape::

    samples[]: {slideChannel, name, positions}
    analysis.channels: {mask, signal}
    analysis.sampleChannels[]: {slideChannel, mask, signal}

New shape::

    samples[]: {name, positions}
    analysis.channels: {segmentation, signal}
    analysis.sampleChannels[]: {sample, segmentation, signal}
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from lisca.core.paths import assay_json_path

_SLIDE_CHANNEL = "slideChannel"
_SAMPLE = "sample"
_MASK = "mask"
_SEGMENTATION = "segmentation"


def migrate_assay_samples_by_name(workspace: Path) -> list[str]:
    """Rewrite legacy ``assay.json`` sample keys. Returns rewritten paths."""
    path = assay_json_path(workspace)
    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8").lstrip("﻿"))
    if not isinstance(data, dict):
        return []

    changed = False
    names_by_slide_channel: dict[str, list[str]] = {}

    samples = data.get("samples")
    if isinstance(samples, list):
        changed |= _migrate_samples(path, samples, names_by_slide_channel)

    analysis = data.get("analysis")
    if isinstance(analysis, dict):
        channels = analysis.get("channels")
        if isinstance(channels, dict) and _needs_rename(
            path, "analysis.channels", channels, _MASK, _SEGMENTATION
        ):
            analysis["channels"] = _renamed(channels, _MASK, _SEGMENTATION)
            changed = True
        sample_channels = analysis.get("sampleChannels")
        if isinstance(sample_channels, list):
            for index, row in enumerate(sample_channels):
                if not isinstance(row, dict):
                    continue
                new_row = _migrate_sample_channels_row(
                    path, index, row, names_by_slide_channel
                )
                if new_row is not None:
                    sample_channels[index] = new_row
                    changed = True

    if not changed:
        return []
    _atomic_write_text(path, json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    return [str(path)]


def _migrate_samples(
    path: Path,
    samples: list[Any],
    names_by_slide_channel: dict[str, list[str]],
) -> bool:
    changed = False
    for row in samples:
        if not isinstance(row, dict) or _SLIDE_CHANNEL not in row:
            continue
        slide_channel = row.pop(_SLIDE_CHANNEL)
        name = row.get("name")
        if not isinstance(name, str) or not name.strip():
            row["name"] = f"Sample {slide_channel}"
        names_by_slide_channel.setdefault(_slide_key(slide_channel), []).append(
            row["name"]
        )
        changed = True
    if changed:
        _check_unique_names(path, samples)
    return changed


def _check_unique_names(path: Path, samples: list[Any]) -> None:
    seen: set[str] = set()
    duplicates: list[str] = []
    for row in samples:
        if not isinstance(row, dict):
            continue
        name = row.get("name")
        if not isinstance(name, str):
            continue
        trimmed = name.strip()
        if trimmed in seen and trimmed not in duplicates:
            duplicates.append(trimmed)
        seen.add(trimmed)
    if duplicates:
        listed = ", ".join(repr(name) for name in duplicates)
        raise ValueError(
            f"assay.json samples[] has duplicate sample names ({listed}); "
            f"rename them so each Sample name is unique: {path}"
        )


def _migrate_sample_channels_row(
    path: Path,
    index: int,
    row: dict[Any, Any],
    names_by_slide_channel: dict[str, list[str]],
) -> dict[Any, Any] | None:
    where = f"analysis.sampleChannels[{index}]"
    changed = False
    if _needs_rename(path, where, row, _MASK, _SEGMENTATION):
        row = _renamed(row, _MASK, _SEGMENTATION)
        changed = True
    if _needs_rename(path, where, row, _SLIDE_CHANNEL, _SAMPLE):
        slide_channel = row[_SLIDE_CHANNEL]
        names = names_by_slide_channel.get(_slide_key(slide_channel), [])
        if not names:
            raise ValueError(
                f"assay.json {where}: slideChannel {slide_channel!r} matches "
                f"no samples[] row: {path}"
            )
        if len(names) > 1:
            listed = ", ".join(repr(name) for name in names)
            raise ValueError(
                f"assay.json {where}: slideChannel {slide_channel!r} matches "
                f"several samples ({listed}): {path}"
            )
        row = _renamed(row, _SLIDE_CHANNEL, _SAMPLE)
        row[_SAMPLE] = names[0]
        changed = True
    return row if changed else None


def _needs_rename(
    path: Path, where: str, obj: dict[Any, Any], old: str, new: str
) -> bool:
    """Return True when ``old`` must become ``new``; error if both are present."""
    if old not in obj:
        return False
    if new in obj:
        raise ValueError(f"assay.json {where} has both `{old}` and `{new}`: {path}")
    return True


def _renamed(obj: dict[Any, Any], old: str, new: str) -> dict[Any, Any]:
    """Copy ``obj`` with key ``old`` renamed to ``new`` in the same position."""
    return {(new if key == old else key): value for key, value in obj.items()}


def _slide_key(slide_channel: Any) -> str:
    return json.dumps(slide_channel, sort_keys=True)


def _atomic_write_text(path: Path, text: str) -> None:
    fd, tmp_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(text)
            handle.flush()
        os.replace(tmp_path, path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise
