import { useSyncExternalStore } from "react";

// The story page's stories list, as this viewer left it: open on the left or put away, and which of its groups are
// open. Every story is its own page, so it's kept in local storage and the list looks the same from story to story
// (DESIGN.md §2.5; §5.1: a folded group stays folded until you open it again). Blocked storage just means the
// defaults, until the page closes. The activity isn't kept: it opens from its corner icon when you want it.

const KEY = "crafthq:story-panels";

export interface Panels {
  /** The stories list is open on the left (its button is the first in the builder's header). */
  stories: boolean;
  /** The stories list's groups opened or folded by hand, by key. The rest start folded, except Needs you. */
  groups: Readonly<Record<string, boolean>>;
}

// Put away until you open it: the chat with the agent is the page (Shubham, 23 Nov: the app menu, the stories, the
// chat and the activity side by side were too many columns to take in at a glance).
const DEFAULTS: Panels = { stories: false, groups: {} };

const subs = new Set<() => void>();
let cache: Panels | null = null;

function read(): Panels {
  if (cache) return cache;
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    const s = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
    const groups = s.groups && typeof s.groups === "object" ? Object.entries(s.groups).filter(([, v]) => typeof v === "boolean") : [];
    cache = {
      stories: typeof s.stories === "boolean" ? s.stories : DEFAULTS.stories,
      groups: Object.fromEntries(groups) as Record<string, boolean>,
    };
  } catch {
    cache = DEFAULTS;
  }
  return cache;
}

function write(next: Panels) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: kept until the page closes.
  }
  subs.forEach((f) => f());
}

function subscribe(onChange: () => void) {
  subs.add(onChange);
  return () => {
    subs.delete(onChange);
  };
}

export const usePanels = () => useSyncExternalStore(subscribe, read, () => DEFAULTS);

export const setStoriesOpen = (open: boolean) => write({ ...read(), stories: open });

export const setGroupOpen = (key: string, open: boolean) => write({ ...read(), groups: { ...read().groups, [key]: open } });

/** Needs you starts open; the board's groups start folded, until you open them. */
export const isGroupOpen = (panels: Panels, key: string) => panels.groups[key] ?? key === "you";
