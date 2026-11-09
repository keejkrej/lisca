"""Resolve Studio ``samples[].positions`` to ``bbox/Pos{n}`` file ids.

Version 1 stores 0-based indices into the source position list. Those indices
are not the folder number. ND2 and CZI file ids are the 0-based indices
themselves. A missing ``positionIndexVersion`` is the pre-0.5.1 encoding.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

from lisca.migrations import migrate_workspace

POSITION_INDEX_VERSION = 1
_PLACEHOLDER = re.compile(r"\{(?:p|position)\}")


@dataclass(frozen=True)
class AssayPositions:
    """Sample file ids in assay order, plus the image source they came from."""

    source: Path
    source_type: str
    samples: dict[str, list[int]]

    @property
    def file_positions(self) -> list[int]:
        seen: set[int] = set()
        ordered: list[int] = []
        for positions in self.samples.values():
            for position in positions:
                if position not in seen:
                    seen.add(position)
                    ordered.append(position)
        return ordered


def load_assay_positions(workspace: Path) -> AssayPositions:
    """Read ``assay.json`` and map each sample onto ``Pos{n}`` file ids."""
    workspace = Path(workspace).expanduser().resolve()
    migrate_workspace(workspace)
    path = workspace / "assay.json"
    if not path.is_file():
        raise FileNotFoundError(
            f"Missing {path}. Define the assay on Studio Metadata and save it."
        )
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{path} must contain a JSON object")

    source, source_type = _source(payload, path)
    samples = payload.get("samples")
    if not isinstance(samples, list) or not samples:
        raise ValueError(f"{path} has no samples. Name each sample on Studio Metadata.")
    ids = _catalog_ids(source, source_type, payload)
    version = _version(payload, path)

    resolved: dict[str, list[int]] = {}
    for index, row in enumerate(samples):
        if not isinstance(row, dict):
            raise ValueError(f"{path}: samples[{index}] must be an object")
        name = str(row.get("name", "")).strip()
        if not name:
            raise ValueError(f"{path}: samples[{index}] sample name must be non-empty")
        if name in resolved:
            raise ValueError(f"{path}: duplicate sample name {name!r}")
        raw = row.get("positions")
        if raw is None or str(raw).strip() == "":
            raise ValueError(f"{path}: samples[{index}] missing positions")
        numbers = _parse_positions(str(raw))
        resolved[name] = _resolve_numbers(
            numbers, version=version, kind=source_type, ids=ids, source=path
        )
    return AssayPositions(source=source, source_type=source_type, samples=resolved)


def _source(payload: dict[str, object], path: Path) -> tuple[Path, str]:
    data = payload.get("data")
    if not isinstance(data, dict):
        raise ValueError(f"{path} has no image source. Set it on Studio Metadata.")
    source_type = str(data.get("type") or "")
    raw_path = str(data.get("path") or "").strip()
    if source_type not in {"nd2", "czi", "folder"} or not raw_path:
        raise ValueError(f"{path} has no image source. Set it on Studio Metadata.")
    return Path(raw_path).expanduser(), source_type


def _version(payload: dict[str, object], path: Path) -> int | None:
    version = payload.get("positionIndexVersion")
    if version is None:
        return None
    if version == POSITION_INDEX_VERSION:
        return POSITION_INDEX_VERSION
    raise ValueError(f"{path}: unsupported positionIndexVersion {version!r}")


def _catalog_ids(
    source: Path, source_type: str, payload: dict[str, object]
) -> list[int] | None:
    if source_type == "folder":
        data = payload.get("data")
        template = data.get("template") if isinstance(data, dict) else None
        subfolder = ""
        if isinstance(template, dict):
            subfolder = str(template.get("subfolder") or "")
        return _folder_ids(source, subfolder)
    if not source.is_file():
        # ND2 and CZI file ids are the stored indices. Range checks need the file.
        return None
    from lisca.readers.session import open_reader

    info, _read, close = open_reader(source)
    try:
        return list(range(info.n_pos))
    finally:
        close()


def _folder_ids(root: Path, subfolder: str) -> list[int]:
    if not root.is_dir():
        raise FileNotFoundError(f"Source folder not found: {root}")
    match = _PLACEHOLDER.search(subfolder)
    if match is None:
        raise ValueError(
            f"Subfolder template {subfolder!r} has no {{p}} placeholder. "
            "Studio Metadata sets this pattern."
        )
    prefix = subfolder[: match.start()]
    suffix = subfolder[match.end() :]
    ids: list[int] = []
    for entry in root.iterdir():
        if not entry.is_dir():
            continue
        name = entry.name
        if not name.startswith(prefix):
            continue
        if suffix and not name.endswith(suffix):
            continue
        middle = name[len(prefix) : len(name) - len(suffix) if suffix else None]
        if middle.isdigit():
            ids.append(int(middle))
    if not ids:
        raise ValueError(f"No positions under {root} matched {subfolder!r}.")
    return sorted(set(ids))


def _parse_positions(raw: str) -> list[int]:
    collected: list[int] = []
    seen: set[int] = set()
    for token in raw.split(","):
        token = token.strip()
        if not token:
            continue
        parts = [part.strip() for part in token.split(":")]
        if len(parts) == 1:
            values = [_position_token(parts[0])]
        elif len(parts) == 2:
            start = _position_token(parts[0])
            stop = _position_token(parts[1])
            if stop < start:
                raise ValueError(f"invalid position range: {token}")
            values = list(range(start, stop + 1))
        else:
            raise ValueError(f"invalid position range: {token}")
        for value in values:
            if value not in seen:
                seen.add(value)
                collected.append(value)
    if not collected:
        raise ValueError("position list is empty")
    return collected


def _position_token(raw: str) -> int:
    try:
        value = int(raw)
    except ValueError as exc:
        raise ValueError(f"invalid position token: {raw!r}") from exc
    if value < 0:
        raise ValueError(f"Positions must be non-negative, got {value}")
    return value


def _resolve_numbers(
    numbers: list[int],
    *,
    version: int | None,
    kind: str,
    ids: list[int] | None,
    source: Path,
) -> list[int]:
    if ids is None:
        return list(numbers)
    id_at = {file_id: index for index, file_id in enumerate(ids)}
    resolved: list[int] = []
    seen: set[int] = set()
    for number in numbers:
        if version == POSITION_INDEX_VERSION:
            index = number
            if index >= len(ids):
                raise ValueError(
                    f"{source}: position {number} is not in this source "
                    f"({len(ids)} positions). Re-select positions on Metadata."
                )
        elif kind == "folder" and number in id_at:
            index = id_at[number]
        elif number < len(ids):
            index = number
        else:
            raise ValueError(
                f"{source}: position {number} is not in this source "
                f"({len(ids)} positions). Re-select positions on Metadata."
            )
        file_id = ids[index]
        if file_id not in seen:
            seen.add(file_id)
            resolved.append(file_id)
    return resolved
