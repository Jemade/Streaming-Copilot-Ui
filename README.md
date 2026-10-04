# StreamCopilot

[![CI](https://github.com/Jemade/Streaming-Copilot-Ui/actions/workflows/ci.yml/badge.svg)](https://github.com/Jemade/Streaming-Copilot-Ui/actions/workflows/ci.yml)

A React and FastAPI chat application focused on SSE streaming, cancellation, error recovery, and observable generation state.

## Features

- Incremental responses through typed SSE events.
- Optimistic messages, cancellation, and retry controls.
- Markdown rendering and responsive conversation views.
- Time-to-first-token and generation metrics.
- An OpenAI-compatible provider and a deterministic development provider.

## Run with Docker

```bash
git clone https://github.com/Jemade/Streaming-Copilot-Ui.git
cd Streaming-Copilot-Ui
docker compose up --build
```

Open http://localhost:3000. The backend runs on port 8000.

## Local development

Requires Python and Node.js. In one terminal:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --reload --port 8008
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. The current Vite proxy targets backend port **8008**; Docker uses its separate backend routing.

The default `LLM_PROVIDER=development` streams deterministic fixture text from the backend with configurable pacing. For live generation, select `LLM_PROVIDER=openai` and configure `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL`. Use the environment examples in each directory as references.

## Verification

```bash
cd backend
pytest -q
```

```bash
cd frontend
npm test
npm run build
```

See [demo notes](docs/demo.md) and [CI](https://github.com/Jemade/Streaming-Copilot-Ui/actions).

## Current scope

Development-provider results demonstrate the streaming transport and UI; they are not model inference. Generation and conversation state are process-local and reset on restart.

## Engineering and contribution guide

Read the [engineering notes](docs/ENGINEERING.md) for implementation boundaries and verification commands, the [review checklist](docs/REVIEW_CHECKLIST.md) for evidence still required, and [CONTRIBUTING.md](CONTRIBUTING.md) to propose changes. Report vulnerabilities through [SECURITY.md](SECURITY.md).

[![Repository hygiene](https://github.com/Jemade/Streaming-Copilot-Ui/actions/workflows/repository-hygiene.yml/badge.svg)](https://github.com/Jemade/Streaming-Copilot-Ui/actions/workflows/repository-hygiene.yml)
