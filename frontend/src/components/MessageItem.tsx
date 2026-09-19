import React, { useState } from 'react';
import { User, Copy, Check } from 'lucide-react';
import { Message } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { StreamingIndicator } from './StreamingIndicator';
import { MetricsBadge } from './MetricsBadge';
import { Logo } from './Logo';

interface MessageItemProps {
  message: Message;
  isLatestStreaming?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isLatestStreaming = false,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  return (
    <div
      className={`group py-4 px-4 sm:px-6 transition-colors ${
        isUser ? 'bg-transparent' : 'bg-surface/60 border-y border-border/40'
      }`}
    >
      <div className="max-w-3xl mx-auto flex items-start space-x-3.5">
        {/* Flat Avatar */}
        <div
          className={`w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
            isUser
              ? 'bg-surface-elevated border-border text-zinc-400'
              : 'bg-surface-elevated border-border text-zinc-100'
          }`}
          aria-hidden="true"
        >
          {isUser ? <User className="w-3.5 h-3.5" /> : <Logo size={14} />}
        </div>

        {/* Content Container */}
        <div className="flex-1 min-w-0">
          {/* Header info */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-zinc-400">
              {isUser ? 'You' : 'StreamCopilot'}
            </span>
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {message.content && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 text-zinc-400 hover:text-zinc-100 rounded hover:bg-surface-elevated transition-colors"
                  title="Copy message"
                  aria-label="Copy message"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Message Content */}
          {isUser ? (
            <div className="text-zinc-100 text-sm whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          ) : (
            <div>
              {message.content ? (
                <div className="relative">
                  <MarkdownRenderer
                    content={message.content}
                    isStreaming={isLatestStreaming && message.status === 'streaming'}
                  />
                  {isLatestStreaming && message.status === 'streaming' && (
                    <StreamingIndicator hasTokens={true} />
                  )}
                </div>
              ) : (
                message.status === 'streaming' && (
                  <StreamingIndicator hasTokens={false} />
                )
              )}

              {/* Error notice if message failed */}
              {message.status === 'error' && (
                <div className="mt-2 text-xs font-mono text-rose-400 bg-surface-elevated border border-rose-900/50 rounded p-2.5">
                  Error: {message.error || 'Generation failed'}
                </div>
              )}

              {/* Metrics Badge */}
              <MetricsBadge
                metrics={message.metrics}
                status={message.status}
                requestId={message.requestId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
