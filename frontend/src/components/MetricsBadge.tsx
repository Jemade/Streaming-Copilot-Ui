import React from 'react';
import { Clock, Activity, Hash, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { GenerationMetrics, MessageStatus } from '../types';

interface MetricsBadgeProps {
  metrics?: GenerationMetrics;
  status: MessageStatus;
  requestId?: string;
}

export const MetricsBadge: React.FC<MetricsBadgeProps> = ({
  metrics,
  status,
  requestId,
}) => {
  if (!metrics && status !== 'error' && status !== 'cancelled') return null;

  return (
    <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-zinc-500">
      {/* Status indicator */}
      <div className="flex items-center space-x-1">
        {status === 'completed' && (
          <>
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span className="text-zinc-400">Completed</span>
          </>
        )}
        {status === 'cancelled' && (
          <>
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span className="text-zinc-400">Cancelled</span>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <span className="text-zinc-400">Failed</span>
          </>
        )}
      </div>

      {/* TTFT */}
      {metrics?.ttft_ms !== undefined && metrics?.ttft_ms !== null && (
        <div className="flex items-center space-x-1" title="Time to first token">
          <Activity className="w-3 h-3 text-zinc-400" />
          <span>
            TTFT: <strong className="text-zinc-300 font-normal">{metrics.ttft_ms}ms</strong>
          </span>
        </div>
      )}

      {/* Total Duration */}
      {metrics?.total_duration_ms !== undefined && metrics?.total_duration_ms !== null && (
        <div className="flex items-center space-x-1" title="Total response generation time">
          <Clock className="w-3 h-3 text-zinc-400" />
          <span>
            Total: <strong className="text-zinc-300 font-normal">{metrics.total_duration_ms}ms</strong>
          </span>
        </div>
      )}

      {/* Token count */}
      {metrics?.token_count !== undefined && metrics?.token_count > 0 && (
        <div className="flex items-center space-x-1" title="Emitted token chunks">
          <Hash className="w-3 h-3 text-zinc-400" />
          <span>
            Tokens: <strong className="text-zinc-300 font-normal">{metrics.token_count}</strong>
          </span>
        </div>
      )}

      {/* Request ID */}
      {requestId && (
        <span className="text-zinc-600 text-[10px]" title={`Request ID: ${requestId}`}>
          req-{requestId.slice(0, 8)}
        </span>
      )}
    </div>
  );
};
