from __future__ import annotations

from pathlib import Path

import pytest

from lisca.data.slide import (
    SlideChannelMapping,
    load_slide_mapping,
    parse_position_spec,
    parse_position_token,
    resolve_slide_path,
    serialize_slide_mapping,
    validate_slide_mapping,
    write_slide_mapping,
)


def test_parse_position_spec_supports_integers_and_slices() -> None:
    assert parse_position_spec("0,2,12:19:2") == [0, 2, 12, 14, 16, 18]


def test_parse_position_spec_deduplicates_and_sorts() -> None:
    assert parse_position_spec("5,1,1,3:7:2") == [1, 3, 5]


def test_parse_position_spec_rejects_empty() -> None:
    with pytest.raises(ValueError, match="Position spec is empty"):
        parse_position_spec("   ")


def test_parse_position_spec_rejects_empty_token() -> None:
    with pytest.raises(ValueError, match="empty token"):
        parse_position_spec("0,,2")


def test_parse_position_token_rejects_invalid_slice() -> None:
    with pytest.raises(ValueError, match="explicit start and stop"):
        parse_position_token(":10")


def test_parse_position_token_rejects_non_positive_step() -> None:
    with pytest.raises(ValueError, match="step must be > 0"):
        parse_position_token("0:10:0")


def test_parse_position_token_rejects_empty_slice_result() -> None:
    with pytest.raises(ValueError, match="produced no positions"):
        parse_position_token("10:0:2")


def test_resolve_slide_path_defaults_to_dataset_root_slide_json(tmp_path: Path) -> None:
    assert resolve_slide_path(tmp_path, None) == (tmp_path / "slide.json").resolve()


def test_validate_slide_mapping_orders_keys_and_deduplicates_positions() -> None:
    validated = validate_slide_mapping(
        {
            "2": {"positions": [10, 12, 10], "image_channel": 1},
            "0": {"positions": [2, 0], "image_channel": 0},
        }
    )

    assert validated == {
        0: SlideChannelMapping(positions=[0, 2], image_channel=0),
        2: SlideChannelMapping(positions=[10, 12], image_channel=1),
    }


def test_serialize_slide_mapping_orders_numeric_keys() -> None:
    serialized = serialize_slide_mapping(
        {
            2: SlideChannelMapping(positions=[10, 12], image_channel=1),
            0: SlideChannelMapping(positions=[0, 2], image_channel=0),
        }
    )

    assert serialized == (
        '{\n'
        '  "0": {\n'
        '    "positions": [\n'
        '      0,\n'
        '      2\n'
        '    ],\n'
        '    "image_channel": 0\n'
        '  },\n'
        '  "2": {\n'
        '    "positions": [\n'
        '      10,\n'
        '      12\n'
        '    ],\n'
        '    "image_channel": 1\n'
        '  }\n'
        '}\n'
    )


def test_write_slide_mapping_writes_json(tmp_path: Path) -> None:
    output_path = write_slide_mapping(
        {1: SlideChannelMapping(positions=[4, 6, 8], image_channel=2)},
        tmp_path / "nested" / "slide.json",
    )

    assert output_path.is_file()
    assert output_path.read_text(encoding="utf-8") == (
        '{\n'
        '  "1": {\n'
        '    "positions": [\n'
        '      4,\n'
        '      6,\n'
        '      8\n'
        '    ],\n'
        '    "image_channel": 2\n'
        '  }\n'
        '}\n'
    )


def test_load_slide_mapping_reads_valid_json(tmp_path: Path) -> None:
    slide_path = tmp_path / "slide.json"
    slide_path.write_text(
        '{\n  "1": {\n    "positions": [4, 6, 8],\n    "image_channel": 2\n  }\n}\n',
        encoding="utf-8",
    )

    assert load_slide_mapping(slide_path) == {
        1: SlideChannelMapping(positions=[4, 6, 8], image_channel=2)
    }


def test_validate_slide_mapping_rejects_missing_positions() -> None:
    with pytest.raises(ValueError, match="missing required field 'positions'"):
        validate_slide_mapping({"0": {"image_channel": 1}})


def test_validate_slide_mapping_rejects_missing_image_channel() -> None:
    with pytest.raises(ValueError, match="missing required field 'image_channel'"):
        validate_slide_mapping({"0": {"positions": [1, 2]}})


def test_validate_slide_mapping_rejects_non_list_positions() -> None:
    with pytest.raises(ValueError, match="positions must be lists"):
        validate_slide_mapping({"0": {"positions": "1,2", "image_channel": 1}})


def test_validate_slide_mapping_rejects_non_integer_image_channel() -> None:
    with pytest.raises(ValueError, match="image_channel.*must be an integer"):
        validate_slide_mapping({"0": {"positions": [1, 2], "image_channel": "1"}})


def test_validate_slide_mapping_rejects_negative_values() -> None:
    with pytest.raises(ValueError, match="Slide image_channel must be non-negative"):
        validate_slide_mapping({"0": {"positions": [1, 2], "image_channel": -1}})

    with pytest.raises(ValueError, match="Slide positions must be non-negative"):
        validate_slide_mapping({"0": {"positions": [1, -2], "image_channel": 1}})
