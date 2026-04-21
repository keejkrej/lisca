from __future__ import annotations

import io
from pathlib import Path

from rich.console import Console

from delivery import slide
from lisca.data.slide import SlideChannelMapping


def test_run_slide_wizard_collects_image_channel(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(slide, "prompt_channel_id", lambda console, mapping: 0)
    monkeypatch.setattr(slide, "prompt_positions", lambda console: [4, 6, 8])
    monkeypatch.setattr(slide, "prompt_image_channel", lambda console: 2)
    monkeypatch.setattr(slide, "render_mapping", lambda console, mapping: None)
    monkeypatch.setattr(slide.Prompt, "ask", lambda *args, **kwargs: "save")

    mapping = slide.run_slide_wizard(
        Console(file=io.StringIO()),
        tmp_path,
        tmp_path / "slide.json",
    )

    assert mapping == {0: SlideChannelMapping(positions=[4, 6, 8], image_channel=2)}


def test_render_mapping_includes_image_channel_column() -> None:
    buffer = io.StringIO()
    console = Console(file=buffer, width=120, color_system=None)

    slide.render_mapping(
        console,
        {
            0: SlideChannelMapping(positions=[0, 2], image_channel=1),
            1: SlideChannelMapping(positions=[12, 14], image_channel=2),
        },
    )

    rendered = buffer.getvalue()
    assert "Image Channel" in rendered
    assert "0, 2" in rendered
    assert "12, 14" in rendered
    assert "1" in rendered
    assert "2" in rendered
