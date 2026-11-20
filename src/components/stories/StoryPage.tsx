import { useCallback, useEffect, useRef, useState } from "react";
import { Tooltip } from "radix-ui";
import { ArrowDown, ArrowLeft, ChevronLeft, ChevronRight, Link as LinkIcon } from "lucide-react";
import type { NeedKind, StoryStatus } from "@/types/dashboard";
import type { ActivityItem, AskCard, Author, FileRef, LiveState, PreviewActions, Segment, StoryItem, StoryPageData, ThreadEntry } from "@/types/stories";
import { BTN_SECONDARY, ICON_BTN } from "@/components/dashboard/classes";
import { storyRef } from "@/components/dashboard/format";
import { Tip } from "@/components/dashboard/Tip";
import { Toast, type ToastMessage } from "@/components/dashboard/Toast";
import { buildActivity, DEVICE_NAME, livePreview, restoreActivity, taskFor, type Task } from "./activity";
import { ActivitySummary } from "./ActivitySummary";
import chat from "./chat.module.css";
import { findCreated } from "./created";
import { Mascot } from "./Mascot";
import { OwnerPicker } from "./OwnerPicker";
import { PreviewRow } from "./PreviewControl";
import { columnLabel, statusMoves, type StatusMove } from "./stage";
import { StatusMenu } from "./StatusMenu";
import { StoryDecision } from "./StoryDecision";
import { ownerOf, setStoryOwner, useStoryOwners } from "./owners";
import { COMPOSER_INPUT_ID, StoryComposer } from "./StoryComposer";
import { StoryRail } from "./StoryRail";
import { StoryThread } from "./StoryThread";
import { AGENT, buildFacts, buildThread, personFor, prNumberFor } from "./thread";

interface State {
  status: StoryStatus;
  need?: NeedKind;
  waitingOn?: string;
}

const isYours = (s: State) => Boolean(s.need) && (s.waitingOn ?? "You") === "You";

/** What the agent is doing when nothing is happening on this page right now (the statuses guide, §2–6). */
function restingLive(s: State): LiveState | null {
  if (s.status === "cancelled") return { kind: "quiet", text: "Cancelled. Nothing more will happen." };
  if (s.status === "done") return { kind: "quiet", text: "Done · merged into main" };
  if (s.need === "stuck" || isYours(s)) return null; // the card says what's needed
  if (s.need) return { kind: "waiting", text: `Waiting on ${s.waitingOn}` };
  if (s.status === "in_progress") return { kind: "working", label: "Building the change" };
  // In review, the check has already passed: the work waits for a person, nobody is working on it.
  if (s.status === "in_review") return { kind: "quiet", text: "Checked · waiting for review" };
  // Planning with nothing to read: moved back by a person, and a plan is only written in answer to a note.
  if (s.status === "planning") return { kind: "quiet", text: "Back in planning. Say in a note what should change." };
  if (s.status === "approved") return { kind: "quiet", text: "Approved · waiting to start" };
  // New is not a plan being written.
  return { kind: "quiet", text: "Nothing has been planned yet" };
}

/** What an approval has under way on this page: waiting to be picked up, then the build, then the second
 *  agent's check. While the agent holds the build or the check, the status menu is locked. */
type Job = "starting" | "building" | "verifying";

const SUGGESTIONS: Partial<Record<NeedKind | "working", string[]>> = {
  review: ["Take mobile screenshots", "Start the preview on mobile", "What changed since last time?"],
  planning: ["Show me the markup", "Add a note to the spec", "Explain the plan simply"],
  next: ["Build the next step", "What’s left to do?"],
  decision: ["Which would you pick, and why?"],
  working: ["How’s it going?"],
};

// The build the agent runs after an approval, a restart or a change request (front end only).
// Steps read as a to-do list while it works (like a coding agent's plan); each ticks off when done.
const BUILD = [
  { step: "Make a branch for the story", doing: "Making the story’s branch" },
  { step: "Read the plan", doing: "Reading the plan" },
  { step: "Make the change", doing: "Making the change" },
  { step: "Write the checks", doing: "Writing the checks" },
  { step: "Run every check", doing: "Running the checks" },
  { step: "Build the preview", doing: "Building the preview" },
];

/** How long something that just finished stays on top of the activity column before it goes down. */
const SETTLE_MS = 1500;

let seq = 0;
const nextId = (p: string) => `${p}-${Date.now()}-${(seq += 1)}`;

/** The island for /stories/hq-N: renders only in the browser, so created stories can be read from storage. */
export function StoryPage({ data }: { data: StoryPageData }) {
  const story = data.story ?? findCreated(data.storyId);
  if (!story) {
    return (
      <main id="main" className="mx-auto w-full max-w-[1344px] px-4 pt-16 text-center md:px-8">
        <p className="text-[17px] font-medium">There’s no story {storyRef(data.storyId)}</p>
        <p className="mt-1 text-[15px] text-[var(--tx2)]">It may have been created in another browser, or the link is wrong.</p>
        <a href="/stories" className={`${BTN_SECONDARY} mt-5`}>
          Back to stories
        </a>
      </main>
    );
  }
  return <StoryView story={story} data={data} />;
}

function StoryView({ story, data }: { story: StoryItem; data: StoryPageData }) {
  const initial = data.thread ?? buildThread(story, data.people, data.viewer);
  const [entries, setEntries] = useState<ThreadEntry[]>(initial.entries);
  const [activity, setActivity] = useState<ActivityItem[]>(() => buildActivity(story, initial.facts));
  const [state, setState] = useState<State>({ status: story.status, need: story.need, waitingOn: story.waitingOn });
  const [changed, setChanged] = useState(false);
  const [busy, setBusy] = useState<LiveState | null>(null);
  const [rebuild, setRebuild] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  // The decision put back into the chat ("Read the chat first"), by its key; the next stage's decision comes forward again.
  const [dismissed, setDismissed] = useState<string | null>(null);
  // The story's pull request: the agent opens it once the work passes its check; a person merges it.
  const [pr, setPr] = useState(initial.facts.pullRequest.state);
  const [prNo, setPrNo] = useState(() => prNumberFor(story.id));
  const [job, setJob] = useState<Job | null>(null);
  // Notes written while the agent holds a build: read after the round, never mid-build.
  const notesDuringJob = useRef(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastKey = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const firstScroll = useRef(true);
  // The one screen-reader line for the activity column: finishes, a preview running or stopped, the build's end.
  const [said, setSaid] = useState("");
  // Bumped by Undo, so the restored activity card appears without motion.
  const [epoch, setEpoch] = useState(0);
  // A preview's start timer, by item id; written only in handlers.
  const previewTimers = useRef(new Map<string, number>());

  const me: Author = { kind: "person", name: data.viewer.name, initials: data.viewer.initials };
  const owners = useStoryOwners();
  const ownerInitials = ownerOf(story, owners);
  const owner = ownerInitials ? personFor(ownerInitials, data.people, data.viewer) : undefined;
  const ownerName = owner?.kind === "person" ? owner.name : undefined;
  // The status row at the top of the chat: the status and what's under way (the status menu), a dot, and whose
  // turn it is when nobody's working. A status says what was asked for; the detail says what's running.
  const status: { dot: string; detail?: string; turn?: string } = (() => {
    if (state.status === "done") return { dot: "bg-[#16a34a]" };
    if (state.status === "cancelled") return { dot: "bg-[var(--tx2)]" };
    if (job === "starting") return { dot: "bg-[var(--tx2)]", detail: "Waiting to start" };
    if (job === "building") return { dot: "bg-[var(--tx)]", detail: "Building" };
    if (job === "verifying") return { dot: "bg-[var(--tx)]", detail: "Verifying" };
    if (state.need === "stuck") return { dot: "bg-[#b91c1c]", detail: "Stopped" };
    if (isYours(state)) return { dot: "bg-[#d97706]", turn: "Waiting on you" };
    if (state.need) return { dot: "bg-[var(--tx2)]", turn: `Waiting on ${state.waitingOn}` };
    if (state.status === "approved") return { dot: "bg-[var(--tx2)]", detail: "Waiting to start" };
    if (state.status === "in_progress") return { dot: "bg-[var(--tx)]", detail: "Building" };
    return { dot: state.status === "planning" && busy ? "bg-[var(--tx)]" : "bg-[var(--tx2)]" };
  })();
  const locked =
    job === "building"
      ? "The agent is building. Nothing can change until it finishes; this unlocks by itself."
      : job === "verifying"
        ? "A second agent is checking the work. This unlocks by itself when it finishes."
        : undefined;
  const live = busy ?? restingLive(state);
  const working = live?.kind === "working" || live?.kind === "thinking";
  // Once the stage moves, the facts follow it, but the story's own checks count stays.
  const moved = buildFacts({ ...story, ...state }, ownerName);
  const facts = !changed
    ? initial.facts
    : { ...moved, checks: moved.checks.state === "passed" && initial.facts.checks.state === "passed" ? initial.facts.checks : moved.checks };
  const files: FileRef[] = entries.flatMap((e) => (e.kind === "message" && e.files ? e.files : []));
  const index = data.stories.findIndex((s) => s.id === story.id);
  const prev = index > 0 ? data.stories[index - 1] : undefined;
  const next = index >= 0 ? data.stories[index + 1] : undefined;

  // Pending agent timers stop when the page goes away.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  // Newest at the bottom, like a chat: open at the end, and follow new messages unless you've scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !atBottom) return;
    el.scrollTo({ top: el.scrollHeight, behavior: firstScroll.current ? "auto" : "smooth" });
    firstScroll.current = false;
  }, [entries, busy, atBottom]);

  const showToast = useCallback((message: string, action?: ToastMessage["action"]) => {
    toastKey.current += 1;
    setToast({ key: toastKey.current, message, action });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const changeOwner = (initials: string | null) => {
    const before = ownerInitials ?? null;
    if (before === initials) return;
    setStoryOwner(story.id, initials);
    const who = initials ? (initials === data.viewer.initials ? "you" : (data.people.find((p) => p.initials === initials)?.name ?? initials)) : null;
    showToast(who ? `Owner changed to ${who}.` : "This story has no owner now.", {
      label: "Undo",
      run: () => setStoryOwner(story.id, before),
    });
  };

  const later = (ms: number, fn: () => void) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  };
  const stopAgent = () => {
    timers.current.splice(0).forEach((t) => window.clearTimeout(t));
    setBusy(null);
    setJob(null);
  };
  const add = (...more: ThreadEntry[]) => setEntries((es) => [...es, ...more.map((e) => ({ ...e, fresh: true }))]);
  // The activity log, newest first, in step with the chat. What's under way shows on top; when something
  // finishes (or the stage moves, or a preview starts running) it stays on top for a moment ("settling"), then
  // goes down to the ready list. Its own timer, not later(), so stopping the agent never leaves it stuck on top.
  const settle = (id: string) =>
    window.setTimeout(() => setActivity((a) => a.map((x) => (x.id === id && x.settling ? { ...x, settling: false } : x))), SETTLE_MS);
  const log = (it: Omit<ActivityItem, "id" | "at"> & { id?: string }) => {
    const id = it.id ?? nextId("act");
    const startedAt = it.state === "working" ? Date.now() : it.startedAt;
    const settles = it.state === "done" || it.state === "info";
    const doneAt = settles ? Date.now() : it.doneAt;
    setActivity((a) => [{ at: "Just now", ...it, id, fresh: true, startedAt, doneAt, settling: settles }, ...a]);
    if (settles) settle(id);
  };
  const say = (text: string) => setSaid(text);
  const patch = (id: string, changes: Partial<ActivityItem>) => {
    const settles = changes.state === "done" || changes.run === "on";
    const stamp: Partial<ActivityItem> = settles ? { doneAt: Date.now(), settling: true, at: "Just now" } : {};
    setActivity((a) => a.map((x) => (x.id === id ? { ...x, ...changes, ...stamp } : x)));
    if (settles) settle(id);
  };
  // Approving the plan approves the drafts (an edit stays in the log as it was).
  const settlePlan = () =>
    setActivity((a) =>
      a.map((x) => ((x.kind === "spec" || x.kind === "engineering") && /^(Draft|Writing|Waiting|Updating)/.test(x.detail) ? { ...x, state: "done", detail: "Approved" } : x)),
    );
  // The preview machine: started and stopped from the activity card, timed here.
  const preview: PreviewActions = {
    start: (id) => {
      const where = activity.find((x) => x.id === id)?.device ?? "web";
      patch(id, { run: "starting", startedAt: Date.now(), detail: `Starting the preview on ${where}` });
      const t = later(2400, () => {
        previewTimers.current.delete(id);
        patch(id, { run: "on", startedAt: Date.now(), detail: `Running on ${where}` });
        say(`Preview running on ${where}.`);
      });
      previewTimers.current.set(id, t);
    },
    stop: (id) => {
      window.clearTimeout(previewTimers.current.get(id));
      previewTimers.current.delete(id);
      const wasOn = activity.find((x) => x.id === id)?.run === "on";
      patch(id, { run: "off", detail: wasOn ? "Stopped" : "Ready to try" });
      if (wasOn) showToast("Preview stopped.");
    },
    device: (id, d) => {
      const run = activity.find((x) => x.id === id)?.run;
      if (run === "on" || run === "starting") return;
      patch(id, { device: d, title: `Preview · ${DEVICE_NAME[d]}` });
    },
  };
  /** One live preview per story: a new preview or a new build stops the old one. */
  const stopPreviews = (detail: string) => {
    previewTimers.current.forEach((t) => window.clearTimeout(t));
    previewTimers.current.clear();
    setActivity((a) => a.map((x): ActivityItem => (x.kind === "preview" && (x.run === "on" || x.run === "starting") ? { ...x, run: "off", detail } : x)));
  };
  const move = (s: State) => {
    setState(s);
    setChanged(true);
  };
  const focusComposer = () => document.getElementById(COMPOSER_INPUT_ID)?.focus();

  /**
   * An approval, played out (statuses guide §3–4). Approved first: the instruction waits until the agent picks
   * it up and moves it to In progress itself. Then the build ticks through its steps, a second agent (not the
   * builder) checks the work against the story, the pull request opens or updates, and only then does the
   * story move to In review. The agent never merges.
   */
  const runBuild = (label: string) => {
    const runId = nextId("run");
    const buildId = nextId("act");
    const verifyId = nextId("act");
    const step = 1300;
    const total = BUILD.length;
    // A reopened story gets a new pull request; one still open is updated.
    const updating = pr === "open";
    const number = pr === "merged" ? prNo + 1 : prNo;
    stopPreviews("Stopped for the new build");
    notesDuringJob.current = 0;
    log({ kind: "stage", title: label, state: "info", detail: "", move: state.status === "approved" ? undefined : { from: columnLabel(state.status), to: "Ready to build" } });
    move({ status: "approved" });
    add({ kind: "stage", id: nextId("stage"), at: "Just now", text: label });
    setJob("starting");
    setBusy({ kind: "waiting", text: "Approved · waiting for the agent to pick it up" });

    const picked = 1400;
    later(picked, () => {
      setJob("building");
      move({ status: "in_progress" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "The agent started building" });
      log({ kind: "stage", title: "Started building", state: "info", detail: "", move: { from: "Ready to build", to: "Building" } });
      setBusy({ kind: "thinking" });
    });
    later(picked + 1000, () => {
      add({ kind: "run", id: runId, at: "Just now", summary: "Building", steps: BUILD.map((b) => b.step), running: true, done: 0 });
      log({ id: buildId, kind: "build", title: "Build", state: "working", detail: BUILD[0].doing, progress: { done: 0, total } });
      setBusy({ kind: "working", label: BUILD[0].doing });
    });
    BUILD.forEach((_, i) =>
      later(picked + 1000 + step * (i + 1), () => {
        setEntries((es) => es.map((e) => (e.id === runId && e.kind === "run" ? { ...e, done: i + 1 } : e)));
        patch(buildId, { progress: { done: i + 1, total }, detail: BUILD[i + 1]?.doing ?? "Finishing up" });
        setBusy({ kind: "working", label: BUILD[i + 1]?.doing ?? "Finishing up" });
      }),
    );
    // The end is staggered, so the build, the checks, the second agent's check, the pull request and the
    // preview each get their moment in the card.
    const end = picked + 1000 + step * (BUILD.length + 1);
    later(end, () => {
      setEntries((es) => es.map((e) => (e.id === runId && e.kind === "run" ? { ...e, running: false, summary: `Built · ${BUILD.length} steps` } : e)));
      patch(buildId, { state: "done", detail: `Built · ${total} steps` });
      setBusy({ kind: "working", label: "Finishing up" });
    });
    later(end + 800, () =>
      log({ kind: "checks", title: "Checks", state: "done", detail: initial.facts.checks.state === "passed" ? initial.facts.checks.line : "All 214 checks passed" }),
    );
    later(end + 1400, () => {
      setJob("verifying");
      log({ id: verifyId, kind: "checks", title: "Independent check", state: "working", detail: "A second agent checks it against the story" });
      setBusy({ kind: "working", label: "A second agent is checking the work" });
    });
    later(end + 3600, () => {
      patch(verifyId, { state: "done", detail: "Passed · does what the story asks" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Checked by a second agent · it does what the story asks" });
      setBusy({ kind: "working", label: updating ? "Updating the pull request" : "Opening the pull request" });
    });
    later(end + 4300, () => {
      setPr("open");
      setPrNo(number);
      log({ kind: "pr", title: `Pull request #${number}`, state: "done", detail: updating ? "Updated with the new build" : "Open · waiting for you to merge" });
    });
    later(end + 5000, () => {
      log({ kind: "preview", title: "Preview · Web", device: "web", run: "off", state: "done", detail: "Ready to try" });
      add({
        kind: "message",
        id: nextId("agent"),
        at: "Just now",
        author: AGENT,
        report: {
          outcome: "Done. A second agent checked it: it does what the story asks, and every check passed.",
          next: `Try the preview and read pull request #${number}. To accept, merge it and mark the story Done. To change something, write a note and rebuild.`,
        },
      });
      // Notes written during the round are read now; they never redirected the build under way.
      if (notesDuringJob.current > 0) {
        add({
          kind: "message",
          id: nextId("agent"),
          at: "Just now",
          author: AGENT,
          text: ["I’ve read your note now that this round is over. It didn’t change the build that was running. To have it built, choose Approved in the status menu: the next build is given every note since this one."],
        });
        notesDuringJob.current = 0;
      }
      move({ status: "in_review", need: "review", waitingOn: "You" });
      setJob(null);
      setBusy(null);
      say("Build finished and checked by a second agent. The pull request is open and the preview is ready to try.");
    });
  };

  /**
   * In Thinking, a note or an answer revises the plan (statuses guide §2): the agent re-reads the thread,
   * updates the page and hands the story back, ready to approve. Nothing is built, no file changes.
   */
  const writePlan = (from: "story" | "note" | "answers") => {
    const specId = nextId("act");
    const fresh = from === "story";
    setBusy({ kind: "thinking" });
    later(1100, () => {
      log({ id: specId, kind: "spec", title: "Specification page", state: "working", detail: fresh ? "Writing" : from === "note" ? "Updating with your note" : "Updating with your answers" });
      setBusy({ kind: "working", label: fresh ? "Writing the plan" : "Updating the plan" });
    });
    later(3800, () => {
      patch(specId, { state: "done", detail: fresh ? "Draft ready for your OK" : from === "note" ? "Edited with your note" : "Updated with your answers" });
    });
    // Then the engineering page, written from the specification page (Shubham, 20 Nov: it comes after the spec).
    const engId = nextId("act");
    later(4400, () => {
      log({ id: engId, kind: "engineering", title: "Engineering page", state: "working", detail: fresh ? "Writing" : "Updating to match" });
      setBusy({ kind: "working", label: fresh ? "Writing the engineering page" : "Updating the engineering page" });
    });
    later(6800, () => {
      patch(engId, { state: "done", detail: fresh ? "Draft ready for your OK" : "Updated to match" });
      add({
        kind: "message",
        id: nextId("agent"),
        at: "Just now",
        author: AGENT,
        report: {
          outcome: fresh ? "The plan is ready." : from === "note" ? "I’ve updated the plan with your note." : "Thanks, that settles it. The plan is ready.",
          next: "Read it, then approve it to start the build. Nothing is built until you do.",
        },
      });
      move({ status: "planning", need: "planning", waitingOn: "You" });
      setBusy(null);
    });
  };

  /** A plain reply: the agent thinks, reads, then answers. */
  const reply = (text: string) => {
    setBusy({ kind: "thinking" });
    later(1300, () => setBusy({ kind: "working", label: "Reading your note" }));
    later(2700, () => {
      add({ kind: "message", id: nextId("agent"), at: "Just now", author: AGENT, text: [text] });
      setBusy(null);
    });
  };

  /** A job from a message: in the log and the chat while it works, then done, with the agent's reply. */
  const runTask = (task: Task, built: boolean) => {
    const id = nextId("act");
    const notYet = task.kind === "preview" && !built;
    const startsPreview = task.kind === "preview" && !notYet;
    if (startsPreview) stopPreviews("Stopped");
    setBusy({ kind: "thinking" });
    later(700, () => {
      log({ id, kind: task.kind, title: task.title, state: "working", detail: task.doing, device: task.device, count: task.count });
      setBusy({ kind: "working", label: task.doing });
    });
    later(700 + task.ms, () => {
      patch(id, {
        state: notYet ? "info" : "done",
        detail: task.done,
        count: task.count,
        ...(startsPreview ? { run: "on" as const, startedAt: Date.now() } : {}),
      });
      add({ kind: "message", id: nextId("agent"), at: "Just now", author: AGENT, text: [task.reply], files: task.files });
      setBusy(null);
      say(startsPreview ? `Preview running on ${task.device ?? "web"}.` : `${task.title}: done. ${task.done}.`);
    });
  };

  const withUndo = (message: string) => {
    const before = { entries, state, changed, activity, pr, prNo };
    showToast(message, {
      label: "Undo",
      run: () => {
        stopAgent();
        previewTimers.current.clear();
        setEntries(before.entries);
        // The story goes back; a running preview keeps running.
        setActivity((now) => restoreActivity(before.activity, now));
        setEpoch((e) => e + 1);
        setSaid("");
        setState(before.state);
        setChanged(before.changed);
        setPr(before.pr);
        setPrNo(before.prNo);
        notesDuringJob.current = 0;
      },
    });
  };

  const ref = storyRef(story.id);
  // Which decision is up: one per stage.
  const decisionKey = `${state.status}:${state.need ?? ""}`;
  const actions = {
    // Accepting is the person's: merge the pull request, then mark the story Done (statuses guide §5).
    accept: () => {
      withUndo(`${ref} marked Done.`);
      move({ status: "done" });
      setPr("merged");
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: `Pull request #${prNo} merged · marked Done by you` });
      log({ kind: "pr", title: `Pull request #${prNo}`, state: "done", detail: "Merged into main" });
      log({ kind: "stage", title: "Marked Done by you", state: "info", detail: "", move: { from: "In review", to: "Done" } });
    },
    approve: () => {
      withUndo(`${ref} approved. The agent starts building when it picks it up.`);
      settlePlan();
      runBuild(state.status === "new" ? "Approved by you" : "Plan approved by you");
    },
    defaults: () => {
      withUndo(`Defaults kept for ${ref}, and it’s approved.`);
      setEntries((es) => es.map((e) => (e.kind === "question" && !e.answer ? { ...e, answer: { option: 0, by: "Default", at: "Just now" }, fresh: true } : e)));
      settlePlan();
      runBuild("Defaults kept · plan approved by you");
    },
    // A stopped build is never re-run: trying again is a new approval, built from the story as it is now.
    restart: () => {
      withUndo(`${ref} approved again. A new build starts from the story as it is now.`);
      runBuild("Approved again by you · a new build");
    },
    plan: () => {
      // From New, or a story waiting to be planned: the description is the plan's first input.
      if (state.status === "new" || state.need === "triage") {
        withUndo(`${ref} moved to Planning.`);
        move({ status: "planning" });
        add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Moved to Planning by you" });
        log({ kind: "stage", title: "Moved to Planning by you", state: "info", detail: "" });
        writePlan("story");
        return;
      }
      // From later on, moving back asks for nothing by itself: a plan is written in answer to a note.
      withUndo(`${ref} moved back to Planning. Say in a note what should change.`);
      move({ status: "planning" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Moved back to Planning by you" });
      log({ kind: "stage", title: "Moved back to Planning by you", state: "info", detail: "", move: { from: columnLabel(state.status), to: "Planning" } });
      setRebuild(false);
      requestAnimationFrame(focusComposer);
    },
    cancel: () => {
      withUndo(`${ref} cancelled.`);
      move({ status: "cancelled" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Cancelled by you" });
      log({ kind: "stage", title: "Cancelled by you", state: "info", detail: "", move: { from: columnLabel(state.status), to: "Cancelled" } });
    },
    // These hand over to the message box, so the decision steps back into the chat first.
    changes: () => {
      setRebuild(true);
      setDismissed(decisionKey);
      requestAnimationFrame(focusComposer);
    },
    write: () => {
      setRebuild(false);
      setDismissed(decisionKey);
      requestAnimationFrame(focusComposer);
    },
  };

  /** A choice in the status menu. A move ends whatever the agent had under way for the old status first. */
  const changeStatus = (to: StatusMove) => {
    stopAgent();
    if (to === "cancelled") return actions.cancel();
    if (to === "done") return actions.accept();
    if (to === "planning") return actions.plan();
    // Approved: build, rebuild, reopen or try again, depending on where the story is.
    if (state.status === "new" || state.status === "planning") return actions.approve();
    if (state.status === "in_review") {
      withUndo(`${ref} approved again. It rebuilds with your notes since the last build.`);
      return runBuild("Approved again by you · rebuild with your notes");
    }
    if (state.status === "done" || state.status === "cancelled") {
      withUndo(`${ref} reopened and approved.`);
      return runBuild("Reopened and approved by you");
    }
    return actions.restart();
  };

  // "Needs your OK": what's waiting on the viewer, as the conversation's last card.
  const ask: AskCard | null = busy
    ? null
    : state.need === "stuck"
      ? {
          label: "Stopped",
          title: "The preview couldn’t start",
          meta: "Approve it again for a new build from the story as it is now, or write a note.",
          primary: { label: "Try again", onClick: actions.restart },
        }
      : !isYours(state)
        ? null
        : state.need === "review"
          ? {
              label: "Needs your OK",
              title: `${story.title} · ready for review`,
              meta: `${facts.checks.line} · checked by a second agent. Merge pull request #${prNo} first: the agent never merges.`,
              move: { from: "In review", to: "Done" },
              primary: { label: "Mark as Done", onClick: actions.accept },
              secondary: { label: "Ask for changes", onClick: actions.changes },
            }
          : state.need === "planning"
            ? {
                label: "Needs your OK",
                title: "The plan is ready",
                meta: "Read it, then approve it. Nothing is built until you do.",
                move: { from: "Planning", to: "Approved" },
                primary: { label: "Approve and build", onClick: actions.approve },
                secondary: { label: "Ask a question", onClick: actions.write },
              }
            : state.need === "decision"
              ? null // the question card itself is the ask, with "Let the defaults stand" beside its button
              : state.need === "triage"
                ? {
                    label: "Needs a decision",
                    title: "Plan it, or cancel it",
                    primary: { label: "Move to planning", onClick: actions.plan },
                    secondary: { label: "Cancel story", onClick: actions.cancel },
                  }
                : { label: "Needs direction", title: "No step applies right now", meta: "Tell the agent what to do next.", secondary: { label: "Write to the agent", onClick: actions.write } };

  const send = ({ text, files: attached, rebuild: andRebuild }: { text: Segment[]; files: FileRef[]; rebuild: boolean }) => {
    setAtBottom(true);
    add({ kind: "message", id: nextId("me"), at: "Just now", author: me, text: text.length ? text : undefined, files: attached });
    // A closed story keeps the note, but nothing answers it (statuses guide §6).
    if (state.status === "done" || state.status === "cancelled") return;
    // While the agent holds a build, a note is read after the round; it never redirects the work (§4).
    if (job) {
      notesDuringJob.current += 1;
      return;
    }
    // A note, then Approved: the change request (§5).
    if (andRebuild) {
      setRebuild(false);
      runBuild("Approved again by you · rebuild with your note");
      return;
    }
    // Asked for a page edit, screenshots, markup or a preview: the agent does it, and the log shows it live.
    const words = text.map((seg) => (typeof seg === "string" ? seg : seg.type === "person" ? seg.name : seg.type === "agent" ? "agent" : `hq-${seg.id}`)).join(" ");
    const built = state.status === "in_review";
    const task = taskFor(words, story, built);
    if (task) {
      runTask(task, built);
      return;
    }
    // In Thinking, a note revises the plan (§2). Open questions stay open until they're answered.
    if ((state.status === "new" || state.status === "planning") && state.need !== "decision") {
      writePlan(state.status === "new" && !state.need ? "story" : "note");
      return;
    }
    reply(
      state.status === "in_review"
        ? "Thanks, I’ve read it. A note in review never changes the code. To have it built, switch on “Rebuild after sending” and send it again, or choose Approved in the status menu."
        : state.need === "stuck"
          ? "Thanks, noted. To build again with it, choose Try again: a new build reads the story as it is now."
          : "Thanks, noted. I’ll take it into account and reply here if I need anything from you.",
    );
  };

  const answer = (entryId: string, option: number) => {
    const updated = entries.map((e) => (e.id === entryId && e.kind === "question" ? { ...e, answer: { option, by: data.viewer.name, at: "Just now" }, fresh: true } : e));
    setEntries(updated);
    if (state.need === "decision" && !updated.some((e) => e.kind === "question" && !e.answer)) {
      move({ status: "planning" });
      setActivity((a) => a.map((x): ActivityItem => (x.kind === "spec" && x.state === "waiting" ? { ...x, state: "done", detail: "Questions answered" } : x)));
      writePlan("answers");
    }
  };

  const copyLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => showToast("Link copied."))
      .catch(() => showToast("Couldn’t copy the link. Copy it from the address bar."));
  };

  // A decision with a button comes in front of the chat until it's put back.
  // Worked out from the state, not from `ask`, whose buttons hold the agent's timers.
  const gated =
    !busy &&
    (state.need === "stuck" ||
      (isYours(state) && (state.need === "review" || state.need === "planning" || state.need === "triage")));
  const gateKey = gated ? decisionKey : null;
  const focused = gateKey !== null && dismissed !== gateKey;
  const dismissDecision = useCallback(() => setDismissed(gateKey), [gateKey]);

  const suggestions = busy ? [] : isYours(state) && state.need ? (SUGGESTIONS[state.need] ?? []) : working ? (SUGGESTIONS.working ?? []) : [];

  // The line above the message box: what a note does from here. A note is a conversation; a status is an instruction.
  const noteHint = (() => {
    if (job === "starting") return "Approved. A note written now may only reach the next build, so write notes before approving.";
    if (job) return "The agent reads a note after this round. It won’t change the work under way.";
    switch (state.status) {
      case "new":
      case "planning":
        return "A note revises the plan. Nothing is built until you approve it.";
      case "approved":
        return state.need === "stuck" ? "A note gets a reply. To build again, choose Try again." : "A note gets a reply. The build starts when the agent picks it up.";
      case "in_progress":
        return "The agent reads a note after this round. It won’t change the work under way.";
      case "in_review":
        return busy ? "A note in review gets a reply and never changes the code." : undefined; // the Rebuild switch says it
      default:
        return "This story is closed. A note is kept, but nobody answers it.";
    }
  })();

  // For the activity column: what the viewer has to decide now (its evidence says "Waiting on you"), and a
  // preview that's starting or running, whose Stop must always be on a sharp surface.
  const yours = !busy && isYours(state) ? state.need : undefined;
  const runningPreview = livePreview(activity);
  const rail = (withHeader: boolean) => (
    <StoryRail
      withHeader={withHeader}
      activity={activity}
      yours={yours}
      restartInChat={state.need === "stuck"}
      epoch={epoch}
      preview={preview}
      facts={facts}
      owner={
        <OwnerPicker
          owner={ownerInitials}
          people={data.people}
          viewerInitials={data.viewer.initials}
          onChange={changeOwner}
          storyLabel={storyRef(story.id)}
          size={20}
          withName
        />
      }
      updated={changed ? "Just now" : story.updated}
      files={files}
      onSoon={(m) => showToast(m)}
    />
  );

  return (
    <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
      {/* Desktop: fits the window. The conversation scrolls on its own with the message box pinned under it;
          the activity column scrolls on its own. Phones scroll as one page, the activity folded under "Activity". */}
      <main
        id="main"
        className="mx-auto w-full max-w-[1344px] px-4 pt-4 pb-6 md:flex md:h-[calc(100dvh-var(--bar-h))] md:flex-col md:overflow-hidden md:px-8 md:pb-0"
      >
        {/* The activity column's one announcement line: finishes only (the chat already says when work starts). */}
        <p role="status" className="sr-only">
          {said}
        </p>
        {/* One header row on desktop: Stories / hq-21 / the story's name, then the agent and the page's buttons.
            The name is the page's heading, the last step of the trail. Phones: trail, then the name, then the agent. */}
        <header className="flex flex-none flex-wrap items-center gap-x-3 gap-y-1.5 md:h-10 md:flex-nowrap">
          <nav aria-label="Breadcrumb" className="flex flex-none items-center gap-2 text-[13px] leading-[18px] text-[var(--tx2)]">
            <a href="/stories" className="inline-flex items-center gap-1.5 rounded-[4px] hover:text-[var(--tx)]">
              <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.75} />
              Stories
            </a>
            <span aria-hidden="true">/</span>
            <span className="tabular-nums" aria-current="page">
              {ref}
            </span>
            <span aria-hidden="true" className="hidden md:inline">
              /
            </span>
          </nav>
          <h1
            title={story.title}
            className="order-3 m-0 basis-full text-[20px] leading-7 font-semibold tracking-[-0.015em] text-[var(--tx)] md:order-none md:min-w-0 md:basis-auto md:truncate md:text-[17px] md:leading-6 md:tracking-[-0.01em]"
          >
            {story.title}
          </h1>
          <span aria-hidden="true" className="hidden flex-1 md:block" />
          <span className="ml-auto flex flex-none items-center gap-0.5 md:ml-0">
            <Tip label={prev ? `Previous: ${prev.title}` : "No previous story"}>
              <a
                href={prev ? `/stories/${storyRef(prev.id)}` : undefined}
                aria-label="Previous story"
                aria-disabled={!prev}
                className={`${ICON_BTN} ${prev ? "" : "pointer-events-none opacity-40"}`}
              >
                <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.75} />
              </a>
            </Tip>
            <Tip label={next ? `Next: ${next.title}` : "No next story"}>
              <a
                href={next ? `/stories/${storyRef(next.id)}` : undefined}
                aria-label="Next story"
                aria-disabled={!next}
                className={`${ICON_BTN} ${next ? "" : "pointer-events-none opacity-40"}`}
              >
                <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} />
              </a>
            </Tip>
            <Tip label="Copy link">
              <button type="button" aria-label="Copy link" onClick={copyLink} className={ICON_BTN}>
                <LinkIcon aria-hidden="true" size={16} strokeWidth={1.75} />
              </button>
            </Tip>
          </span>
        </header>

        <details className="group peer mt-3 rounded-[12px] border border-[var(--card-line)] px-4 md:hidden">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-2 [&::-webkit-details-marker]:hidden">
            <ActivitySummary items={activity} yours={yours} />
          </summary>
          {rail(false)}
        </details>
        {/* Phones, with Activity closed: a running preview's Stop stays one tap away. */}
        {runningPreview && (
          <div className="mt-2 flex h-12 items-center rounded-xl border border-[var(--card-line)] bg-white pr-1.5 pl-3 peer-open:hidden md:hidden">
            <PreviewRow item={runningPreview} preview={preview} onSoon={(m) => showToast(m)} />
          </div>
        )}

        <div className="mt-3 md:flex md:min-h-0 md:flex-1 md:gap-8">
          <section aria-label="Conversation" className="flex min-w-0 flex-1 flex-col md:min-h-0">
            {/* At the top of the chat: the agent, the story's status and what's under way (the status menu,
                where a person changes it), and whose turn it is. Tones from DESIGN.md §3.1: working is ink plus
                motion, a person's turn is attention, done is positive, stopped is negative. */}
            <div className="flex h-10 min-w-0 flex-none items-center gap-2 text-[13px] leading-[18px]">
              <Mascot size={24} />
              <span className="flex-none text-[14px] leading-5 font-medium">Agent</span>
              <StatusMenu
                status={state.status}
                detail={status.detail}
                dot={status.dot}
                working={working}
                locked={locked}
                moves={statusMoves(state.status, state.need === "stuck")}
                onMove={changeStatus}
                storyLabel={ref}
              />
              {status.turn && (
                <span key={status.turn} className={`truncate text-[var(--tx2)] ${chat.labelIn}`}>
                  · {status.turn}
                </span>
              )}
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col">
            {/* Older messages fade out under the box's header, as newer ones do under the message box. */}
            <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-6 md:block ${chat.fadeTop}`} />
            <div
              ref={scrollRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
              }}
              onClick={focused ? dismissDecision : undefined}
              className={`md:min-h-0 md:flex-1 md:overflow-y-auto ${chat.transcript}`}
            >
              {/* Lined up with the breadcrumbs, as wide as the column; bubbles keep their own reading width.
                  Behind a decision it softens and can't be used, until the decision is put back. */}
              <div inert={focused} className={focused ? chat.recede : undefined}>
                <StoryThread
                  entries={entries}
                  stories={data.stories}
                  viewerInitials={data.viewer.initials}
                  live={live}
                  ask={focused ? null : ask}
                  onAnswer={answer}
                  onSkipQuestion={state.need === "decision" && !busy ? actions.defaults : undefined}
                />
              </div>
            </div>

            <div className="sticky bottom-0 flex-none bg-white pb-4">
              {/* Messages fade out as they pass under the box. */}
              <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 -top-10 h-10 ${chat.fade}`} />
              {!atBottom && !focused && (
                <button
                  type="button"
                  onClick={() => {
                    setAtBottom(true);
                    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
                  }}
                  className={`absolute -top-12 left-1/2 z-10 inline-flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border border-[var(--card-line)] bg-white px-3 text-[13px] font-medium shadow-[var(--shadow-card-h)] ${chat.enter}`}
                >
                  <ArrowDown aria-hidden="true" size={14} strokeWidth={2} />
                  Jump to latest
                </button>
              )}
              {focused && <StoryDecision key={gateKey} ask={ask} onDismiss={dismissDecision} />}
              {/* Kept while a decision is in front, so a half-written message isn't lost. */}
              <div className={focused ? "hidden" : undefined}>
                <StoryComposer
                  storyId={story.id}
                  people={data.people}
                  stories={data.stories}
                  canRebuild={state.status === "in_review" && !busy}
                  rebuild={rebuild}
                  onRebuildChange={setRebuild}
                  suggestions={suggestions}
                  hint={noteHint}
                  onSend={send}
                />
              </div>
            </div>
            </div>
          </section>

          <aside aria-label="Activity and details" className="hidden md:block md:w-[320px] md:flex-none md:overflow-y-auto md:border-l md:border-[var(--line)] md:pb-6 md:pl-8">
            {rail(true)}
          </aside>
        </div>
      </main>

      <Toast toast={toast} onDismiss={dismissToast} offsetRight="0px" />
    </Tooltip.Provider>
  );
}
