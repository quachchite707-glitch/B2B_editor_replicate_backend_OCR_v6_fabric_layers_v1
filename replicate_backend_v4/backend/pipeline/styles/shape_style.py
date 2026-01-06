from __future__ import annotations
from typing import List, Optional, Tuple
import numpy as np
import cv2

from pipeline.styles.text_style import bgr_to_hex


def estimate_shape_fill_opacity_radius(
    img_bgr: np.ndarray,
    bbox: List[int],
    text_mask: Optional[np.ndarray],
    semantic: str,
) -> Tuple[str, float, int]:
    x0, y0, x1, y1 = bbox
    roi = img_bgr[y0:y1, x0:x1]
    if roi.size == 0:
        return "#ffffff", 1.0, 0

    # sample excluding text pixels
    if text_mask is not None:
        em = text_mask[y0:y1, x0:x1]
        pixels = roi[em == 0] if np.any(em == 0) else roi.reshape(-1, 3)
    else:
        pixels = roi.reshape(-1, 3)

    if pixels.ndim == 1 or pixels.shape[0] < 30:
        med = np.median(roi.reshape(-1, 3), axis=0)
    else:
        # median robust
        med = np.median(pixels.reshape(-1, 3), axis=0)

    fill = bgr_to_hex(med)

    # opacity heuristic: masks are usually semi-transparent
    opacity = 1.0
    if semantic == "mask":
        # infer opacity by how much it differs from local mean (rough)
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY).astype(np.float32)
        var = float(gray.var())
        opacity = 0.35 if var < 200 else 0.25

    # radius heuristic
    h = max(1, y1 - y0)
    w = max(1, x1 - x0)
    radius = 0
    if semantic == "pill":
        radius = int(round(h / 2))
    elif semantic in ("panel", "block"):
        # mild radius sometimes
        radius = 0

    return fill, float(opacity), int(radius)
