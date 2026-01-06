from __future__ import annotations
from typing import List, Tuple, Literal, Optional
import numpy as np
import cv2

from config import settings


def classify_shape_semantic(
    img_bgr: np.ndarray,
    bbox: List[int],
    covered_texts: List[Tuple[str, float]],
    source: str,
) -> Literal["block", "panel", "pill", "badge", "mask"]:
    x0, y0, x1, y1 = bbox
    w = max(1, x1 - x0)
    h = max(1, y1 - y0)
    ar = w / float(h)

    if source == "mask":
        return "mask"

    # pill: wide and usually single line text
    if ar >= settings.pill_aspect_ratio and len(covered_texts) <= 2:
        return "pill"

    # panel: larger region likely hosting multiple lines
    if len(covered_texts) >= 2 and ar >= 1.2 and h >= 0.08 * img_bgr.shape[0]:
        return "panel"

    # badge: try detect sharp corners by contour approx (lightweight)
    roi = img_bgr[y0:y1, x0:x1]
    if roi.size > 0 and (w * h) < 0.25 * (img_bgr.shape[0] * img_bgr.shape[1]):
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 60, 160)
        cnts, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if cnts:
            c = max(cnts, key=cv2.contourArea)
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.03 * peri, True)
            v = len(approx)
            if 3 <= v <= 6 and ar < 3.0:
                return "badge"

    return "block"
