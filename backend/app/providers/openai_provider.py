"""OpenAI-Compatible LLM Provider.

Supports OpenAI, Groq, OpenRouter, Together AI, Ollama, and any OpenAI-compatible API.
Streams token deltas directly using httpx.AsyncClient with no response buffering.
"""

import asyncio
import json
from typing import AsyncGenerator
import httpx
from app.models.chat import ChatMessage
from app.providers.base import LLMProvider, StreamChunk


class OpenAIProvider(LLMProvider):
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        default_model: str = "gpt-4o-mini",
        timeout_seconds: float = 60.0,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model
        self.timeout_seconds = timeout_seconds

    @property
    def name(self) -> str:
        return "openai"

    async def stream_chat(
        self,
        messages: list[ChatMessage],
        model: str,
        **kwargs,
    ) -> AsyncGenerator[StreamChunk, None]:
        if not self.api_key and not ("localhost" in self.base_url or "127.0.0.1" in self.base_url):
            raise ValueError(
                "OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY in your environment or use the 'development' provider."
            )

        target_model = model or self.default_model
        payload = {
            "model": target_model,
            "messages": [{"role": m.role.value, "content": m.content} for m in messages],
            "stream": True,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 2048),
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        timeout = httpx.Timeout(connect=10.0, read=self.timeout_seconds, write=10.0, pool=10.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                ) as response:
                    if response.status_code != 200:
                        error_body = await response.aread()
                        error_text = error_body.decode("utf-8", errors="replace")
                        raise RuntimeError(
                            f"Upstream provider returned HTTP {response.status_code}: {error_text}"
                        )

                    async for line in response.aiter_lines():
                        line = line.strip()
                        if not line:
                            continue
                        if line == "data: [DONE]":
                            break
                        if line.startswith("data: "):
                            raw_json = line[6:]
                            try:
                                chunk = json.loads(raw_json)
                                choices = chunk.get("choices", [])
                                if choices:
                                    delta = choices[0].get("delta", {})
                                    content = delta.get("content")
                                    finish_reason = choices[0].get("finish_reason")
                                    if content:
                                        yield StreamChunk(delta=content, finish_reason=finish_reason)
                            except json.JSONDecodeError:
                                continue

            except asyncio.CancelledError:
                # The 'async with client.stream()' automatically closes the connection
                raise
            except httpx.TimeoutException as e:
                raise TimeoutError(f"Upstream provider request timed out: {e}") from e
            except httpx.RequestError as e:
                raise RuntimeError(f"Network error connecting to provider: {e}") from e
