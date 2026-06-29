from __future__ import annotations

import gc
from dataclasses import dataclass
from typing import Any

import torch

from config import (
    EMBEDDING_BATCH_SIZE,
    EMBEDDING_MODEL_ID,
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


@dataclass
class EmbeddingBundle:
    tokenizer: Any
    model: Any
    device: str
    dimensions: int


ocr_bundle: OcrBundle | None = None
embedding_bundle: EmbeddingBundle | None = None


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


def embed_texts(texts: list[str]) -> list[list[float]]:
    bundle = load_embedding_model()
    return embed_texts_with_model(texts, bundle.tokenizer, bundle.model, bundle.device)
