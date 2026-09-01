from __future__ import annotations

from enum import Enum


class AppId(str, Enum):
    ALIGNER = "aligner"
    ANNOTATOR = "annotator"
    STUDIO = "studio"
