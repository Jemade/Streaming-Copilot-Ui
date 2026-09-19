import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Composer } from '../src/components/Composer';
import { useChatStore } from '../src/store/chatStore';

// Mock useChatStore
vi.mock('../src/store/chatStore', () => ({
  useChatStore: vi.fn(),
}));

describe('Composer Component', () => {
  const mockSendMessage = vi.fn();
  const mockStopStreaming = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useChatStore as any).mockReturnValue({
      isStreaming: false,
      sendMessage: mockSendMessage,
      stopStreaming: mockStopStreaming,
    });
  });

  it('renders input and disabled send button when empty', () => {
    render(<Composer />);

    const textarea = screen.getByPlaceholderText(/Ask anything/i);
    expect(textarea).toBeInTheDocument();

    const sendButton = screen.getByRole('button', { name: /Send message/i });
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when text is entered and submits on click', () => {
    render(<Composer />);

    const textarea = screen.getByPlaceholderText(/Ask anything/i);
    fireEvent.change(textarea, { target: { value: 'Hello StreamCopilot' } });

    const sendButton = screen.getByRole('button', { name: /Send message/i });
    expect(sendButton).not.toBeDisabled();

    fireEvent.click(sendButton);
    expect(mockSendMessage).toHaveBeenCalledWith('Hello StreamCopilot');
  });

  it('renders Stop button when isStreaming is true and triggers stopStreaming on click', () => {
    (useChatStore as any).mockReturnValue({
      isStreaming: true,
      sendMessage: mockSendMessage,
      stopStreaming: mockStopStreaming,
    });

    render(<Composer />);

    const stopButton = screen.getByRole('button', { name: /Stop generation/i });
    expect(stopButton).toBeInTheDocument();

    fireEvent.click(stopButton);
    expect(mockStopStreaming).toHaveBeenCalled();
  });

  it('submits when Enter is pressed without Shift', () => {
    render(<Composer />);

    const textarea = screen.getByPlaceholderText(/Ask anything/i);
    fireEvent.change(textarea, { target: { value: 'Keyboard prompt' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(mockSendMessage).toHaveBeenCalledWith('Keyboard prompt');
  });
});
