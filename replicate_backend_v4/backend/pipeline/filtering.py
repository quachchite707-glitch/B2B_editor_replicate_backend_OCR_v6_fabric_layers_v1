from __future__ import annotations
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import cv2

from config import settings
from models.schemas import TextLine, ShapeCandidate, ShapeDetected, ParseOptions
from pipeline.shape_classify import classify_shape_semantic
from pipeline.styles.shape_style import estimate_shape_fill_opacity_radius
from pipeline.styles.text_style import build_text_mask


def clamp(v: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, v))


def bbox_area(b: List[int]) -> int:
    return max(0, b[2] - b[0]) * max(0, b[3] - b[1])


def bbox_intersection(a: List[int], b: List[int]) -> int:
    x0 = max(a[0], b[0])
    y0 = max(a[1], b[1])
    x1 = min(a[2], b[2])
    y1 = min(a[3], b[3])
    return max(0, x1 - x0) * max(0, y1 - y0)


def cover_ratio(shape_bbox: List[int], text_bbox: List[int]) -> float:
    inter = bbox_intersection(shape_bbox, text_bbox)
    ta = bbox_area(text_bbox)
    return 0.0 if ta == 0 else float(inter) / float(ta)


def dominant_color_ratio_lab(img_bgr: np.ndarray, bbox: List[int], exclude_mask: Optional[np.ndarray] = None) -> float:
    x0, y0, x1, y1 = bbox
    roi = img_bgr[y0:y1, x0:x1]
    if roi.size == 0:
        return 0.0

    # sample pixels to avoid huge compute
    h, w = roi.shape[:2]
    step = max(1, int((h * w) ** 0.5 / 80))
    sample = roi[::step, ::step].reshape(-1, 3)

    if exclude_mask is not None:
        em = exclude_mask[y0:y1, x0:x1]
        if em is not None and em.size > 0:
            em_s = em[::step, ::step].reshape(-1)
            sample = sample[em_s == 0] if np.any(em_s == 0) else sample

    if sample.shape[0] < 200:
        return 0.0

    lab = cv2.cvtColor(sample.reshape(1, -1, 3), cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)

    K = 2
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, _ = cv2.kmeans(lab, K, None, criteria, 2, cv2.KMEANS_PP_CENTERS)
    labels = labels.reshape(-1)

    counts = np.bincount(labels, minlength=K).astype(np.float32)
    return float(counts.max() / max(1.0, counts.sum()))


def filter_and_detect_shapes(
    img_bgr: np.ndarray,
    text_lines: List[TextLine],
    candidates: List[ShapeCandidate],
    options: ParseOptions,
) -> Tuple[List[ShapeDetected], Dict[str, Any]]:
    H, W = img_bgr.shape[:2]
    out: List[ShapeDetected] = []

    # exclusion mask for dominant color calc: mask out text pixels
    text_mask = build_text_mask(img_bgr, [t.bbox for t in text_lines])

    stats = {
        "kept": 0,
        "dropped_area": 0,
        "dropped_no_text": 0,
        "dropped_color": 0,
        "dropped_cover": 0,
    }

    for i, c in enumerate(candidates):
        x0, y0, x1, y1 = c.bbox
        x0 = clamp(x0, 0, W - 1)
        y0 = clamp(y0, 0, H - 1)
        x1 = clamp(x1, 0, W)
        y1 = clamp(y1, 0, H)
        bbox = [x0, y0, x1, y1]
        area = bbox_area(bbox)
        if area <= 0:
            continue

        if area > settings.max_shape_area_ratio * (W * H) or area < settings.min_shape_area_ratio * (W * H):
            stats["dropped_area"] += 1
            continue

        # associate texts
        covered = []
        best_cover = 0.0
        for t in text_lines:
            cr = cover_ratio(bbox, t.bbox)
            if cr >= 0.35:
                covered.append((t.id, cr))
            best_cover = max(best_cover, cr)

        if settings.require_text_association and options.strict_text_carriers:
            # must carry at least one text strongly
            if best_cover < settings.min_text_cover_ratio and c.source != "mask":
                stats["dropped_cover"] += 1
                continue

        if settings.require_text_association and (not covered) and c.source != "mask":
            stats["dropped_no_text"] += 1
            continue

        # dominant color ratio filtering (mask candidates skip)
        dom = 1.0
        if c.source != "mask":
            dom = dominant_color_ratio_lab(img_bgr, bbox, exclude_mask=text_mask)
            if dom < settings.dominant_color_ratio:
                # allow text-driven bars a bit more forgiving
                if c.source in ("text_bar", "text_panel") and dom >= (settings.dominant_color_ratio - 0.08):
                    pass
                else:
                    stats["dropped_color"] += 1
                    continue

        semantic = classify_shape_semantic(img_bgr, bbox, covered_texts=covered, source=c.source)
        fill, opacity, radius = estimate_shape_fill_opacity_radius(img_bgr, bbox, text_mask=text_mask, semantic=semantic)

        conf = float(min(1.0, max(0.0, c.score + 0.55 * dom)))
        out.append(
            ShapeDetected(
                id=f"s{i+1}",
                bbox=bbox,
                semantic=semantic,
                fill=fill,
                opacity=opacity,
                radius=radius,
                confidence=conf,
                source=c.source,
                links={"covered_texts": covered, "best_cover": best_cover},
                debug={"dominant_color_ratio": dom, "candidate": c.model_dump()},
            )
        )
        stats["kept"] += 1

    # sort by y then x for stable zIndex
    out.sort(key=lambda s: (s.bbox[1], s.bbox[0]))
    return out, stats
