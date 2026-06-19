from __future__ import annotations

import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from config import FEATURE_CHAT_DIR, qdrant_collection_for_project
from schemas import PreparationRequest


@dataclass
class FeatureChatRagBundle:
    query_module: Any
    embedder: Any
    client: Any
    collection: str
    records: list[Any]
    bm25: Any
    loaded_at: float


feature_chat_rag_bundles: dict[str, FeatureChatRagBundle] = {}


def load_feature_chat_rag(*, project_id: Any = None, collection_name: str | None = None) -> FeatureChatRagBundle:
    collection = collection_name or qdrant_collection_for_project(project_id)
    ttl_sec = int(os.getenv("RAG_CORPUS_TTL_SEC", "300"))
    cached = feature_chat_rag_bundles.get(collection)
    if cached is not None and (
        ttl_sec <= 0 or time.monotonic() - cached.loaded_at < ttl_sec
    ):
        return cached

    if not FEATURE_CHAT_DIR.exists():
        raise RuntimeError(f"Feature chat RAG directory was not found: {FEATURE_CHAT_DIR}")
    module_path = FEATURE_CHAT_DIR / "rag_search.py"
    if not module_path.exists():
        legacy_path = FEATURE_CHAT_DIR / "04_query_qdrant_openai.py"
        module_path = legacy_path if legacy_path.exists() else module_path
    if not module_path.exists():
        raise RuntimeError(f"RAG search module was not found: {module_path}")

    if str(FEATURE_CHAT_DIR) not in sys.path:
        sys.path.insert(0, str(FEATURE_CHAT_DIR))

    import importlib.util
    from rank_bm25 import BM25Okapi
    from rag.embeddings import DEFAULT_HF_EMBEDDING_MODEL, make_embedder
    from rag.qdrant_store import collection_exists, config_from_env, count_points, make_client

    spec = importlib.util.spec_from_file_location("runpod_feature_chat_query", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {module_path}")
    query_module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = query_module
    spec.loader.exec_module(query_module)

    dimensions = os.getenv("RAG_EMBEDDING_DIMENSIONS")
    embedder = make_embedder(
        provider=os.getenv("RAG_EMBEDDING_PROVIDER", os.getenv("EMBEDDING_PROVIDER", "huggingface")),
        model=os.getenv("RAG_EMBEDDING_MODEL") or os.getenv("EMBEDDING_MODEL_ID", DEFAULT_HF_EMBEDDING_MODEL),
        dimensions=int(dimensions) if dimensions else None,
        device=os.getenv("RAG_EMBEDDING_DEVICE", "auto"),
        embedding_backend=os.getenv("RAG_HF_EMBEDDING_BACKEND", "transformers"),
    )
    config = config_from_env(
        os.getenv("QDRANT_URL"),
        os.getenv("QDRANT_API_KEY"),
        collection,
        os.getenv("QDRANT_PREFER_GRPC", "false").lower() == "true",
    )
    client = make_client(config)
    if collection_exists(client, config.collection) and count_points(client, config.collection) > 0:
        records = query_module.load_corpus(client, config.collection)
        bm25 = BM25Okapi([query_module.tokenize(query_module.retrieval_text(record)) for record in records])
    else:
        records = []
        bm25 = None

    bundle = FeatureChatRagBundle(
        query_module=query_module,
        embedder=embedder,
        client=client,
        collection=config.collection,
        records=records,
        bm25=bm25,
        loaded_at=time.monotonic(),
    )
    feature_chat_rag_bundles[collection] = bundle
    return bundle


def invalidate_feature_chat_rag(*, project_id: Any = None, collection_name: str | None = None) -> None:
    if project_id is None and collection_name is None:
        feature_chat_rag_bundles.clear()
        return
    collection = collection_name or qdrant_collection_for_project(project_id)
    feature_chat_rag_bundles.pop(collection, None)


def _clean_id(value: Any) -> str | None:
    text = str(value or "").strip()
    return text or None


def _source_types_for_scope(scope: str, source_types: list[str] | None = None) -> list[str]:
    explicit = [str(item).strip() for item in source_types or [] if str(item).strip()]
    if explicit:
        return explicit
    normalized_scope = (scope or "project").strip().lower()
    if normalized_scope in {"internal", "internal_document", "internal_documents"}:
        return ["internal_document"]
    if normalized_scope in {"meeting", "meeting_minutes", "previous_meeting", "previous_meetings"}:
        return ["meeting_minutes"]
    if normalized_scope in {"current_meeting", "current"}:
        return ["meeting_minutes"]
    if normalized_scope in {"external", "external_news", "news"}:
        return ["external_news"]
    return ["meeting_minutes", "internal_document"]


def _skip_rerank_default() -> bool:
    explicit = os.getenv("RAG_SKIP_RERANK")
    if explicit is not None:
        return explicit.lower() == "true"
    return not bool(os.getenv("COHERE_API_KEY") or os.getenv("CO_API_KEY"))


ALL_MEETING_SCOPE_KEYWORDS = (
    "전체 회의록",
    "모든 회의",
    "전체 회의",
    "지금까지",
    "그동안",
    "여태",
    "전부",
)
LAST_MEETING_SCOPE_KEYWORDS = (
    "지난번",
    "저번",
    "직전",
    "마지막 회의",
    "최근 회의",
)
EXPLICIT_TIME_SCOPE_RE = re.compile(
    r"(\d{4}[-./년]\s*\d{1,2}[-./월]\s*\d{1,2}일?|\d{1,2}\s*월\s*\d{1,2}\s*일|"
    r"오늘|어제|그제|지난주|지난 주|저번주|저번 주|이번주|이번 주|지난달|지난 달|"
    r"\d+\s*일\s*전|\d+\s*주\s*전|\d+\s*개월\s*전)"
)
FULL_DATE_RE = re.compile(r"(?P<year>\d{4})\s*(?:[-./년])\s*(?P<month>\d{1,2})\s*(?:[-./월])\s*(?P<day>\d{1,2})\s*일?")
MONTH_DAY_RE = re.compile(r"(?<!\d)(?P<month>\d{1,2})\s*월\s*(?P<day>\d{1,2})\s*일")
DAYS_AGO_RE = re.compile(r"(?P<count>\d+)\s*일\s*전")
WEEKS_AGO_RE = re.compile(r"(?P<count>\d+)\s*주\s*전")
MONTHS_AGO_RE = re.compile(r"(?P<count>\d+)\s*개월\s*전")


def _reference_date() -> date:
    raw = os.getenv("RAG_REFERENCE_DATE", "").strip()
    if raw:
        try:
            return date.fromisoformat(raw)
        except ValueError:
            pass
    return date.today()


def _safe_date(year: int, month: int, day: int) -> date | None:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _month_range(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)
    return start, end


def _shift_month(base: date, months: int) -> tuple[int, int]:
    month_index = base.year * 12 + (base.month - 1) + months
    return month_index // 12, month_index % 12 + 1


def _meeting_date_scope(question: str) -> tuple[str | None, str | None]:
    query = str(question or "")
    today = _reference_date()

    full_match = FULL_DATE_RE.search(query)
    if full_match:
        target = _safe_date(
            int(full_match.group("year")),
            int(full_match.group("month")),
            int(full_match.group("day")),
        )
        if target:
            return target.isoformat(), target.isoformat()

    month_day_match = MONTH_DAY_RE.search(query)
    if month_day_match:
        target = _safe_date(today.year, int(month_day_match.group("month")), int(month_day_match.group("day")))
        if target and target > today + timedelta(days=31):
            target = _safe_date(today.year - 1, target.month, target.day)
        if target:
            return target.isoformat(), target.isoformat()

    days_ago_match = DAYS_AGO_RE.search(query)
    if days_ago_match:
        target = today - timedelta(days=int(days_ago_match.group("count")))
        return target.isoformat(), target.isoformat()

    weeks_ago_match = WEEKS_AGO_RE.search(query)
    if weeks_ago_match:
        count = int(weeks_ago_match.group("count"))
        start = today - timedelta(days=today.weekday() + 7 * count)
        end = start + timedelta(days=6)
        return start.isoformat(), end.isoformat()

    months_ago_match = MONTHS_AGO_RE.search(query)
    if months_ago_match:
        year, month = _shift_month(today, -int(months_ago_match.group("count")))
        start, end = _month_range(year, month)
        return start.isoformat(), end.isoformat()

    if "오늘" in query:
        return today.isoformat(), today.isoformat()
    if "어제" in query:
        target = today - timedelta(days=1)
        return target.isoformat(), target.isoformat()
    if "그제" in query:
        target = today - timedelta(days=2)
        return target.isoformat(), target.isoformat()
    if "지난주" in query or "지난 주" in query or "저번주" in query or "저번 주" in query:
        start = today - timedelta(days=today.weekday() + 7)
        end = start + timedelta(days=6)
        return start.isoformat(), end.isoformat()
    if "이번주" in query or "이번 주" in query:
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        return start.isoformat(), end.isoformat()
    if "지난달" in query or "지난 달" in query:
        year, month = _shift_month(today, -1)
        start, end = _month_range(year, month)
        return start.isoformat(), end.isoformat()

    return None, None


def _meeting_scope_limit(question: str, requested_limit: int | None) -> int:
    query = str(question or "")
    default_limit = int(os.getenv("RAG_MAX_PREVIOUS_MEETINGS", "5"))
    base_limit = requested_limit if requested_limit is not None else default_limit

    if any(keyword in query for keyword in ALL_MEETING_SCOPE_KEYWORDS):
        return 0
    if any(keyword in query for keyword in LAST_MEETING_SCOPE_KEYWORDS):
        return min(int(base_limit or default_limit), int(os.getenv("RAG_LAST_PREVIOUS_MEETINGS", "3")))
    if EXPLICIT_TIME_SCOPE_RE.search(query):
        return 0
    return int(base_limit or default_limit)


def _search_args(
    module: Any,
    question: str,
    *,
    top_k: int,
    prefix: str = "RAG",
    project_id: Any = None,
    meeting_id: Any = None,
    source_scope: str = "project",
    source_types: list[str] | None = None,
    max_previous_meetings: int | None = None,
    min_relevance_score: float | None = None,
) -> Any:
    normalized_scope = (source_scope or "project").strip().lower()
    selected_source_types = _source_types_for_scope(normalized_scope, source_types)
    use_project_filter = normalized_scope not in {"all", "global"}
    where_meeting_id = _clean_id(meeting_id) if normalized_scope in {"current", "current_meeting"} else None
    exclude_meeting_id = None
    if _clean_id(meeting_id) and "meeting_minutes" in selected_source_types and where_meeting_id is None:
        exclude_meeting_id = _clean_id(meeting_id)
    requested_meeting_limit = (
        int(max_previous_meetings)
        if max_previous_meetings is not None
        else int(os.getenv(f"{prefix}_MAX_PREVIOUS_MEETINGS", os.getenv("RAG_MAX_PREVIOUS_MEETINGS", "5")))
    )
    effective_meeting_limit = 0 if normalized_scope in {"all", "global"} else _meeting_scope_limit(question, requested_meeting_limit)
    meeting_date_from, meeting_date_to = _meeting_date_scope(question)
    return module.argparse.Namespace(
        query=question,
        top_k=top_k,
        dense_k=int(os.getenv(f"{prefix}_DENSE_K", str(max(20, top_k * 4)))),
        dense_fetch_k=int(os.getenv(f"{prefix}_DENSE_FETCH_K", str(max(50, top_k * 8)))),
        bm25_k=int(os.getenv(f"{prefix}_BM25_K", str(max(20, top_k * 4)))),
        rrf_k=int(os.getenv("RAG_RRF_K", "60")),
        rrf_top_k=int(os.getenv(f"{prefix}_RRF_TOP_K", str(max(20, top_k * 4)))),
        rerank_top_n=int(os.getenv("RAG_RERANK_TOP_N", str(max(10, top_k * 2)))),
        where_doc_id=os.getenv("RAG_WHERE_DOC_ID") or None,
        where_source_contains=os.getenv("RAG_INTERNAL_DOCUMENT_SOURCE_CONTAINS") if prefix == "RAG" else None,
        where_project_id=_clean_id(project_id) if use_project_filter else None,
        where_meeting_id=where_meeting_id,
        exclude_meeting_id=exclude_meeting_id,
        source_types=",".join(selected_source_types),
        max_previous_meetings=effective_meeting_limit,
        requested_max_previous_meetings=requested_meeting_limit,
        meeting_date_from=meeting_date_from,
        meeting_date_to=meeting_date_to,
        min_relevance_score=float(
            min_relevance_score
            if min_relevance_score is not None
            else os.getenv(f"{prefix}_MIN_RELEVANCE_SCORE", os.getenv("RAG_MIN_RELEVANCE_SCORE", "0"))
        ),
        exclude_chunk_types=os.getenv("RAG_EXCLUDE_CHUNK_TYPES", "image_caption,chart_caption"),
        skip_rerank=_skip_rerank_default(),
        cohere_model=os.getenv("COHERE_RERANK_MODEL", "rerank-v3.5"),
        max_tokens_per_doc=int(os.getenv("RAG_MAX_TOKENS_PER_DOC", "4096")),
    )


def feature_chat_retrieve(
    question: str,
    *,
    project_id: Any = None,
    meeting_id: Any = None,
    source_scope: str = "project",
    source_types: list[str] | None = None,
    max_previous_meetings: int | None = None,
    min_relevance_score: float | None = None,
) -> dict[str, Any]:
    bundle = load_feature_chat_rag(project_id=project_id)
    module = bundle.query_module
    top_k = int(os.getenv("CHAT_RAG_TOP_K", "5"))
    args = _search_args(
        module,
        question,
        top_k=top_k,
        project_id=project_id,
        meeting_id=meeting_id,
        source_scope=source_scope,
        source_types=source_types,
        max_previous_meetings=max_previous_meetings,
        min_relevance_score=min_relevance_score,
    )
    if "external_news" in str(args.source_types).split(","):
        return {"context": "", "sources": [], "hit_count": 0, "collection": bundle.collection}
    if not bundle.records:
        return {"context": "", "sources": [], "hit_count": 0, "collection": bundle.collection}
    hits = module.retrieve(args, bundle.embedder, bundle.client, bundle.collection, bundle.records, bundle.bm25)
    return {
        "context": module.build_context(hits, int(os.getenv("CHAT_RAG_MAX_CONTEXT_CHARS", "9000"))),
        "sources": module.answer_source_references(hits),
        "hit_count": len(hits),
        "collection": bundle.collection,
    }


def preparation_query(req: PreparationRequest) -> str:
    participant_text = " ".join(
        f"{item.get('name', '')} {item.get('work', '')}" if isinstance(item, dict) else str(item)
        for item in req.participants
    )
    agenda_text = " ".join(str(item) for item in req.agendas)
    return " ".join(
        part.strip()
        for part in [req.title, getattr(req, "project_context", ""), participant_text, agenda_text]
        if part and part.strip()
    )


def preparation_news_query(req: PreparationRequest) -> str:
    agenda_text = " ".join(str(item) for item in req.agendas)
    return " ".join(
        part.strip()
        for part in [req.title, agenda_text]
        if part and part.strip()
    )


def feature_chat_search_hits(
    question: str,
    *,
    top_k: int,
    project_id: Any = None,
    meeting_id: Any = None,
    source_scope: str = "project",
    source_types: list[str] | None = None,
    max_previous_meetings: int | None = None,
) -> list[Any]:
    bundle = load_feature_chat_rag(project_id=project_id)
    module = bundle.query_module
    args = _search_args(
        module,
        question,
        top_k=top_k,
        prefix="PREPARATION_RAG",
        project_id=project_id,
        meeting_id=meeting_id,
        source_scope=source_scope,
        source_types=source_types,
        max_previous_meetings=max_previous_meetings,
    )
    if not bundle.records:
        return []
    return module.retrieve(args, bundle.embedder, bundle.client, bundle.collection, bundle.records, bundle.bm25)


def hit_document_type(hit: Any) -> str:
    meta = getattr(hit, "metadata", {}) if isinstance(getattr(hit, "metadata", {}), dict) else {}
    values = [meta.get("source_type"), meta.get("doc_type"), meta.get("document_type"), meta.get("category")]
    text = " ".join(str(value or "").lower() for value in values)
    if "previous" in text or "meeting_minutes" in text or "previous_meeting" in text:
        return "previous_meeting"
    if "internal" in text or "internal_document" in text:
        return "internal_document"
    return ""


MEETING_PREPARATION_CHUNK_PRIORITY = {
    "meeting_summary": 0,
    "summary": 0,
    "meeting_todo": 1,
    "todo": 1,
    "meeting_document": 2,
    "document": 2,
}


def hit_chunk_type(hit: Any) -> str:
    meta = getattr(hit, "metadata", {}) if isinstance(getattr(hit, "metadata", {}), dict) else {}
    return str(meta.get("chunk_type") or meta.get("section_type") or meta.get("block_type") or "").strip()


def prioritize_meeting_hits(hits: list[Any]) -> list[Any]:
    def sort_key(indexed_hit: tuple[int, Any]) -> tuple[int, int]:
        index, hit = indexed_hit
        chunk_type = hit_chunk_type(hit).lower()
        priority = MEETING_PREPARATION_CHUNK_PRIORITY.get(chunk_type, 99)
        return priority, index

    return [hit for _, hit in sorted(enumerate(hits), key=sort_key)]


def hit_to_preparation_document(hit: Any, category: str, *, project_id: Any = None) -> dict[str, Any]:
    module = load_feature_chat_rag(project_id=project_id).query_module
    meta = getattr(hit, "metadata", {}) if isinstance(getattr(hit, "metadata", {}), dict) else {}
    text = module.normalize_context_text(str(getattr(hit, "document", "") or ""))
    return {
        "category": category,
        "source": module.source_label(meta),
        "text": text[: int(os.getenv("PREPARATION_DOC_MAX_CHARS", "1200"))],
        "chunk_id": str(getattr(hit, "chunk_id", "")),
        "rank": int(getattr(hit, "rank", 0) or 0),
        "score": float(getattr(hit, "score", 0.0) or 0.0),
        "metadata": {
            key: meta.get(key)
            for key in [
                "source_type",
                "doc_type",
                "document_type",
                "category",
                "chunk_type",
                "section_type",
                "project_id",
                "meeting_id",
                "meeting_topic",
                "meeting_datetime",
                "document_id",
                "viewer_type",
                "viewer_id",
                "storage_key",
                "s3_key",
                "s3_url",
                "source",
                "file_name",
                "source_filename",
                "page",
                "page_idx",
                "page_no",
                "page_number",
                "page_start",
                "page_end",
            ]
            if meta.get(key) is not None
        },
    }


def select_preparation_documents(req: PreparationRequest) -> dict[str, Any]:
    base_query = preparation_query(req)
    default_top_k = int(os.getenv("PREPARATION_RAG_TOP_K", "3"))
    previous_top_k = int(os.getenv("PREPARATION_PREVIOUS_MEETINGS_TOP_K", str(default_top_k)))
    internal_top_k = int(os.getenv("PREPARATION_INTERNAL_DOCUMENTS_TOP_K", str(default_top_k)))
    fetch_k = int(os.getenv("PREPARATION_RAG_FETCH_K", str(max(20, max(previous_top_k, internal_top_k) * 6))))
    project_id = getattr(req, "project_id", "")
    meeting_id = getattr(req, "meeting_id", "")
    max_previous_meetings = int(getattr(req, "max_previous_meetings", 5) or 5)
    previous_hits = (
        feature_chat_search_hits(
            f"{base_query} 이전 회의 회의록 결정사항 논의내용 할일 담당자 미완료 이슈",
            top_k=fetch_k,
            project_id=project_id,
            meeting_id=meeting_id,
            source_scope="previous_meetings",
            max_previous_meetings=max_previous_meetings,
        )
        if base_query
        else []
    )
    internal_hits = (
        feature_chat_search_hits(
            f"{base_query} 내부 문서 요구사항 정책 참고자료",
            top_k=fetch_k,
            project_id=project_id,
            meeting_id=meeting_id,
            source_scope="internal_documents",
            max_previous_meetings=max_previous_meetings,
        )
        if base_query
        else []
    )

    docs: dict[str, list[dict[str, Any]]] = {"previous_meetings": [], "internal_documents": []}
    seen = {"previous_meetings": set(), "internal_documents": set()}
    previous_hits = prioritize_meeting_hits(previous_hits)
    for hit, output_key, category in [
        *[(hit, "previous_meetings", "previous_meeting") for hit in previous_hits],
        *[(hit, "internal_documents", "internal_document") for hit in internal_hits],
    ]:
        hit_type = hit_document_type(hit)
        if hit_type and hit_type != category:
            continue
        limit = previous_top_k if output_key == "previous_meetings" else internal_top_k
        chunk_id = str(getattr(hit, "chunk_id", ""))
        if chunk_id in seen[output_key] or len(docs[output_key]) >= limit:
            continue
        seen[output_key].add(chunk_id)
        docs[output_key].append(hit_to_preparation_document(hit, category, project_id=project_id))

    return {"query": base_query, "news_query": preparation_news_query(req), **docs}
