from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


DEFAULT_DATASET_ROOT = Path("dataset")
DEFAULT_ARTIFACT_ROOT = Path("artifacts")
DEFAULT_IMAGE_SIZE = 256
DEFAULT_EPOCHS = 10
DEFAULT_BATCH_SIZE = 8
DEFAULT_LR = 1e-3
DEFAULT_WEIGHT_DECAY = 1e-4
DEFAULT_SEED = 42
DEFAULT_NUM_WORKERS = 0
NUM_CLASSES = 3
TRAIN_FRACTION = 0.70
VAL_FRACTION = 0.15
CLASS_NAMES = ("background", "live", "dead")


@dataclass(frozen=True)
class TrainingConfig:
    dataset_root: Path = DEFAULT_DATASET_ROOT
    artifact_root: Path = DEFAULT_ARTIFACT_ROOT
    run_name: str | None = None
    epochs: int = DEFAULT_EPOCHS
    batch_size: int = DEFAULT_BATCH_SIZE
    image_size: int = DEFAULT_IMAGE_SIZE
    lr: float = DEFAULT_LR
    weight_decay: float = DEFAULT_WEIGHT_DECAY
    seed: int = DEFAULT_SEED
    num_workers: int = DEFAULT_NUM_WORKERS
    device: str = "auto"

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["dataset_root"] = str(self.dataset_root)
        payload["artifact_root"] = str(self.artifact_root)
        return payload


@dataclass(frozen=True)
class TrainingArtifacts:
    run_dir: Path
    best_checkpoint_path: Path
    last_checkpoint_path: Path
    config_path: Path
    metrics_csv_path: Path
    test_metrics_path: Path
    train_split_path: Path
    val_split_path: Path
    test_split_path: Path


@dataclass(frozen=True)
class TimelapseReadoutRow:
    time_index: int
    background_px: int
    live_px: int
    dead_px: int
    total_px: int
    live_area_px: int
    live_fraction: float
    killing_efficiency: float


@dataclass(frozen=True)
class TimelapseInferenceResult:
    input_path: Path
    checkpoint_path: Path
    output_csv_path: Path
    frame_count: int
    rows: list[TimelapseReadoutRow]
    mask_stack_path: Path | None


def default_run_name() -> str:
    return datetime.now().strftime("unet_%Y%m%d_%H%M%S")
