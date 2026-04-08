from __future__ import annotations

from pathlib import Path

import pytest

from delivery import slide


def test_parse_position_spec_supports_integers_and_slices() -> None:
    assert slide.parse_position_spec("0,2,12:19:2") == [0, 2, 12, 14, 16, 18]


def test_parse_position_spec_deduplicates_and_sorts() -> None:
    assert slide.parse_position_spec("5,1,1,3:7:2") == [1, 3, 5]


def test_parse_position_spec_rejects_empty() -> None:
    with pytest.raises(ValueError, match="Position spec is empty"):
        slide.parse_position_spec("   ")


def test_parse_position_spec_rejects_empty_token() -> None:
    with pytest.raises(ValueError, match="empty token"):
        slide.parse_position_spec("0,,2")


def test_parse_position_token_rejects_invalid_slice() -> None:
    with pytest.raises(ValueError, match="explicit start and stop"):
        slide.parse_position_token(":10")


def test_parse_position_token_rejects_non_positive_step() -> None:
    with pytest.raises(ValueError, match="step must be > 0"):
        slide.parse_position_token("0:10:0")


def test_parse_position_token_rejects_empty_slice_result() -> None:
    with pytest.raises(ValueError, match="produced no positions"):
        slide.parse_position_token("10:0:2")


def test_resolve_output_path_defaults_to_dataset_root_slide_json(tmp_path: Path) -> None:
    assert slide.resolve_output_path(tmp_path, None) == (tmp_path / "slide.json").resolve()


def test_serialize_slide_mapping_orders_numeric_keys() -> None:
    serialized = slide.serialize_slide_mapping({2: [10, 12], 0: [0, 2]})

    assert serialized == '{\n  "0": [\n    0,\n    2\n  ],\n  "2": [\n    10,\n    12\n  ]\n}\n'


def test_write_slide_mapping_writes_json(tmp_path: Path) -> None:
    output_path = slide.write_slide_mapping({1: [4, 6, 8]}, tmp_path / "nested" / "slide.json")

    assert output_path.is_file()
    assert output_path.read_text(encoding="utf-8") == '{\n  "1": [\n    4,\n    6,\n    8\n  ]\n}\n'
