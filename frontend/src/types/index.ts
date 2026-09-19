export type Role = 'user' | 'assistant' | 'system';

export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'cancelled' | 'error';

export interface GenerationMetrics {
  ttft_ms?: number;
  total_duration_ms?: number;
  token_count?: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  status: MessageStatus;
  timestamp: number;
  metrics?: GenerationMetrics;
  error?: string;
  requestId?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type LLMProvider = 'development' | 'openai';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface MessageStartPayload {
  request_id: string;
  conversation_id: string;
  model: string;
  provider: string;
  created_at: number;
}

export interface ContentDeltaPayload {
  request_id: string;
  delta: string;
  index: number;
}

export interface MessageCompletePayload {
  request_id: string;
  content: string;
  finish_reason: string;
  metrics: GenerationMetrics;
}

export interface ErrorPayload {
  request_id: string;
  error: string;
  code: string;
  retryable: boolean;
}

export interface MessageCancelledPayload {
  request_id: string;
  reason: string;
  metrics: GenerationMetrics;
}

export interface SSECallbacks {
  onStart?: (data: MessageStartPayload) => void;
  onDelta?: (data: ContentDeltaPayload) => void;
  onComplete?: (data: MessageCompletePayload) => void;
  onError?: (data: ErrorPayload) => void;
  onCancelled?: (data: MessageCancelledPayload) => void;
  onConnectionError?: (error: Error) => void;
}
