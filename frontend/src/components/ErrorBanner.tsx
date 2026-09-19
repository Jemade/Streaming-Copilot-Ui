import React from 'react';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { useChatStore } from '../store/chatStore';

export const ErrorBanner: React.FC = () => {
  const { error, retryLastMessage, dismissError, isStreaming } = useChatStore();

  if (!error) return null;

  return (
    <div
      role="alert"
      className="bg-surface-elevated border border-border text-zinc-200 px-4 py-2.5 rounded-lg mx-4 sm:mx-6 my-2 flex items-center justify-between text-xs shadow-sm"
    >
      <div className="flex items-center space-x-2.5 min-w-0 mr-3">
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
        <div className="truncate">
          {error.code && (
            <span className="font-mono text-zinc-400 mr-1.5">
              [{error.code}]
            </span>
          )}
          <span className="text-zinc-300">{error.message}</span>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {error.retryable !== false && (
          <button
            type="button"
            onClick={retryLastMessage}
            disabled={isStreaming}
            className="flex items-center space-x-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 rounded transition-colors disabled:opacity-30"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
        <button
          type="button"
          onClick={dismissError}
          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
          title="Dismiss error"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
