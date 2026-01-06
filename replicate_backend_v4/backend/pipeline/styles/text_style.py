from __future__ import annotations
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import cv2

from config import settings


def bgr_to_hex(bgr: np.ndarray) -> str:
    b, g, r = [int(x) for x in bgr]
    return f"#{r:02x}{g:02x}{b:02x}"


def build_text_mask(img_bgr: np.ndarray, bboxes: List[List[int]]) -> np.ndarray:
    """
    Build a binary mask where text areas are 1.
    Simple bbox-based for exclusion; fast & stable.
    """
    H, W = img_bgr.shape[:2]
    m = np.zeros((H, W), dtype=np.uint8)
    for b in bboxes:
        x0, y0, x1, y1 = b
        x0 = max(0, min(W - 1, x0))
        y0 = max(0, min(H - 1, y0))
        x1 = max(0, min(W, x1))
        y1 = max(0, min(H, y1))
        if x1 > x0 and y1 > y0:
            m[y0:y1, x0:x1] = 1
    return m


def estimate_text_fill(img_bgr: np.ndarray, bbox: List[int], pad: int = 3) -> str:
    """
    Robust fill estimation:
    - Otsu binarize ROI
    - pick text class (dark or light)
    - median color over text pixels
    """
    H, W = img_bgr.shape[:2]
    x0, y0, x1, y1 = bbox
    x0p = max(0, x0 - pad)
    y0p = max(0, y0 - pad)
    x1p = min(W, x1 + pad)
    y1p = min(H, y1 + pad)

    roi = img_bgr[y0p:y1p, x0p:x1p]
    if roi.size == 0:
        return "#000000"

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    dark_mean = float(np.mean(gray[th == 0])) if np.any(th == 0) else 255.0
    bright_mean = float(np.mean(gray[th == 255])) if np.any(th == 255) else 0.0

    # decide which side is text
    if dark_mean < (255 - bright_mean):
        text_mask = (th == 0)   # black text
    else:
        text_mask = (th == 255) # white text

    # denoise
    text_mask_u8 = (text_mask.astype(np.uint8) * 255)
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    text_mask_u8 = cv2.morphologyEx(text_mask_u8, cv2.MORPH_OPEN, k, iterations=1)
    text_mask = (text_mask_u8 > 0)

    if int(np.count_nonzero(text_mask)) < 50:
        med = np.median(roi.reshape(-1, 3), axis=0)
        return bgr_to_hex(med)

    pixels = roi[text_mask]
    med = np.median(pixels, axis=0)
    return bgr_to_hex(med)


def estimate_font_size_from_bbox(bbox: List[int]) -> int:
    h = max(1, bbox[3] - bbox[1])
    # empirical mapping (works well for posters)
    return int(max(10, min(220, round(0.85 * h))))


def estimate_font_weight(img_bgr: np.ndarray, bbox: List[int]) -> int:
    """
    Very light heuristic:
    - compute binarized text area ratio, thick strokes -> higher ratio
    """
    x0, y0, x1, y1 = bbox
    roi = img_bgr[y0:y1, x0:x1]
    if roi.size == 0:
        return 400
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    # assume text is minority class; pick smaller pixel count as text
    cnt0 = np.count_nonzero(th == 0)
    cnt1 = np.count_nonzero(th == 255)
    text_cnt = min(cnt0, cnt1)
    ratio = text_cnt / float(max(1, th.size))
    if ratio > 0.22:
        return 700
    if ratio > 0.18:
        return 600
    return 400


def guess_align(text_bbox: List[int], canvas_w: int, container_bbox: Optional[List[int]] = None) -> str:
    x0, y0, x1, y1 = text_bbox
    tw = max(1, x1 - x0)
    tc = (x0 + x1) / 2.0

    if container_bbox:
        bx0, by0, bx1, by1 = container_bbox
        bc = (bx0 + bx1) / 2.0
        if abs(tc - bc) <= 0.08 * (bx1 - bx0):
            return "center"
        if x0 - bx0 <= 0.06 * (bx1 - bx0):
            return "left"
        return "center"

    # fallback by canvas
    if tw >= 0.55 * canvas_w:
        return "center"
    if abs(tc - canvas_w / 2.0) <= 0.10 * canvas_w:
        return "center"
    return "left"


def detect_stroke_and_shadow(img_bgr: np.ndarray, bbox: List[int]) -> Tuple[int, str, Optional[Dict[str, Any]]]:
    """
    Conservative:
    - Only output stroke/shadow if we have decent signal.
    """
    x0, y0, x1, y1 = bbox
    roi = img_bgr[y0:y1, x0:x1]
    if roi.size == 0:
        return 0, "#000000", None

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # text mask = smaller class
    if np.count_nonzero(th == 0) < np.count_nonzero(th == 255):
        text = (th == 0).astype(np.uint8)
    else:
        text = (th == 255).astype(np.uint8)

    # border ring for stroke estimation
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    dil = cv2.dilate(text, k, iterations=1)
    ring = (dil - text).astype(np.uint8)

    if np.count_nonzero(ring) < 30:
        return 0, "#000000", None

    ring_pixels = roi[ring == 1]
    text_pixels = roi[text == 1]
    if ring_pixels.size == 0 or text_pixels.size == 0:
        return 0, "#000000", None

    ring_med = np.median(ring_pixels.reshape(-1, 3), axis=0)
    text_med = np.median(text_pixels.reshape(-1, 3), axis=0)

    # If ring color is significantly different, likely stroke
    diff = float(np.mean(np.abs(ring_med - text_med)))
    if diff > 35:
        stroke_width = 2
        stroke = bgr_to_hex(ring_med)
    else:
        stroke_width = 0
        stroke = "#000000"

    # Shadow: check if outside ring is darker on one side (very rough)
    shadow = None
    # keep conservative (many posters have no shadow)
    return stroke_width, stroke, shadow
