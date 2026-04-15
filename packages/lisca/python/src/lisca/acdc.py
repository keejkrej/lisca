from __future__ import annotations

import argparse
import csv
import re
import shutil
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image


SUPPORTED_SOURCE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff"}
SOURCE_FILE_RE = re.compile(r"^img_(\d+)_(.+)_(\d+)$", re.IGNORECASE)


@dataclass(frozen=True)
class SourceImageFile:
    path: Path
    time: int
    channel: str
    z: int


@dataclass(frozen=True)
class ConvertedPosition:
    source_dir: Path
    position: int
    channel_names: tuple[str, ...]
    time_count: int
    z_count: int
    images_dir: Path
    metadata_csv_path: Path
    stack_paths: tuple[Path, ...]


@dataclass(frozen=True)
class ConversionSummary:
    output_root: Path
    converted_positions: tuple[ConvertedPosition, ...]
    dry_run: bool


def parse_position_dir_name(name: str) -> int | None:
    normalized = "".join(name.split())
    if not normalized:
        return None

    lower = normalized.lower()
    for prefix in ("position", "pos"):
        if lower.startswith(prefix):
            remainder = lower[len(prefix) :].lstrip("-_")
            if remainder and remainder.isdigit():
                return int(remainder)

    if lower.isdigit():
        return int(lower)
    return None


def parse_source_filename(path: Path) -> SourceImageFile | None:
    if path.suffix.lower() not in SUPPORTED_SOURCE_EXTENSIONS:
        return None

    match = SOURCE_FILE_RE.match(path.stem)
    if match is None:
        return None

    return SourceImageFile(
        path=path.resolve(),
        time=int(match.group(1)),
        channel=match.group(2),
        z=int(match.group(3)),
    )


def resolve_input_positions(input_path: Path, *, positions: list[str] | None = None) -> list[tuple[int, Path]]:
    input_path = input_path.expanduser().resolve()
    if not input_path.exists():
        raise ValueError(f"Input path does not exist: {input_path}")

    requested_positions = None if positions is None else {parse_requested_position(value) for value in positions}

    parsed_input_pos = parse_position_dir_name(input_path.name) if input_path.is_dir() else None
    if parsed_input_pos is not None:
        discovered = [(parsed_input_pos, input_path)]
    else:
        discovered = sorted(
            (
                (parsed_pos, child.resolve())
                for child in input_path.iterdir()
                if child.is_dir()
                for parsed_pos in [parse_position_dir_name(child.name)]
                if parsed_pos is not None
            ),
            key=lambda item: item[0],
        )

    if not discovered:
        raise ValueError(f"No source position folders found under {input_path}")

    if requested_positions is None:
        return discovered

    filtered = [item for item in discovered if item[0] in requested_positions]
    missing = sorted(requested_positions - {pos for pos, _ in discovered})
    if missing:
        missing_label = ", ".join(f"Pos{value}" for value in missing)
        raise ValueError(f"Requested positions not found under {input_path}: {missing_label}")
    return filtered


def parse_requested_position(value: str) -> int:
    parsed = parse_position_dir_name(value)
    if parsed is None:
        raise ValueError(f"Invalid position selector: {value!r}")
    return parsed


def scan_position_files(pos_dir: Path) -> list[SourceImageFile]:
    files = [
        parsed
        for child in sorted(pos_dir.iterdir())
        if child.is_file()
        for parsed in [parse_source_filename(child)]
        if parsed is not None
    ]
    if not files:
        raise ValueError(f"No supported source images found in {pos_dir}")
    return files


def group_position_files(files: list[SourceImageFile]) -> tuple[list[str], list[int], list[int], dict[str, dict[int, dict[int, Path]]]]:
    grouped: dict[str, dict[int, dict[int, Path]]] = {}
    channels: set[str] = set()
    times: set[int] = set()
    z_values: set[int] = set()

    for item in files:
        channel_bucket = grouped.setdefault(item.channel, {})
        time_bucket = channel_bucket.setdefault(item.time, {})
        if item.z in time_bucket:
            raise ValueError(
                f"Duplicate source image for channel={item.channel!r}, time={item.time}, z={item.z}: {item.path}"
            )
        time_bucket[item.z] = item.path
        channels.add(item.channel)
        times.add(item.time)
        z_values.add(item.z)

    sorted_channels = sorted(channels)
    sorted_times = sorted(times)
    sorted_z_values = sorted(z_values)
    return sorted_channels, sorted_times, sorted_z_values, grouped


def validate_grouped_files(
    pos_dir: Path,
    *,
    channels: list[str],
    times: list[int],
    z_values: list[int],
    grouped: dict[str, dict[int, dict[int, Path]]],
) -> None:
    expected_times = list(range(times[0], times[-1] + 1))
    if times != expected_times:
        raise ValueError(
            f"{pos_dir} has non-contiguous time indices: expected {expected_times[0]}..{expected_times[-1]}, got {times}"
        )

    for channel in channels:
        channel_times = sorted(grouped[channel])
        if channel_times != times:
            raise ValueError(
                f"{pos_dir} channel {channel!r} has inconsistent time indices: expected {times}, got {channel_times}"
            )
        for time in times:
            channel_z_values = sorted(grouped[channel][time])
            if channel_z_values != z_values:
                raise ValueError(
                    f"{pos_dir} channel {channel!r} at time {time} has inconsistent z indices: "
                    f"expected {z_values}, got {channel_z_values}"
                )


def load_image_array(path: Path) -> np.ndarray:
    with Image.open(path) as image:
        array = np.asarray(image)
        if array.ndim == 2:
            return array

        if array.ndim == 3 and array.shape[2] in {3, 4}:
            rgb = array[:, :, :3]
            if np.array_equal(rgb[:, :, 0], rgb[:, :, 1]) and np.array_equal(rgb[:, :, 1], rgb[:, :, 2]):
                return rgb[:, :, 0]

            grayscale = np.asarray(image.convert("L"))
            return grayscale

    raise ValueError(f"Unsupported source image shape for {path}: {array.shape}")


def build_channel_stack(
    pos_dir: Path,
    *,
    channel: str,
    times: list[int],
    z_values: list[int],
    grouped: dict[str, dict[int, dict[int, Path]]],
) -> np.ndarray:
    stack_by_time: list[np.ndarray] = []
    expected_shape: tuple[int, int] | None = None

    for time in times:
        z_planes: list[np.ndarray] = []
        for z in z_values:
            image = load_image_array(grouped[channel][time][z])
            if expected_shape is None:
                expected_shape = image.shape
            elif image.shape != expected_shape:
                raise ValueError(
                    f"{pos_dir} has inconsistent frame sizes for channel {channel!r}: "
                    f"expected {expected_shape}, got {image.shape}"
                )
            z_planes.append(image)

        if len(z_planes) == 1:
            stack_by_time.append(z_planes[0])
        else:
            stack_by_time.append(np.stack(z_planes, axis=0))

    return np.stack(stack_by_time, axis=0)


def output_basename(output_root: Path, position: int) -> str:
    root_name = output_root.name or "cell_acdc"
    return f"{root_name}_s{position}_"


def metadata_rows(
    *,
    basename: str,
    channel_names: list[str],
    stack_shape: tuple[int, ...],
) -> list[tuple[str, str]]:
    size_t = stack_shape[0]
    if len(stack_shape) == 3:
        size_z = 1
        size_y, size_x = stack_shape[1:]
    elif len(stack_shape) == 4:
        size_z = stack_shape[1]
        size_y, size_x = stack_shape[2:]
    else:
        raise ValueError(f"Unsupported stack shape for metadata: {stack_shape}")

    rows = [
        ("basename", basename),
        ("SizeT", str(size_t)),
        ("SizeZ", str(size_z)),
        ("SizeY", str(size_y)),
        ("SizeX", str(size_x)),
    ]
    rows.extend((f"channel_{index}_name", channel_name) for index, channel_name in enumerate(channel_names))
    return rows


def write_metadata_csv(metadata_csv_path: Path, rows: list[tuple[str, str]]) -> None:
    metadata_csv_path.parent.mkdir(parents=True, exist_ok=True)
    with metadata_csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["Description", "values"])
        writer.writerows(rows)


def convert_position(
    pos_dir: Path,
    *,
    position: int,
    output_root: Path,
    overwrite: bool,
    dry_run: bool,
) -> ConvertedPosition:
    files = scan_position_files(pos_dir)
    channels, times, z_values, grouped = group_position_files(files)
    validate_grouped_files(pos_dir, channels=channels, times=times, z_values=z_values, grouped=grouped)

    position_dir = output_root / f"Position_{position}"
    images_dir = position_dir / "Images"
    basename = output_basename(output_root, position)

    reference_stack = build_channel_stack(pos_dir, channel=channels[0], times=times, z_values=z_values, grouped=grouped)
    stack_paths = tuple(images_dir / f"{basename}{channel}.tif" for channel in channels)
    metadata_csv_path = images_dir / f"{basename}metadata.csv"

    if not dry_run:
        if position_dir.exists():
            if not overwrite:
                raise ValueError(f"Output position already exists: {position_dir}")
            shutil.rmtree(position_dir)
        images_dir.mkdir(parents=True, exist_ok=True)

        for channel, stack_path in zip(channels, stack_paths, strict=True):
            stack = reference_stack if channel == channels[0] else build_channel_stack(
                pos_dir, channel=channel, times=times, z_values=z_values, grouped=grouped
            )
            tifffile.imwrite(stack_path, stack, photometric="minisblack")

        write_metadata_csv(
            metadata_csv_path,
            metadata_rows(basename=basename, channel_names=channels, stack_shape=reference_stack.shape),
        )

    return ConvertedPosition(
        source_dir=pos_dir,
        position=position,
        channel_names=tuple(channels),
        time_count=len(times),
        z_count=len(z_values),
        images_dir=images_dir.resolve(),
        metadata_csv_path=metadata_csv_path.resolve(),
        stack_paths=tuple(path.resolve() for path in stack_paths),
    )


def convert_viewer_source_to_cell_acdc(
    input_path: Path,
    output_root: Path,
    *,
    positions: list[str] | None = None,
    overwrite: bool = False,
    dry_run: bool = False,
) -> ConversionSummary:
    resolved_output_root = output_root.expanduser().resolve()
    discovered_positions = resolve_input_positions(input_path, positions=positions)
    converted = [
        convert_position(
            pos_dir,
            position=position,
            output_root=resolved_output_root,
            overwrite=overwrite,
            dry_run=dry_run,
        )
        for position, pos_dir in discovered_positions
    ]
    return ConversionSummary(
        output_root=resolved_output_root,
        converted_positions=tuple(converted),
        dry_run=dry_run,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="lisca2acdc",
        description=(
            "Convert viewer-style PosN image folders named like "
            "'img_<time>_<channel>_<z>.<ext>' into a Cell-ACDC experiment layout."
        ),
    )
    parser.add_argument("input_path", type=Path, help="Source raw root or a single PosN folder.")
    parser.add_argument("output_root", type=Path, help="Cell-ACDC experiment output root.")
    parser.add_argument(
        "--position",
        dest="positions",
        action="append",
        default=None,
        help="Optional position selector such as Pos18, Position_18, or 18. May be repeated.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace existing Position_n output folders if they already exist.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and print the planned outputs without writing files.",
    )
    return parser


def format_summary(summary: ConversionSummary) -> str:
    lines = [f"Output root: {summary.output_root}"]
    if summary.dry_run:
        lines.append("Mode: dry-run")

    for position in summary.converted_positions:
        channels = ", ".join(position.channel_names)
        lines.append(
            f"Pos{position.position} -> Position_{position.position}/Images "
            f"(channels: {channels}; T={position.time_count}; Z={position.z_count})"
        )
    return "\n".join(lines)


def cli(
    input_path: Path,
    output_root: Path,
    *,
    positions: list[str] | None = None,
    overwrite: bool = False,
    dry_run: bool = False,
) -> ConversionSummary:
    return convert_viewer_source_to_cell_acdc(
        input_path,
        output_root,
        positions=positions,
        overwrite=overwrite,
        dry_run=dry_run,
    )


def main(argv: list[str] | None = None) -> None:
    args = build_parser().parse_args(argv)
    summary = cli(
        args.input_path,
        args.output_root,
        positions=args.positions,
        overwrite=args.overwrite,
        dry_run=args.dry_run,
    )
    print(format_summary(summary))


if __name__ == "__main__":
    main()
