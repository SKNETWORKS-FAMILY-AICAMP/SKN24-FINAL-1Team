from __future__ import annotations

import os
import tempfile
from typing import Any

import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse

from config import (
    STT_BATCH_SIZE,
    STT_COMPUTE_TYPE,
    STT_DEVICE,
    STT_ENABLE_ALIGN,
    STT_ENABLE_DIARIZE,
    STT_MODEL_ID,
    STT_PRELOAD_MODEL,
)
from model_runtime import cleanup_cuda, load_stt_model, transcribe_audio_file


app = FastAPI(title="HPM WhisperX STT Server", version="1.0.0")


def format_timestamp(seconds: float) -> str:
    seconds = max(0, int(seconds))
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60

    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "stt",
        "stt_model": STT_MODEL_ID,
        "stt_device": STT_DEVICE,
        "stt_compute_type": STT_COMPUTE_TYPE,
        "stt_batch_size": STT_BATCH_SIZE,
        "stt_align": STT_ENABLE_ALIGN,
        "stt_diarize": STT_ENABLE_DIARIZE,
        "preload_stt_model": STT_PRELOAD_MODEL,
        "torch_cuda": torch.cuda.is_available(),
    }


@app.on_event("startup")
def preload_models() -> None:
    if STT_PRELOAD_MODEL:
        load_stt_model()


@app.post("/stt", response_class=PlainTextResponse)
@app.post("/transcribe", response_class=PlainTextResponse)
async def stt(
    file: UploadFile = File(...),
    language: str = Form("ko"),
    align: bool = Form(STT_ENABLE_ALIGN),
    diarize: bool = Form(STT_ENABLE_DIARIZE),
    batch_size: int = Form(STT_BATCH_SIZE),
    participants: str = Form(""),
) -> str:
    suffix = os.path.splitext(file.filename or "")[1] or ".webm"
    print("DEBUG FORM diarize:", diarize)
    print("DEBUG FORM language:", language)
    print("DEBUG HF_TOKEN:", bool(os.getenv("HF_TOKEN")))
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        result = transcribe_audio_file(
            tmp_path,
            language=language or None,
            batch_size=batch_size,
            align=align,
            diarize=diarize,
            hf_token=os.getenv("HF_TOKEN"),
        )

        participant_list = [
            name.strip()
            for name in participants.split(",")
            if name.strip()
        ]

        full_text_lines: list[str] = []

        if participant_list:
            full_text_lines.append("[참석자]")
            for name in participant_list:
                full_text_lines.append(f"- {name}")
            full_text_lines.append("")

        full_text_lines.append("[발화 원문]")

        segments = result.get("segments") or []
        print("DIARIZATION_ERROR:", result.get("diarization_error"))
        print("FIRST_SEG:", segments[0] if segments else None)

        for seg in segments:
            speaker_id = (
                seg.get("speaker")
                or seg.get("speaker_id")
                or seg.get("label")
                or "화자미분리"
            )

            start = float(seg.get("start") or 0)
            start_ts = format_timestamp(start)

            text = str(seg.get("text") or "").strip()

            if not text:
                continue

            full_text_lines.append(f"[{start_ts}] {speaker_id}: {text}")

        return "\n".join(full_text_lines)

    except Exception as exc:
        cleanup_cuda()
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass