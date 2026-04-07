from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


DEFAULT_DATASET_ROOT = Path("dataset")
DEFAULT_ARTIFACT_ROOT = Path("artifacts")
DEFAULT_IMAGE_SIZE = 224
DEFAULT_EPOCHS = 10
DEFAULT_BATCH_SIZE = 32
DEFAULT_LR = 1e-4
DEFAULT_WEIGHT_DECAY = 1e-4
DEFAULT_SEED = 42
DEFAULT_THRESHOLD = 0.5
DEFAULT_NUM_WORKERS = 0
TRAIN_FRACTION = 0.70
VAL_FRACTION = 0.15


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
    threshold: float = DEFAULT_THRESHOLD
    pretrained: bool = True
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
class PredictionResult:
    image_path: Path
    dead_probability: float
    hard_label: str
    checkpoint_path: Path
    threshold: float


@dataclass(frozen=True)
class TimelapsePredictionRow:
    time_index: int
    dead_probability: float
    hard_label: str


@dataclass(frozen=True)
class TimelapsePredictionResult:
    input_path: Path
    checkpoint_path: Path
    output_csv_path: Path
    channel: int
    frame_count: int
    threshold: float
    rows: list[TimelapsePredictionRow]


def default_run_name() -> str:
    return datetime.now().strftime("resnet18_%Y%m%d_%H%M%S")
