from __future__ import annotations

import logging
import time
from typing import Any

import torch
from fastapi import FastAPI

from config import (
    EMBEDDING_MODEL_ID,
    PRELOAD_EMBEDDING_MODEL,
    QDRANT_COLLECTION,
    QDRANT_COLLECTION_PREFIX,
    QDRANT_COLLECTION_PROJECT_MODE,
    QDRANT_URL,
    qdrant_collection_for_project,
)
from internal_docs.routes import router as internal_docs_router
from internal_docs.service import preload_embedding_model


logger = logging.getLogger("uvicorn.error")
app = FastAPI(title="HPM Parsed/Internal Docs Server", version="1.0.0")
app.include_router(internal_docs_router)
embedding_model_info: dict[str, Any] | None = None
embedding_model_error: str | None = None


def _torch_cuda_available() -> bool:
    try:
        return bool(torch.cuda.is_available())
    except Exception:
        return False


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "parsed",
        "internal_docs_ingest": True,
        "preload_embedding_model": PRELOAD_EMBEDDING_MODEL,
        "embedding_model_loaded_on_startup": embedding_model_info is not None,
        "embedding_model_info": embedding_model_info,
        "embedding_model_error": embedding_model_error,
        "embedding_model": EMBEDDING_MODEL_ID,
        "qdrant_collection": QDRANT_COLLECTION,
        "qdrant_url": QDRANT_URL,
        "project_collection_mode": QDRANT_COLLECTION_PROJECT_MODE,
        "project_collection_prefix": QDRANT_COLLECTION_PREFIX,
        "project_collection_example": qdrant_collection_for_project("example"),
        "torch_cuda": _torch_cuda_available(),
    }


@app.on_event("startup")
def preload_models() -> None:
    global embedding_model_error, embedding_model_info

    if not PRELOAD_EMBEDDING_MODEL:
        logger.info("Embedding model preload disabled; first /internal-docs/ingest request will load it")
        return

    started = time.perf_counter()
    logger.info("Loading embedding model for internal-docs ingest")
    try:
        embedding_model_info = preload_embedding_model()
        embedding_model_error = None
    except Exception as exc:
        embedding_model_error = str(exc)
        logger.exception("Embedding model preload failed")
        raise
    logger.info(
        "Embedding model loaded: model=%s device=%s dimensions=%s elapsed_sec=%.3f",
        embedding_model_info.get("model"),
        embedding_model_info.get("device"),
        embedding_model_info.get("dimensions"),
        time.perf_counter() - started,
    )
