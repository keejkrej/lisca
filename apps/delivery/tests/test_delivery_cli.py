from __future__ import annotations

from delivery import cli


def test_expression_timeseries_dispatches(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_main(argv: list[str] | None = None, *, prog_name: str) -> None:
        captured["argv"] = argv
        captured["prog_name"] = prog_name

    monkeypatch.setattr(cli.timeseries, "main", fake_main)

    cli.main(["expression", "timeseries", "dataset", "--channel", "1"])

    assert captured["argv"] == ["dataset", "--channel", "1"]
    assert captured["prog_name"] == "delivery expression timeseries"

