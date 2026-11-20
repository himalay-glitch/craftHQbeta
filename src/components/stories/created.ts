import { useSyncExternalStore } from "react";
import type { StoryItem } from "@/types/stories";

// Front end only: stories created in this browser are kept in local storage, so they stay on the board
// after a reload and their own page can open. The CraftHQ API replaces this later.

const KEY = "crafthq:created-stories";
const EMPTY: StoryItem[] = [];
let cache: StoryItem[] | null = null;
const listeners = new Set<() => void>();

function read(): StoryItem[] {
  if (cache) return cache;
  cache = EMPTY;
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    if (Array.isArray(saved)) cache = saved as StoryItem[];
  } catch {
    // Storage blocked or unreadable: no created stories.
  }
  return cache;
}

export function addCreated(story: StoryItem) {
  cache = [story, ...read()];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage blocked: the story lives until the page closes.
  }
  listeners.forEach((l) => l());
}

export const findCreated = (id: number) => read().find((s) => s.id === id) ?? null;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export const useCreatedStories = () => useSyncExternalStore(subscribe, read, () => EMPTY);
