from lisca.core.align_grid import (
    AlignGridState,
    FrameBounds,
    pattern_area_ratio,
    enumerate_visible_align_grid_patterns,
    filter_user_preference_excluded,
    PatternCoord,
)


def test_enumerate_visible_patterns_and_edge_ratio_filter() -> None:
    frame = FrameBounds(width=100, height=100)
    grid = AlignGridState(
        enabled=True,
        shape="rect",
        tx=-10,
        ty=-10,
        rotation=0,
        spacing_a=50,
        spacing_b=50,
        pattern_width=50,
        pattern_height=50,
        opacity=0.35,
    )
    patterns = enumerate_visible_align_grid_patterns(frame, grid)
    pattern_map = {(pattern.i, pattern.j): pattern for pattern in patterns}
    full_width = 50
    full_height = 50

    assert pattern_map[(0, 0)].w == 50
    assert (
        pattern_area_ratio(
            pattern_map[(0, 0)], full_width=full_width, full_height=full_height
        )
        == 1.0
    )

    edge_pattern = pattern_map[(-1, 0)]
    assert edge_pattern.w * edge_pattern.h < full_width * full_height
    assert (
        pattern_area_ratio(edge_pattern, full_width=full_width, full_height=full_height)
        < 0.8
    )

    excluded = [PatternCoord(i=-1, j=0), PatternCoord(i=0, j=0)]
    kept, ratio_filtered, missing = filter_user_preference_excluded(
        excluded,
        pattern_map,
        full_width=full_width,
        full_height=full_height,
        min_area_ratio=0.8,
    )
    assert ratio_filtered == 1
    assert missing == 0
    assert len(kept) == 1
    assert kept[0][0] == PatternCoord(i=0, j=0)
