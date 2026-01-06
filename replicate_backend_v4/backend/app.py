from __future__ import annotations

import os
import time
from typing import Any, Dict, Optional

# MUST set before importing paddle / paddleocr
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_mkldnn"] = "0"
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from models.schemas import ParseOptions
from pipeline.pipeline import PosterParsePipeline


app = FastAPI(title="PosterParse vNext", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PIPELINE = PosterParsePipeline()


@app.get("/")
def root() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/parse")
async def parse_legacy(
    file: UploadFile = File(...),
    detect_bars: int = Form(1),
) -> JSONResponse:
    """
    Legacy endpoint: returns {width,height,texts,bars:[]}
    """
    t0 = time.time()
    try:
        img_bytes = await file.read()
        # reuse pipeline but only export texts
        res = PIPELINE.run(
            image_bytes=img_bytes,
            asset_url="string",
            options=ParseOptions(
                detect_blocks=False,
                detect_masks=False,
                detect_badges=False,
                detect_color_shapes=False,
                strict_text_carriers=False,
                return_debug=True,
            ),
        )
        texts = res.debug["texts"] if res.debug and "texts" in res.debug else []
        elapsed = int((time.time() - t0) * 1000)
        return JSONResponse({"width": res.width, "height": res.height, "texts": texts, "bars": [], "elapsedMs": elapsed})
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": {"error": "OCR_FAILED", "message": str(e), "hint": "Check deps & MKLDNN disabled."}},
        )


@app.post("/parse_fabric")
async def parse_fabric(
    file: UploadFile = File(...),
    assetUrl: str = Form("string"),
    detect_blocks: int = Form(1),
    detect_masks: int = Form(1),
    detect_badges: int = Form(1),
    detect_color_shapes: int = Form(1),
    strict_text_carriers: int = Form(1),
    return_debug: int = Form(1),
) -> JSONResponse:
    t0 = time.time()
    try:
        img_bytes = await file.read()
        options = ParseOptions(
            detect_blocks=bool(int(detect_blocks)),
            detect_masks=bool(int(detect_masks)),
            detect_badges=bool(int(detect_badges)),
            detect_color_shapes=bool(int(detect_color_shapes)),
            strict_text_carriers=bool(int(strict_text_carriers)),
            return_debug=bool(int(return_debug)),
        )

        res = PIPELINE.run(image_bytes=img_bytes, asset_url=assetUrl, options=options)
        return JSONResponse(res.model_dump())
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "detail": {
                    "error": "PARSE_FAILED",
                    "message": str(e),
                    "hint": "If you see OneDnnContext/fused_conv2d: ensure paddlepaddle==2.6.2 and MKLDNN disabled.",
                }
            },
        )
