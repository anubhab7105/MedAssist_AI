"use client";

import { useRef, type KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, isStreaming, onStop }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit() {
    const value = textareaRef.current?.value.trim();
    if (!value || isStreaming) return;
    onSend(value);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-card p-2">
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder="Describe how you're feeling..."
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        aria-label="Chat message"
        className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
      />
      {isStreaming ? (
        <Button size="icon" variant="danger" onClick={onStop} aria-label="Stop generating">
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button size="icon" onClick={handleSubmit} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
