from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

GRID_BOUNDS_EPSILON = 1e-6
MAX_ALIGN_GRID_RECTS = 8000

AlignGridShape = Literal["rect", "square", "hex"]


@dataclass(frozen=True)
class FrameBounds:
    width: int
    height: int


@dataclass(frozen=True)
class AlignGridState:
    enabled: bool
    shape: AlignGridShape
    tx: float
    ty: float
    rotation: float
    spacing_a: float
    spacing_b: float
    cell_width: float
    cell_height: float
    opacity: float = 0.35


@dataclass(frozen=True)
class CellCoord:
    i: int
    j: int


@dataclass(frozen=True)
class CellBox:
    i: int
    j: int
    x: int
    y: int
    w: int
    h: int


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def normalize_radians(value: float) -> float:
    normalized = (
        (((value + math.pi) % (math.pi * 2)) + math.pi * 2) % (math.pi * 2)
    ) - math.pi
    return normalized if math.isfinite(normalized) else 0.0


def minimum_align_grid_spacing(cell_width: float, cell_height: float) -> float:
    return max(1.0, min(cell_width, cell_height))


def normalize_align_grid_shape(shape: str | None) -> AlignGridShape:
    if shape is None:
        return "rect"
    if shape == "square":
        return "rect"
    if shape in ("rect", "hex"):
        return shape
    return "rect"


def align_grid_state_from_json(data: dict[str, object]) -> AlignGridState:
    cell_width = max(1.0, float(data.get("cellWidth", 128)))
    cell_height = max(1.0, float(data.get("cellHeight", 128)))
    min_spacing = minimum_align_grid_spacing(cell_width, cell_height)
    return AlignGridState(
        enabled=bool(data.get("enabled", False)),
        shape=normalize_align_grid_shape(str(data.get("shape", "rect"))),
        tx=float(data.get("tx", 0)),
        ty=float(data.get("ty", 0)),
        rotation=normalize_radians(float(data.get("rotation", 0))),
        spacing_a=max(min_spacing, float(data.get("spacingA", 160))),
        spacing_b=max(min_spacing, float(data.get("spacingB", 160))),
        cell_width=cell_width,
        cell_height=cell_height,
        opacity=clamp(float(data.get("opacity", 0.35)), 0.0, 1.0),
    )


@dataclass(frozen=True)
class GridBasis:
    ax: float
    ay: float
    bx: float
    by: float


def align_grid_basis(
    shape: AlignGridShape, rotation: float, spacing_a: float, spacing_b: float
) -> GridBasis:
    is_rect = shape in ("rect", "square")
    second_angle = rotation + (math.pi / 2 if is_rect else math.pi / 3)
    return GridBasis(
        ax=math.cos(rotation) * spacing_a,
        ay=math.sin(rotation) * spacing_a,
        bx=math.cos(second_angle) * spacing_b,
        by=math.sin(second_angle) * spacing_b,
    )


def estimate_align_grid_draw(
    width: int, height: int, spacing_a: float, spacing_b: float
) -> int:
    min_spacing = max(1.0, min(spacing_a, spacing_b))
    estimated_columns = math.ceil(width / min_spacing) + 3
    estimated_rows = math.ceil(height / min_spacing) + 3
    return max(estimated_columns, estimated_rows)


@dataclass(frozen=True)
class IndexBounds:
    basis: GridBasis
    origin_x: float
    origin_y: float
    half_width: float
    half_height: float
    i_min: int
    i_max: int
    j_min: int
    j_max: int


def resolve_visible_align_grid_index_bounds(
    frame: FrameBounds, grid: AlignGridState
) -> IndexBounds:
    basis = align_grid_basis(grid.shape, grid.rotation, grid.spacing_a, grid.spacing_b)
    origin_x = frame.width / 2 + grid.tx
    origin_y = frame.height / 2 + grid.ty
    half_width = grid.cell_width / 2
    half_height = grid.cell_height / 2
    determinant = basis.ax * basis.by - basis.ay * basis.bx

    if abs(determinant) <= GRID_BOUNDS_EPSILON:
        draw_range = estimate_align_grid_draw(
            frame.width, frame.height, grid.spacing_a, grid.spacing_b
        )
        return IndexBounds(
            basis=basis,
            origin_x=origin_x,
            origin_y=origin_y,
            half_width=half_width,
            half_height=half_height,
            i_min=-draw_range,
            i_max=draw_range,
            j_min=-draw_range,
            j_max=draw_range,
        )

    corners = (
        (-half_width, -half_height),
        (frame.width + half_width, -half_height),
        (-half_width, frame.height + half_height),
        (frame.width + half_width, frame.height + half_height),
    )
    i_min = math.inf
    i_max = -math.inf
    j_min = math.inf
    j_max = -math.inf
    for corner_x, corner_y in corners:
        dx = corner_x - origin_x
        dy = corner_y - origin_y
        i_value = (dx * basis.by - dy * basis.bx) / determinant
        j_value = (dy * basis.ax - dx * basis.ay) / determinant
        i_min = min(i_min, i_value)
        i_max = max(i_max, i_value)
        j_min = min(j_min, j_value)
        j_max = max(j_max, j_value)

    return IndexBounds(
        basis=basis,
        origin_x=origin_x,
        origin_y=origin_y,
        half_width=half_width,
        half_height=half_height,
        i_min=math.floor(i_min - GRID_BOUNDS_EPSILON),
        i_max=math.ceil(i_max + GRID_BOUNDS_EPSILON),
        j_min=math.floor(j_min - GRID_BOUNDS_EPSILON),
        j_max=math.ceil(j_max + GRID_BOUNDS_EPSILON),
    )


def enumerate_visible_align_grid_cells(
    frame: FrameBounds, grid: AlignGridState
) -> list[CellBox]:
    bounds = resolve_visible_align_grid_index_bounds(frame, grid)
    cells: list[CellBox] = []
    raw_width = max(1, round(grid.cell_width))
    raw_height = max(1, round(grid.cell_height))

    for i in range(bounds.i_min, bounds.i_max + 1):
        for j in range(bounds.j_min, bounds.j_max + 1):
            center_x = (
                bounds.origin_x
                + i * bounds.basis.ax
                + j * bounds.basis.bx
            )
            center_y = (
                bounds.origin_y
                + i * bounds.basis.ay
                + j * bounds.basis.by
            )
            raw_x = round(center_x - bounds.half_width)
            raw_y = round(center_y - bounds.half_height)
            clipped_x = round(clamp(raw_x, 0, frame.width))
            clipped_y = round(clamp(raw_y, 0, frame.height))
            clipped_right = round(clamp(raw_x + raw_width, 0, frame.width))
            clipped_bottom = round(clamp(raw_y + raw_height, 0, frame.height))
            width = clipped_right - clipped_x
            height = clipped_bottom - clipped_y
            if width <= 0 or height <= 0:
                continue
            cells.append(
                CellBox(i=i, j=j, x=clipped_x, y=clipped_y, w=width, h=height)
            )
    return cells


def cell_area_ratio(cell: CellBox, *, full_width: int, full_height: int) -> float:
    full_area = max(1, full_width * full_height)
    return (cell.w * cell.h) / full_area


def filter_user_preference_excluded(
    excluded: list[CellCoord],
    cell_boxes: dict[tuple[int, int], CellBox],
    *,
    full_width: int,
    full_height: int,
    min_area_ratio: float,
) -> tuple[list[tuple[CellCoord, CellBox, float]], int, int]:
    """Return user-preference excludes, ratio-filtered count, and missing count."""
    kept: list[tuple[CellCoord, CellBox, float]] = []
    ratio_filtered = 0
    missing = 0

    for coord in excluded:
        key = (coord.i, coord.j)
        box = cell_boxes.get(key)
        if box is None:
            missing += 1
            continue
        ratio = cell_area_ratio(box, full_width=full_width, full_height=full_height)
        if ratio < min_area_ratio:
            ratio_filtered += 1
            continue
        kept.append((coord, box, ratio))

    return kept, ratio_filtered, missing
