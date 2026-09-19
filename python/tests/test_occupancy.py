from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from lisca.core.occupancy import (
    append_occupancy_examples,
    build_occupancy_pack,
    embed_occupancy_crop,
    merge_occupancy_packs,
    occupancy_exclude_score,
    pack_counts,
    pack_gate_message,
    pack_is_ready,
    save_occupancy_pack,
    score_embedding_against_pack,
    should_exclude_score,
)
from lisca.core.paths import occupancy_pack_path


def _blob_crop(size: int = 32) -> np.ndarray:
    yy, xx = np.mgrid[0:size, 0:size]
    center = (yy - size / 2) ** 2 + (xx - size / 2) ** 2
    return np.where(center < (size / 4) ** 2, 200, 20).astype(np.float64)


def _empty_crop(size: int = 32) -> np.ndarray:
    return np.full((size, size), 40.0)


def test_few_shot_separates_occupied_from_empty() -> None:
    occupied = embed_occupancy_crop(_blob_crop())
    empty = embed_occupancy_crop(_empty_crop())
    pack = build_occupancy_pack([occupied], [empty])
    occupied_query = embed_occupancy_crop(_blob_crop(36) + 5)
    empty_query = embed_occupancy_crop(_empty_crop(36) + 3)
    occupied_score = score_embedding_against_pack(occupied_query, pack)
    empty_score = score_embedding_against_pack(empty_query, pack)
    assert empty_score > occupied_score
    assert should_exclude_score(empty_score, pack)
    assert not should_exclude_score(occupied_score, pack)


def test_exclude_score_positive_when_closer_to_empty() -> None:
    occupied = [1.0, 0.0]
    empty = [0.0, 1.0]
    query = [0.1, 0.9]
    assert occupancy_exclude_score(query, occupied, empty) > 0


def test_save_and_load_occupancy_pack(tmp_path: Path) -> None:
    pack = build_occupancy_pack(
        [embed_occupancy_crop(_blob_crop())],
        [embed_occupancy_crop(_empty_crop())],
    )
    path = save_occupancy_pack(tmp_path, pack)
    assert path == occupancy_pack_path(tmp_path)
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "lisca-occupancy-v0" in text
    assert "occupied" in text
    assert "empty" in text


def test_pack_gate_requires_two_of_each_class() -> None:
    one_each = build_occupancy_pack(
        [embed_occupancy_crop(_blob_crop())],
        [embed_occupancy_crop(_empty_crop())],
    )
    assert pack_counts(one_each) == (1, 1)
    assert not pack_is_ready(one_each)
    assert "Not ready yet" in pack_gate_message(one_each)
    ready = build_occupancy_pack(
        [embed_occupancy_crop(_blob_crop()), embed_occupancy_crop(_blob_crop(36))],
        [embed_occupancy_crop(_empty_crop()), embed_occupancy_crop(_empty_crop(36))],
    )
    assert pack_is_ready(ready)
    assert "Prompt pack ready" in pack_gate_message(ready)


def test_append_accumulates_and_replaces_same_site(tmp_path: Path) -> None:
    occupied = embed_occupancy_crop(_blob_crop())
    empty = embed_occupancy_crop(_empty_crop())
    first = append_occupancy_examples(
        tmp_path,
        [occupied],
        [],
        occupied_meta=[{"i": 0, "j": 0, "pos": 1}],
    )
    assert pack_counts(first) == (1, 0)
    second = append_occupancy_examples(
        tmp_path,
        [],
        [empty],
        empty_meta=[{"i": 1, "j": 1, "pos": 1}],
    )
    assert pack_counts(second) == (1, 1)
    flipped = append_occupancy_examples(
        tmp_path,
        [],
        [empty],
        empty_meta=[{"i": 0, "j": 0, "pos": 1}],
    )
    occupied_count, empty_count = pack_counts(flipped)
    assert occupied_count == 0
    assert empty_count == 2


def test_merge_keeps_anonymous_crops() -> None:
    base = build_occupancy_pack([embed_occupancy_crop(_blob_crop())], [])
    extra = build_occupancy_pack([], [embed_occupancy_crop(_empty_crop())])
    merged = merge_occupancy_packs(base, extra)
    assert pack_counts(merged) == (1, 1)


def test_cli_record_then_status(tmp_path: Path) -> None:
    occupied_path = tmp_path / "occupied.png"
    empty_path = tmp_path / "empty.png"
    Image.fromarray(_blob_crop().astype(np.uint8)).save(occupied_path)
    Image.fromarray(_empty_crop().astype(np.uint8)).save(empty_path)
    pack = append_occupancy_examples(
        tmp_path,
        [embed_occupancy_crop(_blob_crop())],
        [embed_occupancy_crop(_empty_crop())],
    )
    assert occupancy_pack_path(tmp_path).is_file()
    assert not pack_is_ready(pack)
