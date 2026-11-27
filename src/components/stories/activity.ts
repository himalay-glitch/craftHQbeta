import type { NeedKind } from "@/types/dashboard";
import type { ActivityItem, ActivityKind, Device, FileRef, MainState, PhaseKey, PrMerge, StoryFacts, StoryItem } from "@/types/stories";
import { PHASE_LABEL } from "./phases";
import { prNumberFor } from "./thread";

// The activity log's starting point for a story (front end only, until it comes from the CraftHQ API), and
// the jobs a message can ask the agent for: what it shows while working, and what it says when done.

const item = (s: StoryItem, kind: ActivityKind, rest: Omit<ActivityItem, "id" | "kind">): ActivityItem => ({
  id: `${s.id}-${kind}-${rest.at}-${rest.title}`,
  kind,
  ...rest,
});

/** An open pull request's line in the outputs: waiting on the person who merges, or what the robots are doing to keep
 *  it mergeable after another story merged first. */
export const PR_DETAIL: Record<PrMerge, (conflictWith?: number) => string> = {
  ready: () => "Ready to merge on GitHub",
  updating: () => "Bringing in the latest main",
  checks: () => "Checks running",
  conflict: (other) => (other ? `Conflicts with hq-${other} · Builder is fitting both in` : "Conflicts · Builder is fixing them"),
  failing: () => "A check failed · Builder is fixing it",
  blocked: () => "Couldn’t update · CraftHQ can’t write to GitHub",
};

const refs = (ids: number[]) => ids.map((id) => `hq-${id}`).join(", ");

/** The "Latest main" line in the outputs: up to date, or what's being brought in. Built stories only. */
export function mainDetail(m: MainState): { state: ActivityItem["state"]; detail: string } {
  if (m.behind.length && m.onPush) return { state: "waiting", detail: `${refs(m.behind)} merged · compared when you create the pull request` };
  if (m.behind.length) return { state: "working", detail: `${refs(m.behind)} merged · bringing it in` };
  return { state: "done", detail: m.settled ? `Up to date · ${m.settled} clashes, both sides kept` : `Up to date · checked ${m.checked}` };
}

/** Newest first, from where the story is now. */
/** How far a build is, by its phase: the same four steps the story page's own build ticks through. */
const BUILD_STEP: Partial<Record<PhaseKey, number>> = { plan: 0, resume: 0, implement: 1, "ui-check": 2, review: 3, verify: 4, reply: 4 };

/** `now`: when the page opened (epoch ms), so a run under way counts its time from the same start as the board. */
export function buildActivity(s: StoryItem, facts: StoryFacts, now?: number): ActivityItem[] {
  const a: ActivityItem[] = [];
  const status = s.status;
  // New is not a plan being written (statuses guide §2): until the agent picks it up, nothing is happening.
  const untouched = status === "new" && !s.need;
  // The whole app, every screen from A to Z, is there at every stage (Shubham, 27 Nov): with this story in it once
  // it's built, and before that the app as it is now. One machine runs at a time, this story's preview or this.
  const built = s.need !== "stuck" && (status === "in_review" || status === "pull_request" || status === "done");
  a.push(item(s, "preview", { title: "Whole app · Web", scope: "app", withStory: built, state: "done", detail: "Ready to try", device: "web", run: "off", at: "Nov 10" }));
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

  a.push(item(s, "stage", { title: "Plan approved", state: "info", detail: "", move: { from: "Planning", to: "Building" }, at: "Nov 11" }));
  const stuck = s.need === "stuck";
  if (status === "approved" && !stuck) return a.reverse();

  const building = status === "in_progress" || stuck;
  // A run under way (the board's live line) says which phase it's in, here as on the board.
  const phase = status === "in_progress" && s.live ? s.live.phase : undefined;
  a.push(
    item(s, "build", {
      title: "Build",
      state: building ? (stuck ? "failed" : "working") : "done",
      detail: building ? (stuck ? "Paused" : phase ? PHASE_LABEL[phase] : "Running the checks") : "Built · 6 steps",
      progress: building ? (phase ? { done: BUILD_STEP[phase] ?? 0, total: 4 } : { done: 4, total: 6 }) : undefined,
      startedAt: phase && s.live && now ? (s.live.startedAt ?? now - (s.live.minutesAgo ?? 0) * 60_000) : undefined,
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
  a.push(item(s, "preview", { title: "Preview · Web", state: "done", detail: "Ready to try", device: "web", run: "off", at: "Nov 12" }));
  // The pull request exists only once someone creates it from In review (Shubham, 26 Nov).
  const n = s.pr?.number ?? prNumberFor(s.id);
  const merged = status === "done" && (s.outcome === "merged" || s.pr?.state === "merged");
  const closed = status === "done" && !merged && (s.outcome === "closed" || s.pr?.state === "closed");
  if (status === "pull_request" || merged || closed)
    a.push(item(s, "stage", { title: "Pull request created", state: "info", detail: "", move: { from: "In review", to: "Pull request" }, at: "Nov 13" }));
  // Back in review with its pull request open: the pull request has the version before this one.
  if (status === "in_review" && s.pr?.state === "open")
    a.push(item(s, "pr", { title: `Pull request #${n}`, state: "done", detail: "Has the version before this · update it from the review", at: "Nov 24" }));
  if (status === "pull_request") {
    const merge = s.pr?.merge ?? "ready";
    a.push(item(s, "pr", { title: `Pull request #${n}`, state: merge === "blocked" ? "failed" : "done", detail: PR_DETAIL[merge](s.pr?.conflictWith), at: "Nov 13" }));
  }
  // Built work waiting for a person: where its branch stands against main, so nobody has to ask (hq-35, 18–25 Nov).
  if (status === "in_review" || status === "pull_request") {
    const m = mainDetail(s.main ?? { behind: [], checked: "5m ago" });
    a.push(item(s, "main", { title: "Latest main", ...m, at: "Just now" }));
  }
  if (status === "done") {
    if (merged || closed) a.push(item(s, "pr", { title: `Pull request #${n}`, state: "done", detail: merged ? "Merged into main" : "Closed without merging", at: "Nov 14" }));
    a.push(item(s, "stage", { title: merged ? "Merged" : closed ? "Closed" : "Marked Done", state: "info", detail: "", move: { from: merged || closed ? "Pull request" : "In review", to: "Done" }, at: "Nov 14" }));
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
  /** Previews: this story's own, or the whole app. */
  scope?: ActivityItem["scope"];
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
      reply: "The markup is ready: two screens, drawn from the plan. It’s under Preview.",
      count: 2,
      device,
      ms: 3000,
    };
  }
  // The whole app, every screen: there before the build too, as the app is now. "app" here isn't the mobile app.
  if (has(text, /\b(whole|entire|full) (app|product)\b|\ba to z\b/)) {
    const device = deviceIn(text.replace(/\b(whole|entire|full) (app|product)\b/gi, ""), "web");
    return {
      kind: "preview",
      scope: "app",
      title: `Whole app · ${DEVICE_NAME[device]}`,
      doing: `Starting the whole app on ${device}`,
      done: `Running on ${device}`,
      reply: built
        ? `The whole app is running on ${device}, with this story in it: every screen, from the first one. Open it under Preview, and stop it there when you’re done.`
        : `The whole app is running on ${device}, as it is now: this story isn’t in it yet, it comes with the build. Open it under Preview, and stop it there when you’re done.`,
      device,
      ms: 2400,
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
        reply: "There’s nothing of this story to preview yet: it comes with the build, once the plan is approved. Meanwhile the whole app, as it is now, is under Preview.",
        device,
        ms: 1200,
      };
    }
    return {
      kind: "preview",
      title: `Preview · ${DEVICE_NAME[device]}`,
      doing: `Starting the preview on ${device}`,
      done: `Running on ${device}`,
      reply: `The preview is running on ${device}: just what this story makes. Open it under Preview, and stop it there when you’re done.`,
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
      reply: "I’ve updated the specification page with that. The changes are under Pages.",
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
  main: "The comparison with main opens on GitHub once GitHub is connected.",
};

/** Happening now, shown on top as a notification: work under way, waiting on a person, failed, a preview starting,
 *  or something that has just finished (it stays a moment before it goes down). */
export const isNow = (i: ActivityItem) =>
  i.state === "working" || i.state === "waiting" || i.state === "failed" || i.run === "starting" || Boolean(i.settling);


/** One of each: a story has one specification page, one engineering page, one preview of its own, one of the whole
 *  app and one pull request, and a rebuild's build and checks replace the last ones. Each is keyed by what it is, so
 *  only its newest version counts. */
const SINGLE: ActivityKind[] = ["spec", "engineering", "preview", "pr", "main"];
const sameThing = (it: ActivityItem) =>
  it.kind === "preview" && it.scope === "app" ? "preview:app" : SINGLE.includes(it.kind) ? it.kind : `${it.kind}:${it.title}`;

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

/** Finished things, in the order they finished: the newest lands last. Only the newest version of each thing counts, so
 *  a page being reworked isn't here while it's being rewritten. Reading the story and stage changes aren't things you
 *  open: never here. `justNow`: with what finished a moment ago and is still "settling". */
function finished(items: ActivityItem[], justNow: boolean) {
  const seen = new Set<string>();
  const newest: { it: ActivityItem; index: number }[] = [];
  items.forEach((it, index) => {
    if (it.kind === "read" || it.kind === "stage" || it.state === "info") return;
    const key = sameThing(it);
    if (seen.has(key)) return; // an older version of something newer
    seen.add(key);
    if (it.state === "done" && (justNow || !it.settling)) newest.push({ it, index });
  });
  return newest.sort((a, b) => (a.it.doneAt ?? 0) - (b.it.doneAt ?? 0) || b.index - a.index).map(({ it }) => it);
}

/** Finished and settled: what the phone's one-line summary counts as ready (what has just finished is its news then). */
export const readyOf = (items: ActivityItem[]) => finished(items, false);

/** Everything that was made, with what finished a moment ago: each part of the Output shows its own things in place. */
export const madeOf = (items: ActivityItem[]) => finished(items, true);

/** Being made, waiting on someone or stopped: the newest version of each thing that isn't finished. Each shows in its
 *  own part (Shubham, 27 Nov: every part a box of its own), where it becomes a finished line when it's done. */
export const activeOf = (items: ActivityItem[]) =>
  newestVersions(items).filter((i) => i.kind !== "read" && i.kind !== "stage" && (i.state === "working" || i.state === "waiting" || i.state === "failed"));

// ---- Outputs: one short list, in a fixed order ----

/** The thing you'd open first goes first; then the order they finished. */
const KIND_ORDER: ActivityKind[] = ["spec", "engineering", "preview", "screenshots", "markup", "pr", "main", "build", "checks"];

/** This story's preview before the whole app's. */
const rank = (it: ActivityItem) => KIND_ORDER.indexOf(it.kind) + (it.scope === "app" ? 0.5 : 0);

export function orderOutputs(ready: ActivityItem[]) {
  return ready
    .map((it, i) => ({ it, i }))
    .sort((a, b) => rank(a.it) - rank(b.it) || a.i - b.i)
    .map(({ it }) => it);
}

/** The newest thing working, else the newest thing (the phone summary falls back to it). Items are newest first. */
export const spotOf = (items: ActivityItem[]) => items.find((i) => i.state === "working") ?? items[0];

/** The preview machine, while it's starting or running: this story's preview or the whole app (one runs at a time). */
export const livePreview = (items: ActivityItem[]) =>
  items.find((i) => i.kind === "preview" && i.state !== "info" && (i.run === "starting" || i.run === "on"));

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
