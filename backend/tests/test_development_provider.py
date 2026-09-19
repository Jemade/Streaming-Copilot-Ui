"""Tests for the Deterministic Development Streaming Provider."""

import asyncio
import pytest
from app.models.chat import ChatMessage, Role
from app.providers.development import DevelopmentProvider


@pytest.mark.asyncio
async def test_development_provider_streams_chunks():
    provider = DevelopmentProvider(token_delay_ms=1)
    messages = [ChatMessage(role=Role.USER, content="Hello, explain streaming")]

    chunks = []
    async for chunk in provider.stream_chat(messages=messages, model="test-model"):
        chunks.append(chunk.delta)

    full_text = "".join(chunks)
    assert len(chunks) > 1
    assert "StreamCopilot" in full_text
    assert "Hello, explain streaming" in full_text


@pytest.mark.asyncio
async def test_development_provider_failure_trigger():
    provider = DevelopmentProvider(token_delay_ms=1)
    messages = [ChatMessage(role=Role.USER, content="Please /fail this request")]

    emitted = []
    with pytest.raises(RuntimeError) as exc_info:
        async for chunk in provider.stream_chat(messages=messages, model="test-model"):
            emitted.append(chunk.delta)

    assert len(emitted) > 0  # Emitted initial tokens before failure
    assert "Upstream provider error" in str(exc_info.value)


@pytest.mark.asyncio
async def test_development_provider_timeout_trigger():
    provider = DevelopmentProvider(token_delay_ms=1)
    messages = [ChatMessage(role=Role.USER, content="Please trigger /timeout")]

    with pytest.raises(TimeoutError) as exc_info:
        async for _ in provider.stream_chat(messages=messages, model="test-model"):
            pass

    assert "timed out" in str(exc_info.value)


@pytest.mark.asyncio
async def test_development_provider_code_trigger():
    provider = DevelopmentProvider(token_delay_ms=1)
    messages = [ChatMessage(role=Role.USER, content="Show me /code")]

    chunks = []
    async for chunk in provider.stream_chat(messages=messages, model="test-model"):
        chunks.append(chunk.delta)

    full_text = "".join(chunks)
    assert "```python" in full_text
    assert "```typescript" in full_text
    assert "async def event_generator" in full_text


@pytest.mark.asyncio
async def test_development_provider_cancellation():
    provider = DevelopmentProvider(token_delay_ms=50)
    messages = [ChatMessage(role=Role.USER, content="Tell me a long story")]

    async def consume():
        chunks = []
        async for chunk in provider.stream_chat(messages=messages, model="test-model"):
            chunks.append(chunk.delta)
            if len(chunks) >= 3:
                # Cancel task
                raise asyncio.CancelledError()
        return chunks

    with pytest.raises(asyncio.CancelledError):
        await consume()
