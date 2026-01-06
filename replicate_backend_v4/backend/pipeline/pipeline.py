from __future__ import annotations
import time
from typing import Any, Dict, Tuple, Optional, List

import numpy as np

from config import settings
from models.schemas import ParseOptions, ParseResult
from pipeline.preprocess import load_and_preprocess
from pipeline.ocr_engine import OCREngine
from pipeline.text_post import postprocess_text_lines
from pipeline.candidates import generate_candidates
from pipeline.filtering import filter_and_detect_shapes
from pipeline.export.fabric_export import export_fabric_layers


class PosterParsePipeline:
    def __init__(self) -> None:
        self.ocr = OCREngine(lang=settings.ocr_lang, use_angle_cls=settings.ocr_use_angle_cls)

    def run(
        self,
        image_bytes: bytes,
        asset_url: str,
        options: ParseOptions,
    ) -> ParseResult:
        t0 = time.time()

        img_bgr, orig_size, proc_size, scale = load_and_preprocess(
            image_bytes=image_bytes,
            long_side=settings.long_side,
            keep_original_size=settings.keep_original_size,
        )

        H, W = img_bgr.shape[:2]

        # OCR
        raw_lines = self.ocr.extract_text_lines(img_bgr)

        # Text postprocess: merge fragments + group
        text_lines = postprocess_text_lines(raw_lines, canvas_w=W, canvas_h=H)

        # Candidates (multi-source recall)
        candidates, cand_debug = generate_candidates(
            img_bgr=img_bgr,
            text_lines=text_lines,
            options=options,
        )

        # Filter + classify + style
        shapes, shape_debug = filter_and_detect_shapes(
            img_bgr=img_bgr,
            text_lines=text_lines,
            candidates=candidates,
            options=options,
        )

        # Export fabric layers
        layers, export_debug = export_fabric_layers(
            img_bgr=img_bgr,
            asset_url=asset_url,
            text_lines=text_lines,
            shapes=shapes,
        )

        elapsed_ms = int((time.time() - t0) * 1000)

        debug: Optional[Dict[str, Any]] = None
        if options.return_debug:
            debug = {
                "canvas": {"width": W, "height": H, "scale": scale, "orig_size": orig_size, "proc_size": proc_size},
                "texts": [t.model_dump() for t in text_lines],
                "candidates": cand_debug,
                "shapes": [s.model_dump() for s in shapes],
                "shape_debug": shape_debug,
                "export_debug": export_debug,
            }

        return ParseResult(
            width=W,
            height=H,
            layers=layers,
            debug=debug,
            elapsedMs=elapsed_ms,
        )
