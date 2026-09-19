import React, { useEffect, useState } from 'react';
import { Trash2, Cpu, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { checkHealth } from '../services/api';
import { ConnectionStatus } from '../types';
import { Logo } from './Logo';

export const Header: React.FC = () => {
  const {
    selectedProvider,
    setProvider,
    clearCurrentConversation,
    isStreaming,
  } = useChatStore();

  const [connStatus, setConnStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    let mounted = true;
    const verifyBackend = async () => {
      try {
        await checkHealth();
        if (mounted) setConnStatus('connected');
      } catch {
        if (mounted) setConnStatus('error');
      }
    };

    verifyBackend();
    const interval = setInterval(verifyBackend, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="border-b border-border bg-surface px-4 py-2.5 flex items-center justify-between sticky top-0 z-20">
      {/* Clean Brand with Vector Logo */}
      <div className="flex items-center space-x-2.5">
        <div className="w-7 h-7 rounded-md bg-surface-elevated border border-border flex items-center justify-center text-zinc-100">
          <Logo size={16} />
        </div>
        <div className="flex items-center space-x-2">
          <h1 className="text-xs font-medium text-zinc-100 tracking-tight">StreamCopilot</h1>
          <span className="text-[10px] font-mono text-zinc-500 bg-surface-elevated px-1.5 py-0.5 rounded border border-border">
            v1.0
          </span>
        </div>
      </div>

      {/* Controls & Badges */}
      <div className="flex items-center space-x-2.5">
        {/* Backend status: actual icon when loading/offline, solid clean dot when ready */}
        <div
          className="flex items-center space-x-1.5 px-2 py-1 rounded-md text-xs font-mono border border-border bg-surface-elevated"
          title={`Backend status: ${connStatus}`}
        >
          {connStatus === 'connected' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-zinc-400 text-[11px]">Ready</span>
            </>
          ) : connStatus === 'connecting' ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
              <span className="text-zinc-400 text-[11px]">Connecting...</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-400 text-[11px]">Offline</span>
            </>
          )}
        </div>

        {/* Flat Provider Selector */}
        <div className="flex items-center bg-surface-elevated border border-border rounded-md p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setProvider('development')}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors flex items-center space-x-1.5 ${
              selectedProvider === 'development'
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Deterministic development provider (cost-free, reproducible)"
          >
            <Cpu className="w-3 h-3" />
            <span>Dev</span>
          </button>
          <button
            type="button"
            onClick={() => setProvider('openai')}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors flex items-center space-x-1.5 ${
              selectedProvider === 'openai'
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="OpenAI-compatible provider"
          >
            <Zap className="w-3 h-3" />
            <span>OpenAI</span>
          </button>
        </div>

        {/* Clear chat */}
        <button
          type="button"
          onClick={clearCurrentConversation}
          disabled={isStreaming}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-surface-elevated rounded-md transition-colors border border-transparent hover:border-border disabled:opacity-30 disabled:cursor-not-allowed"
          title="Clear conversation"
          aria-label="Clear chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
