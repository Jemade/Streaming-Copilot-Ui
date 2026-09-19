import { describe, it, expect, vi, beforeEach } from 'vitest';
import { streamChatCompletion } from '../src/services/sseClient';

describe('streamChatCompletion SSE client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly parses structured SSE events and invokes callbacks', async () => {
    const ssePayload = [
      'event: message_start\n',
      'data: {"request_id":"req-1","conversation_id":"conv-1","model":"dev","provider":"development","created_at":1000}\n\n',
      'event: content_delta\n',
      'data: {"request_id":"req-1","delta":"Hello","index":0}\n\n',
      'event: content_delta\n',
      'data: {"request_id":"req-1","delta":" world!","index":1}\n\n',
      'event: message_complete\n',
      'data: {"request_id":"req-1","content":"Hello world!","finish_reason":"stop","metrics":{"ttft_ms":45,"total_duration_ms":120,"token_count":2}}\n\n',
    ].join('');

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(ssePayload));
        controller.close();
      },
    });

    const mockResponse = {
      ok: true,
      status: 200,
      body: mockStream,
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const onStart = vi.fn();
    const onDelta = vi.fn();
    const onComplete = vi.fn();

    await streamChatCompletion({
      messages: [{ role: 'user', content: 'Hi' }],
      callbacks: { onStart, onDelta, onComplete },
    });

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({ request_id: 'req-1', provider: 'development' })
    );
    expect(onDelta).toHaveBeenCalledTimes(2);
    expect(onDelta).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ delta: 'Hello', index: 0 })
    );
    expect(onDelta).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ delta: ' world!', index: 1 })
    );
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Hello world!',
        metrics: expect.objectContaining({ ttft_ms: 45, token_count: 2 }),
      })
    );
  });

  it('handles client abort correctly via onCancelled callback', async () => {
    const controller = new AbortController();
    const onCancelled = vi.fn();

    const abortError = new DOMException('The user aborted a request.', 'AbortError');
    global.fetch = vi.fn().mockRejectedValue(abortError);

    await streamChatCompletion({
      messages: [{ role: 'user', content: 'Cancel test' }],
      signal: controller.signal,
      callbacks: { onCancelled },
    });

    expect(onCancelled).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'client_aborted' })
    );
  });

  it('handles server HTTP error properly', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: vi.fn().mockResolvedValue('Fatal error'),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const onError = vi.fn();

    await streamChatCompletion({
      messages: [{ role: 'user', content: 'Error test' }],
      callbacks: { onError },
    });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'NETWORK_ERROR',
        error: expect.stringContaining('Server returned HTTP 500'),
      })
    );
  });
});
