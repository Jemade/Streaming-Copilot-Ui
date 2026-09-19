"""Integration tests for FastAPI endpoints."""

import json
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "active_generations" in data
        assert "uptime_seconds" in data


@pytest.mark.asyncio
async def test_metrics_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/metrics")
        assert response.status_code == 200
        assert "stream_copilot_requests_total" in response.text


@pytest.mark.asyncio
async def test_chat_stream_direct():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "messages": [{"role": "user", "content": "Hello StreamCopilot"}],
            "provider": "development",
        }
        response = await client.post("/v1/chat/stream", json=payload)
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

        body = response.text
        assert "event: message_start" in body
        assert "event: content_delta" in body
        assert "event: message_complete" in body


@pytest.mark.asyncio
async def test_two_stage_chat_stream():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: POST /v1/chat
        payload = {
            "messages": [{"role": "user", "content": "Tell me about SSE"}],
            "provider": "development",
        }
        res1 = await client.post("/v1/chat", json=payload)
        assert res1.status_code == 201
        data = res1.json()
        assert "request_id" in data
        request_id = data["request_id"]

        # Step 2: GET /v1/chat/stream/{request_id}
        res2 = await client.get(f"/v1/chat/stream/{request_id}")
        assert res2.status_code == 200
        assert "text/event-stream" in res2.headers["content-type"]
        assert "event: message_complete" in res2.text


@pytest.mark.asyncio
async def test_chat_stream_error_handling():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "messages": [{"role": "user", "content": "Please /fail this test"}],
            "provider": "development",
        }
        response = await client.post("/v1/chat/stream", json=payload)
        assert response.status_code == 200
        body = response.text
        assert "event: message_start" in body
        assert "event: error" in body
        assert "PROVIDER_ERROR" in body


@pytest.mark.asyncio
async def test_cancel_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/v1/generations/non-existent-id/cancel")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "not_found"
