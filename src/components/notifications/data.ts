import { useSyncExternalStore } from "react";
import type { BotId } from "@/types/ask";

/** Who a notification is from: an agent (its face), or a teammate (their initials). */
export type From = { kind: "bot"; id: BotId } | { kind: "person"; name: string; initials: string };

export interface Notice {
  id: string;
  storyId: number;
  from: From;
  /** The summary around the story's title, which is shown in medium (DESIGN.md §6.5): [before, title, after]. */
  text: [string, string, string];
  when: string;
  /** Needs you: blocked until you act, with its one inline action (DESIGN.md §6.5). Otherwise an update. */
  action?: string;
}

// Until the CraftHQ API sends them: what Josh (the demo's viewer) would have, from the sample stories. Needs you first,
// newest first; then updates, newest first. One per story (DESIGN.md §6.5: grouped by ticket).
export const NOTICES: Notice[] = [
  { id: "review-43", storyId: 43, from: { kind: "bot", id: "tester" }, text: ["", "Creation flow revision", " passed every check and is ready for your review"], when: "just now", action: "Review" },
  { id: "review-33", storyId: 33, from: { kind: "bot", id: "tester" }, text: ["", "Event Discuss tab: posts, replies and likes", " is ready for your review"], when: "just now", action: "Review" },
  { id: "review-52", storyId: 52, from: { kind: "bot", id: "tester" }, text: ["", "Explore: discovery (search + browse, list + map)", " is ready for your review"], when: "2m ago", action: "Review" },
  { id: "blocked-25", storyId: 25, from: { kind: "bot", id: "pm" }, text: ["Couldn’t update the pull request for ", "Phone sign-up and verification code", ": CraftHQ can’t write to GitHub"], when: "1m ago", action: "Reconnect" },
  { id: "stuck-21", storyId: 21, from: { kind: "bot", id: "debugger" }, text: ["", "Test story", " is stuck: its preview couldn’t start"], when: "1h ago", action: "Open" },
  { id: "question-28", storyId: 28, from: { kind: "bot", id: "pm" }, text: ["The PM needs a decision on ", "Create a login screen", ": what it should add"], when: "1h ago", action: "Answer" },
  { id: "plan-30", storyId: 30, from: { kind: "bot", id: "pm" }, text: ["The plan for ", "Loop handover test: answers follow the story owner", " is ready for your OK"], when: "8d ago", action: "Read plan" },

  { id: "pr-53", storyId: 53, from: { kind: "bot", id: "pm" }, text: ["Pull request #259 for ", "View your profile", " is ready. Deepak merges it on GitHub"], when: "3m ago" },
  { id: "queued-58", storyId: 58, from: { kind: "person", name: "Deepak Tewatia", initials: "DT" }, text: ["Deepak approved ", "Dark mode for the calendar", ". It’s queued for the Developer"], when: "4m ago" },
  { id: "main-26", storyId: 26, from: { kind: "bot", id: "pm" }, text: ["hq-5 merged, so the PM is bringing main into ", "Home feed states: loading, empty, error, offline", ". Both sides of every clash can stay"], when: "6m ago" },
  { id: "merged-1", storyId: 1, from: { kind: "person", name: "Deepak Tewatia", initials: "DT" }, text: ["Deepak merged ", "Sign up with your email", ""], when: "Yesterday" },
];

// What this viewer has read, kept in this browser until the API keeps it. The three new reviews, the refused pull
// request update and the ready one start unread.
const KEY = "crafthq:notifications:read";
const FIRST_UNREAD = ["review-43", "review-33", "review-52", "blocked-25", "pr-53"];
const FIRST_READ = NOTICES.filter((n) => !FIRST_UNREAD.includes(n.id)).map((n) => n.id);

const listeners = new Set<() => void>();
let cache: { raw: string | null; ids: ReadonlySet<string> } | null = null;

function read(): ReadonlySet<string> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Blocked storage: the defaults, until the page closes.
  }
  if (cache && cache.raw === raw) return cache.ids;
  let ids: string[] = FIRST_READ;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) ids = parsed.filter((x): x is string => typeof x === "string");
  } catch {
    // A broken value: the defaults.
  }
  cache = { raw, ids: new Set(ids) };
  return cache.ids;
}

function write(ids: Iterable<string>) {
  const raw = JSON.stringify([...new Set(ids)]);
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    // Kept for this page only.
  }
  cache = { raw, ids: new Set(JSON.parse(raw) as string[]) };
  listeners.forEach((fn) => fn());
}

const EMPTY: ReadonlySet<string> = new Set(NOTICES.map((n) => n.id));

/** The ids read so far. On the server, everything counts as read, so no count flashes before the page wakes. */
export const useRead = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      const onStorage = (e: StorageEvent) => e.key === KEY && fn();
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(fn);
        window.removeEventListener("storage", onStorage);
      };
    },
    read,
    () => EMPTY,
  );

export const markRead = (id: string) => write([...read(), id]);
export const markAllRead = () => write(NOTICES.map((n) => n.id));
