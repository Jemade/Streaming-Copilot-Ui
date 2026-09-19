"""Generation Lifecycle Manager and Metrics Tracker."""

import asyncio
import time
from typing import Dict, Optional
from dataclasses import dataclass, field
from prometheus_client import Counter, Histogram, Gauge

from app.models.chat import GenerationMetrics


# Prometheus Metrics
REQUESTS_TOTAL = Counter(
    "stream_copilot_requests_total",
    "Total number of streaming chat requests",
    ["provider", "model", "status"],
)
TTFT_HISTOGRAM = Histogram(
    "stream_copilot_ttft_seconds",
    "Time to first token (seconds)",
    ["provider", "model"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)
DURATION_HISTOGRAM = Histogram(
    "stream_copilot_generation_duration_seconds",
    "Total generation duration (seconds)",
    ["provider", "model"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
)
ACTIVE_STREAMS_GAUGE = Gauge(
    "stream_copilot_active_streams",
    "Number of currently active streaming responses",
)


@dataclass
class GenerationContext:
    request_id: str
    conversation_id: str
    provider: str
    model: str
    started_at: float = field(default_factory=time.perf_counter)
    first_token_at: Optional[float] = None
    completed_at: Optional[float] = None
    cancelled_at: Optional[float] = None
    token_count: int = 0
    status: str = "running"  # "running", "completed", "cancelled", "failed"
    task: Optional[asyncio.Task] = None
    cancel_event: asyncio.Event = field(default_factory=asyncio.Event)


class GenerationManager:
    def __init__(self, max_history: int = 1000):
        self._contexts: Dict[str, GenerationContext] = {}
        self._max_history = max_history
        self._lock = asyncio.Lock()

    @property
    def active_count(self) -> int:
        return sum(1 for c in self._contexts.values() if c.status == "running")

    def register(
        self,
        request_id: str,
        conversation_id: str,
        provider: str,
        model: str,
    ) -> GenerationContext:
        """Register a new generation request."""
        # Trim history if exceeding max_history
        if len(self._contexts) >= self._max_history:
            completed_keys = [k for k, v in self._contexts.items() if v.status != "running"]
            for k in completed_keys[: len(completed_keys) // 2]:
                self._contexts.pop(k, None)

        ctx = GenerationContext(
            request_id=request_id,
            conversation_id=conversation_id,
            provider=provider,
            model=model,
        )
        self._contexts[request_id] = ctx
        ACTIVE_STREAMS_GAUGE.inc()
        return ctx

    def set_task(self, request_id: str, task: asyncio.Task) -> None:
        """Attach the running asyncio task for potential cancellation."""
        if request_id in self._contexts:
            self._contexts[request_id].task = task

    def record_first_token(self, request_id: str) -> Optional[float]:
        """Record the timestamp of the first token received (TTFT)."""
        ctx = self._contexts.get(request_id)
        if ctx and ctx.first_token_at is None:
            ctx.first_token_at = time.perf_counter()
            ttft_seconds = ctx.first_token_at - ctx.started_at
            TTFT_HISTOGRAM.labels(provider=ctx.provider, model=ctx.model).observe(ttft_seconds)
            return round(ttft_seconds * 1000.0, 2)
        return None

    def record_token(self, request_id: str) -> None:
        """Increment the token count."""
        ctx = self._contexts.get(request_id)
        if ctx:
            ctx.token_count += 1

    def record_completion(self, request_id: str) -> GenerationMetrics:
        """Mark generation as successfully completed and compute metrics."""
        ctx = self._contexts.get(request_id)
        if not ctx:
            return GenerationMetrics()

        ctx.completed_at = time.perf_counter()
        ctx.status = "completed"
        ACTIVE_STREAMS_GAUGE.dec()

        total_duration = ctx.completed_at - ctx.started_at
        DURATION_HISTOGRAM.labels(provider=ctx.provider, model=ctx.model).observe(total_duration)
        REQUESTS_TOTAL.labels(provider=ctx.provider, model=ctx.model, status="completed").inc()

        ttft_ms = None
        if ctx.first_token_at:
            ttft_ms = round((ctx.first_token_at - ctx.started_at) * 1000.0, 2)

        return GenerationMetrics(
            ttft_ms=ttft_ms,
            total_duration_ms=round(total_duration * 1000.0, 2),
            token_count=ctx.token_count,
        )

    def record_cancellation(self, request_id: str) -> GenerationMetrics:
        """Mark generation as cancelled and compute metrics."""
        ctx = self._contexts.get(request_id)
        if not ctx:
            return GenerationMetrics()

        if ctx.status == "running":
            ACTIVE_STREAMS_GAUGE.dec()
        ctx.cancelled_at = time.perf_counter()
        ctx.status = "cancelled"

        total_duration = ctx.cancelled_at - ctx.started_at
        REQUESTS_TOTAL.labels(provider=ctx.provider, model=ctx.model, status="cancelled").inc()

        ttft_ms = None
        if ctx.first_token_at:
            ttft_ms = round((ctx.first_token_at - ctx.started_at) * 1000.0, 2)

        return GenerationMetrics(
            ttft_ms=ttft_ms,
            total_duration_ms=round(total_duration * 1000.0, 2),
            token_count=ctx.token_count,
        )

    def record_failure(self, request_id: str, error: str) -> GenerationMetrics:
        """Mark generation as failed."""
        ctx = self._contexts.get(request_id)
        if not ctx:
            return GenerationMetrics()

        if ctx.status == "running":
            ACTIVE_STREAMS_GAUGE.dec()
        ctx.completed_at = time.perf_counter()
        ctx.status = "failed"

        total_duration = ctx.completed_at - ctx.started_at
        REQUESTS_TOTAL.labels(provider=ctx.provider, model=ctx.model, status="failed").inc()

        ttft_ms = None
        if ctx.first_token_at:
            ttft_ms = round((ctx.first_token_at - ctx.started_at) * 1000.0, 2)

        return GenerationMetrics(
            ttft_ms=ttft_ms,
            total_duration_ms=round(total_duration * 1000.0, 2),
            token_count=ctx.token_count,
        )

    def cancel(self, request_id: str) -> bool:
        """Cancel an active generation by request_id."""
        ctx = self._contexts.get(request_id)
        if not ctx:
            return False

        ctx.cancel_event.set()
        if ctx.task and not ctx.task.done():
            ctx.task.cancel()
        return True

    def get_context(self, request_id: str) -> Optional[GenerationContext]:
        return self._contexts.get(request_id)


# Global singleton manager instance
generation_manager = GenerationManager()
