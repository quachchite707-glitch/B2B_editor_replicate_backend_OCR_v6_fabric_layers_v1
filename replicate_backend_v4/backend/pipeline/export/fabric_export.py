from __future__ import annotations
from typing import List, Dict, Any, Tuple, Optional

import numpy as np

from config import settings
from models.schemas import FabricLayer, TextLine, ShapeDetected
from pipeline.styles.text_style import (
    estimate_text_fill,
    estimate_font_size_from_bbox,
    estimate_font_weight,
    guess_align,
    detect_stroke_and_shadow,
)


def _bg_layer(W: int, H: int, asset_url: str) -> FabricLayer:
    return FabricLayer(
        id="bg-1",
        type="BG_IMAGE",
        name="背景",
        x=0,
        y=0,
        width=W,
        height=H,
        opacity=1,
        rotation=0,
        locked=True,
        hidden=False,
        zIndex=0,
        data={"assetUrl": asset_url, "fit": "cover"},
        style=None,
    )


def export_fabric_layers(
    img_bgr: np.ndarray,
    asset_url: str,
    text_lines: List[TextLine],
    shapes: List[ShapeDetected],
) -> Tuple[List[FabricLayer], Dict[str, Any]]:
    H, W = img_bgr.shape[:2]
    layers: List[FabricLayer] = [_bg_layer(W, H, asset_url)]

    # shapes first
    for i, s in enumerate(shapes):
        x0, y0, x1, y1 = s.bbox
        layers.append(
            FabricLayer(
                id=f"shape-{i+1}",
                type="SHAPE",
                name=f"叠加层-{s.semantic}",
                x=int(x0),
                y=int(y0),
                width=int(x1 - x0),
                height=int(y1 - y0),
                opacity=float(s.opacity),
                rotation=0,
                locked=False,
                hidden=False,
                zIndex=10 + i,
                data={"shapeType": "rect", "semantic": s.semantic, "confidence": s.confidence, "source": s.source},
                style={
                    "fill": s.fill,
                    "strokeWidth": 0,
                    "stroke": "#000000",
                    "radius": int(s.radius),
                },
            )
        )

    # helper: find container shape for alignment
    def find_container(tb: List[int]) -> Optional[List[int]]:
        x0, y0, x1, y1 = tb
        best = None
        best_area = None
        for s in shapes:
            sx0, sy0, sx1, sy1 = s.bbox
            if sx0 <= x0 + 2 and sy0 <= y0 + 2 and sx1 >= x1 - 2 and sy1 >= y1 - 2:
                area = (sx1 - sx0) * (sy1 - sy0)
                if best is None or area < best_area:
                    best = s.bbox
                    best_area = area
        return best

    # text on top
    for i, t in enumerate(text_lines):
        fs = estimate_font_size_from_bbox(t.bbox)
        fw = estimate_font_weight(img_bgr, t.bbox)
        fill = estimate_text_fill(img_bgr, t.bbox)
        container = find_container(t.bbox)
        align = guess_align(t.bbox, canvas_w=W, container_bbox=container)

        stroke_w, stroke_c, shadow = detect_stroke_and_shadow(img_bgr, t.bbox)

        layers.append(
            FabricLayer(
                id=f"text-{i+1}",
                type="TEXT",
                name="文字",
                x=int(t.bbox[0]),
                y=int(t.bbox[1]),
                width=int(t.bbox[2] - t.bbox[0]),
                height=int(t.bbox[3] - t.bbox[1]),
                opacity=1,
                rotation=0,
                locked=False,
                hidden=False,
                zIndex=100 + i,
                data={"text": t.text, "textAutoSize": "fixed", "groupId": t.group_id, "score": t.score},
                style={
                    "fontFamily": settings.default_font_family,
                    "fontSize": fs,
                    "fontWeight": fw,
                    "fontStyle": "normal",
                    "underline": False,
                    "fill": fill,
                    "align": align,
                    "stroke": stroke_c,
                    "strokeWidth": stroke_w,
                    "shadow": shadow,
                    "lineHeight": settings.default_line_height,
                    "letterSpacing": 0,
                },
            )
        )

    layers.sort(key=lambda l: int(l.zIndex))
    debug = {
        "layers_count": len(layers),
        "shape_count": len(shapes),
        "text_count": len(text_lines),
    }
    return layers, debug
