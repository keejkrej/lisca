"""In-memory slide-channel mapping used by analysis stages.

Built from Studio `assay.json` (`samples[]` + `analysis.channels` /
`analysis.sampleChannels`). Position ranges use inclusive Studio semantics
(`1:12` → 1…12), matching `crates/lisca`.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SlideChannelMapping:
    positions: list[int]
    signal_channels: list[int]
    mask_channel: int
    sample_name: str


type SlideMapping = dict[int, SlideChannelMapping]


def parse_position_token(token: str) -> list[int]:
    """Expand one position token. Ranges are inclusive on both ends (`1:3` → 1,2,3)."""
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
    if stop < start:
        raise ValueError(f"Invalid empty position range: {raw!r}")

    values = list(range(start, stop + 1, step))
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


def validate_slide_mapping(mapping: SlideMapping) -> SlideMapping:
    if not mapping:
        raise ValueError("slide mapping defines no slide channels")
    ordered: SlideMapping = {}
    for slide_channel, entry in sorted(mapping.items()):
        if slide_channel < 0:
            raise ValueError(f"Slide channel keys must be non-negative, got {slide_channel}")
        if not entry.positions:
            raise ValueError(f"slide channel {slide_channel} defines no positions")
        if not entry.signal_channels:
            raise ValueError(f"slide channel {slide_channel}: signal channel list must be non-empty")
        for signal_channel in entry.signal_channels:
            if signal_channel < 0:
                raise ValueError(f"signal channel must be non-negative, got {signal_channel}")
        if entry.mask_channel < 0:
            raise ValueError(f"mask_channel must be non-negative, got {entry.mask_channel}")
        # Empty names are allowed for analysis (timeseries/auc/fit). Plot/results
        # stages reject them via require_named_samples.
        ordered[slide_channel] = SlideChannelMapping(
            positions=sorted(set(entry.positions)),
            signal_channels=list(entry.signal_channels),
            mask_channel=entry.mask_channel,
            sample_name=entry.sample_name.strip(),
        )
    return ordered
