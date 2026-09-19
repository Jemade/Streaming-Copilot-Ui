import {
  SSECallbacks,
  MessageStartPayload,
  ContentDeltaPayload,
  MessageCompletePayload,
  ErrorPayload,
  MessageCancelledPayload,
  LLMProvider,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface StreamChatOptions {
  messages: Array<{ role: string; content: string }>;
  conversationId?: string;
  provider?: LLMProvider;
  model?: string;
  signal?: AbortSignal;
  callbacks: SSECallbacks;
}

/**
 * Streams chat completion events from the FastAPI backend using Server-Sent Events (SSE).
 * Uses fetch + ReadableStream with zero buffering to maximize TTFT responsiveness.
 */
export async function streamChatCompletion({
  messages,
  conversationId,
  provider = 'development',
  model,
  signal,
  callbacks,
}: StreamChatOptions): Promise<void> {
  const url = `${API_BASE_URL}/v1/chat/stream`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        messages,
        conversation_id: conversationId,
        provider,
        model,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Server returned HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null, cannot stream.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split SSE packets by double newline
      const parts = buffer.split('\n\n');
      // The last part is either empty or an incomplete packet
      buffer = parts.pop() || '';

      for (const part of parts) {
        if (!part.trim()) continue;

        let eventType = 'message';
        let dataStr = '';

        const lines = part.split('\n');
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            dataStr = line.slice(6).trim();
          }
        }

        if (!dataStr) continue;

        try {
          const parsed = JSON.parse(dataStr);
          switch (eventType) {
            case 'message_start':
              callbacks.onStart?.(parsed as MessageStartPayload);
              break;
            case 'content_delta':
              callbacks.onDelta?.(parsed as ContentDeltaPayload);
              break;
            case 'message_complete':
              callbacks.onComplete?.(parsed as MessageCompletePayload);
              break;
            case 'error':
              callbacks.onError?.(parsed as ErrorPayload);
              break;
            case 'message_cancelled':
              callbacks.onCancelled?.(parsed as MessageCancelledPayload);
              break;
            default:
              console.warn(`Unknown SSE event type: ${eventType}`, parsed);
          }
        } catch (jsonErr) {
          console.warn('Failed to parse SSE JSON chunk:', dataStr, jsonErr);
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // Client explicitly aborted the fetch request
      callbacks.onCancelled?.({
        request_id: '',
        reason: 'client_aborted',
        metrics: {},
      });
      return;
    }

    const error = err instanceof Error ? err : new Error(String(err));
    if (callbacks.onConnectionError) {
      callbacks.onConnectionError(error);
    } else {
      callbacks.onError?.({
        request_id: '',
        error: error.message,
        code: 'NETWORK_ERROR',
        retryable: true,
      });
    }
  }
}
