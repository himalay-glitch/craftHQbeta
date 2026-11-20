import { useSyncExternalStore } from "react";

// Front end only: who owns a story, when someone changed it here (from a card's avatar or the story page).
// Kept in local storage by story ID, so the choice stays after a reload; null means "no owner". The CraftHQ
// API replaces this later.

type Owners = Record<number, string | null>;

const KEY = "crafthq:story-owners";
const EMPTY: Owners = {};
let cache: Owners | null = null;
const listeners = new Set<() => void>();

function read(): Owners {
  if (cache) return cache;
  cache = EMPTY;
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) cache = saved as Owners;
  } catch {
    // Storage blocked or unreadable: nobody changed.
  }
  return cache;
}

export function setStoryOwner(id: number, initials: string | null) {
  cache = { ...read(), [id]: initials };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage blocked: the change lives until the page closes.
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export const useStoryOwners = () => useSyncExternalStore(subscribe, read, () => EMPTY);

/** The story's owner after any change made here. */
export function ownerOf<S extends { id: number; owner?: string }>(story: S, owners: Owners): string | undefined {
  return story.id in owners ? (owners[story.id] ?? undefined) : story.owner;
}
