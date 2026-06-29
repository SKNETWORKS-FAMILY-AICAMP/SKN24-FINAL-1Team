from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class MinutesRequest(BaseModel):
    text: str = Field(..., description="STT transcript text.")
    meeting_id: str = ""
    title: str = ""
    meeting_datetime: str = ""
    location: str = ""


class AgendaRequest(BaseModel):
    title: str
    previous_summary: str = ""
    ocr_text: str = ""


class PreparationRequest(BaseModel):
    title: str
    meeting_datetime: str = ""
    location: str = ""
    participants: list[dict[str, str]] = Field(default_factory=list)
    agendas: list[str] = Field(default_factory=list)
    previous_meetings: list[dict[str, str]] = Field(default_factory=list)
    internal_documents: list[dict[str, str]] = Field(default_factory=list)
    external_documents: list[dict[str, str]] = Field(default_factory=list)
    external_news: list[dict[str, str]] = Field(default_factory=list)


class ChatRequest(BaseModel):
    question: str
    context: str = ""
    history: list[dict[str, str]] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)


class TextResponse(BaseModel):
    result: Any
    elapsed_sec: float
    model: str
