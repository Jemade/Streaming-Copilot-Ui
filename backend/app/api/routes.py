"""FastAPI API Routes for StreamCopilot."""

import asyncio
import json
import time
import uuid
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.config import get_settings
from app.models.chat import (
    ChatRequest,
    CancelResponse,
    HealthResponse,
    MessageStartData,
    ContentDeltaData,
    MessageCompleteData,
    ErrorData,
    MessageCancelledData,
)
from app.providers.factory import get_provider
from app.services.generation_manager import generation_manager

router = APIRouter()
settings = get_settings()

START_TIME = time.time()

# In-memory storage for two-stage streaming (POST /v1/chat -> GET /v1/chat/stream/{request_id})
pending_requests: Dict[str, ChatRequest] = {}


def format_sse(event: str, data: dict) -> str:
    """Format an SSE frame conforming to the W3C EventSource standard."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def generate_sse_stream(
    request: ChatRequest,
    request_id: str,
    conversation_id: str,
):
    """Core generator that manages LLM streaming, token metrics, and lifecycle events."""
    model_name = request.model or (settings.OPENAI_MODEL if request.provider == "openai" else "stream-copilot-dev")
    provider_instance = get_provider(request.provider)
    provider_name = provider_instance.name

    # Register in generation manager
    generation_manager.register(
        request_id=request_id,
        conversation_id=conversation_id,
        provider=provider_name,
        model=model_name,
    )

    # Attach current task if available
    try:
        current_task = asyncio.current_task()
        if current_task:
            generation_manager.set_task(request_id, current_task)
    except Exception:
        pass

    # 1. Emit message_start event
    start_data = MessageStartData(
        request_id=request_id,
        conversation_id=conversation_id,
        model=model_name,
        provider=provider_name,
        created_at=time.time(),
    )
    yield format_sse("message_start", start_data.model_dump())

    full_content = []
    token_index = 0

    try:
        async for chunk in provider_instance.stream_chat(
            messages=request.messages,
            model=model_name,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        ):
            # Record TTFT on first token
            if token_index == 0:
                generation_manager.record_first_token(request_id)

            generation_manager.record_token(request_id)
            full_content.append(chunk.delta)

            delta_data = ContentDeltaData(
                request_id=request_id,
                delta=chunk.delta,
                index=token_index,
            )
            yield format_sse("content_delta", delta_data.model_dump())
            token_index += 1

        # 2. Normal completion
        metrics = generation_manager.record_completion(request_id)
        complete_data = MessageCompleteData(
            request_id=request_id,
            content="".join(full_content),
            finish_reason="stop",
            metrics=metrics,
        )
        yield format_sse("message_complete", complete_data.model_dump())

    except asyncio.CancelledError:
        # 3. Stream cancelled
        metrics = generation_manager.record_cancellation(request_id)
        cancel_data = MessageCancelledData(
            request_id=request_id,
            reason="user_cancelled",
            metrics=metrics,
        )
        yield format_sse("message_cancelled", cancel_data.model_dump())
        raise

    except Exception as exc:
        # 4. Error during streaming
        metrics = generation_manager.record_failure(request_id, str(exc))
        error_code = "TIMEOUT_ERROR" if isinstance(exc, TimeoutError) else "PROVIDER_ERROR"
        error_data = ErrorData(
            request_id=request_id,
            error=str(exc),
            code=error_code,
            retryable=True,
        )
        yield format_sse("error", error_data.model_dump())


@router.post("/v1/chat/stream")
async def chat_stream(request: ChatRequest):
    """Direct SSE streaming endpoint.
    
    Accepts ChatRequest with messages and returns an active text/event-stream.
    """
    request_id = str(uuid.uuid4())
    conversation_id = request.conversation_id or str(uuid.uuid4())

    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }

    return StreamingResponse(
        generate_sse_stream(request, request_id, conversation_id),
        media_type="text/event-stream",
        headers=headers,
    )


@router.post("/v1/chat", status_code=status.HTTP_201_CREATED)
async def create_chat_generation(request: ChatRequest):
    """Initiate a chat generation task for the two-stage protocol.
    
    Returns request_id and stream_url to subscribe via GET /v1/chat/stream/{request_id}.
    """
    request_id = str(uuid.uuid4())
    conversation_id = request.conversation_id or str(uuid.uuid4())
    pending_requests[request_id] = request

    return {
        "request_id": request_id,
        "conversation_id": conversation_id,
        "stream_url": f"/v1/chat/stream/{request_id}",
    }


@router.get("/v1/chat/stream/{request_id}")
async def get_chat_stream(request_id: str):
    """Subscribe to the SSE stream of a previously initiated generation."""
    request = pending_requests.pop(request_id, None)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Generation request '{request_id}' not found or already consumed.",
        )

    conversation_id = request.conversation_id or str(uuid.uuid4())

    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }

    return StreamingResponse(
        generate_sse_stream(request, request_id, conversation_id),
        media_type="text/event-stream",
        headers=headers,
    )


@router.post("/v1/generations/{generation_id}/cancel", response_model=CancelResponse)
async def cancel_generation(generation_id: str):
    """Explicitly cancel an active streaming generation by ID."""
    success = generation_manager.cancel(generation_id)
    if success:
        return CancelResponse(
            status="cancelled",
            message=f"Generation {generation_id} successfully cancelled.",
            request_id=generation_id,
        )
    return CancelResponse(
        status="not_found",
        message=f"Generation {generation_id} not found or already terminated.",
        request_id=generation_id,
    )


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Service health and operational status."""
    return HealthResponse(
        status="healthy",
        active_generations=generation_manager.active_count,
        uptime_seconds=round(time.time() - START_TIME, 2),
        provider=settings.LLM_PROVIDER,
    )


@router.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
