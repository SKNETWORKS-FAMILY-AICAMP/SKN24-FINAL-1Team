from __future__ import annotations

import gc
from dataclasses import dataclass
from typing import Any

import torch

from config import (
    LOAD_IN_4BIT,
    OCR_MODEL_ID,
    TORCH_DTYPE,
)

try:
    from qwen_vl_utils import process_vision_info
except Exception:  # pragma: no cover - optional until qwen OCR backend is used.
    process_vision_info = None


@dataclass
class OcrBundle:
    model: Any
    processor: Any


ocr_bundle: OcrBundle | None = None


def dtype_arg() -> str | torch.dtype:
    if TORCH_DTYPE == "auto":
        return "auto"
    return getattr(torch, TORCH_DTYPE)


def cleanup_cuda() -> None:
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def load_ocr_model() -> OcrBundle:
    global ocr_bundle
    if ocr_bundle is not None:
        return ocr_bundle
    if process_vision_info is None:
        raise RuntimeError("qwen-vl-utils is not installed.")

    from transformers import AutoModelForImageTextToText, AutoProcessor, BitsAndBytesConfig

    quantization_config = None
    if LOAD_IN_4BIT:
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True,
        )

    processor = AutoProcessor.from_pretrained(OCR_MODEL_ID, trust_remote_code=True)
    model = AutoModelForImageTextToText.from_pretrained(
        OCR_MODEL_ID,
        device_map="auto",
        torch_dtype=dtype_arg(),
        quantization_config=quantization_config,
        trust_remote_code=True,
    )
    ocr_bundle = OcrBundle(model=model, processor=processor)
    return ocr_bundle
