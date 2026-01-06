from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional, Tuple
from pydantic import BaseModel, Field


BBox = List[int]  # [x0,y0,x1,y1]


class TextLine(BaseModel):
    id: str
    text: str
    bbox: BBox
    quad: Optional[List[List[float]]] = None
    score: float
    group_id: str = "g0"


class ShapeCandidate(BaseModel):
    id: str
    bbox: BBox
    source: Literal["text_bar", "text_panel", "color_seg", "mask"] = "text_bar"
    score: float = 0.0
    meta: Dict[str, Any] = Field(default_factory=dict)


class ShapeDetected(BaseModel):
    id: str
    bbox: BBox
    semantic: Literal["block", "panel", "pill", "badge", "mask"] = "block"
    fill: str = "#ffffff"
    opacity: float = 1.0
    radius: int = 0
    confidence: float = 0.0
    source: str = "unknown"
    links: Dict[str, Any] = Field(default_factory=dict)  # e.g., texts covered, ratios
    debug: Dict[str, Any] = Field(default_factory=dict)


class FabricLayer(BaseModel):
    id: str
    type: Literal["BG_IMAGE", "SHAPE", "TEXT", "ICON"]
    name: str
    x: int
    y: int
    width: int
    height: int
    opacity: float = 1.0
    rotation: float = 0
    locked: bool = False
    hidden: bool = False
    zIndex: int = 0
    data: Dict[str, Any] = Field(default_factory=dict)
    style: Optional[Dict[str, Any]] = None


class ParseOptions(BaseModel):
    detect_blocks: bool = True
    detect_masks: bool = True
    detect_badges: bool = True
    detect_color_shapes: bool = True
    strict_text_carriers: bool = True  # only keep shapes that carry text
    return_debug: bool = True


class ParseResult(BaseModel):
    width: int
    height: int
    layers: List[FabricLayer]
    debug: Optional[Dict[str, Any]] = None
    elapsedMs: int
