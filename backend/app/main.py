"""StreamCopilot FastAPI Application Entrypoint."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import get_settings

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("stream_copilot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting StreamCopilot backend service...")
    logger.info("Environment: %s", settings.ENVIRONMENT)
    logger.info("Default LLM Provider: %s", settings.LLM_PROVIDER)
    logger.info("Allowed CORS Origins: %s", settings.CORS_ORIGINS)
    yield
    logger.info("Shutting down StreamCopilot backend service...")


app = FastAPI(
    title="StreamCopilot API",
    description="Real-time LLM token streaming backend with SSE, cancellation, and metrics.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for browser client access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=(settings.ENVIRONMENT == "development"),
    )
