from __future__ import annotations

from pathlib import Path

from lisca.data.roi import default_timeseries_csv_path



def test_default_timeseries_csv_path_uses_timeseries_pos_dir(tmp_path: Path) -> None:
    csv_path = default_timeseries_csv_path(tmp_path, pos=7, channel=3, output_csv=None)

    assert csv_path == (tmp_path / "timeseries" / "Pos7" / "Pos7_ch003_timeseries.csv").resolve()
