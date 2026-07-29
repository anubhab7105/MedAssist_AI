"use client";

import ReactMarkdown from "react-markdown";
import { AlertTriangle, Bot, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";

export function ChatMessageBubble({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  if (message.isEmergency) {
    return (
      <div className="flex justify-start">
        <div className="flex max-w-[85%] items-start gap-3 rounded-2xl rounded-tl-sm border border-danger/30 bg-danger/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <p className="text-sm leading-relaxed text-danger">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-white/[0.06] text-foreground"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : message.content ? (
          <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/30">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <TypingIndicator />
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
          <UserIcon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
    </div>
  );
}
