"use client";

import { useRef, useState, type KeyboardEvent, type ChangeEvent } from "react";
import { Send, Square, Paperclip, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string, attachment?: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, isStreaming, onStop }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentBase64, setAttachmentBase64] = useState<string | undefined>();
  const [attachmentType, setAttachmentType] = useState<"image" | "pdf" | undefined>();

  function handleSubmit() {
    const value = textareaRef.current?.value.trim();
    if ((!value && !attachmentBase64) || isStreaming) return;
    
    onSend(value || "", attachmentBase64);
    
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
    setAttachmentBase64(undefined);
    setAttachmentType(undefined);
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

    const isPDF = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    
    if (!isPDF && !isImage) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachmentBase64(event.target?.result as string);
      setAttachmentType(isPDF ? "pdf" : "image");
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be uploaded again if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment() {
    setAttachmentBase64(undefined);
    setAttachmentType(undefined);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-input bg-white p-2 shadow-soft transition-shadow focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,49,120,0.10)]">
      {attachmentBase64 && (
        <div className="relative w-20 h-20 mb-2 flex items-center justify-center">
          {attachmentType === "image" ? (
            <img 
              src={attachmentBase64} 
              alt="Upload preview" 
              className="object-cover w-full h-full rounded-md border" 
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 rounded-md border bg-muted/50 p-2 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">PDF</span>
            </div>
          )}
          <button 
            onClick={removeAttachment}
            className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 border shadow-sm hover:bg-gray-100"
            aria-label="Remove attachment"
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
          aria-label="Attach file"
          className="text-muted-foreground hover:text-foreground"
          disabled={isStreaming || !!attachmentBase64}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <input 
          type="file" 
          accept="image/*,application/pdf" 
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
          <Button size="icon" onClick={handleSubmit} aria-label="Send message" disabled={!textareaRef.current?.value.trim() && !attachmentBase64}>
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
