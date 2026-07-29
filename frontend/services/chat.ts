import { createClient } from "@/lib/supabase/client";

export interface StreamChunk {
  type: "token" | "emergency";
  content: string;
}

/**
 * Streams a chat response token-by-token using fetch + ReadableStream,
 * since SSE-over-axios doesn't play well in the browser. Calls onChunk
 * for every token/emergency event and resolves once the stream ends.
 */
export async function streamChatMessage(
  message: string,
  conversationId: string | null,
  onChunk: (chunk: StreamChunk) => void,
  signal?: AbortSignal
): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Please log in before using AI Chat.");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("AI Chat is not configured. Missing NEXT_PUBLIC_API_URL.");
  }

  const response = await fetch(`${apiUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ message, conversation_id: conversationId }),
    signal,
  });

  if (!response.ok || !response.body) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.detail || "The assistant is temporarily unavailable.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice("data:".length).trim();
      if (raw === "[DONE]") return;

      try {
        const parsed = JSON.parse(raw) as StreamChunk;
        onChunk(parsed);
      } catch {
        // ignore malformed keepalive lines
      }
    }
  }
}
