from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from config import EMBEDDING_DEVICE, EMBEDDING_MODEL_ID, EMBEDDING_PROVIDER

from .service import UploadedDocument, ingest_uploaded_documents


router = APIRouter(prefix="/internal-docs", tags=["internal-docs"])
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


@router.post("/ingest")
async def ingest_internal_documents(
    files: list[UploadFile] = File(...),
    metadata: str = Form("{}"),
    project_id: str = Form(""),
    qdrant_url: str | None = Form(None),
    qdrant_api_key: str | None = Form(None),
    collection: str | None = Form(None),
    embedding_provider: str = Form(EMBEDDING_PROVIDER),
    embedding_model: str | None = Form(EMBEDDING_MODEL_ID),
    device: str = Form(EMBEDDING_DEVICE),
    reset: bool = Form(False),
    skip_existing: bool = Form(True),
    require_cuda: bool = Form(True),
    keep_outputs: bool = Form(False),
    embed_batch_size: int = Form(16),
    upsert_batch_size: int = Form(128),
) -> dict[str, Any]:
    uploads: list[UploadedDocument] = []
    for file in files:
        filename = file.filename or ""
        if not any(filename.lower().endswith(extension) for extension in ALLOWED_EXTENSIONS):
            raise HTTPException(status_code=400, detail=f"Only PDF, DOCX, and TXT files are supported: {filename}")
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail=f"Uploaded file is empty: {filename}")
        uploads.append(UploadedDocument(filename=filename, content=content))

    try:
        result = await run_in_threadpool(
            ingest_uploaded_documents,
            uploads,
            metadata,
            qdrant_url,
            qdrant_api_key,
            collection,
            embedding_provider,
            embedding_model,
            device,
            reset,
            skip_existing,
            require_cuda,
            keep_outputs,
            embed_batch_size,
            upsert_batch_size,
            project_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal document ingest failed: {exc}") from exc

    return {"result": result}
