import { useSyncExternalStore } from "react";
import type { Decision, Segment, ThreadEntry } from "@/types/stories";
import { answerText } from "./questions";

// The story's decisions (Shubham, 26 Nov): kept for good, so a misunderstanding or a debate can always be settled.
// People make every one of them directly; nothing here waits on an agent. Answers and approvals are read from the
// conversation itself. Messages saved as decisions, and changes to decisions, are kept in local storage by story, so
// they stay after a reload. The CraftHQ API keeps all of them later, as records of their own.

type Saved = Record<number, Decision[]>;

const KEY = "crafthq:story-decisions";
const NONE: Decision[] = [];
let cache: Saved | null = null;
const listeners = new Set<() => void>();

function read(): Saved {
  if (cache) return cache;
  cache = {};
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) cache = saved as Saved;
  } catch {
    // Storage blocked or unreadable: nothing saved yet.
  }
  return cache;
}

function write(next: Saved) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the decision lives until the page closes.
  }
  listeners.forEach((l) => l());
}

export function addDecision(storyId: number, d: Decision) {
  const all = read();
  write({ ...all, [storyId]: [...(all[storyId] ?? []), d] });
}

/** Undo only: a decision just saved, taken back. Decisions are otherwise never removed. */
export function removeDecision(storyId: number, id: string) {
  const all = read();
  write({ ...all, [storyId]: (all[storyId] ?? []).filter((d) => d.id !== id) });
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export const useSavedDecisions = (storyId: number) =>
  useSyncExternalStore(
    subscribe,
    () => read()[storyId] ?? NONE,
    () => NONE,
  );

/** The moves people make that settle something, as the conversation's status lines say them ("Plan approved by Skye
 *  Rao"), until the API sends them as decisions of their own. Hand-offs, rebuild steps and robot work aren't decisions. */
const MOVES: { re: RegExp; text: string }[] = [
  { re: /^Plan (?:written · )?approved by ([^·]+?)(?:\s·|$)/, text: "Plan approved" },
  { re: /^Defaults kept · plan approved by ([^·]+?)(?:\s·|$)/, text: "Plan approved with the default answers" },
  { re: /^Approved by ([^·]+?)(?:\s·|$)/, text: "Approved to build" },
  { re: /^Approved again by ([^·]+?)(?:\s·|$)/, text: "Rebuild approved" },
  { re: /^Pull request created by ([^·]+?)(?:\s·|$)/, text: "Work accepted · pull request created" },
  { re: /^Pull request updated by ([^·]+?)(?:\s·|$)/, text: "Pull request updated with the new build" },
  { re: /^Marked Done by ([^·]+?)(?:\s·|$)/, text: "Marked Done · nothing to merge" },
  { re: /closed without merging, by (.+)$/, text: "Pull request closed without merging" },
  { re: /^Moved (?:back )?to Planning by (.+)$/, text: "Sent back to Planning" },
  { re: /^Cancelled by ([^·]+?)(?:\s·|$)/, text: "Story cancelled" },
];

const who = (name: string, viewer: string) => (name === "you" || name === viewer ? "You" : name);

/** "Today" for a decision made today, else "Nov 26". */
export function dayOf(ts: number, now = Date.now()) {
  const d = new Date(ts);
  return d.toDateString() === new Date(now).toDateString() ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Every decision on the story, newest first: answers and approvals from the conversation, in the order they happened,
 * then the ones saved here. A decision that a later one replaced stays in the list, marked with who replaced it.
 */
export function decisionsFrom(entries: ThreadEntry[], saved: Decision[], viewer: string): Decision[] {
  const list: Decision[] = [];
  for (const e of entries) {
    if (e.kind === "question" && e.answer) {
      list.push({
        id: `d-${e.id}`,
        kind: "answer",
        text: answerText(e),
        question: e.question,
        others: e.options.filter((_, i) => i !== e.answer?.option),
        by: e.answer.by === "Default" ? "Default answer" : who(e.answer.by, viewer),
        at: e.answer.at,
        entryId: e.id,
      });
    } else if (e.kind === "stage") {
      for (const m of MOVES) {
        const hit = m.re.exec(e.text);
        if (hit) {
          list.push({ id: `d-${e.id}`, kind: "approval", text: m.text, by: who(hit[1].trim(), viewer), at: e.at, entryId: e.id });
          break;
        }
      }
    }
  }
  const mine = [...saved].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0)).map((d) => ({ ...d, by: who(d.by, viewer), at: d.ts ? dayOf(d.ts) : d.at }));
  const all = [...list, ...mine];
  for (const d of mine) {
    if (!d.replaces) continue;
    const old = all.find((x) => x.id === d.replaces);
    if (old) old.replacedBy = { by: d.by, at: d.at };
  }
  return all.reverse();
}

/** A message as plain words, for the decision it's saved as: names for chips, the report's outcome first. */
export function plainText(text?: Segment[], report?: { outcome: string; means?: string }) {
  const words = (text ?? [])
    .map((s) => (typeof s === "string" ? s : s.type === "person" ? s.name : s.type === "agent" ? "the agent" : `hq-${s.id}`))
    .join("")
    .trim();
  const said = words || [report?.outcome, report?.means].filter(Boolean).join(" ");
  // One line: the first sentence when it's a sensible length, else the start of it.
  const first = /^(.{12,200}?[.!?])(\s|$)/.exec(said)?.[1];
  return first ?? (said.length > 200 ? `${said.slice(0, 197).trimEnd()}…` : said);
}
