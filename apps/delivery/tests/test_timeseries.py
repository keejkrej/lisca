from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import pandas as pd
import pytest

from delivery.expression import timeseries



def test_load_slide_positions_returns_integer_list(tmp_path: Path) -> None:
    slide_path = tmp_path / 'slide.json'
    slide_path.write_text(json.dumps({'1': [12, 14, 16, 18]}), encoding='utf-8')

    assert timeseries.load_slide_positions(slide_path, 1) == [12, 14, 16, 18]



def test_load_slide_positions_rejects_string_entries(tmp_path: Path) -> None:
    slide_path = tmp_path / 'slide.json'
    slide_path.write_text(json.dumps({'1': ['12-14', 16]}), encoding='utf-8')

    with pytest.raises(ValueError, match="must be integers"):
        timeseries.load_slide_positions(slide_path, 1)



def test_default_slide_timeseries_csv_path_uses_slide_stem(tmp_path: Path) -> None:
    slide_path = tmp_path / 'plate-a.json'

    csv_path = timeseries.default_slide_timeseries_csv_path(tmp_path, slide_path, channel=2, output_csv=None)

    assert csv_path == (tmp_path / 'timeseries' / 'plate-a_ch002_timeseries.csv').resolve()



def test_cli_with_slide_consolidates_all_positions_for_channel(monkeypatch, tmp_path: Path) -> None:
    slide_path = tmp_path / 'slide.json'
    slide_path.write_text(json.dumps({'2': [25, 26, 28]}), encoding='utf-8')

    compute_calls: list[tuple[int, int, list[float]]] = []
    written: list[tuple[pd.DataFrame, Path]] = []

    monkeypatch.setattr(timeseries, 'position_dir', lambda dataset_root, pos: dataset_root / 'roi' / f'Pos{pos}')
    monkeypatch.setattr(
        timeseries,
        'read_position_index',
        lambda pos_dir: SimpleNamespace(position=int(pos_dir.name.removeprefix('Pos')), channel_count=4),
    )
    monkeypatch.setattr(timeseries, 'validate_channel_index', lambda index, channel: None)

    def fake_compute_roi_metrics(pos_dir: Path, index: SimpleNamespace, *, channel: int, quartiles: list[float]) -> pd.DataFrame:
        compute_calls.append((index.position, channel, quartiles))
        return pd.DataFrame([
            {
                'pos': index.position,
                'channel': channel,
                't': 0,
                'roi': 1,
                'corrected': float(index.position),
            }
        ])

    monkeypatch.setattr(timeseries, 'compute_roi_metrics', fake_compute_roi_metrics)
    monkeypatch.setattr(timeseries, 'write_metrics_csv', lambda df, output_csv: written.append((df.copy(), output_csv)))

    timeseries.cli(
        dataset_root=tmp_path,
        pos=0,
        channel=2,
        slide=slide_path,
        output_csv=None,
        quartiles=timeseries.DEFAULT_QUARTILES,
    )

    assert compute_calls == [
        (25, 2, [0.1, 0.25, 0.5, 0.75, 0.9]),
        (26, 2, [0.1, 0.25, 0.5, 0.75, 0.9]),
        (28, 2, [0.1, 0.25, 0.5, 0.75, 0.9]),
    ]
    assert len(written) == 1
    written_df, written_path = written[0]
    assert written_path == (tmp_path / 'timeseries' / 'slide_ch002_timeseries.csv').resolve()
    assert written_df[['pos', 'channel', 't', 'roi', 'corrected']].to_dict('records') == [
        {'pos': 25, 'channel': 2, 't': 0, 'roi': 1, 'corrected': 25.0},
        {'pos': 26, 'channel': 2, 't': 0, 'roi': 1, 'corrected': 26.0},
        {'pos': 28, 'channel': 2, 't': 0, 'roi': 1, 'corrected': 28.0},
    ]



def test_cli_with_slide_skips_missing_positions(monkeypatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    slide_path = tmp_path / 'slide.json'
    slide_path.write_text(json.dumps({'2': [25, 26, 28]}), encoding='utf-8')

    compute_calls: list[int] = []
    written: list[tuple[pd.DataFrame, Path]] = []

    def fake_position_dir(dataset_root: Path, pos: int) -> Path:
        if pos == 26:
            raise ValueError(f"No ROI directory found for --pos={pos}")
        return dataset_root / 'roi' / f'Pos{pos}'

    monkeypatch.setattr(timeseries, 'position_dir', fake_position_dir)
    monkeypatch.setattr(
        timeseries,
        'read_position_index',
        lambda pos_dir: SimpleNamespace(position=int(pos_dir.name.removeprefix('Pos')), channel_count=4),
    )
    monkeypatch.setattr(timeseries, 'validate_channel_index', lambda index, channel: None)

    def fake_compute_roi_metrics(pos_dir: Path, index: SimpleNamespace, *, channel: int, quartiles: list[float]) -> pd.DataFrame:
        compute_calls.append(index.position)
        return pd.DataFrame([
            {'pos': index.position, 'channel': channel, 't': 0, 'roi': 1, 'corrected': float(index.position)}
        ])

    monkeypatch.setattr(timeseries, 'compute_roi_metrics', fake_compute_roi_metrics)
    monkeypatch.setattr(timeseries, 'write_metrics_csv', lambda df, output_csv: written.append((df.copy(), output_csv)))

    timeseries.cli(
        dataset_root=tmp_path,
        pos=0,
        channel=2,
        slide=slide_path,
        output_csv=None,
        quartiles=timeseries.DEFAULT_QUARTILES,
    )

    captured = capsys.readouterr()
    assert compute_calls == [25, 28]
    assert "Skipped 1 missing positions: 26" in captured.out
    assert "Wrote consolidated metrics CSV for 2 positions" in captured.out
    assert len(written) == 1



def test_cli_with_slide_honors_custom_output_csv(monkeypatch, tmp_path: Path) -> None:
    slide_path = tmp_path / 'slide.json'
    slide_path.write_text(json.dumps({'0': [0, 1]}), encoding='utf-8')

    monkeypatch.setattr(timeseries, 'position_dir', lambda dataset_root, pos: dataset_root / 'roi' / f'Pos{pos}')
    monkeypatch.setattr(
        timeseries,
        'read_position_index',
        lambda pos_dir: SimpleNamespace(position=int(pos_dir.name.removeprefix('Pos')), channel_count=1),
    )
    monkeypatch.setattr(timeseries, 'validate_channel_index', lambda index, channel: None)
    monkeypatch.setattr(
        timeseries,
        'compute_roi_metrics',
        lambda pos_dir, index, *, channel, quartiles: pd.DataFrame([
            {'pos': index.position, 'channel': channel, 't': 0, 'roi': 1, 'corrected': float(index.position)}
        ]),
    )

    written_paths: list[Path] = []
    monkeypatch.setattr(timeseries, 'write_metrics_csv', lambda df, output_csv: written_paths.append(output_csv))

    custom_output = tmp_path / 'combined.csv'
    timeseries.cli(
        dataset_root=tmp_path,
        pos=0,
        channel=0,
        slide=slide_path,
        output_csv=custom_output,
        quartiles=timeseries.DEFAULT_QUARTILES,
    )

    assert written_paths == [custom_output.resolve()]
