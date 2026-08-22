"use client";

import { useCallback, useRef, useState } from "react";
import { streamChatMessage } from "@/services/chat";
import type { ChatMessage } from "@/types";
import type { LocalChatConversation } from "@/lib/localHistory";

function genId() {
  return crypto.randomUUID();
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string, image?: string) => {
    setError(null);
    conversationIdRef.current ??= genId();

    const userMessage: ChatMessage = {
      id: genId(),
      role: "user",
      content,
      image,
      createdAt: new Date().toISOString(),
    };

    const assistantId = genId();
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);
    setIsStreaming(true);

    abortController.current = new AbortController();

    try {
      await streamChatMessage(
        content,
        conversationIdRef.current,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: chunk.type === "emergency" ? chunk.content : m.content + chunk.content,
                    isEmergency: chunk.type === "emergency" || m.isEmergency,
                  }
                : m
            )
          );
        },
        image,
        abortController.current.signal
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content.length > 0));
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const stopStreaming = useCallback(() => {
    abortController.current?.abort();
    setIsStreaming(false);
  }, []);

  /** Load a previously saved conversation into state. */
  const loadConversation = useCallback((conv: LocalChatConversation) => {
    abortController.current?.abort();
    setIsStreaming(false);
    setError(null);
    conversationIdRef.current = conv.id;
    setMessages(conv.messages);
  }, []);

  /** Reset to a blank chat. */
  const resetChat = useCallback(() => {
    abortController.current?.abort();
    setIsStreaming(false);
    setError(null);
    conversationIdRef.current = null;
    setMessages([]);
  }, []);

  /** Current conversation id (read-only). */
  const conversationId = conversationIdRef.current;

  return {
    messages,
    sendMessage,
    isStreaming,
    error,
    stopStreaming,
    loadConversation,
    resetChat,
    conversationId,
  };
}
