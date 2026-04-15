from __future__ import annotations

import csv
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image

from lisca.acdc import convert_viewer_source_to_cell_acdc, parse_position_dir_name, parse_source_filename


def write_grayscale_image(path: Path, value: int, *, shape: tuple[int, int] = (4, 5)) -> None:
    array = np.full(shape, value, dtype=np.uint8)
    Image.fromarray(array).save(path)


def populate_source_position(pos_dir: Path, *, times: list[int], channels: list[str], z_values: list[int]) -> None:
    pos_dir.mkdir(parents=True, exist_ok=True)
    for time in times:
        for channel_index, channel in enumerate(channels):
            for z in z_values:
                value = time * 20 + channel_index * 5 + z
                write_grayscale_image(pos_dir / f"img_{time:09d}_{channel}_{z:03d}.png", value)


def read_metadata_csv(path: Path) -> dict[str, str]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return {row["Description"]: row["values"] for row in reader}


def test_parse_position_dir_name_accepts_pos_and_position_variants() -> None:
    assert parse_position_dir_name("Pos18") == 18
    assert parse_position_dir_name("Position_18") == 18
    assert parse_position_dir_name("18") == 18
    assert parse_position_dir_name("notes") is None


def test_parse_source_filename_reads_time_channel_and_z() -> None:
    parsed = parse_source_filename(Path("img_000000123_Durchlicht_007.jpg"))

    assert parsed is not None
    assert parsed.time == 123
    assert parsed.channel == "Durchlicht"
    assert parsed.z == 7


def test_convert_single_position_writes_cell_acdc_layout(tmp_path: Path) -> None:
    source_pos = tmp_path / "raw" / "Pos18"
    populate_source_position(source_pos, times=[0, 1, 2], channels=["Durchlicht", "TexRed"], z_values=[0])

    output_root = tmp_path / "cell_acdc"
    summary = convert_viewer_source_to_cell_acdc(source_pos, output_root)

    assert len(summary.converted_positions) == 1
    images_dir = output_root / "Position_18" / "Images"
    assert images_dir.is_dir()

    metadata_path = images_dir / "cell_acdc_s18_metadata.csv"
    durchlicht_path = images_dir / "cell_acdc_s18_Durchlicht.tif"
    texred_path = images_dir / "cell_acdc_s18_TexRed.tif"

    assert metadata_path.is_file()
    assert durchlicht_path.is_file()
    assert texred_path.is_file()

    metadata = read_metadata_csv(metadata_path)
    assert metadata["basename"] == "cell_acdc_s18_"
    assert metadata["channel_0_name"] == "Durchlicht"
    assert metadata["channel_1_name"] == "TexRed"
    assert metadata["SizeT"] == "3"
    assert metadata["SizeZ"] == "1"
    assert metadata["SizeY"] == "4"
    assert metadata["SizeX"] == "5"

    durchlicht = tifffile.imread(durchlicht_path)
    texred = tifffile.imread(texred_path)
    assert durchlicht.shape == (3, 4, 5)
    assert texred.shape == (3, 4, 5)
    assert int(durchlicht[2, 0, 0]) == 40
    assert int(texred[2, 0, 0]) == 45


def test_convert_raw_root_preserves_multiple_position_ids(tmp_path: Path) -> None:
    source_root = tmp_path / "raw"
    populate_source_position(source_root / "Pos18", times=[0, 1], channels=["Durchlicht", "TexRed"], z_values=[0])
    populate_source_position(source_root / "Pos21", times=[0, 1], channels=["Durchlicht", "TexRed"], z_values=[0])

    summary = convert_viewer_source_to_cell_acdc(source_root, tmp_path / "cell_acdc")

    assert [position.position for position in summary.converted_positions] == [18, 21]
    assert (tmp_path / "cell_acdc" / "Position_18" / "Images" / "cell_acdc_s18_Durchlicht.tif").is_file()
    assert (tmp_path / "cell_acdc" / "Position_21" / "Images" / "cell_acdc_s21_TexRed.tif").is_file()


def test_convert_multi_z_position_writes_tczyx_as_tzyx_stack(tmp_path: Path) -> None:
    source_pos = tmp_path / "raw" / "Pos3"
    populate_source_position(source_pos, times=[0, 1], channels=["Durchlicht"], z_values=[0, 1])

    convert_viewer_source_to_cell_acdc(source_pos, tmp_path / "cell_acdc")

    stack = tifffile.imread(tmp_path / "cell_acdc" / "Position_3" / "Images" / "cell_acdc_s3_Durchlicht.tif")
    assert stack.shape == (2, 2, 4, 5)
    assert int(stack[0, 0, 0, 0]) == 0
    assert int(stack[0, 1, 0, 0]) == 1
    assert int(stack[1, 0, 0, 0]) == 20
