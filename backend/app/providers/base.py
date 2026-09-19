"""Base LLM Provider Interface."""

from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional
from pydantic import BaseModel
from app.models.chat import ChatMessage


class StreamChunk(BaseModel):
    delta: str
    finish_reason: Optional[str] = None


class LLMProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name identifier."""
        pass

    @abstractmethod
    async def stream_chat(
        self,
        messages: list[ChatMessage],
        model: str,
        **kwargs,
    ) -> AsyncGenerator[StreamChunk, None]:
        """Stream chat completion chunks from the provider.

        Yields StreamChunk items incrementally.
        Must handle cooperative cancellation via asyncio.CancelledError.
        """
        pass
