import type { ChatMessage, SymptomCheckRequest, SymptomCheckResponse } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocalChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalSymptomRecord {
  id: string;
  title: string;
  formData: SymptomCheckRequest;
  result: SymptomCheckResponse;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ITEMS = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function storageKey(userId: string, namespace: "chats" | "symptoms"): string {
  return `healthchat:${userId}:${namespace}`;
}

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

/** Generate a short title from text – first 50 characters, trimmed. */
function makeTitle(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 50) return trimmed;
  return trimmed.slice(0, 50).trimEnd() + "…";
}

// ---------------------------------------------------------------------------
// Chat history
// ---------------------------------------------------------------------------

export function getChatHistory(userId: string): LocalChatConversation[] {
  return readArray<LocalChatConversation>(storageKey(userId, "chats"));
}

/**
 * Save or update a chat conversation. If a conversation with the same id
 * already exists it is updated in-place; otherwise it is prepended.
 * Enforces the 10-item FIFO cap (oldest removed first).
 */
export function saveChatConversation(
  userId: string,
  conversation: LocalChatConversation
): void {
  const key = storageKey(userId, "chats");
  let list = readArray<LocalChatConversation>(key);

  const idx = list.findIndex((c) => c.id === conversation.id);
  if (idx >= 0) {
    list[idx] = conversation;
  } else {
    list.unshift(conversation);
  }

  // FIFO: keep only the newest MAX_ITEMS
  if (list.length > MAX_ITEMS) {
    list = list.slice(0, MAX_ITEMS);
  }

  writeArray(key, list);
}

export function deleteChatConversation(userId: string, id: string): void {
  const key = storageKey(userId, "chats");
  const list = readArray<LocalChatConversation>(key).filter((c) => c.id !== id);
  writeArray(key, list);
}

// ---------------------------------------------------------------------------
// Symptom history
// ---------------------------------------------------------------------------

export function getSymptomLocalHistory(userId: string): LocalSymptomRecord[] {
  return readArray<LocalSymptomRecord>(storageKey(userId, "symptoms"));
}

/**
 * Save a symptom check record. Always prepends (newest first).
 * Enforces the 10-item FIFO cap.
 */
export function saveSymptomRecord(
  userId: string,
  formData: SymptomCheckRequest,
  result: SymptomCheckResponse
): LocalSymptomRecord {
  const key = storageKey(userId, "symptoms");
  let list = readArray<LocalSymptomRecord>(key);

  const record: LocalSymptomRecord = {
    id: crypto.randomUUID(),
    title: makeTitle(formData.symptoms),
    formData,
    result,
    createdAt: new Date().toISOString(),
  };

  list.unshift(record);

  if (list.length > MAX_ITEMS) {
    list = list.slice(0, MAX_ITEMS);
  }

  writeArray(key, list);
  return record;
}

export function deleteSymptomRecord(userId: string, id: string): void {
  const key = storageKey(userId, "symptoms");
  const list = readArray<LocalSymptomRecord>(key).filter((r) => r.id !== id);
  writeArray(key, list);
}

/**
 * Build a LocalChatConversation object from the current chat state.
 * The title is derived from the first user message.
 */
export function buildChatConversation(
  conversationId: string,
  messages: ChatMessage[],
  existingConversation?: LocalChatConversation
): LocalChatConversation {
  const firstUserMsg = messages.find((m) => m.role === "user");
  const title = firstUserMsg ? makeTitle(firstUserMsg.content) : "New chat";
  const now = new Date().toISOString();

  return {
    id: conversationId,
    title,
    messages,
    createdAt: existingConversation?.createdAt ?? now,
    updatedAt: now,
  };
}
