"""Tests for OpenAI-Compatible Provider with mocked HTTP streaming."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.models.chat import ChatMessage, Role
from app.providers.openai_provider import OpenAIProvider


@pytest.mark.asyncio
async def test_openai_provider_missing_key():
    provider = OpenAIProvider(api_key="", base_url="https://api.openai.com/v1")
    messages = [ChatMessage(role=Role.USER, content="Hello")]

    with pytest.raises(ValueError) as exc:
        async for _ in provider.stream_chat(messages=messages, model="gpt-4o-mini"):
            pass

    assert "OPENAI_API_KEY is not configured" in str(exc.value)


@pytest.mark.asyncio
async def test_openai_provider_successful_stream():
    provider = OpenAIProvider(api_key="sk-test-key", base_url="https://api.openai.com/v1")
    messages = [ChatMessage(role=Role.USER, content="Hello")]

    # Simulated SSE lines from OpenAI
    sse_lines = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"role":"assistant","content":""}}]}',
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"Hello"}}]}',
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":" world!"}}]}',
        'data: [DONE]',
    ]

    async def mock_aiter_lines():
        for line in sse_lines:
            yield line

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.aiter_lines = mock_aiter_lines

    mock_stream_ctx = MagicMock()
    mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_response)
    mock_stream_ctx.__aexit__ = AsyncMock(return_value=None)

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.stream = MagicMock(return_value=mock_stream_ctx)

    with patch("httpx.AsyncClient", return_value=mock_client):
        chunks = []
        async for chunk in provider.stream_chat(messages=messages, model="gpt-4o-mini"):
            chunks.append(chunk.delta)

        assert "".join(chunks) == "Hello world!"


@pytest.mark.asyncio
async def test_openai_provider_upstream_error():
    provider = OpenAIProvider(api_key="sk-test-key", base_url="https://api.openai.com/v1")
    messages = [ChatMessage(role=Role.USER, content="Hello")]

    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.aread = AsyncMock(return_value=b'{"error": {"message": "Invalid API key"}}')

    mock_stream_ctx = MagicMock()
    mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_response)
    mock_stream_ctx.__aexit__ = AsyncMock(return_value=None)

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.stream = MagicMock(return_value=mock_stream_ctx)

    with patch("httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError) as exc_info:
            async for _ in provider.stream_chat(messages=messages, model="gpt-4o-mini"):
                pass

        assert "HTTP 401" in str(exc_info.value)
        assert "Invalid API key" in str(exc_info.value)
