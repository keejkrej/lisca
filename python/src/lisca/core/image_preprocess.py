from __future__ import annotations

from dataclasses import dataclass

import torch
from PIL import Image
from torchvision.transforms import functional as tf

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


@dataclass(frozen=True)
class SmartExclusionPreprocess:
    image_size: int = 224

    def __call__(self, image: Image.Image) -> torch.Tensor:
        gray = image.convert("L")
        resized = tf.resize(
            gray,
            [self.image_size, self.image_size],
            interpolation=tf.InterpolationMode.BILINEAR,
        )
        rgb = resized.convert("RGB")
        tensor = tf.to_tensor(rgb)
        return tf.normalize(tensor, IMAGENET_MEAN, IMAGENET_STD)


def load_png_image(path: str) -> Image.Image:
    return Image.open(path)
