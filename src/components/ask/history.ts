import { useSyncExternalStore } from "react";
import type { AskData, ChatMessage, SavedChat } from "@/types/ask";
import { answer } from "./brain";

// Past chats (demo): kept in this browser's localStorage, newest first, so New chat never loses one.
// The real app keeps them on the server.

const KEY = "crafthq.ask.chats";
const EVENT = "crafthq:chats";
const EMPTY: SavedChat[] = [];
const MAX = 30;

let cachedRaw: string | null | undefined;
let cached: SavedChat[] = EMPTY;

function read(): SavedChat[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Storage can be refused (private windows); history then lasts for this page only.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? (JSON.parse(raw) as SavedChat[]) : EMPTY;
    } catch {
      cached = EMPTY;
    }
  }
  return cached;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Saved chats, newest first. Empty on the server and until the browser has loaded them. */
export function useSavedChats() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function saveChat(chat: SavedChat) {
  const next = [chat, ...read().filter((c) => c.id !== chat.id)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    cachedRaw = undefined;
    cached = next;
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Removes a chat. It leaves a marker, so an example chat that isn't stored stays gone too. */
export function deleteChat(id: string) {
  const next = [{ id, title: "", updatedAt: 0, messages: [], deleted: true }, ...read().filter((c) => c.id !== id)];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    cachedRaw = undefined;
    cached = next;
  }
  window.dispatchEvent(new Event(EVENT));
}

export const newChatId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const newMessageId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** A chat's title: your first question, trimmed. */
export function titleOf(messages: ChatMessage[]) {
  const first = messages.find((m) => m.from === "me")?.blocks[0];
  const text = first && first.kind === "text" ? first.text : "New chat";
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

/** A few past chats so the history isn't empty on a first visit, built from the same scripted answers. */
export function seedChats(data: AskData): (SavedChat & { agoMinutes: number })[] {
  const make = (id: string, question: string, agoMinutes: number) => {
    const messages: ChatMessage[] = [
      { id: `${id}-q`, from: "me", blocks: [{ kind: "text", text: question }] },
      ...answer(question, data).map((t, i) => ({ id: `${id}-${i}`, from: t.from, blocks: t.blocks })),
    ];
    return { id, title: titleOf(messages), updatedAt: 0, agoMinutes, messages };
  };
  return [
    make("seed-stuck", "What’s stuck, and why?", 3 * 60),
    make("seed-design", "Design the event invite card", 26 * 60),
    make("seed-merged", "What merged this week?", 2 * 24 * 60),
  ];
}
