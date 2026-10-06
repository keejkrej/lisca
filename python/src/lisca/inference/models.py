"""Assay packages register encoders and tasks with the inference host."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any, Protocol

import numpy as np
from PIL import Image


class Encoder(Protocol):
    identity: str
    device: str
    model_id: str
    revision: str
    dimensions: int

    def encode(self, images: list[Image.Image]) -> np.ndarray: ...


Prepare = Callable[[Any, Any, Any], None]
Mount = Callable[..., None]

_models: dict[str, Callable[[str], Any]] = {}
_tasks: list[tuple[Prepare, Mount]] = []
_loaded = False


def register_model(name: str, factory: Callable[[str], Any]) -> None:
    if name in _models:
        raise ValueError(f"Inference model {name!r} is already registered")
    _models[name] = factory


def register_task(prepare: Prepare, mount: Mount) -> None:
    _tasks.append((prepare, mount))


def model_factories() -> dict[str, Callable[[str], Any]]:
    return dict(_models)


def tasks() -> list[tuple[Prepare, Mount]]:
    return list(_tasks)


def load_assays() -> None:
    """Import assay packages that contribute models. Safe to call more than once."""
    global _loaded
    if _loaded:
        return
    from apoptosis.inference import register  # ty: ignore[unresolved-import]

    register(register_model, register_task)
    _loaded = True
