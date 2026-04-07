from __future__ import annotations

from pathlib import Path

from apoptosis.bf_class import cli


def test_train_parser_requires_dataset_root() -> None:
    parser = cli.build_train_parser()

    try:
        parser.parse_args([])
    except SystemExit as exc:
        assert exc.code == 2
    else:
        raise AssertionError("Expected --dataset-root to be required")


def test_convert_dataset_main_dispatches(tmp_path: Path, monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_convert_dataset(input_root: Path, output_root: Path, position: str):
        captured["input_root"] = input_root
        captured["output_root"] = output_root
        captured["position"] = position
        return object()

    def fake_print_summary(summary, output_root: Path) -> None:
        captured["summary"] = summary
        captured["printed_output_root"] = output_root

    monkeypatch.setattr(cli, "convert_dataset", fake_convert_dataset)
    monkeypatch.setattr(cli, "print_summary", fake_print_summary)

    cli.convert_dataset_main(
        [
            "--input-root",
            str(tmp_path / "input"),
            "--output-root",
            str(tmp_path / "output"),
            "--position",
            "Pos7",
        ]
    )

    assert captured["input_root"] == (tmp_path / "input").resolve()
    assert captured["output_root"] == (tmp_path / "output").resolve()
    assert captured["position"] == "Pos7"
    assert captured["printed_output_root"] == (tmp_path / "output").resolve()
