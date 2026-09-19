import React from 'react';
import { Loader2 } from 'lucide-react';

interface StreamingIndicatorProps {
  hasTokens: boolean;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({ hasTokens }) => {
  if (hasTokens) {
    // Clean, minimalist terminal cursor during active token emission
    return (
      <span
        className="inline-block w-1.5 h-4 ml-1 bg-zinc-400 align-middle"
        aria-hidden="true"
        title="Streaming..."
      />
    );
  }

  // Pre-token generation state with an actual spinner icon, not dramatic animations
  return (
    <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400 py-1" role="status" aria-live="polite">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400 shrink-0" />
      <span>Generating response...</span>
    </div>
  );
};
