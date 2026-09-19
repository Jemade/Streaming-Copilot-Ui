"""Provider Factory and Registry."""

from typing import Optional
from app.config import get_settings
from app.providers.base import LLMProvider
from app.providers.development import DevelopmentProvider
from app.providers.openai_provider import OpenAIProvider


def get_provider(provider_name: Optional[str] = None) -> LLMProvider:
    """Instantiate and return the requested LLM provider."""
    settings = get_settings()
    name = (provider_name or settings.LLM_PROVIDER).lower().strip()

    if name == "development":
        return DevelopmentProvider(token_delay_ms=settings.DEV_TOKEN_DELAY_MS)
    elif name in ("openai", "openai-compatible"):
        return OpenAIProvider(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            default_model=settings.OPENAI_MODEL,
        )
    else:
        raise ValueError(f"Unsupported provider '{name}'. Supported providers: 'development', 'openai'.")
