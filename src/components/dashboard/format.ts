import type { NeedKind, Story, StoryStatus } from "@/types/dashboard";
import type { TicketStatus } from "@/types/status";

export const storyRef = (id: number) => `hq-${id}`;

/** The story's own page, where its chat is: an agent's question is asked there, and answered there. */
export const chatHref = (id: number) => `/stories/${storyRef(id)}`;

export const STATUS_LABEL: Record<StoryStatus, string> = {
  new: "New",
  planning: "Planning",
  approved: "Approved",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
  cancelled: "Cancelled",
};

/** The prototype's groups, in its order (most urgent first). */
export const NEEDS: { kind: NeedKind; label: string; hint: string }[] = [
  { kind: "stuck", label: "Stuck", hint: "Not being picked up. Each says what it is waiting on." },
  { kind: "review", label: "Review", hint: "Move the story back to Approved to have each one built." },
  { kind: "decision", label: "Decision", hint: "Answer the open questions." },
  { kind: "planning", label: "Planning", hint: "" },
  { kind: "triage", label: "Triage", hint: "" },
  { kind: "next", label: "Say what to do next", hint: "No step applies. Add a note with what you want, or move its status." },
];

export const needHint = (kind: NeedKind) => NEEDS.find((n) => n.kind === kind)!.hint;

/**
 * Each group's story as a shared ticket status (DESIGN.md §7.12), so the dashboard and Stories name it alike. The
 * groups stay the queue's order, filter and cards; a status never says "you", so every group that waits on a
 * person is Needs input, and the Action column says what input. Stuck stories stopped on a failed preview or check.
 */
export const NEED_STATUS: Record<NeedKind, TicketStatus> = {
  stuck: "failed",
  review: "in_review",
  decision: "needs_input",
  planning: "needs_input",
  triage: "needs_input",
  next: "needs_input",
};

/** The review instruction every review story shares; the table shows only instructions that differ from it. */
const SAME_REVIEW = "Move the story back to Approved to have this built.";

/** What the Action column shows: the story's own instruction, or its extra line, or nothing. */
export const rowAction = (s: Story) => (s.action && s.action !== SAME_REVIEW ? s.action : s.meta);

const ORDER = Object.fromEntries(NEEDS.map((n, i) => [n.kind, i])) as Record<NeedKind, number>;

export type SortMode = "group" | "updated-desc" | "updated-asc";

/** Default order: the prototype's groups (Stuck first), then its own order within each group. */
export function sortQueue(stories: Story[], mode: SortMode): Story[] {
  const indexed = stories.map((s, i) => ({ s, i }));
  const mins = (s: Story) => s.updatedMinutes ?? Number.MAX_SAFE_INTEGER;
  indexed.sort((a, b) => {
    if (mode === "updated-desc") return mins(a.s) - mins(b.s) || a.i - b.i;
    if (mode === "updated-asc") return mins(b.s) - mins(a.s) || a.i - b.i;
    return ORDER[a.s.need!] - ORDER[b.s.need!] || a.i - b.i;
  });
  return indexed.map((x) => x.s);
}

// The open story lives in the URL (`?story=hq-43`), so links, reloads and Back reopen it. The top bar and
// the dashboard are separate islands; after changing the URL they announce it with this event.
export const URL_EVENT = "dashboard:url";

export function readStoryParam(search: string): number | null {
  const match = new URLSearchParams(search).get("story")?.match(/^hq-(\d+)$/);
  return match ? Number(match[1]) : null;
}

interface StoryHistoryState {
  story: number | null;
  /** True when opening the panel added this history entry, so closing it can simply go Back. */
  pushed?: boolean;
}

export function writeStoryParam(id: number | null, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  if (id === null) url.searchParams.delete("story");
  else url.searchParams.set("story", storyRef(id));
  const prev = (window.history.state ?? {}) as Partial<StoryHistoryState>;
  const state: StoryHistoryState = mode === "push" ? { story: id, pushed: true } : { ...prev, story: id };
  window.history[mode === "push" ? "pushState" : "replaceState"](state, "", url);
  window.dispatchEvent(new Event(URL_EVENT));
}

/** Closes the open story: Back if opening it added a history entry, otherwise drop the parameter in place. */
export function clearStoryParam() {
  const state = window.history.state as Partial<StoryHistoryState> | null;
  if (state?.pushed) window.history.back();
  else writeStoryParam(null, "replace");
}
