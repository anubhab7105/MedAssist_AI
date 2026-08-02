"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { ChatMessageBubble } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";

const SUGGESTIONS = [
  "I've had a sore throat for 3 days",
  "What could cause frequent headaches?",
  "Is it normal to feel dizzy after skipping meals?",
];

export default function ChatPage() {
  const { messages, sendMessage, isStreaming, stopStreaming, error } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col md:h-[calc(100vh-5rem)]">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-4"
      >
        <div className="status-pill">
          <span className="status-dot" />
          Assistant online
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground">AI Chat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Educational guidance only. Always consult a licensed doctor for medical decisions.
        </p>
      </motion.div>

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
  );
}
