from __future__ import annotations

import base64
import json
import os
import tempfile
import time
from typing import Any

import requests
from fastapi import FastAPI, File, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from config import (
    LOAD_IN_4BIT,
    MAX_NEW_TOKENS,
    OCR_BACKEND,
    OCR_MODEL_ID,
    PADDLEOCR_VL_RETURN_MARKDOWN_IMAGES,
    PADDLEOCR_VL_TIMEOUT_SEC,
    PADDLEOCR_VL_URL,
    PADDLEOCR_VL_VISUALIZE,
    PRELOAD_OCR_MODEL,
)
from schemas import TextResponse


app = FastAPI(title="HPM OCR Server", version="1.0.0")


def _torch_cuda_available() -> bool:
    try:
        import torch

        return bool(torch.cuda.is_available())
    except Exception:
        return False


def _is_pdf(file: UploadFile) -> bool:
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    return filename.endswith(".pdf") or content_type == "application/pdf"


def _extract_paddleocr_text(payload: dict[str, Any]) -> str:
    result = payload.get("result") or {}
    pages = result.get("layoutParsingResults") or []
    texts: list[str] = []

    for page in pages:
        if not isinstance(page, dict):
            continue
        markdown = page.get("markdown") or {}
        if not isinstance(markdown, dict):
            continue
        text = str(markdown.get("text") or "").strip()
        if text:
            texts.append(text)

    if texts:
        return "\n\n".join(texts)

    fallback = result or payload
    return json.dumps(fallback, ensure_ascii=False)


async def _ocr_with_paddleocr_vl(file: UploadFile) -> str:
    file_bytes = await file.read()
    payload = {
        "file": base64.b64encode(file_bytes).decode("ascii"),
        "fileType": 0 if _is_pdf(file) else 1,
        "returnMarkdownImages": PADDLEOCR_VL_RETURN_MARKDOWN_IMAGES,
        "visualize": PADDLEOCR_VL_VISUALIZE,
    }

    try:
        response = await run_in_threadpool(
            requests.post,
            f"{PADDLEOCR_VL_URL}/layout-parsing",
            json=payload,
            timeout=PADDLEOCR_VL_TIMEOUT_SEC,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"PaddleOCR-VL request failed: {exc}") from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"PaddleOCR-VL returned {response.status_code}: {response.text[:1000]}",
        )

    try:
        response_payload = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"PaddleOCR-VL returned non-JSON: {response.text[:1000]}") from exc

    error_code = response_payload.get("errorCode")
    if error_code not in (None, 0):
        raise HTTPException(
            status_code=502,
            detail=f"PaddleOCR-VL error {error_code}: {response_payload.get('errorMsg')}",
        )

    return _extract_paddleocr_text(response_payload)


async def _ocr_with_qwen(file: UploadFile) -> str:
    import torch

    from model_runtime import cleanup_cuda, load_ocr_model, process_vision_info

    bundle = load_ocr_model()
    processor = bundle.processor
    model = bundle.model

    suffix = os.path.splitext(file.filename or "")[1] or ".png"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": tmp_path},
                    {"type": "text", "text": "Extract all readable text from this image or document page."},
                ],
            }
        ]
        text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        image_inputs, video_inputs = process_vision_info(messages)
        inputs = processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        ).to(model.device)
        with torch.inference_mode():
            generated = model.generate(**inputs, max_new_tokens=MAX_NEW_TOKENS)
        generated = generated[:, inputs.input_ids.shape[-1] :]
        return processor.batch_decode(generated, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
    except Exception as exc:
        cleanup_cuda()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "ocr",
        "ocr_backend": OCR_BACKEND,
        "ocr_model": OCR_MODEL_ID,
        "paddleocr_vl_url": PADDLEOCR_VL_URL if OCR_BACKEND == "paddleocr_vl" else None,
        "load_in_4bit": LOAD_IN_4BIT,
        "preload_ocr_model": PRELOAD_OCR_MODEL,
        "torch_cuda": _torch_cuda_available(),
    }


@app.on_event("startup")
def preload_models() -> None:
    if OCR_BACKEND == "qwen" and PRELOAD_OCR_MODEL:
        from model_runtime import load_ocr_model

        load_ocr_model()


@app.post("/ocr", response_model=TextResponse)
async def ocr(file: UploadFile = File(...)) -> TextResponse:
    started = time.perf_counter()

    if OCR_BACKEND == "paddleocr_vl":
        extracted = await _ocr_with_paddleocr_vl(file)
        model_name = "PaddleOCR-VL"
    elif OCR_BACKEND == "qwen":
        extracted = await _ocr_with_qwen(file)
        model_name = OCR_MODEL_ID
    else:
        raise HTTPException(status_code=500, detail=f"Unsupported OCR_BACKEND: {OCR_BACKEND}")

    return TextResponse(
        result={"text": extracted.strip()},
        elapsed_sec=round(time.perf_counter() - started, 3),
        model=model_name,
    )
