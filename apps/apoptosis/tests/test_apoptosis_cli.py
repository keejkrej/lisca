from __future__ import annotations

from apoptosis import cli


def test_bf_class_train_dispatches(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_train(argv: list[str] | None = None) -> None:
        captured["argv"] = argv

    monkeypatch.setattr(cli.bf_class_cli, "train_main", fake_train)

    cli.main(["bf-class", "train", "--dataset-root", "dataset"])

    assert captured["argv"] == ["--dataset-root", "dataset"]


def test_bf_class_events_dispatches(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_events(argv: list[str] | None = None) -> None:
        captured["argv"] = argv

    monkeypatch.setattr(cli.bf_class_cli, "events_main", fake_events)

    cli.main(["bf-class", "events", "best.pt", "roi/Pos0", "--output-csv", "events.csv"])

    assert captured["argv"] == ["best.pt", "roi/Pos0", "--output-csv", "events.csv"]


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


def test_correlation_dispatches(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_correlation(argv: list[str] | None = None, *, prog_name: str) -> None:
        captured["argv"] = argv
        captured["prog_name"] = prog_name

    monkeypatch.setattr(cli.correlation, "main", fake_correlation)

    cli.main(["correlation", "bf.csv", "stain.csv", "--output-plot", "scatter.png"])

    assert captured["argv"] == ["bf.csv", "stain.csv", "--output-plot", "scatter.png"]
    assert captured["prog_name"] == "apoptosis correlation"
