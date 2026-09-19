import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code to clipboard:', err);
    }
  };

  const displayLanguage = language || 'code';

  return (
    <div className="my-3 rounded-md overflow-hidden border border-border bg-[#0e0e11] text-zinc-200 font-mono text-xs shadow-sm">
      {/* Code Block Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-elevated border-b border-border text-zinc-400">
        <span className="font-mono text-[11px] font-medium tracking-wide lowercase text-zinc-400">
          {displayLanguage}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500"
          title="Copy code"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-3.5 overflow-x-auto">
        <pre className="!bg-transparent !p-0 leading-relaxed text-zinc-200">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
};
