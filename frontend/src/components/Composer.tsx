import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { useChatStore } from '../store/chatStore';

export const Composer: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isStreaming, sendMessage, stopStreaming } = useChatStore();

  // Auto-resize textarea height as content changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  }, [prompt]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isStreaming) return;

    const currentPrompt = prompt;
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessage(currentPrompt);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Cancel on Escape if streaming
    if (e.key === 'Escape' && isStreaming) {
      e.preventDefault();
      stopStreaming();
    }
  };

  return (
    <div className="border-t border-border bg-surface px-4 py-3 sticky bottom-0 z-20">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="relative flex flex-col">
          <div className="relative flex items-end bg-surface-elevated border border-border rounded-lg focus-within:border-zinc-500 transition-colors p-2">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... (Enter to send, Shift+Enter for newline, /code, /fail)"
              rows={1}
              className="flex-1 max-h-48 resize-none bg-transparent text-sm text-zinc-100 placeholder-zinc-500 px-2 py-1.5 focus:outline-none leading-relaxed"
              aria-label="Prompt message"
              disabled={isStreaming}
            />

            <div className="flex items-center space-x-1.5 ml-2 pb-0.5">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopStreaming}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  title="Stop generation (Esc)"
                  aria-label="Stop generation"
                >
                  <Square className="w-3 h-3 fill-rose-500 text-rose-500" />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="p-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-950 disabled:opacity-20 disabled:hover:bg-zinc-100 disabled:cursor-not-allowed transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  title="Send message (Enter)"
                  aria-label="Send message"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Helper caption */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5 px-1">
            <span>
              {isStreaming
                ? 'Streaming response • Press Stop or Esc to cancel'
                : 'Tip: /code for snippets, /table for Markdown, /fail for error recovery'}
            </span>
            <span className="font-mono">{prompt.length > 0 ? `${prompt.length} chars` : ''}</span>
          </div>
        </form>
      </div>
    </div>
  );
};
