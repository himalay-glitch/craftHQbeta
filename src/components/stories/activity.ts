import type { NeedKind } from "@/types/dashboard";
import type { ActivityItem, ActivityKind, Device, FileRef, StoryFacts, StoryItem } from "@/types/stories";
import { prNumberFor } from "./thread";

// The activity log's starting point for a story (front end only, until it comes from the CraftHQ API), and
// the jobs a message can ask the agent for: what it shows while working, and what it says when done.

const item = (s: StoryItem, kind: ActivityKind, rest: Omit<ActivityItem, "id" | "kind">): ActivityItem => ({
  id: `${s.id}-${kind}-${rest.at}-${rest.title}`,
  kind,
  ...rest,
});

/** Newest first, from where the story is now. */
export function buildActivity(s: StoryItem, facts: StoryFacts): ActivityItem[] {
  const a: ActivityItem[] = [];
  const status = s.status;
  // New is not a plan being written (statuses guide §2): until the agent picks it up, nothing is happening.
  const untouched = status === "new" && !s.need;
  a.push(item(s, "read", { title: "Story", state: untouched ? "info" : "done", detail: untouched ? "Not planned yet" : "Read", at: "Nov 10" }));
  if (status === "new" || status === "cancelled") {
    if (status === "cancelled") a.push(item(s, "stage", { title: "Cancelled", state: "info", detail: "", move: { from: "Planning", to: "Cancelled" }, at: "Nov 12" }));
    return a.reverse();
  }

  const planReady = status !== "planning" || s.need === "planning";
  const asking = status === "planning" && s.need === "decision";
  const specDetail = status === "planning" ? (s.need === "planning" ? "Draft ready for your OK" : asking ? "Waiting on your answers" : "Writing") : "Approved";
  // The specification page first, then the engineering page, which is written from it (Shubham, 20 Nov).
  a.push(item(s, "spec", { title: "Specification page", state: planReady ? "done" : asking ? "waiting" : "working", detail: specDetail, at: "Nov 11" }));
  if (planReady) a.push(item(s, "engineering", { title: "Engineering page", state: "done", detail: status === "planning" ? "Draft ready for your OK" : "Approved", at: "Nov 11" }));
  if (status === "planning") return a.reverse();

  a.push(item(s, "stage", { title: "Plan approved", state: "info", detail: "", move: { from: "Planning", to: "Ready to build" }, at: "Nov 11" }));
  const stuck = s.need === "stuck";
  if (status === "approved" && !stuck) return a.reverse();

  const building = status === "in_progress" || stuck;
  a.push(
    item(s, "build", {
      title: "Build",
      state: building ? (stuck ? "failed" : "working") : "done",
      detail: building ? (stuck ? "Paused" : "Running the checks") : "Built · 6 steps",
      progress: building ? { done: 4, total: 6 } : undefined,
      at: "Nov 12",
    }),
  );
  if (stuck) {
    a.push(item(s, "preview", { title: "Preview · Web", state: "failed", detail: "Couldn’t start: the machine was reclaimed", device: "web", at: "Nov 12" }));
    return a.reverse();
  }
  if (building) return a.reverse();

  a.push(item(s, "checks", { title: "Checks", state: "done", detail: facts.checks.line, at: "Nov 12" }));
  // A second agent, not the builder, checks the work before it reaches review (statuses guide §4).
  a.push(item(s, "checks", { title: "Independent check", state: "done", detail: "Passed · does what the story asks", at: "Nov 12" }));
  // The pull request opens with the move to review, before the preview, so the preview stays the newest card.
  a.push(item(s, "pr", { title: `Pull request #${prNumberFor(s.id)}`, state: "done", detail: "Open · waiting for you to merge", at: "Nov 12" }));
  a.push(item(s, "preview", { title: "Preview · Web", state: "done", detail: "Ready to try", device: "web", run: "off", at: "Nov 12" }));
  if (status === "done") {
    a.push(item(s, "pr", { title: `Pull request #${prNumberFor(s.id)}`, state: "done", detail: "Merged into main", at: "Nov 14" }));
    a.push(item(s, "stage", { title: "Marked Done", state: "info", detail: "", move: { from: "In review", to: "Done" }, at: "Nov 14" }));
  }
  return a.reverse();
}

/** A job the agent does from a message: its activity entry while working and when done, and its reply. */
export interface Task {
  kind: ActivityKind;
  title: string;
  /** Shown in the chat and the activity log while it works. */
  doing: string;
  done: string;
  reply: string;
  files?: FileRef[];
  count?: number;
  device?: Device;
  ms: number;
}

const has = (text: string, words: RegExp) => words.test(text.toLowerCase());

function deviceIn(text: string, fallback: Device): Device {
  if (has(text, /\b(web|desktop|browser|laptop)\b/)) return "web";
  if (has(text, /\b(mobile|android|phone|app)\b/)) return "mobile";
  return fallback;
}

export const DEVICE_NAME: Record<Device, string> = { web: "Web", mobile: "Mobile" };

/** What a message asks the agent to make or change, if anything. `built` is false before the first build. */
export function taskFor(text: string, story: StoryItem, built: boolean): Task | null {
  const slug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "story";

  if (has(text, /screen ?shots?|capture/)) {
    const device = deviceIn(text, "mobile");
    const n = 3;
    return {
      kind: "screenshots",
      title: `Screenshots · ${DEVICE_NAME[device]}`,
      doing: `Taking screenshots on ${device}`,
      done: `${n} screens`,
      reply: built
        ? `Here are ${n} screenshots on ${device}, from the latest preview.`
        : `Here are ${n} screenshots on ${device}. They’re from the plan’s screens, since nothing is built yet.`,
      files: Array.from({ length: n }, (_, i) => ({ name: `${slug}-${device}-${i + 1}.png`, kind: "image" as const })),
      count: n,
      device,
      ms: 2600,
    };
  }
  if (has(text, /mark ?ups?|mock ?ups?|wireframes?/)) {
    const device = deviceIn(text, "mobile");
    return {
      kind: "markup",
      title: `Markup · ${DEVICE_NAME[device]}`,
      doing: "Drawing the markup",
      done: "2 screens, from the plan",
      reply: "The markup is ready: two screens, drawn from the plan. It’s in Activity on the right.",
      count: 2,
      device,
      ms: 3000,
    };
  }
  if (has(text, /preview/)) {
    const device = deviceIn(text, "web");
    if (!built) {
      return {
        kind: "preview",
        title: `Preview · ${DEVICE_NAME[device]}`,
        doing: "Checking the preview",
        done: "Made after the build",
        reply: "There’s nothing to preview yet: it’s built after the plan is approved. I’ll start it as soon as the build finishes.",
        device,
        ms: 1200,
      };
    }
    return {
      kind: "preview",
      title: `Preview · ${DEVICE_NAME[device]}`,
      doing: `Starting the preview on ${device}`,
      done: `Running on ${device}`,
      reply: `The preview is running on ${device}. Open it from Activity, and stop it there when you’re done.`,
      device,
      ms: 2400,
    };
  }
  if (has(text, /engineering|technical|tech spec|architecture/)) {
    return {
      kind: "engineering",
      title: "Engineering page",
      doing: "Editing the engineering page",
      done: "Edited with your note",
      reply: "I’ve updated the engineering page with that.",
      ms: 2600,
    };
  }
  if (has(text, /spec|document|\bdoc\b|docs|requirement/)) {
    return {
      kind: "spec",
      title: "Specification page",
      doing: "Editing the specification page",
      done: "Edited with your note",
      reply: "I’ve updated the specification page with that. The changes are in Activity on the right.",
      ms: 2800,
    };
  }
  return null;
}

// ---- Activity: what's happening now on top, what's finished at the bottom ----

/** What "Open" says until the pages and files come from the CraftHQ API. */
export const OPENS: Partial<Record<ActivityKind, string>> = {
  spec: "The specification page opens here once it comes from the CraftHQ API.",
  engineering: "The engineering page opens here once it comes from the CraftHQ API.",
  screenshots: "Screenshots open full size once they come from the build service.",
  markup: "The markup opens here once it comes from the CraftHQ API.",
  pr: "Pull requests open on GitHub once GitHub is connected.",
};

/** Happening now, shown on top as a notification: work under way, waiting on a person, failed, a preview starting,
 *  or something that has just finished (it stays a moment before it goes down). */
export const isNow = (i: ActivityItem) =>
  i.state === "working" || i.state === "waiting" || i.state === "failed" || i.run === "starting" || Boolean(i.settling);


/** One of each: a story has one specification page, one engineering page, one preview and one pull request, and
 *  a rebuild's build and checks replace the last ones. Each is keyed by what it is, so only its newest version counts. */
const SINGLE: ActivityKind[] = ["spec", "engineering", "preview", "pr"];
const sameThing = (it: ActivityItem) => (SINGLE.includes(it.kind) ? it.kind : `${it.kind}:${it.title}`);

/** The newest version of each thing, newest first: an older version (a page since rewritten, last build's checks)
 *  is never on top and never in the Ready list. */
function newestVersions(items: ActivityItem[]) {
  const seen = new Set<string>();
  return items.filter((it) => {
    if (it.kind === "read" || it.kind === "stage") return true; // not things: never replaced
    const key = sameThing(it);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** What's on top, newest first. */
export const nowOf = (items: ActivityItem[]) => newestVersions(items).filter(isNow);

/** Something is being worked on right now (the Ready list fades back while it is). */
export const anyWorking = (items: ActivityItem[]) => nowOf(items).some((i) => i.state === "working" || i.run === "starting");

/** Finished things, as buttons at the bottom of the column, in the order they finished: the newest lands last.
 *  Only the newest version of each thing counts, so a page being reworked leaves the list while it's on top and
 *  comes back down when it's ready. Reading the story and stage changes aren't things you open: never here. */
export function readyOf(items: ActivityItem[]) {
  const seen = new Set<string>();
  const newest: { it: ActivityItem; index: number }[] = [];
  items.forEach((it, index) => {
    if (it.kind === "read" || it.kind === "stage" || it.state === "info") return;
    const key = sameThing(it);
    if (seen.has(key)) return; // an older version of something newer
    seen.add(key);
    if (it.state === "done" && !it.settling) newest.push({ it, index });
  });
  return newest.sort((a, b) => (a.it.doneAt ?? 0) - (b.it.doneAt ?? 0) || b.index - a.index).map(({ it }) => it);
}

/** The newest thing working, else the newest thing (the phone summary falls back to it). Items are newest first. */
export const spotOf = (items: ActivityItem[]) => items.find((i) => i.state === "working") ?? items[0];

export const currentPreview = (items: ActivityItem[]) => items.find((i) => i.kind === "preview" && i.state !== "info");

/** The preview machine, while it's starting or running. */
export const livePreview = (items: ActivityItem[]) => {
  const p = currentPreview(items);
  return p && (p.run === "starting" || p.run === "on") ? p : undefined;
};

/** The evidence for the viewer's open decision (DESIGN.md §2.2): marked "Waiting on you" in the ready list. */
const PROOF: Partial<Record<NeedKind, ActivityKind[]>> = { review: ["preview", "checks"], planning: ["spec", "engineering"], decision: ["spec"], triage: ["read"] };
export const isProof = (it: ActivityItem, yours?: NeedKind) => Boolean(yours && PROOF[yours]?.includes(it.kind));

/** Why an item is on top, in a word on its card. */
export type Reason = "working" | "starting" | "running" | "failed" | "waiting" | "yours" | "finished" | "moved" | "latest";

export function reasonOf(it: ActivityItem, yours?: NeedKind): Reason {
  if (it.state === "working") return "working";
  if (it.run === "starting") return "starting";
  if (it.run === "on") return "running";
  if (it.state === "failed") return "failed";
  if (it.state === "waiting") return "waiting";
  if (yours && it.state === "done" && PROOF[yours]?.includes(it.kind)) return "yours";
  if (it.state === "done") return "finished";
  return it.move ? "moved" : "latest";
}

/** Undo restores the story, never the preview machine: previews keep their live state, and one still starting
 *  in the snapshot comes back off. Nothing restored is fresh or settling, so nothing flashes or animates in. */
export function restoreActivity(before: ActivityItem[], now: ActivityItem[]): ActivityItem[] {
  const byId = new Map(now.map((x) => [x.id, x]));
  const restored = before.map((x): ActivityItem => {
    const cur = byId.get(x.id);
    if (x.kind === "preview" && cur) return { ...x, run: cur.run, detail: cur.detail, device: cur.device, title: cur.title, startedAt: cur.startedAt, fresh: false, settling: false };
    return { ...x, run: x.run === "starting" ? "off" : x.run, fresh: false, settling: false };
  });
  const keep = now.filter((x) => x.kind === "preview" && x.run === "on" && !before.some((b) => b.id === x.id)).map((x) => ({ ...x, fresh: false, settling: false }));
  return [...keep, ...restored];
}
