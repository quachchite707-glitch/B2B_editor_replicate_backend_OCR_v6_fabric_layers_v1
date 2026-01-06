from __future__ import annotations
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- runtime ---
    host: str = "127.0.0.1"
    port: int = 8001

    # --- OCR ---
    ocr_lang: str = "ch"
    ocr_use_angle_cls: bool = True

    # --- preprocess ---
    long_side: int = 1400  # resize long side for stability
    keep_original_size: bool = True

    # --- candidate generation ---
    enable_color_seg_candidates: bool = True
    enable_mask_candidates: bool = True

    # Text-driven expansion (relative to text bbox)
    bar_pad_x_ratio: float = 0.10
    bar_pad_y_ratio: float = 0.65
    bar_pad_x_min: int = 8
    bar_pad_x_max: int = 60
    bar_pad_y_min: int = 6
    bar_pad_y_max: int = 50

    panel_pad_x_ratio: float = 0.12
    panel_pad_y_ratio: float = 0.40
    panel_pad_x_min: int = 12
    panel_pad_x_max: int = 90
    panel_pad_y_min: int = 10
    panel_pad_y_max: int = 90

    # Color segmentation candidates
    color_seg_k: int = 8
    color_seg_resize: int = 360
    color_seg_min_area_ratio: float = 0.006  # filter tiny regions

    # --- filtering (design semantics) ---
    # dominant color ratio threshold inside candidate shape ROI (higher -> more "flat")
    dominant_color_ratio: float = 0.84
    max_shape_area_ratio: float = 0.35
    min_shape_area_ratio: float = 0.002

    # association
    require_text_association: bool = True
    min_text_cover_ratio: float = 0.85  # shape must cover text bbox with this ratio

    # --- classify ---
    pill_aspect_ratio: float = 2.2

    # --- output ---
    default_font_family: str = "SourceHanSansSC"
    default_line_height: float = 1.1

    class Config:
        env_prefix = "POSTER_PARSE_"


settings = Settings()
