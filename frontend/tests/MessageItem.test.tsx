import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageItem } from '../src/components/MessageItem';
import { Message } from '../src/types';

describe('MessageItem Component', () => {
  it('renders a user message correctly', () => {
    const userMsg: Message = {
      id: 'msg-1',
      role: 'user',
      content: 'Explain quantum computing',
      status: 'completed',
      timestamp: Date.now(),
    };

    render(<MessageItem message={userMsg} />);
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Explain quantum computing')).toBeInTheDocument();
  });

  it('renders an assistant message with TTFT metrics', () => {
    const assistantMsg: Message = {
      id: 'msg-2',
      role: 'assistant',
      content: 'Quantum computing leverages qubits.',
      status: 'completed',
      timestamp: Date.now(),
      metrics: {
        ttft_ms: 124.5,
        total_duration_ms: 850.0,
        token_count: 32,
      },
    };

    render(<MessageItem message={assistantMsg} />);
    expect(screen.getByText('StreamCopilot')).toBeInTheDocument();
    expect(screen.getByText('Quantum computing leverages qubits.')).toBeInTheDocument();
    expect(screen.getByText(/124.5ms/)).toBeInTheDocument();
    expect(screen.getByText(/850ms/)).toBeInTheDocument();
    expect(screen.getByText(/32/)).toBeInTheDocument();
  });

  it('renders cancelled status when message was cancelled', () => {
    const cancelledMsg: Message = {
      id: 'msg-3',
      role: 'assistant',
      content: 'Incomplete response before stop...',
      status: 'cancelled',
      timestamp: Date.now(),
      metrics: {
        ttft_ms: 85.0,
        total_duration_ms: 310.0,
        token_count: 10,
      },
    };

    render(<MessageItem message={cancelledMsg} />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByText(/Incomplete response before stop/)).toBeInTheDocument();
  });
});
