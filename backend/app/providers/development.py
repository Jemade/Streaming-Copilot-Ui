"""Deterministic Development Streaming Provider.

This provider generates real streaming chunks with realistic token pacing for
local development, automated CI testing, and reproducible demos without incurring API costs.
It supports controllable failure triggers (/fail, /timeout, /code, /table) to test
frontend resilience, markdown stabilization, and cancellation.
"""

import asyncio
import re
from typing import AsyncGenerator
from app.models.chat import ChatMessage
from app.providers.base import LLMProvider, StreamChunk


class DevelopmentProvider(LLMProvider):
    def __init__(self, token_delay_ms: int = 25):
        self.token_delay_ms = token_delay_ms

    @property
    def name(self) -> str:
        return "development"

    def _tokenize(self, text: str) -> list[str]:
        """Split text into realistic token chunks (words, spaces, punctuation, code pieces)."""
        # Matches words, spaces, code blocks, or punctuation
        tokens = re.findall(r"\s+|\S+", text)
        return tokens

    async def stream_chat(
        self,
        messages: list[ChatMessage],
        model: str,
        **kwargs,
    ) -> AsyncGenerator[StreamChunk, None]:
        last_user_msg = ""
        for m in reversed(messages):
            if m.role.value == "user":
                last_user_msg = m.content.strip()
                break

        # Check for simulated test triggers
        if "/fail" in last_user_msg.lower() or "/error" in last_user_msg.lower():
            # Emit a couple of tokens then fail
            yield StreamChunk(delta="Starting generation before encountering an upstream provider issue...")
            await asyncio.sleep(self.token_delay_ms / 1000.0 * 3)
            raise RuntimeError("Upstream provider error: HTTP 502 Bad Gateway - Connection reset by peer")

        if "/timeout" in last_user_msg.lower():
            # Emit brief acknowledgment then simulate a timeout
            yield StreamChunk(delta="Initiating upstream request...")
            await asyncio.sleep(0.5)
            raise TimeoutError("Upstream provider timed out after 30000ms")

        # Select or generate content based on prompt
        if "/code" in last_user_msg.lower():
            content = (
                "Here is an example of an asynchronous Server-Sent Events (SSE) generator in Python:\n\n"
                "```python\n"
                "import asyncio\n"
                "from typing import AsyncGenerator\n\n"
                "async def event_generator() -> AsyncGenerator[str, None]:\n"
                "    \"\"\"Streams SSE events with structured JSON data.\"\"\"\n"
                "    for i in range(5):\n"
                "        await asyncio.sleep(0.1)\n"
                "        yield f\"event: content_delta\\ndata: {\\\"index\\\": {i}}\\n\\n\"\n"
                "```\n\n"
                "And here is the corresponding TypeScript client using the Fetch API and `ReadableStream`:\n\n"
                "```typescript\n"
                "export async function readStream(response: Response, onChunk: (text: string) => void) {\n"
                "  const reader = response.body?.getReader();\n"
                "  if (!reader) return;\n"
                "  const decoder = new TextDecoder();\n"
                "  while (true) {\n"
                "    const { done, value } = await reader.read();\n"
                "    if (done) break;\n"
                "    onChunk(decoder.decode(value, { stream: true }));\n"
                "  }\n"
                "}\n"
                "```\n\n"
                "Both snippets demonstrate how unbuffered streaming avoids memory spikes and minimizes TTFT (Time To First Token)."
            )
        elif "/table" in last_user_msg.lower() or "/markdown" in last_user_msg.lower():
            content = (
                "### Streaming Protocol Comparison\n\n"
                "| Feature | Server-Sent Events (SSE) | WebSockets | Standard HTTP POST |\n"
                "| :--- | :--- | :--- | :--- |\n"
                "| **Directionality** | Unidirectional (Server to Client) | Full Duplex (Bidirectional) | Request/Response |\n"
                "| **HTTP/2 & HTTP/3** | Native Multiplexing | Requires Connection Upgrade | Native Multiplexing |\n"
                "| **Auto Reconnect** | Built-in browser support | Requires custom logic | N/A |\n"
                "| **Buffering Risk** | Preventable via `X-Accel-Buffering: no` | None | Buffers full payload |\n"
                "| **Complexity** | Low (Text protocol) | High (Frame management) | Minimal |\n\n"
                "> **Key Takeaway**: SSE is the industry standard for LLM completions because the client only sends the prompt once, while tokens stream continuously from server to client."
            )
        else:
            # General thoughtful response acknowledging the prompt
            content = (
                f"You asked: \"{last_user_msg}\"\n\n"
                "StreamCopilot delivers real-time token streaming using a structured Server-Sent Events (SSE) protocol.\n\n"
                "### Key Architectural Capabilities:\n"
                "1. **Zero-Buffering**: Chunks are forwarded immediately as they arrive from the model provider.\n"
                "2. **Incremental Rendering**: The React frontend uses a high-performance streaming buffer with markdown stabilization.\n"
                "3. **True Cancellation**: Clicking **Stop** aborts the client stream and instructs the backend to terminate the upstream provider task.\n"
                "4. **Observable Metrics**: Each completed stream reports exact Time To First Token (TTFT) and total duration.\n\n"
                "Feel free to test `/code`, `/table`, `/fail`, or click **Stop** mid-stream to verify cancellation!"
            )

        tokens = self._tokenize(content)
        for token in tokens:
            try:
                # Cooperative delay to simulate realistic network/generation pacing
                await asyncio.sleep(self.token_delay_ms / 1000.0)
                yield StreamChunk(delta=token)
            except asyncio.CancelledError:
                # Handle cancellation gracefully
                raise
