"""Chat and Streaming Data Models."""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class Role(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(BaseModel):
    role: Role
    content: str
    id: Optional[str] = None


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    conversation_id: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=2048, ge=1, le=8192)


class GenerationMetrics(BaseModel):
    ttft_ms: Optional[float] = None
    total_duration_ms: Optional[float] = None
    token_count: int = 0


class MessageStartData(BaseModel):
    request_id: str
    conversation_id: str
    model: str
    provider: str
    created_at: float


class ContentDeltaData(BaseModel):
    request_id: str
    delta: str
    index: int


class MessageCompleteData(BaseModel):
    request_id: str
    content: str
    finish_reason: str = "stop"
    metrics: GenerationMetrics


class ErrorData(BaseModel):
    request_id: str
    error: str
    code: str
    retryable: bool = True


class MessageCancelledData(BaseModel):
    request_id: str
    reason: str = "user_cancelled"
    metrics: GenerationMetrics


class CancelResponse(BaseModel):
    status: str
    message: str
    request_id: str


class HealthResponse(BaseModel):
    status: str
    active_generations: int
    uptime_seconds: float
    provider: str
