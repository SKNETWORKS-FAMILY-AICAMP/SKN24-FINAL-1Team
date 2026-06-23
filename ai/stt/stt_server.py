from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import os
import tempfile
import threading
import time
from typing import Any
import uuid

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
STT_JOBS: dict[str, dict[str, Any]] = {}
STT_JOBS_LOCK = threading.Lock()
STT_TASK_LOCK = threading.Lock()
STT_JOB_EXECUTOR = ThreadPoolExecutor(max_workers=int(os.getenv("STT_JOB_WORKERS", "1")))


def _now_ts() -> float:
    return round(time.time(), 3)


def _job_snapshot(job_id: str) -> dict[str, Any]:
    with STT_JOBS_LOCK:
        job = STT_JOBS.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail=f"STT job not found: {job_id}")
        return dict(job)


def _update_stt_job(job_id: str, **updates: Any) -> None:
    with STT_JOBS_LOCK:
        job = STT_JOBS.get(job_id)
        if job is None:
            return
        job.update(updates)
        job["updated_at"] = _now_ts()


def _serialize_error(exc: Exception) -> str:
    if isinstance(exc, HTTPException):
        return str(exc.detail)
    return str(exc)


def format_timestamp(seconds: float) -> str:
    seconds = max(0, int(seconds))
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60

    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def transcribe_audio_bytes(
    file_bytes: bytes,
    filename: str,
    *,
    language: str,
    align: bool,
    diarize: bool,
    batch_size: int,
    participants: str,
) -> str:
    suffix = os.path.splitext(filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        with STT_TASK_LOCK:
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
    except Exception:
        cleanup_cuda()
        raise
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


def _run_stt_job(
    job_id: str,
    file_bytes: bytes,
    filename: str,
    params: dict[str, Any],
) -> None:
    _update_stt_job(job_id, status="running", step="transcribe", started_at=_now_ts())
    started = time.perf_counter()
    try:
        text = transcribe_audio_bytes(file_bytes, filename, **params)
        _update_stt_job(
            job_id,
            status="succeeded",
            step="done",
            result={"text": text},
            elapsed_sec=round(time.perf_counter() - started, 3),
            model=STT_MODEL_ID,
            error=None,
            completed_at=_now_ts(),
        )
    except Exception as exc:
        _update_stt_job(
            job_id,
            status="failed",
            step="failed",
            error=_serialize_error(exc),
            elapsed_sec=round(time.perf_counter() - started, 3),
            completed_at=_now_ts(),
        )


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


@app.post("/stt/jobs", status_code=202)
@app.post("/transcribe/jobs", status_code=202)
async def create_stt_job(
    file: UploadFile = File(...),
    language: str = Form("ko"),
    align: bool = Form(STT_ENABLE_ALIGN),
    diarize: bool = Form(STT_ENABLE_DIARIZE),
    batch_size: int = Form(STT_BATCH_SIZE),
    participants: str = Form(""),
) -> dict[str, Any]:
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail=f"Uploaded file is empty: {file.filename or ''}")

    job_id = uuid.uuid4().hex
    params = {
        "language": language,
        "align": align,
        "diarize": diarize,
        "batch_size": batch_size,
        "participants": participants,
    }
    job = {
        "job_id": job_id,
        "type": "stt",
        "status": "queued",
        "step": "queued",
        "result": None,
        "elapsed_sec": None,
        "model": None,
        "error": None,
        "filename": file.filename or "",
        "created_at": _now_ts(),
        "updated_at": _now_ts(),
        "started_at": None,
        "completed_at": None,
    }
    with STT_JOBS_LOCK:
        STT_JOBS[job_id] = job
    STT_JOB_EXECUTOR.submit(_run_stt_job, job_id, file_bytes, file.filename or "", params)
    return _job_snapshot(job_id)


@app.get("/stt/jobs/{job_id}")
@app.get("/transcribe/jobs/{job_id}")
def get_stt_job(job_id: str) -> dict[str, Any]:
    return _job_snapshot(job_id)


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
    print("DEBUG FORM diarize:", diarize)
    print("DEBUG FORM language:", language)
    print("DEBUG HF_TOKEN:", bool(os.getenv("HF_TOKEN")))
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail=f"Uploaded file is empty: {file.filename or ''}")
    try:
        return transcribe_audio_bytes(
            file_bytes,
            file.filename or "",
            language=language,
            align=align,
            diarize=diarize,
            batch_size=batch_size,
            participants=participants,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
