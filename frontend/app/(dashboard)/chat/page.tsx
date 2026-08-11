"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { ChatMessageBubble } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import {
  getChatHistory,
  saveChatConversation,
  deleteChatConversation,
  buildChatConversation,
} from "@/lib/localHistory";
import { getChatConversation } from "@/services/profile";
import type { LocalChatConversation } from "@/lib/localHistory";
import type { ChatMessage } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

const SUGGESTIONS = [
  "I've had a sore throat for 3 days",
  "What could cause frequent headaches?",
  "Is it normal to feel dizzy after skipping meals?",
];

export default function ChatPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const openConversationId = searchParams.get("conversation");
  const {
    messages,
    sendMessage,
    isStreaming,
    stopStreaming,
    error,
    loadConversation,
    resetChat,
    conversationId,
  } = useChat();

  const bottomRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState<LocalChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const prevIsStreaming = useRef(isStreaming);

  const userId = user?.id ?? "";

  // Load history from localStorage on mount & when userId changes
  const refreshHistory = useCallback(() => {
    if (!userId) return;
    setHistory(getChatHistory(userId));
  }, [userId]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  // Open a conversation from the dashboard (?conversation=<id>): first try
  // local storage, then load it from the backend (works across devices).
  useEffect(() => {
    if (!userId || !openConversationId) return;

    const local = history.find((c) => c.id === openConversationId);
    if (local) {
      loadConversation(local);
      setActiveId(local.id);
      return;
    }

    let cancelled = false;
    getChatConversation(openConversationId)
      .then((rows: any[]) => {
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;
        const msgs: ChatMessage[] = rows.map((row, i) => ({
          id: `${openConversationId}-${i}`,
          role: row.role,
          content: row.content,
          createdAt: row.created_at,
        }));
        const conv: LocalChatConversation = {
          id: openConversationId,
          title:
            msgs.find((m) => m.role === "user")?.content.slice(0, 50) || "Chat",
          messages: msgs,
          createdAt: msgs[0]?.createdAt ?? new Date().toISOString(),
          updatedAt: msgs[msgs.length - 1]?.createdAt ?? new Date().toISOString(),
        };
        loadConversation(conv);
        setActiveId(conv.id);
        saveChatConversation(userId, conv);
        refreshHistory();
      })
      .catch(() => {
        // Not found / offline: leave the chat empty rather than crash.
      });
    return () => {
      cancelled = true;
    };
  }, [openConversationId, userId, history, loadConversation, refreshHistory]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-save when streaming finishes (transition true→false)
  useEffect(() => {
    if (prevIsStreaming.current && !isStreaming && userId && conversationId) {
      const hasUserMsg = messages.some((m) => m.role === "user");
      if (hasUserMsg) {
        const existing = history.find((c) => c.id === conversationId);
        const conv = buildChatConversation(conversationId, messages, existing);
        saveChatConversation(userId, conv);
        setActiveId(conversationId);
        refreshHistory();
      }
    }
    prevIsStreaming.current = isStreaming;
  }, [isStreaming, userId, conversationId, messages, history, refreshHistory]);

  // --- Handlers ---

  const handleNewChat = () => {
    resetChat();
    setActiveId(null);
  };

  const handleSelectChat = (conv: LocalChatConversation) => {
    loadConversation(conv);
    setActiveId(conv.id);
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    deleteChatConversation(userId, id);
    if (activeId === id) {
      resetChat();
      setActiveId(null);
    }
    refreshHistory();
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl gap-0 md:h-[calc(100vh-5rem)]">
      {/* ----------------------------------------------------------------- */}
      {/* Sidebar                                                           */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden flex-shrink-0 flex-col overflow-hidden border-r border-border md:flex"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                History
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNewChat}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/20 hover:text-primary"
                  title="New chat"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/20 hover:text-primary"
                  title="Close sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2">
              {history.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No saved chats yet.
                </p>
              )}
              {history.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectChat(conv)}
                  className={`group mb-1 flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    activeId === conv.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-muted/15"
                  }`}
                >
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-snug">{conv.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(conv.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(conv.id, e)}
                    className="ml-auto rounded p-1 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------- */}
      {/* Main chat area                                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-4 flex items-start justify-between"
        >
          <div>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="mb-2 hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/20 hover:text-primary md:inline-flex"
                title="Open sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}
            <div className="status-pill">
              <span className="status-dot" />
              Assistant online
            </div>
            <h1 className="mt-4 font-display text-3xl font-semibold text-foreground">AI Chat</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Educational guidance only. Always consult a licensed doctor for medical decisions.
            </p>
          </div>

          {/* Mobile new chat + history toggle */}
          <div className="flex gap-1 md:hidden">
            <button
              onClick={handleNewChat}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted/20 hover:text-primary"
              title="New chat"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        {/* Mobile history strip */}
        {history.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {history.slice(0, 5).map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectChat(conv)}
                className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  activeId === conv.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-white text-muted-foreground hover:border-primary/30"
                }`}
              >
                {conv.title.length > 25 ? conv.title.slice(0, 25) + "…" : conv.title}
              </button>
            ))}
          </div>
        )}

        <div className="clinical-panel flex-1 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dce9ff] text-primary">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-medium text-foreground">Start a conversation</h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Describe what you&apos;re experiencing and get calm, educational guidance.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-full border border-[#c3c6d4] bg-[#eff4ff] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessageBubble key={message.id} message={message} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {error && <p className="mt-2 text-xs text-danger">{error}</p>}

        <div className="mt-4">
          <ChatInput onSend={sendMessage} isStreaming={isStreaming} onStop={stopStreaming} />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            This information is educational only and should not replace professional medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}
