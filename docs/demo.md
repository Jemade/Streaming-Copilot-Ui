# StreamCopilot Verification & Demo Script

This document provides a step-by-step interactive walkthrough to demonstrate and verify all features of **StreamCopilot**.

---

## Prerequisites

Start the backend and frontend services:

```bash
# Terminal 1 - Backend
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open your browser to `http://localhost:5173`.

---

## 10-Step Interactive Demo Walkthrough

### Step 1: Open Application & Verify Connection Status
- **Action**: Load `http://localhost:5173` in your browser.
- **Expected Outcome**:
  - The application opens with a dark developer-focused interface.
  - The header displays the **Ready** status badge (solid indicator) verifying communication with `GET /health`.
  - The provider badge indicates **Dev Provider** is active.
  - The chat area presents the welcome card with 4 quick prompt suggestions.

---

### Step 2: Send Prompt (Optimistic UI)
- **Action**: Type `Explain how Server-Sent Events work with zero buffering` and press **Enter** (or click the up-arrow button).
- **Expected Outcome**:
  - The user message appears **immediately** on screen without waiting for the server response (optimistic UI).
  - The assistant bubble displays a clean loader icon with: `Generating response...`.

---

### Step 3: Observe Real Token Streaming & TTFT
- **Action**: Watch the assistant response render incrementally.
- **Expected Outcome**:
  - Tokens stream into view chunk-by-chunk without full-response buffering or fake typing delays.
  - Upon completion, the message footer displays real-time metrics:
    - **TTFT**: ~25-50ms
    - **Total duration**: ~1000-2000ms
    - **Token count**: ~100-200 tokens
    - **Status**: `Completed` (green checkmark)
    - **Request ID**: Truncated UUID for observability.

---

### Step 4: Stop Generation Mid-Response (True Cancellation)
- **Action**:
  - Send a prompt that generates a lengthy response, for example: `Tell me a comprehensive history of computer operating systems`.
  - While tokens are actively streaming, click the red **Stop** button (or press **Escape**).
- **Expected Outcome**:
  - Streaming terminates **immediately** on the frontend.
  - An HTTP call `POST /v1/generations/{id}/cancel` is dispatched to the backend.
  - The backend cancels the underlying `asyncio.Task` and provider stream.
  - The message state updates to **Cancelled** with an amber alert badge.
  - The metrics badge reflects tokens generated prior to cancellation and total time elapsed.

---

### Step 5: Retry Cancelled Message
- **Action**: Click the **Retry** action button on the error/cancellation banner.
- **Expected Outcome**:
  - The previous incomplete response is replaced cleanly without duplicating messages.
  - The backend re-initiates generation with a new `request_id`.

---

### Step 6: Trigger Development-Mode Stream Failure
- **Action**: Send the prompt: `Please /fail this request`.
- **Expected Outcome**:
  - The development provider emits an initial chunk (`Starting generation...`).
  - An intentional upstream exception is raised (`HTTP 502 Bad Gateway - Connection reset by peer`).
  - The backend emits an SSE `event: error` frame with `{ "code": "PROVIDER_ERROR", "retryable": true }`.
  - The UI does **not** freeze or crash.
  - An actionable **ErrorBanner** appears at the top: `[PROVIDER_ERROR] Upstream provider error: HTTP 502 Bad Gateway...`.

---

### Step 7: Error Recovery & Non-Duplicating Retry
- **Action**:
  - Click the **Retry** button in the ErrorBanner.
- **Expected Outcome**:
  - The failed message placeholder is cleanly removed.
  - A new request is dispatched.
  - When retried without the trigger or with a normal prompt, the copilot streams successfully without duplicate messages in the chat history.

---

### Step 8: Display Rich Markdown & Tables
- **Action**: Click the quick prompt or send: `Show a comparison table of streaming protocols with /table`.
- **Expected Outcome**:
  - The assistant renders a Markdown table comparing SSE, WebSockets, and standard HTTP.
  - Header row, borders, blockquotes, and lists render cleanly during streaming.

---

### Step 9: Display Code Block with Partial Fence Stabilization
- **Action**: Send: `Show me /code with Python and TypeScript SSE snippets`.
- **Expected Outcome**:
  - Code blocks stream smoothly.
  - Even when partial code fences (```` ```python ````) are incomplete, the layout does not break or flicker.
  - Each code block displays:
    - Monospace font and syntax badge (`python`, `typescript`).
    - A **Copy** button.
  - Clicking **Copy** changes the button to `Copied!` with a checkmark for 2 seconds.

---

### Step 10: Test Mobile Layout
- **Action**: Open Chrome DevTools (or resize your browser window) to a mobile viewport (e.g. 375px width, iPhone SE / Pixel).
- **Expected Outcome**:
  - Header compacts cleanly without overlapping badges.
  - The chat area, code blocks, and composer remain fully responsive.
  - Code blocks support horizontal touch scrolling without overflowing the screen width.
  - Touch targets for buttons are accessible (minimum 36-44px).
