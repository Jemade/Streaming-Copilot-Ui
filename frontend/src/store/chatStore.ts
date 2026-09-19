import { create } from 'zustand';
import {
  Conversation,
  Message,
  LLMProvider,
} from '../types';
import { streamChatCompletion } from '../services/sseClient';
import { cancelGeneration } from '../services/api';

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string;
  isStreaming: boolean;
  activeRequestId: string | null;
  abortController: AbortController | null;
  selectedProvider: LLMProvider;
  selectedModel: string;
  error: { message: string; code?: string; retryable?: boolean } | null;

  // Actions
  selectConversation: (id: string) => void;
  createConversation: () => void;
  clearCurrentConversation: () => void;
  setProvider: (provider: LLMProvider) => void;
  setModel: (model: string) => void;
  sendMessage: (prompt: string) => Promise<void>;
  stopStreaming: () => void;
  retryLastMessage: () => Promise<void>;
  dismissError: () => void;
}

const initialConversationId = 'default-conv';

const initialConversation: Conversation = {
  id: initialConversationId,
  title: 'Current Session',
  messages: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [initialConversation],
  activeConversationId: initialConversationId,
  isStreaming: false,
  activeRequestId: null,
  abortController: null,
  selectedProvider: 'development',
  selectedModel: 'stream-copilot-dev',
  error: null,

  selectConversation: (id: string) => {
    set({ activeConversationId: id, error: null });
  },

  createConversation: () => {
    const newId = 'conv-' + Date.now();
    const newConv: Conversation = {
      id: newId,
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      conversations: [newConv, ...state.conversations],
      activeConversationId: newId,
      error: null,
    }));
  },

  clearCurrentConversation: () => {
    const { activeConversationId, isStreaming, stopStreaming } = get();
    if (isStreaming) {
      stopStreaming();
    }
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === activeConversationId
          ? { ...c, messages: [], updatedAt: Date.now() }
          : c
      ),
      error: null,
    }));
  },

  setProvider: (provider: LLMProvider) => {
    set({
      selectedProvider: provider,
      selectedModel: provider === 'openai' ? 'gpt-4o-mini' : 'stream-copilot-dev',
    });
  },

  setModel: (model: string) => {
    set({ selectedModel: model });
  },

  dismissError: () => {
    set({ error: null });
  },

  stopStreaming: () => {
    const { abortController, activeRequestId, activeConversationId } = get();
    if (abortController) {
      abortController.abort();
    }
    if (activeRequestId) {
      cancelGeneration(activeRequestId);
    }
    set((state) => ({
      isStreaming: false,
      abortController: null,
      conversations: state.conversations.map((c) => {
        if (c.id !== activeConversationId) return c;
        const updated = [...c.messages];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.status === 'streaming') {
          updated[updated.length - 1] = {
            ...lastMsg,
            status: 'cancelled',
          };
        }
        return { ...c, messages: updated };
      }),
    }));
  },

  sendMessage: async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const {
      activeConversationId,
      conversations,
      selectedProvider,
      selectedModel,
      isStreaming,
      stopStreaming,
    } = get();

    if (isStreaming) {
      stopStreaming();
    }

    const currentConv = conversations.find((c) => c.id === activeConversationId);
    if (!currentConv) return;

    // 1. Optimistic User Message
    const userMsgId = 'user-' + Date.now();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      status: 'completed',
      timestamp: Date.now(),
    };

    // 2. Assistant Placeholder Message
    const assistantMsgId = 'assistant-' + Date.now();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      timestamp: Date.now(),
    };

    const controller = new AbortController();

    set((state) => ({
      isStreaming: true,
      abortController: controller,
      error: null,
      conversations: state.conversations.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              messages: [...c.messages, userMsg, assistantMsg],
              updatedAt: Date.now(),
            }
          : c
      ),
    }));

    // Prepare message history for backend
    const outgoingMessages = [
      ...currentConv.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: trimmed },
    ];

    await streamChatCompletion({
      messages: outgoingMessages,
      conversationId: activeConversationId,
      provider: selectedProvider,
      model: selectedModel,
      signal: controller.signal,
      callbacks: {
        onStart: (data) => {
          set((state) => ({
            activeRequestId: data.request_id,
            conversations: state.conversations.map((c) => {
              if (c.id !== activeConversationId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, requestId: data.request_id } : m
                ),
              };
            }),
          }));
        },
        onDelta: (data) => {
          set((state) => ({
            conversations: state.conversations.map((c) => {
              if (c.id !== activeConversationId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + data.delta }
                    : m
                ),
              };
            }),
          }));
        },
        onComplete: (data) => {
          set((state) => ({
            isStreaming: false,
            abortController: null,
            conversations: state.conversations.map((c) => {
              if (c.id !== activeConversationId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: data.content,
                        status: 'completed',
                        metrics: data.metrics,
                      }
                    : m
                ),
              };
            }),
          }));
        },
        onError: (data) => {
          set((state) => ({
            isStreaming: false,
            abortController: null,
            error: {
              message: data.error,
              code: data.code,
              retryable: data.retryable,
            },
            conversations: state.conversations.map((c) => {
              if (c.id !== activeConversationId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        status: 'error',
                        error: data.error,
                      }
                    : m
                ),
              };
            }),
          }));
        },
        onCancelled: (data) => {
          set((state) => ({
            isStreaming: false,
            abortController: null,
            conversations: state.conversations.map((c) => {
              if (c.id !== activeConversationId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        status: 'cancelled',
                        metrics: data.metrics,
                      }
                    : m
                ),
              };
            }),
          }));
        },
        onConnectionError: (err) => {
          set((state) => ({
            isStreaming: false,
            abortController: null,
            error: {
              message: err.message || 'Connection lost. Please check if the backend is reachable.',
              code: 'NETWORK_ERROR',
              retryable: true,
            },
            conversations: state.conversations.map((c) => {
              if (c.id !== activeConversationId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        status: 'error',
                        error: err.message,
                      }
                    : m
                ),
              };
            }),
          }));
        },
      },
    });
  },

  retryLastMessage: async () => {
    const { activeConversationId, conversations, sendMessage } = get();
    const currentConv = conversations.find((c) => c.id === activeConversationId);
    if (!currentConv || currentConv.messages.length === 0) return;

    const messages = [...currentConv.messages];
    const lastMsg = messages[messages.length - 1];

    if (lastMsg.role === 'assistant' && (lastMsg.status === 'error' || lastMsg.status === 'cancelled')) {
      // Find preceding user message
      const userMsg = messages[messages.length - 2];
      if (userMsg && userMsg.role === 'user') {
        const promptToRetry = userMsg.content;

        // Remove both the failed assistant message and the user message,
        // then call sendMessage so no duplicate messages are created
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === activeConversationId
              ? {
                  ...c,
                  messages: c.messages.slice(0, -2),
                  updatedAt: Date.now(),
                }
              : c
          ),
          error: null,
        }));

        await sendMessage(promptToRetry);
      }
    }
  },
}));
