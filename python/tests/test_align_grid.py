from lisca.core.align_grid import (
    AlignGridState,
    FrameBounds,
    cell_area_ratio,
    enumerate_visible_align_grid_cells,
    filter_user_preference_excluded,
    CellCoord,
)


def test_enumerate_visible_cells_and_edge_ratio_filter() -> None:
    frame = FrameBounds(width=100, height=100)
    grid = AlignGridState(
        enabled=True,
        shape="rect",
        tx=-10,
        ty=-10,
        rotation=0,
        spacing_a=50,
        spacing_b=50,
        cell_width=50,
        cell_height=50,
        opacity=0.35,
    )
    cells = enumerate_visible_align_grid_cells(frame, grid)
    cell_map = {(cell.i, cell.j): cell for cell in cells}
    full_width = 50
    full_height = 50

    assert cell_map[(0, 0)].w == 50
    assert cell_area_ratio(cell_map[(0, 0)], full_width=full_width, full_height=full_height) == 1.0

    edge_cell = cell_map[(-1, 0)]
    assert edge_cell.w * edge_cell.h < full_width * full_height
    assert cell_area_ratio(edge_cell, full_width=full_width, full_height=full_height) < 0.8

    excluded = [CellCoord(i=-1, j=0), CellCoord(i=0, j=0)]
    kept, ratio_filtered, missing = filter_user_preference_excluded(
        excluded,
        cell_map,
        full_width=full_width,
        full_height=full_height,
        min_area_ratio=0.8,
    )
    assert ratio_filtered == 1
    assert missing == 0
    assert len(kept) == 1
    assert kept[0][0] == CellCoord(i=0, j=0)
