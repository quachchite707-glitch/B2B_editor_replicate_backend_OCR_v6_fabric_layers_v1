from __future__ import annotations
from typing import Tuple
import numpy as np
import cv2
from PIL import Image, ImageOps


def _imdecode(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("cv2.imdecode failed: invalid image bytes")
    return img


def _exif_transpose_if_needed(image_bytes: bytes) -> np.ndarray:
    # PIL handles EXIF orientation robustly
    try:
        im = Image.open((__import__("io").BytesIO)(image_bytes))
        im = ImageOps.exif_transpose(im).convert("RGB")
        img = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
        return img
    except Exception:
        return _imdecode(image_bytes)


def load_and_preprocess(
    image_bytes: bytes,
    long_side: int = 1400,
    keep_original_size: bool = True,
) -> Tuple[np.ndarray, Tuple[int, int], Tuple[int, int], float]:
    img = _exif_transpose_if_needed(image_bytes)
    H0, W0 = img.shape[:2]

    if keep_original_size:
        return img, (W0, H0), (W0, H0), 1.0

    # Resize to stabilize OCR/candidates
    scale = 1.0
    if max(W0, H0) > long_side:
        scale = long_side / float(max(W0, H0))
        W = int(W0 * scale)
        H = int(H0 * scale)
        img = cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA)
    else:
        W, H = W0, H0

    return img, (W0, H0), (W, H), scale
