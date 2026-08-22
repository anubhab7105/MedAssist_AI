"use client";

import { useRef, useState, type KeyboardEvent, type ChangeEvent } from "react";
import { Send, Square, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string, image?: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, isStreaming, onStop }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageBase64, setImageBase64] = useState<string | undefined>();

  function handleSubmit() {
    const value = textareaRef.current?.value.trim();
    if ((!value && !imageBase64) || isStreaming) return;
    
    onSend(value || "", imageBase64);
    
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
    setImageBase64(undefined);
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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be uploaded again if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-input bg-white p-2 shadow-soft transition-shadow focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,49,120,0.10)]">
      {imageBase64 && (
        <div className="relative w-20 h-20 mb-2">
          <img src={imageBase64} alt="Upload preview" className="object-cover w-full h-full rounded-md border" />
          <button 
            onClick={() => setImageBase64(undefined)}
            className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 border shadow-sm hover:bg-gray-100"
            aria-label="Remove image"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach image"
          className="text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
        />
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Describe how you're feeling..."
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          aria-label="Chat message"
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {isStreaming ? (
          <Button size="icon" variant="danger" onClick={onStop} aria-label="Stop generating">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="icon" onClick={handleSubmit} aria-label="Send message" disabled={!textareaRef.current?.value.trim() && !imageBase64}>
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
