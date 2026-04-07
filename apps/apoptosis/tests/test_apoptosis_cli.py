from __future__ import annotations

from apoptosis import cli


def test_bf_class_train_dispatches(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_train(argv: list[str] | None = None) -> None:
        captured["argv"] = argv

    monkeypatch.setattr(cli.bf_class_cli, "train_main", fake_train)

    cli.main(["bf-class", "train", "--dataset-root", "dataset"])

    assert captured["argv"] == ["--dataset-root", "dataset"]


def test_bf_seg_train_dispatches(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_train(argv: list[str] | None = None) -> None:
        captured["argv"] = argv

    monkeypatch.setattr(cli.bf_seg_cli, "train_main", fake_train)

    cli.main(["bf-seg", "train", "--dataset-root", "dataset"])

    assert captured["argv"] == ["--dataset-root", "dataset"]


def test_stain_roi_timeseries_dispatches(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_main(argv: list[str] | None = None, *, prog_name: str) -> None:
        captured["argv"] = argv
        captured["prog_name"] = prog_name

    monkeypatch.setattr(cli.nd2_roi_timeseries, "main", fake_main)

    cli.main(["stain", "roi-timeseries", "input.nd2", "bbox.csv", "--channel", "1"])

    assert captured["argv"] == ["input.nd2", "bbox.csv", "--channel", "1"]
    assert captured["prog_name"] == "apoptosis stain roi-timeseries"
