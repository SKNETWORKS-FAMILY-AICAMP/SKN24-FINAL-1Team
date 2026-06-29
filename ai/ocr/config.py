from __future__ import annotations

import os
import importlib.util
from pathlib import Path


APP_DIR = Path(__file__).resolve().parent
ROOT_DIR = APP_DIR.parent


def load_env_files() -> None:
    candidates = [
        APP_DIR / ".env",
        ROOT_DIR / ".env",
        Path("/workspace/final_1team/runpod/.env"),
        Path("/workspace/final_1team/.env"),
        Path("/workspace/runpod/.env"),
        Path("/workspace/.env"),
    ]
    for path in candidates:
        if not path.exists():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_files()

if os.getenv("HF_HUB_ENABLE_HF_TRANSFER") == "1" and importlib.util.find_spec("hf_transfer") is None:
    os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "0"


OCR_BACKEND = os.getenv("OCR_BACKEND", "paddleocr_vl").lower()
OCR_MODEL_ID = os.getenv("OCR_MODEL_ID", "Qwen/Qwen3-VL-4B-Instruct")
PADDLEOCR_VL_URL = os.getenv("PADDLEOCR_VL_URL", "http://127.0.0.1:8080").rstrip("/")
PADDLEOCR_VL_TIMEOUT_SEC = int(os.getenv("PADDLEOCR_VL_TIMEOUT_SEC", "600"))
PADDLEOCR_VL_RETURN_MARKDOWN_IMAGES = os.getenv("PADDLEOCR_VL_RETURN_MARKDOWN_IMAGES", "false").lower() == "true"
PADDLEOCR_VL_VISUALIZE = os.getenv("PADDLEOCR_VL_VISUALIZE", "false").lower() == "true"

LOAD_IN_4BIT = os.getenv("LOAD_IN_4BIT", "true").lower() == "true"
TORCH_DTYPE = os.getenv("TORCH_DTYPE", "auto")
MAX_NEW_TOKENS = int(os.getenv("MAX_NEW_TOKENS", "2048"))
PRELOAD_OCR_MODEL = os.getenv("PRELOAD_OCR_MODEL", "false").lower() == "true"
