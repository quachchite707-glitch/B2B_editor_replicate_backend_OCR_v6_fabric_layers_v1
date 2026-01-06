from __future__ import annotations
from typing import List, Dict, Any, Tuple
import numpy as np
import cv2

from config import settings
from models.schemas import TextLine, ShapeCandidate, ParseOptions


def clamp(v: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, v))


def _union_bbox(bboxes: List[List[int]]) -> List[int]:
    x0 = min(b[0] for b in bboxes)
    y0 = min(b[1] for b in bboxes)
    x1 = max(b[2] for b in bboxes)
    y1 = max(b[3] for b in bboxes)
    return [x0, y0, x1, y1]


def _pad_bbox(b: List[int], px: int, py: int, W: int, H: int) -> List[int]:
    x0, y0, x1, y1 = b
    return [
        clamp(x0 - px, 0, W - 1),
        clamp(y0 - py, 0, H - 1),
        clamp(x1 + px, 0, W),
        clamp(y1 + py, 0, H),
    ]


def _text_driven_candidates(img_bgr: np.ndarray, text_lines: List[TextLine]) -> List[ShapeCandidate]:
    H, W = img_bgr.shape[:2]
    out: List[ShapeCandidate] = []

    # per line bar
    for i, t in enumerate(text_lines):
        x0, y0, x1, y1 = t.bbox
        tw = max(1, x1 - x0)
        th = max(1, y1 - y0)

        px = int(clamp(int(settings.bar_pad_x_ratio * tw), settings.bar_pad_x_min, settings.bar_pad_x_max))
        py = int(clamp(int(settings.bar_pad_y_ratio * th), settings.bar_pad_y_min, settings.bar_pad_y_max))
        bb = _pad_bbox(t.bbox, px, py, W, H)

        out.append(
            ShapeCandidate(
                id=f"c_bar_{i+1}",
                bbox=bb,
                source="text_bar",
                score=0.2,
                meta={"text_id": t.id, "group_id": t.group_id},
            )
        )

    # per group panel (union)
    groups: Dict[str, List[TextLine]] = {}
    for t in text_lines:
        groups.setdefault(t.group_id, []).append(t)

    gi = 0
    for gid, items in groups.items():
        gi += 1
        ub = _union_bbox([t.bbox for t in items])
        uw = max(1, ub[2] - ub[0])
        uh = max(1, ub[3] - ub[1])
        px = int(clamp(int(settings.panel_pad_x_ratio * uw), settings.panel_pad_x_min, settings.panel_pad_x_max))
        py = int(clamp(int(settings.panel_pad_y_ratio * uh), settings.panel_pad_y_min, settings.panel_pad_y_max))
        bb = _pad_bbox(ub, px, py, W, H)
        out.append(
            ShapeCandidate(
                id=f"c_panel_{gi}",
                bbox=bb,
                source="text_panel",
                score=0.25,
                meta={"group_id": gid, "text_ids": [t.id for t in items]},
            )
        )

    return out


def _color_seg_candidates(img_bgr: np.ndarray) -> List[ShapeCandidate]:
    H, W = img_bgr.shape[:2]
    target = settings.color_seg_resize
    scale = target / float(max(H, W))
    if scale < 1.0:
        small = cv2.resize(img_bgr, (int(W * scale), int(H * scale)), interpolation=cv2.INTER_AREA)
    else:
        small = img_bgr.copy()

    sh, sw = small.shape[:2]
    lab = cv2.cvtColor(small, cv2.COLOR_BGR2LAB)
    Z = lab.reshape((-1, 3)).astype(np.float32)

    K = int(max(4, settings.color_seg_k))
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, _ = cv2.kmeans(Z, K, None, criteria, 2, cv2.KMEANS_PP_CENTERS)
    labels = labels.reshape((sh, sw)).astype(np.uint8)

    out: List[ShapeCandidate] = []
    min_area = int(settings.color_seg_min_area_ratio * (H * W))

    cid = 0
    for k in range(K):
        mask = (labels == k).astype(np.uint8) * 255
        # cleanup
        mask = cv2.medianBlur(mask, 5)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)

        cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cnts:
            x, y, w, h = cv2.boundingRect(c)
            area_small = w * h
            if area_small < 200:
                continue

            # scale back
            x0 = int(x / scale)
            y0 = int(y / scale)
            x1 = int((x + w) / scale)
            y1 = int((y + h) / scale)

            x0 = clamp(x0, 0, W - 1)
            y0 = clamp(y0, 0, H - 1)
            x1 = clamp(x1, 0, W)
            y1 = clamp(y1, 0, H)

            area = (x1 - x0) * (y1 - y0)
            if area < min_area:
                continue

            cid += 1
            out.append(
                ShapeCandidate(
                    id=f"c_seg_{cid}",
                    bbox=[x0, y0, x1, y1],
                    source="color_seg",
                    score=0.15,
                    meta={"cluster": k},
                )
            )

    return out


def _mask_candidates(img_bgr: np.ndarray) -> List[ShapeCandidate]:
    # heuristic: detect top/bottom soft masks frequently used in posters
    H, W = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)

    def band_stats(y0: int, y1: int) -> Tuple[float, float]:
        band = gray[y0:y1, :]
        return float(band.mean()), float(band.var())

    # compare top/bottom with mid
    mid_mean, mid_var = band_stats(int(0.35 * H), int(0.65 * H))
    out: List[ShapeCandidate] = []

    # top band
    top_mean, top_var = band_stats(0, int(0.20 * H))
    if top_var < 1.15 * mid_var and abs(top_mean - mid_mean) > 6:
        out.append(
            ShapeCandidate(
                id="c_mask_top",
                bbox=[0, 0, W, int(0.22 * H)],
                source="mask",
                score=0.2,
                meta={"pos": "top", "top_mean": top_mean, "mid_mean": mid_mean},
            )
        )

    # bottom band
    bot_mean, bot_var = band_stats(int(0.80 * H), H)
    if bot_var < 1.15 * mid_var and abs(bot_mean - mid_mean) > 6:
        out.append(
            ShapeCandidate(
                id="c_mask_bottom",
                bbox=[0, int(0.78 * H), W, H],
                source="mask",
                score=0.2,
                meta={"pos": "bottom", "bot_mean": bot_mean, "mid_mean": mid_mean},
            )
        )

    return out


def generate_candidates(
    img_bgr: np.ndarray,
    text_lines: List[TextLine],
    options: ParseOptions,
) -> Tuple[List[ShapeCandidate], Dict[str, Any]]:
    cands: List[ShapeCandidate] = []

    # always add text-driven
    td = _text_driven_candidates(img_bgr, text_lines)
    cands.extend(td)

    seg = []
    if options.detect_color_shapes and settings.enable_color_seg_candidates:
        seg = _color_seg_candidates(img_bgr)
        cands.extend(seg)

    masks = []
    if options.detect_masks and settings.enable_mask_candidates:
        masks = _mask_candidates(img_bgr)
        cands.extend(masks)

    debug = {
        "counts": {"text_driven": len(td), "color_seg": len(seg), "masks": len(masks), "total": len(cands)},
        "samples": [c.model_dump() for c in cands[:20]],
    }
    return cands, debug
