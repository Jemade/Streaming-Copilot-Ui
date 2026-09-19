import React, { useEffect, useRef } from 'react';
import { Terminal, Code2, AlertOctagon, Table2 } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { MessageItem } from './MessageItem';
import { Logo } from './Logo';

export const ChatArea: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    isStreaming,
    sendMessage,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentConv = conversations.find((c) => c.id === activeConversationId);
  const messages = currentConv?.messages || [];

  // Auto-scroll to bottom when messages or content update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, messages[messages.length - 1]?.content]);

  const handleSuggestionClick = (prompt: string) => {
    if (!isStreaming) {
      sendMessage(prompt);
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center justify-center">
        <div className="max-w-xl w-full text-center space-y-5">
          <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border text-zinc-100 mx-auto flex items-center justify-center">
            <Logo size={22} />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
              StreamCopilot
            </h2>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Zero-buffering real-time token streaming with Server-Sent Events, true cancellation, and observable TTFT.
            </p>
          </div>

          {/* Clean, flat suggestion cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2">
            <button
              type="button"
              onClick={() => handleSuggestionClick("Explain how Server-Sent Events work with zero buffering")}
              className="p-3 rounded-lg bg-surface-elevated border border-border hover:bg-surface-hover hover:border-zinc-700 transition-colors text-xs group"
            >
              <div className="flex items-center space-x-2 text-zinc-200 group-hover:text-white font-medium mb-1">
                <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                <span>Explain SSE Streaming</span>
              </div>
              <p className="text-[11px] text-zinc-500 line-clamp-2">
                Observe TTFT and live incremental chunk delivery.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSuggestionClick("Show me /code with Python and TypeScript SSE snippets")}
              className="p-3 rounded-lg bg-surface-elevated border border-border hover:bg-surface-hover hover:border-zinc-700 transition-colors text-xs group"
            >
              <div className="flex items-center space-x-2 text-zinc-200 group-hover:text-white font-medium mb-1">
                <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Stream Code Blocks</span>
              </div>
              <p className="text-[11px] text-zinc-500 line-clamp-2">
                Test partial markdown code fence stabilization.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSuggestionClick("Simulate an upstream error with /fail")}
              className="p-3 rounded-lg bg-surface-elevated border border-border hover:bg-surface-hover hover:border-zinc-700 transition-colors text-xs group"
            >
              <div className="flex items-center space-x-2 text-zinc-200 group-hover:text-white font-medium mb-1">
                <AlertOctagon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Test Error Recovery</span>
              </div>
              <p className="text-[11px] text-zinc-500 line-clamp-2">
                Verify mid-stream error handling and non-duplicating retry.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSuggestionClick("Show a comparison table of streaming protocols with /table")}
              className="p-3 rounded-lg bg-surface-elevated border border-border hover:bg-surface-hover hover:border-zinc-700 transition-colors text-xs group"
            >
              <div className="flex items-center space-x-2 text-zinc-200 group-hover:text-white font-medium mb-1">
                <Table2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Markdown Tables</span>
              </div>
              <p className="text-[11px] text-zinc-500 line-clamp-2">
                Render tables and rich markdown smoothly while streaming.
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="py-2">
        {messages.map((message, index) => (
          <MessageItem
            key={message.id}
            message={message}
            isLatestStreaming={isStreaming && index === messages.length - 1}
          />
        ))}
        <div ref={messagesEndRef} className="h-4" />
      </div>
    </div>
  );
};
