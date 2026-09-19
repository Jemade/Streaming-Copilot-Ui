"""Tests for GenerationManager lifecycle tracking and metrics."""

import asyncio
import time
import pytest
from app.services.generation_manager import GenerationManager


def test_generation_manager_registration():
    mgr = GenerationManager()
    ctx = mgr.register("req-1", "conv-1", "development", "test-model")

    assert ctx.request_id == "req-1"
    assert ctx.conversation_id == "conv-1"
    assert ctx.status == "running"
    assert mgr.active_count == 1


def test_generation_manager_ttft_and_completion():
    mgr = GenerationManager()
    mgr.register("req-2", "conv-2", "development", "test-model")

    time.sleep(0.01)
    ttft = mgr.record_first_token("req-2")
    assert ttft is not None
    assert ttft >= 10.0  # At least 10ms

    mgr.record_token("req-2")
    mgr.record_token("req-2")

    time.sleep(0.01)
    metrics = mgr.record_completion("req-2")
    assert metrics.ttft_ms is not None
    assert metrics.total_duration_ms is not None
    assert metrics.total_duration_ms >= metrics.ttft_ms
    assert metrics.token_count == 2
    assert mgr.active_count == 0


@pytest.mark.asyncio
async def test_generation_manager_cancellation():
    mgr = GenerationManager()
    mgr.register("req-3", "conv-3", "development", "test-model")

    async def dummy_task():
        await asyncio.sleep(5)

    task = asyncio.create_task(dummy_task())
    mgr.set_task("req-3", task)

    cancelled = mgr.cancel("req-3")
    assert cancelled is True
    assert task.cancelled() or task.cancelling()

    metrics = mgr.record_cancellation("req-3")
    assert metrics.token_count == 0
    ctx = mgr.get_context("req-3")
    assert ctx.status == "cancelled"
    assert mgr.active_count == 0

    try:
        await task
    except asyncio.CancelledError:
        pass
