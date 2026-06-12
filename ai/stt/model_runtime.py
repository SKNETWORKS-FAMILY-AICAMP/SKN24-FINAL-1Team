from __future__ import annotations

import gc
import json
import os
import re
import tempfile
from dataclasses import dataclass
from typing import Any

import torch

from config import (
    EMBEDDING_BATCH_SIZE,
    EMBEDDING_MODEL_ID,
    LLAMA_N_CTX,
    LLAMA_N_GPU_LAYERS,
    LLAMA_N_THREADS,
    LLAMA_VERBOSE,
    LOAD_IN_4BIT,
    MAX_NEW_TOKENS,
    OCR_MODEL_ID,
    STT_COMPUTE_TYPE,
    STT_DEVICE,
    STT_MODEL_ID,
    TEXT_BACKEND,
    TEXT_GGUF_FILENAME,
    TEXT_GGUF_REPO,
    TORCH_DTYPE,
)

try:
    from qwen_vl_utils import process_vision_info
except Exception:
    process_vision_info = None


@dataclass
class TextBundle:
    llm: Any


@dataclass
class OcrBundle:
    model: Any
    processor: Any


@dataclass
class EmbeddingBundle:
    tokenizer: Any
    model: Any
    device: str
    dimensions: int


@dataclass
class SttBundle:
    model: Any
    device: str
    compute_type: str


text_bundle: TextBundle | None = None
ocr_bundle: OcrBundle | None = None
embedding_bundle: EmbeddingBundle | None = None
stt_bundle: SttBundle | None = None


def dtype_arg() -> str | torch.dtype:
    if TORCH_DTYPE == "auto":
        return "auto"
    return getattr(torch, TORCH_DTYPE)


def cleanup_cuda() -> None:
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def load_text_model() -> TextBundle:
    global text_bundle
    if text_bundle is not None:
        return text_bundle
    if TEXT_BACKEND != "llama_cpp":
        raise RuntimeError(f"Unsupported TEXT_BACKEND: {TEXT_BACKEND}")

    from llama_cpp import Llama

    llm = Llama.from_pretrained(
        repo_id=TEXT_GGUF_REPO,
        filename=TEXT_GGUF_FILENAME,
        n_ctx=LLAMA_N_CTX,
        n_gpu_layers=LLAMA_N_GPU_LAYERS,
        n_threads=LLAMA_N_THREADS,
        verbose=LLAMA_VERBOSE,
    )
    text_bundle = TextBundle(llm=llm)
    return text_bundle


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


def embed_texts_with_model(texts: list[str], tokenizer: Any, model: Any, device: str) -> list[list[float]]:
    vectors = []
    for start in range(0, len(texts), EMBEDDING_BATCH_SIZE):
        batch = texts[start : start + EMBEDDING_BATCH_SIZE]
        encoded = tokenizer(
            batch,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt",
        )
        encoded = {key: value.to(device) for key, value in encoded.items()}
        with torch.inference_mode():
            output = model(**encoded)
        token_embeddings = output.last_hidden_state
        mask = encoded["attention_mask"].unsqueeze(-1).expand(token_embeddings.size()).float()
        pooled = (token_embeddings * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1e-9)
        pooled = torch.nn.functional.normalize(pooled, p=2, dim=1)
        vectors.extend(pooled.cpu().tolist())
    return vectors


def load_embedding_model() -> EmbeddingBundle:
    global embedding_bundle
    if embedding_bundle is not None:
        return embedding_bundle

    from transformers import AutoModel, AutoTokenizer

    device = "cuda" if torch.cuda.is_available() else "cpu"
    tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_ID)
    model = AutoModel.from_pretrained(EMBEDDING_MODEL_ID).to(device)
    model.eval()

    sample = embed_texts_with_model(["dimension probe"], tokenizer, model, device)
    embedding_bundle = EmbeddingBundle(
        tokenizer=tokenizer,
        model=model,
        device=device,
        dimensions=len(sample[0]),
    )
    return embedding_bundle


def load_stt_model() -> SttBundle:
    global stt_bundle
    if stt_bundle is not None:
        return stt_bundle

    import whisperx

    device = STT_DEVICE
    if device == "cuda" and not torch.cuda.is_available():
        device = "cpu"
    compute_type = STT_COMPUTE_TYPE
    if device == "cpu" and compute_type in {"float16", "bfloat16"}:
        compute_type = "int8"

    model = whisperx.load_model(STT_MODEL_ID, device=device, compute_type=compute_type)
    stt_bundle = SttBundle(model=model, device=device, compute_type=compute_type)
    return stt_bundle


# ── VAD로 잡음 제거된 오디오 경로 반환 ──────────────────────────
def apply_vad(audio_path: str) -> str:
    """
    Silero VAD로 무음/잡음 구간을 제거하고
    정제된 임시 wav 파일 경로를 반환합니다.
    실패하면 원본 경로를 그대로 반환합니다.
    """
    try:
        vad_model, utils = torch.hub.load(
            repo_or_dir="snakers4/silero-vad",
            model="silero_vad",
            force_reload=False,
            trust_repo=True,
        )
        get_speech_timestamps, save_audio, read_audio, _, collect_chunks = utils

        wav = read_audio(audio_path, sampling_rate=16000)
        speech_timestamps = get_speech_timestamps(
            wav,
            vad_model,
            sampling_rate=16000,
            threshold=0.5,          # 음성 감지 민감도 (0~1, 높을수록 엄격)
            min_speech_duration_ms=250,   # 250ms 이상 음성만 유지
            min_silence_duration_ms=100,  # 100ms 이상 무음만 제거
        )

        if not speech_timestamps:
            print("VAD: 음성 구간 없음 → 원본 사용")
            return audio_path

        # 임시 파일에 잡음 제거된 오디오 저장
        tmp = tempfile.NamedTemporaryFile(
            delete=False, suffix="_vad.wav"
        )
        tmp.close()
        save_audio(
            tmp.name,
            collect_chunks(speech_timestamps, wav),
            sampling_rate=16000,
        )
        print(f"VAD 완료: {len(speech_timestamps)}개 음성 구간 추출 → {tmp.name}")
        return tmp.name

    except Exception as e:
        print(f"VAD 처리 실패 (원본 사용): {e}")
        return audio_path


def transcribe_audio_file(
    audio_path: str,
    *,
    language: str | None = "ko",
    batch_size: int = 16,
    align: bool = True,
    diarize: bool = False,
    hf_token: str | None = None,
) -> dict[str, Any]:
    import whisperx

    # ── Silero VAD로 잡음 제거 ──────────────────────────────────
    clean_path = apply_vad(audio_path)
    # VAD로 새 파일이 만들어진 경우 나중에 삭제
    vad_created_tmp = (clean_path != audio_path)
    # ────────────────────────────────────────────────────────────

    try:
        bundle = load_stt_model()
        audio = whisperx.load_audio(clean_path)  # ← clean_path 사용
        transcribe_kwargs: dict[str, Any] = {"batch_size": batch_size}
        if language:
            transcribe_kwargs["language"] = language
        result = bundle.model.transcribe(audio, **transcribe_kwargs)

        if align and result.get("segments"):
            try:
                align_model, metadata = whisperx.load_align_model(
                    language_code=result.get("language") or language or "ko",
                    device=bundle.device,
                )
                result = whisperx.align(
                    result["segments"],
                    align_model,
                    metadata,
                    audio,
                    bundle.device,
                    return_char_alignments=False,
                )
            except Exception as exc:
                result["alignment_error"] = str(exc)

        if diarize and result.get("segments"):
            token = hf_token
            if token:
                try:
                    from whisperx.diarize import DiarizationPipeline, assign_word_speakers                           # DiarizationPipeline이 import 가 안되서 직접 import해서 사용
                    diarize_model = DiarizationPipeline(
                        token=token, device=bundle.device
                    )
                    diarize_segments = diarize_model(audio)
                    result = assign_word_speakers(diarize_segments, result)
                except Exception as exc:
                    result["diarization_error"] = str(exc)
            else:
                result["diarization_error"] = "HF token is required for diarization."

        segments = result.get("segments") or []
        text = "\n".join(
            f"{segment.get('speaker', '').strip() + ': ' if segment.get('speaker') else ''}"
            f"{str(segment.get('text') or '').strip()}"
            for segment in segments
            if str(segment.get("text") or "").strip()
        ).strip()
        if not text:
            text = str(result.get("text") or "").strip()

        return {
            "text": text,
            "language": result.get("language") or language,
            "segments": segments,
            "alignment_error": result.get("alignment_error"),
            "diarization_error": result.get("diarization_error"),
            "device": bundle.device,
            "compute_type": bundle.compute_type,
        }

    finally:
        # VAD가 만든 임시 파일 정리
        if vad_created_tmp:
            try:
                os.remove(clean_path)
            except OSError:
                pass


def embed_texts(texts: list[str]) -> list[list[float]]:
    bundle = load_embedding_model()
    return embed_texts_with_model(texts, bundle.tokenizer, bundle.model, bundle.device)


def extract_json(text: str) -> Any:
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        raise ValueError(f"Model did not return JSON: {text[:500]}")
    return json.loads(match.group())


def generate_text(messages: list[dict[str, str]], *, max_new_tokens: int = MAX_NEW_TOKENS) -> str:
    bundle = load_text_model()
    response = bundle.llm.create_chat_completion(
        messages=messages,
        max_tokens=max_new_tokens,
        temperature=0.0,
        top_p=0.95,
        repeat_penalty=1.05,
    )
    return str(response["choices"][0]["message"]["content"]).strip()


def generate_json(messages: list[dict[str, str]], *, max_new_tokens: int = MAX_NEW_TOKENS) -> Any:
    raw = generate_text(messages, max_new_tokens=max_new_tokens)
    try:
        return extract_json(raw)
    except Exception:
        repair_messages = [
            {
                "role": "system",
                "content": "Return valid JSON only. Do not add explanations, markdown, or code fences.",
            },
            {
                "role": "user",
                "content": (
                    "The following model output is intended to be JSON but is invalid. "
                    "Fix only the JSON syntax and preserve the data as much as possible.\n\n"
                    f"{raw}"
                ),
            },
        ]
        return extract_json(generate_text(repair_messages, max_new_tokens=max_new_tokens))