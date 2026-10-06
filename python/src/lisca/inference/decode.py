"""Bounded PNG and JPEG decoding for inference requests."""

import io

from PIL import Image, UnidentifiedImageError

MAX_PIXELS = 1_048_576


def decode_image(raw: bytes) -> Image.Image:
    try:
        with Image.open(io.BytesIO(raw)) as image:
            if image.width * image.height > MAX_PIXELS:
                raise ValueError("Reference image exceeds one megapixel")
            if image.format not in {"PNG", "JPEG"}:
                raise ValueError("References must be PNG or JPEG")
            return image.convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise ValueError("Cannot decode reference image") from error
