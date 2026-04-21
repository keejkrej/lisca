from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class SlideChannelMapping:
    positions: list[int]
    image_channel: int


type SlideMapping = dict[int, SlideChannelMapping]


def resolve_slide_path(dataset_root: Path, output: Path | None = None) -> Path:
    if output is None:
        return (dataset_root / "slide.json").resolve()
    return output.expanduser().resolve()


def parse_position_token(token: str) -> list[int]:
    raw = token.strip()
    if not raw:
        raise ValueError("Empty position token")

    if ":" not in raw:
        try:
            value = int(raw)
        except ValueError as exc:
            raise ValueError(f"Invalid position token: {raw!r}") from exc
        if value < 0:
            raise ValueError(f"Positions must be non-negative, got {value}")
        return [value]

    parts = [part.strip() for part in raw.split(":")]
    if len(parts) not in {2, 3}:
        raise ValueError(f"Invalid slice token: {raw!r}")
    if any(part == "" for part in parts[:2]):
        raise ValueError(f"Slices must include explicit start and stop: {raw!r}")

    try:
        start = int(parts[0])
        stop = int(parts[1])
        step = int(parts[2]) if len(parts) == 3 else 1
    except ValueError as exc:
        raise ValueError(f"Invalid slice token: {raw!r}") from exc

    if start < 0 or stop < 0:
        raise ValueError(f"Positions must be non-negative in slice {raw!r}")
    if step <= 0:
        raise ValueError(f"Slice step must be > 0 in {raw!r}")

    values = list(range(start, stop, step))
    if not values:
        raise ValueError(f"Slice produced no positions: {raw!r}")
    return values


def parse_position_spec(spec: str) -> list[int]:
    tokens = [token.strip() for token in spec.split(",")]
    if not any(tokens):
        raise ValueError("Position spec is empty")

    positions: list[int] = []
    for token in tokens:
        if not token:
            raise ValueError("Position spec contains an empty token")
        positions.extend(parse_position_token(token))

    return sorted(set(positions))


def validate_slide_mapping(raw: object, *, source: Path | None = None) -> SlideMapping:
    source_label = str(source) if source is not None else "slide mapping"
    if not isinstance(raw, dict):
        raise ValueError(f"Slide mapping must be a JSON object: {source_label}")

    slide_positions: SlideMapping = {}
    for raw_channel, raw_entry in raw.items():
        try:
            slide_channel = int(raw_channel)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"Slide channel keys must be non-negative integers, got {raw_channel!r}"
            ) from exc
        if slide_channel < 0:
            raise ValueError(f"Slide channel keys must be non-negative integers, got {raw_channel!r}")

        if isinstance(raw_entry, SlideChannelMapping):
            raw_positions = raw_entry.positions
            raw_image_channel = raw_entry.image_channel
        else:
            if not isinstance(raw_entry, dict):
                raise ValueError(
                    f"Slide channel entries must be objects, got {type(raw_entry).__name__} for {slide_channel}"
                )
            if "positions" not in raw_entry:
                raise ValueError(f"Slide channel {slide_channel} is missing required field 'positions'")
            if "image_channel" not in raw_entry:
                raise ValueError(
                    f"Slide channel {slide_channel} is missing required field 'image_channel'"
                )
            raw_positions = raw_entry["positions"]
            raw_image_channel = raw_entry["image_channel"]

        if not isinstance(raw_positions, list):
            raise ValueError(
                f"Slide channel positions must be lists, got {type(raw_positions).__name__} for {slide_channel}"
            )
        if not isinstance(raw_image_channel, int) or isinstance(raw_image_channel, bool):
            raise ValueError(
                f"Slide image_channel for channel {slide_channel} must be an integer, got {raw_image_channel!r}"
            )
        if raw_image_channel < 0:
            raise ValueError(f"Slide image_channel must be non-negative, got {raw_image_channel}")

        positions: list[int] = []
        for entry in raw_positions:
            if not isinstance(entry, int) or isinstance(entry, bool):
                raise ValueError(
                    f"Slide positions for channel {slide_channel} must be integers, got {entry!r}"
                )
            if entry < 0:
                raise ValueError(f"Slide positions must be non-negative, got {entry}")
            positions.append(entry)
        if not positions:
            raise ValueError(f"{source_label} defines no positions for slide channel {slide_channel}")
        slide_positions[slide_channel] = SlideChannelMapping(
            positions=sorted(set(positions)),
            image_channel=raw_image_channel,
        )

    if not slide_positions:
        raise ValueError(f"{source_label} defines no slide channels")
    return dict(sorted(slide_positions.items()))


def load_slide_mapping(slide_path: Path) -> SlideMapping:
    raw = json.loads(slide_path.read_text(encoding="utf-8"))
    return validate_slide_mapping(raw, source=slide_path)


def serialize_slide_mapping(mapping: SlideMapping) -> str:
    validated_mapping = validate_slide_mapping(mapping)
    ordered = {
        str(channel): {
            "positions": validated_mapping[channel].positions,
            "image_channel": validated_mapping[channel].image_channel,
        }
        for channel in sorted(validated_mapping)
    }
    return json.dumps(ordered, indent=2) + "\n"


def write_slide_mapping(mapping: SlideMapping, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(serialize_slide_mapping(mapping), encoding="utf-8")
    return output_path.resolve()
