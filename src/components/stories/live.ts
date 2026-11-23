import { useSyncExternalStore } from "react";
import type { StoryItem } from "@/types/stories";

// Front end only: changes to stories that the board's demo (`?demo=live`) plays, since there's no back end yet.
// Later the same patches come from the CraftHQ API's event stream. Kept in memory; saved to session storage only
// while `?demo=live` is on the address, so a demo never leaks into a normal visit (a run would otherwise keep
// "working" for hours). Stop clears it.

export type StoryPatch = Partial<Pick<StoryItem, "status" | "need" | "waitingOn" | "meta" | "live" | "outcome" | "pr" | "updated" | "updatedMinutes">> & {
  /** Explicitly clear these fields (a patch can't say "undefined" through JSON). */
  clear?: ("need" | "waitingOn" | "meta" | "live")[];
};

const KEY = "crafthq:story-live-demo";
const EMPTY: Record<number, StoryPatch> = {};
let cache: Record<number, StoryPatch> | null = null;
const subs = new Set<() => void>();

const demoOn = () => {
  try {
    return new URLSearchParams(window.location.search).get("demo") === "live";
  } catch {
    return false;
  }
};

function read(): Record<number, StoryPatch> {
  if (cache) return cache;
  cache = EMPTY;
  if (!demoOn()) return cache;
  try {
    const saved: unknown = JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      // A run started more than 2 hours ago is over: drop it rather than show it "working" for hours.
      const cutoff = Date.now() - 2 * 60 * 60_000;
      cache = Object.fromEntries(
        Object.entries(saved as Record<string, StoryPatch>).map(([id, p]) =>
          p.live?.startedAt !== undefined && p.live.startedAt < cutoff ? [id, { ...p, live: undefined, clear: [...(p.clear ?? []), "live"] }] : [id, p],
        ),
      );
    }
  } catch {
    // Unreadable: start clean.
  }
  return cache;
}

function save() {
  if (!demoOn()) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(cache ?? {}));
  } catch {
    // Storage blocked: the demo lives until the page closes.
  }
}

/** Merge a change into a story's patch. */
export function patchStory(id: number, patch: StoryPatch) {
  const prev = read()[id] ?? {};
  const clear = [...new Set([...(prev.clear ?? []).filter((k) => !(k in patch)), ...(patch.clear ?? [])])];
  cache = { ...read(), [id]: { ...prev, ...patch, clear } };
  save();
  subs.forEach((f) => f());
}

export function clearPatches() {
  cache = {};
  save();
  subs.forEach((f) => f());
}

function subscribe(onChange: () => void) {
  subs.add(onChange);
  return () => subs.delete(onChange);
}

export const useStoryPatches = () => useSyncExternalStore(subscribe, read, () => EMPTY);

/** A story with its demo changes applied. */
export function withPatch(story: StoryItem, patch?: StoryPatch): StoryItem {
  if (!patch) return story;
  const { clear, ...rest } = patch;
  const next: StoryItem = { ...story, ...rest };
  clear?.forEach((k) => {
    delete next[k];
  });
  return next;
}
