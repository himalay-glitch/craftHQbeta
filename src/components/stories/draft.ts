import { useSyncExternalStore } from "react";
import type { ImportedFrom } from "@/types/stories";

// The unsent story is kept in this browser, so closing the box, leaving the page or reloading never
// loses what someone typed (DESIGN.md §4.8, §6.1). Files can't be kept this way; only the text is.
// Read through useSyncExternalStore: the server render gets the empty draft, then React switches.

export interface StoryDraft {
  title: string;
  why: string;
  detail: string;
  /** null means the default owner: the person writing it. */
  ownerId: string | null;
  /** Imported from a ticket: the link back, kept with the draft. */
  source: ImportedFrom | null;
  /** The ticket's attachments, by name. */
  attachments: string[];
}

const KEY = "crafthq:new-story-draft";
const EMPTY: StoryDraft = { title: "", why: "", detail: "", ownerId: null, source: null, attachments: [] };

let current: StoryDraft | null = null;
const listeners = new Set<() => void>();

const isEmpty = (d: StoryDraft) => !d.title && !d.why && !d.detail && !d.source;
const text = (v: unknown) => (typeof v === "string" ? v : "");

function read(): StoryDraft {
  if (current) return current;
  current = EMPTY;
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (saved && typeof saved === "object") {
      const s = saved as Record<string, unknown>;
      const src = s.source as Record<string, unknown> | null | undefined;
      current = {
        title: text(s.title),
        why: text(s.why),
        detail: text(s.detail),
        ownerId: text(s.ownerId) || null,
        source: src && text(src.tool) && text(src.key) ? { tool: text(src.tool), key: text(src.key) } : null,
        attachments: Array.isArray(s.attachments) ? s.attachments.filter((a): a is string => typeof a === "string") : [],
      };
    }
  } catch {
    // Storage blocked or the saved value is unreadable: start empty.
  }
  return current;
}

export function setDraft(patch: Partial<StoryDraft>) {
  current = { ...read(), ...patch };
  try {
    if (isEmpty(current)) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Storage blocked: the draft still lives until the page closes.
  }
  listeners.forEach((l) => l());
}

export const clearDraft = () => setDraft(EMPTY);

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export const useDraft = () => useSyncExternalStore(subscribe, read, () => EMPTY);
