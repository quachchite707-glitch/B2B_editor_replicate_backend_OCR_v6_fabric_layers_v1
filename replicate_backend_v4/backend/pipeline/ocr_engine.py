from __future__ import annotations

import os
from typing import List, Dict, Any, Optional

# MUST set before importing paddle
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_mkldnn"] = "0"
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import paddle  # noqa
from paddleocr import PaddleOCR  # noqa

import numpy as np
from models.schemas import TextLine


def quad_to_bbox(quad: List[List[float]]) -> List[int]:
    xs = [p[0] for p in quad]
    ys = [p[1] for p in quad]
    x0, x1 = int(min(xs)), int(max(xs))
    y0, y1 = int(min(ys)), int(max(ys))
    return [x0, y0, x1, y1]


class OCREngine:
    def __init__(self, lang: str = "ch", use_angle_cls: bool = True) -> None:
        # extra safety
        try:
            paddle.set_flags({"FLAGS_use_mkldnn": False})
            paddle.set_flags({"FLAGS_enable_mkldnn": False})
        except Exception:
            pass

        self.ocr = PaddleOCR(use_angle_cls=use_angle_cls, lang=lang, show_log=False)

    def extract_text_lines(self, img_bgr: np.ndarray) -> List[TextLine]:
        res = self.ocr.ocr(img_bgr, cls=True)
        out: List[TextLine] = []

        if not res or not res[0]:
            return out

        for i, item in enumerate(res[0]):
            if not item or len(item) < 2:
                continue
            quad = item[0]
            txt, score = item[1][0], float(item[1][1])
            if not txt:
                continue
            bbox = quad_to_bbox(quad)
            out.append(
                TextLine(
                    id=f"t{i+1}",
                    text=txt,
                    bbox=bbox,
                    quad=quad,
                    score=score,
                )
            )
        return out
