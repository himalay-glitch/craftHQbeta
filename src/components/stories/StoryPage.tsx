import { useCallback, useEffect, useRef, useState } from "react";
import { Tooltip } from "radix-ui";
import { ArrowDown, ArrowLeft, BellRing, ChevronLeft, ChevronRight, Link as LinkIcon } from "lucide-react";
import type { NeedKind, Person, StoryStatus } from "@/types/dashboard";
import type { ActivityItem, AskCard, AskRefusal, Author, FileRef, LiveState, PhaseKey, PreviewActions, RunPhase, Segment, StoryItem, StoryPageData, ThreadEntry } from "@/types/stories";
import { BTN_SECONDARY, ICON_BTN } from "@/components/dashboard/classes";
import { storyRef } from "@/components/dashboard/format";
import { Tip } from "@/components/dashboard/Tip";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { Toast } from "@/components/dashboard/Toast";
import { openMessages } from "@/components/messages/events";
import { isOpenAsk, useStoryMessages } from "@/components/messages/store";
import { buildActivity, DEVICE_NAME, livePreview, restoreActivity, taskFor, type Task } from "./activity";
import { ActivitySummary } from "./ActivitySummary";
import chat from "./chat.module.css";
import { CancelStoryDialog } from "./CancelStoryDialog";
import { findCreated } from "./created";
import { LIVE_WORDS } from "./LiveLine";
import { PHASE_LABEL } from "./phases";
import { names } from "./RichText";
import { PreviewRow } from "./PreviewControl";
import { columnLabel, statusMoves, type StatusMove } from "./stage";
import { MORE_BUTTON_ID, StatusLine, StatusMenu } from "./StatusMenu";
import { StoryDecision } from "./StoryDecision";
import { ownerOf, useStoryOwners } from "./owners";
import { COMPOSER_INPUT_ID, StoryComposer } from "./StoryComposer";
import { ActivityCorner } from "./ActivityCorner";
import { StoryNav, StoryNavToggle } from "./StoryNav";
import { StoryRail } from "./StoryRail";
import { StoryThread } from "./StoryThread";
import { TeamButton, TeamChip } from "./TeamButton";
import { ago, TeammateBanner, type TeammateChange } from "./TeammateBanner";
import { TeammateDemo, type TeammateMove } from "./TeammateDemo";
import { useToastQueue } from "./toasts";
import { AGENT, buildFacts, buildThread, personFor, prNumberFor } from "./thread";

interface State {
  status: StoryStatus;
  need?: NeedKind;
  waitingOn?: string;
}

const isYours = (s: State) => Boolean(s.need) && (s.waitingOn ?? "You") === "You";

/** What the robots are doing when nothing is happening on this page right now (the statuses guide, §2–6).
 *  `run`: the build under way that the board shows (its phase and start), so both say the same words and time. */
function restingLive(s: State, run?: { phase: PhaseKey; since?: number }): LiveState | null {
  if (s.status === "cancelled") return { kind: "quiet", text: "Cancelled. Nothing more will happen." };
  if (s.status === "done") return { kind: "quiet", text: "Done · merged into main" };
  if (s.need === "stuck" || isYours(s)) return null; // the card says what's needed
  if (s.need) return { kind: "waiting", text: `Waiting on ${s.waitingOn}` };
  if (s.status === "in_progress") {
    const phase = run?.phase ?? "implement";
    return { kind: "working", label: LIVE_WORDS[phase], phase, since: run?.since };
  }
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

// The phases of the build the agent runs after an approval, a restart or a change request (front end only),
// with how long each takes here. They show one at a time while it works, then fold under its reply.
const BUILD_PHASES: RunPhase[] = [
  { key: "plan", ms: 2400 }, // makes the story's branch and reads the plan
  { key: "implement", ms: 3600 },
  { key: "ui-check", ms: 2400 }, // opens the running app and looks at the screens
  { key: "review", ms: 2400 }, // runs every check and reviews its own work
  { key: "verify", ms: 2600 }, // a second agent, not the builder, checks it against the story
  { key: "reply", ms: 1600 }, // opens or updates the pull request and writes the report
];

/** How long something that just finished stays on top of the activity column before it goes down. */
const SETTLE_MS = 1500;

/** Desktop: the chat's column in the white sheet. The columns beside it keep fixed widths and the chat takes the
 *  rest of the screen (Shubham, 23 Nov): the whole sheet up to 1200 px, then 70% of it, centred, so a big monitor
 *  still gets a bigger chat while the agent's side and yours stay within one glance. Bubbles and cards keep their
 *  own widths, so lines stay readable (DESIGN.md §3.2, about 70 characters). The status row, the thread and the
 *  message box all use it, so they line up. Sheet padding is 16 px below 1024 px and 24 px above (DESIGN.md §3.3). */
const COLUMN = "md:mx-auto md:w-full md:max-w-[min(100%,max(1200px,70%))] md:px-4 lg:px-6";

let seq = 0;
const nextId = (p: string) => `${p}-${Date.now()}-${(seq += 1)}`;

/** A nudge for the teammate a story is waiting on, offered above the message box (it goes to Messages). */
const NUDGE: Partial<Record<NeedKind, string>> = {
  review: "the review is pending. Can you take a look?",
  decision: "there’s an open question here for you.",
  planning: "the plan is ready for you to approve.",
  next: "this is waiting on you. Can you say what’s next?",
  triage: "can you plan this one or cancel it?",
};

/** What a ⋯ menu move does, for the reason it was refused: "Couldn’t cancel it: …". */
const MOVE_VERB: Record<StatusMove, string> = {
  planning: "move it to Planning",
  approved: "start the build",
  done: "mark it Done",
  cancelled: "cancel it",
};

/** When a teammate changes the story under you, what that means for what you had open. */
const ON_HOLD: Partial<Record<NeedKind, string>> = {
  review: "Your review is on hold.",
  planning: "Your approval isn’t needed now.",
  decision: "Your answers are on hold.",
  triage: "Your decision isn’t needed now.",
  next: "Your next step is on hold.",
  stuck: "Your restart isn’t needed now.",
};

/** What a teammate on the story is doing, by its status, for the presence line. */
const DOING: Record<StoryStatus, string> = {
  new: "reading it",
  planning: "reading the plan",
  approved: "watching the build",
  in_progress: "watching the build",
  in_review: "reviewing",
  done: "looking",
  cancelled: "looking",
};

const firstName = (p: Person) => p.name.split(" ")[0];

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
  const [activity, setActivity] = useState<ActivityItem[]>(() => buildActivity(story, initial.facts, Date.now()));
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
  // Toasts for the result of your own action, one at a time; the rest wait (DESIGN.md §6.5).
  const { toast, show: showToast, dismiss: dismissToast, dropUndo } = useToastQueue();
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const firstScroll = useRef(true);
  // The one screen-reader line for the activity column: finishes, a preview running or stopped, the build's end.
  const [said, setSaid] = useState("");
  // Bumped by Undo, so the restored activity card appears without motion.
  const [epoch, setEpoch] = useState(0);
  // A preview's start timer, by item id; written only in handlers.
  const previewTimers = useRef(new Map<string, number>());
  // Teammates on the same story. Until the CraftHQ API sends presence and changes, `?demo=teammate` plays them.
  const [demo] = useState(() => new URLSearchParams(window.location.search).get("demo") === "teammate");
  const [present, setPresent] = useState(false);
  // A teammate's change this page has caught up with: a banner until you've seen it.
  const [banner, setBanner] = useState<TeammateChange | null>(null);
  // A teammate's change made elsewhere that this page hasn't heard of yet: the next move you make is refused.
  const [pending, setPending] = useState<{ to: TeammateMove; at: number } | null>(null);
  // Why the last button you pressed did nothing, shown in place on the decision card.
  const [refusal, setRefusal] = useState<string | null>(null);
  // The chat line "See what changed" points at, tinted for a moment.
  const [highlight, setHighlight] = useState<string | undefined>(undefined);
  // Cancel story was chosen while a robot is building: it asks first (DESIGN.md §6.11).
  const [confirmCancel, setConfirmCancel] = useState(false);

  const me: Author = { kind: "person", name: data.viewer.name, initials: data.viewer.initials };
  // The story's Team conversation, people only (it opens in Messages): who's in it, what you haven't read, and
  // requests still waiting for a reply. None of it shows in this chat, which is the robots'.
  const storyMessages = useStoryMessages(story.id, data.viewer.id);
  const [openedAt] = useState(() => Date.now());
  const personOf = (id: string) => data.people.find((p) => p.id === id);
  const peopleOf = (ids: string[]) => [...new Set(ids)].filter((id) => id !== data.viewer.id).flatMap((id) => personOf(id) ?? []);
  const teamPeople = peopleOf(storyMessages.flatMap((m) => [m.from, ...m.to]));
  const teamUnread = storyMessages.filter((m) => m.to.includes(data.viewer.id) && !m.seen[data.viewer.id]).length;
  const asks = storyMessages.filter((m) => isOpenAsk(m, storyMessages));
  const waitingOnThem = peopleOf(asks.filter((m) => m.from === data.viewer.id).flatMap((m) => m.ask?.of ?? []));
  const waitingOnMe = peopleOf(asks.filter((m) => m.ask?.of.includes(data.viewer.id)).map((m) => m.from));
  const openTeam = (draft?: string) => openMessages(`story:${story.id}`, draft);
  const owners = useStoryOwners();
  const ownerInitials = ownerOf(story, owners);
  const owner = ownerInitials ? personFor(ownerInitials, data.people, data.viewer) : undefined;
  const ownerName = owner?.kind === "person" ? owner.name : undefined;
  // The teammate in the demo: the story's owner when that isn't you, else the first teammate.
  const teammate = data.people.find((p) => p.initials === ownerInitials && p.id !== data.viewer.id) ?? data.people.find((p) => p.id !== data.viewer.id);
  const mateName = teammate?.name ?? "A teammate";
  const mateFirst = mateName.split(" ")[0];
  // The status row at the top of the chat: the status and what's under way (the status menu), a dot, and whose
  // turn it is when nobody's working. A status says what was asked for; the detail says what's running.
  // The board's run on this story (StoryItem.live), until this page changes the status: same words, same start.
  const seed = story.live && !changed ? { phase: story.live.phase, since: story.live.startedAt ?? openedAt - (story.live.minutesAgo ?? 0) * 60_000 } : undefined;
  const live = busy ?? restingLive(state, seed);
  const working = live?.kind === "working" || live?.kind === "thinking";
  // The robot's one current phase, by its name: the same words as the chat's live line and the board.
  const phase = live?.kind === "working" ? live.phase : undefined;
  const status: { dot: string; detail?: string; turn?: string } = (() => {
    if (state.status === "done") return { dot: "bg-[#16a34a]" };
    if (state.status === "cancelled") return { dot: "bg-[var(--tx2)]" };
    if (job === "starting") return { dot: "bg-[var(--tx2)]", detail: "Waiting to start" };
    if (phase) return { dot: "bg-[var(--tx)]", detail: LIVE_WORDS[phase] };
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
      ? "Builder is building; you can change this when it finishes."
      : job === "verifying"
        ? "Checker is verifying; you can change this when it finishes."
        : undefined;
  // Once the stage moves, the facts follow it, but the story's own checks count stays.
  const moved = buildFacts({ ...story, ...state }, ownerName);
  const facts = !changed
    ? initial.facts
    : { ...moved, checks: moved.checks.state === "passed" && initial.facts.checks.state === "passed" ? initial.facts.checks : moved.checks };
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
  const add = (...more: ThreadEntry[]) => {
    const ts = Date.now();
    setEntries((es) => [...es, ...more.map((e) => ({ ...e, fresh: true, ts }))]);
  };
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
  const runBuild = (label: string, stageId?: string) => {
    const buildId = nextId("act");
    const shotsId = nextId("act");
    const verifyId = nextId("act");
    // A reopened story gets a new pull request; one still open is updated.
    const updating = pr === "open";
    const number = pr === "merged" ? prNo + 1 : prNo;
    const phases = BUILD_PHASES;
    const of = phases.length;
    // Where each phase starts, after the pick-up.
    const starts = phases.map((_, i) => phases.slice(0, i).reduce((t, p) => t + p.ms, 0));
    const picked = 1400;
    const end = picked + starts[of - 1] + phases[of - 1].ms;
    let since = 0;
    /** The live line and the status row name this phase, and only this one. */
    const enter = (i: number) => setBusy({ kind: "working", label: LIVE_WORDS[phases[i].key], phase: phases[i].key, step: i + 1, of, since });

    stopPreviews("Stopped for the new build");
    notesDuringJob.current = 0;
    log({ kind: "stage", title: label, state: "info", detail: "", move: state.status === "approved" ? undefined : { from: columnLabel(state.status), to: "Ready to build" } });
    move({ status: "approved" });
    add({ kind: "stage", id: stageId ?? nextId("stage"), at: "Just now", text: label });
    setJob("starting");
    setBusy({ kind: "waiting", text: "Approved · waiting for Builder to pick it up" });

    later(picked, () => {
      since = Date.now();
      setJob("building");
      move({ status: "in_progress" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Builder started building" });
      log({ kind: "stage", title: "Started building", state: "info", detail: "", move: { from: "Ready to build", to: "Building" } });
      log({ id: buildId, kind: "build", title: "Build", state: "working", detail: PHASE_LABEL.plan, progress: { done: 0, total: 4 } });
      enter(0);
    });
    // Each phase's own work in the activity column, as it starts.
    const effects: Partial<Record<RunPhase["key"], () => void>> = {
      implement: () => patch(buildId, { progress: { done: 1, total: 4 }, detail: PHASE_LABEL.implement }),
      "ui-check": () => {
        patch(buildId, { progress: { done: 2, total: 4 }, detail: PHASE_LABEL["ui-check"] });
        log({ id: shotsId, kind: "screenshots", title: "Screenshots · Web", device: "web", state: "working", detail: "Looking at the screens" });
      },
      review: () => {
        patch(shotsId, { state: "done", detail: "3 screens checked", count: 3 });
        patch(buildId, { progress: { done: 3, total: 4 }, detail: PHASE_LABEL.review });
      },
      verify: () => {
        patch(buildId, { state: "done", progress: { done: 4, total: 4 }, detail: "Built and reviewed" });
        log({ kind: "checks", title: "Checks", state: "done", detail: initial.facts.checks.state === "passed" ? initial.facts.checks.line : "All 214 checks passed" });
        setJob("verifying");
        log({ id: verifyId, kind: "checks", title: "Independent check", state: "working", detail: "Checker checks it against the story" });
      },
      reply: () => {
        setJob("building");
        patch(verifyId, { state: "done", detail: "Passed · does what the story asks" });
        add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Verified by Checker · it does what the story asks" });
      },
    };
    phases.forEach((p, i) => {
      if (i === 0) return;
      later(picked + starts[i], () => {
        effects[p.key]?.();
        enter(i);
      });
    });
    later(picked + starts[of - 1] + 700, () => {
      setPr("open");
      setPrNo(number);
      log({ kind: "pr", title: `Pull request #${number}`, state: "done", detail: updating ? "Updated · ready to merge" : "Ready to merge" });
    });
    later(end, () => {
      log({ kind: "preview", title: "Preview · Web", device: "web", run: "off", state: "done", detail: "Ready to try" });
      add({
        kind: "message",
        id: nextId("agent"),
        at: "Just now",
        author: AGENT,
        report: {
          outcome: "Done. Checker verified it: it does what the story asks, and every check passed.",
          next: `Try the preview and read pull request #${number}. To accept, merge it and mark the story Done. To change something, write a note and rebuild.`,
        },
        // The phases, folded into one line under the reply.
        run: phases,
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
      say("Build finished and verified by Checker. The pull request is open and the preview is ready to try.");
    });
  };

  /**
   * In Thinking, a note or an answer revises the plan (statuses guide §2): the agent re-reads the thread,
   * updates the page and hands the story back, ready to approve. Nothing is built, no file changes.
   */
  const writePlan = (from: "story" | "note" | "answers") => {
    const specId = nextId("act");
    const engId = nextId("act");
    const fresh = from === "story";
    // After an answer, the agent first picks up where it left off; then it plans, then it replies.
    const lead = from === "answers" ? 1100 : 0;
    const replyAt = 6200;
    const phases: RunPhase[] = [
      ...(lead ? [{ key: "resume" as const, ms: lead }] : []),
      { key: "plan", ms: replyAt - lead },
      { key: "reply", ms: 800 },
    ];
    const of = phases.length;
    const since = Date.now();
    const enter = (i: number) => setBusy({ kind: "working", label: LIVE_WORDS[phases[i].key], phase: phases[i].key, step: i + 1, of, since });
    enter(0);
    if (lead) later(lead, () => enter(1));
    later(1100, () => {
      log({ id: specId, kind: "spec", title: "Specification page", state: "working", detail: fresh ? "Writing" : from === "note" ? "Updating with your note" : "Updating with your answers" });
    });
    later(3800, () => {
      patch(specId, { state: "done", detail: fresh ? "Draft ready for your OK" : from === "note" ? "Edited with your note" : "Updated with your answers" });
    });
    // Then the engineering page, written from the specification page (Shubham, 20 Nov: it comes after the spec).
    later(4400, () => {
      log({ id: engId, kind: "engineering", title: "Engineering page", state: "working", detail: fresh ? "Writing" : "Updating to match" });
    });
    later(replyAt, () => {
      patch(engId, { state: "done", detail: fresh ? "Draft ready for your OK" : "Updated to match" });
      enter(of - 1);
    });
    later(replyAt + 800, () => {
      add({
        kind: "message",
        id: nextId("agent"),
        at: "Just now",
        author: AGENT,
        report: {
          outcome: fresh ? "The plan is ready." : from === "note" ? "I’ve updated the plan with your note." : "Thanks, that settles it. The plan is ready.",
          next: "Read it, then approve it to start the build. Nothing is built until you do.",
        },
        run: phases,
      });
      move({ status: "planning", need: "planning", waitingOn: "You" });
      setBusy(null);
    });
  };

  /** A plain reply: the agent thinks, reads, then answers. */
  const reply = (text: string) => {
    setBusy({ kind: "thinking" });
    later(1300, () => setBusy({ kind: "working", label: LIVE_WORDS.reply, phase: "reply", since: Date.now() }));
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
      // By the robot's name in the chat ("Builder is taking screenshots on web"); the activity line keeps the short words.
      setBusy({ kind: "working", label: `Builder is ${task.doing.charAt(0).toLowerCase()}${task.doing.slice(1)}`, since: Date.now() });
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
      withUndo(`${ref} approved. Builder starts building when it picks it up.`);
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
        withUndo(`${ref} moved to Planning. Asker writes a plan from the description.`);
        move({ status: "planning" });
        add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Moved to Planning by you" });
        log({ kind: "stage", title: "Moved to Planning by you", state: "info", detail: "" });
        writePlan("story");
        return;
      }
      // From later on, moving back asks for nothing by itself: a plan is written in answer to a note.
      withUndo(`${ref} moved back to Planning. Nothing is built; say in a note what should change.`);
      move({ status: "planning" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Moved back to Planning by you" });
      log({ kind: "stage", title: "Moved back to Planning by you", state: "info", detail: "", move: { from: columnLabel(state.status), to: "Planning" } });
      setRebuild(false);
      requestAnimationFrame(focusComposer);
    },
    cancel: () => {
      withUndo(`${ref} cancelled. Nothing more happens on it.`);
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

  // ---- Teammates on the same story ----

  /** A teammate's change, applied here: the status row, the decision and the activity update in place, the chat
   *  gets a line, and a banner says who did it and what it means for you (DESIGN.md §6.5, §8.4). */
  const applyTeammate = (to: TeammateMove, at: number) => {
    const hadYours = isYours(state) ? state.need : undefined;
    const wasBuilding = Boolean(job);
    const fresh = state.status === "new" || state.status === "planning";
    const entryId = nextId("stage");
    stopAgent();
    dropUndo();
    setRefusal(null);
    if (to === "planning") {
      move({ status: "planning" });
      add({ kind: "stage", id: entryId, at: "Just now", text: `Moved back to Planning by ${mateName}` });
      log({ kind: "stage", title: `Moved back to Planning by ${mateFirst}`, state: "info", detail: "", move: { from: columnLabel(state.status), to: "Planning" } });
    } else {
      if (fresh) settlePlan();
      runBuild(fresh ? `Plan approved by ${mateName}` : `Approved again by ${mateName} · a new build`, entryId);
    }
    // "Skye approved this again a moment ago. It’s rebuilding. Your review is on hold."
    const then = to === "planning" ? (wasBuilding ? "The build that was running stopped." : undefined) : fresh ? "It’s building now." : "It’s rebuilding.";
    setBanner({
      who: mateFirst,
      did: to === "planning" ? "moved this back to Planning" : fresh ? "approved the plan" : "approved this again",
      means: [then, hadYours ? ON_HOLD[hadYours] : undefined].filter(Boolean).join(" ") || undefined,
      at,
      entryId,
    });
  };

  /** Demo: a teammate moves the story, either straight away, or "late" (this page doesn't know yet). */
  const teammateMove = (to: TeammateMove, late: boolean) => {
    const at = Date.now();
    if (late) setPending({ to, at });
    else applyTeammate(to, at);
  };

  /** Catch up with a teammate's change this page hadn't heard of. */
  const catchUp = () => {
    if (!pending) return;
    const p = pending;
    setPending(null);
    applyTeammate(p.to, p.at);
  };

  /** "See what changed": the banner goes, and the chat shows the teammate's line, tinted for a moment. */
  const seeChange = () => {
    if (!banner) return;
    const id = banner.entryId;
    setBanner(null);
    setAtBottom(false);
    setHighlight(id);
    requestAnimationFrame(() => document.querySelector(`[data-entry="${id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  };

  /** Every move is checked against the story as it is, not as this page last showed it (statuses guide §7). If a
   *  teammate changed it first, nothing is applied and this says why. */
  const refuse = (verb: string) =>
    pending ? `Couldn’t ${verb}: ${mateFirst} ${pending.to === "planning" ? "moved it back to Planning" : "approved it again"} ${ago(Date.now(), pending.at)}.` : null;
  const guard = (verb: string, fn: () => void) => {
    const why = refuse(verb);
    if (!why) return fn();
    setRefusal(why);
    setDismissed(null); // the decision comes forward, so the reason shows where the button was
  };
  // The decision's buttons, each checked when pressed (closures, so nothing runs while the page renders).
  const act = {
    accept: () => guard("mark it Done", actions.accept),
    approve: () => guard("approve it", actions.approve),
    defaults: () => guard("approve it", actions.defaults),
    restart: () => guard("start it again", actions.restart),
    plan: () => guard("move it to Planning", actions.plan),
    cancel: () => guard("cancel it", actions.cancel),
    changes: () => guard("ask for changes", actions.changes),
  };

  /** A choice in the ⋯ menu. Refused (with the reason, shown in the menu) when a teammate moved it first;
   *  otherwise it ends whatever the robots had under way for the old status, then applies. Cancelling while
   *  Builder is building asks first, since the build is thrown away (DESIGN.md §6.11). */
  const changeStatus = (to: StatusMove): string | undefined => {
    const why = refuse(MOVE_VERB[to]);
    if (why) return why;
    if (to === "cancelled" && state.status === "in_progress") {
      setConfirmCancel(true);
      return undefined;
    }
    stopAgent();
    if (to === "cancelled") actions.cancel();
    else if (to === "done") actions.accept();
    else if (to === "planning") actions.plan();
    // Approved: build, rebuild, reopen or try again, depending on where the story is.
    else if (state.status === "new" || state.status === "planning") actions.approve();
    else if (state.status === "in_review") {
      withUndo(`${ref} sent back to build. Builder rebuilds with your notes, then Checker checks it again.`);
      runBuild("Approved again by you · rebuild with your notes");
    } else if (state.status === "done" || state.status === "cancelled") {
      withUndo(`${ref} reopened. Builder starts a new build from the story as it is now.`);
      runBuild("Reopened and approved by you");
    } else actions.restart();
    return undefined;
  };

  /** Confirmed: the build stops and is thrown away. No Undo: the build can't come back. */
  /** The confirm closes: focus goes back to the ⋯ button it was opened from (DESIGN.md §7.9). */
  const closeConfirm = () => {
    setConfirmCancel(false);
    requestAnimationFrame(() => document.getElementById(MORE_BUTTON_ID)?.focus());
  };
  const cancelRunning = () => {
    closeConfirm();
    stopAgent();
    stopPreviews("Stopped");
    move({ status: "cancelled" });
    add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Cancelled by you · the build was stopped" });
    log({ kind: "stage", title: "Cancelled by you", state: "info", detail: "", move: { from: columnLabel(state.status), to: "Cancelled" } });
    setActivity((a) => a.map((x) => (x.state === "working" ? { ...x, state: "failed", detail: "Stopped" } : x)));
    showToast(`${ref} cancelled. The build was stopped.`);
  };

  // "Needs your OK": what's waiting on the viewer, as the conversation's last card.
  const ask: AskCard | null = busy
    ? null
    : state.need === "stuck"
      ? {
          label: "Stopped",
          title: "The preview couldn’t start",
          meta: "Approve it again for a new build from the story as it is now, or write a note.",
          primary: { label: "Try again", onClick: act.restart },
        }
      : !isYours(state)
        ? null
        : state.need === "review"
          ? {
              label: "Needs your OK",
              title: `${story.title} · ready for review`,
              meta: `${facts.checks.line} · verified by Checker. Merge pull request #${prNo} first: robots never merge.`,
              move: { from: "In review", to: "Done" },
              primary: { label: "Mark as Done", onClick: act.accept },
              secondary: { label: "Ask for changes", onClick: act.changes },
            }
          : state.need === "planning"
            ? {
                label: "Needs your OK",
                title: "The plan is ready",
                meta: "Read it, then approve it. Nothing is built until you do.",
                move: { from: "Planning", to: "Approved" },
                primary: { label: "Approve and build", onClick: act.approve },
                secondary: { label: "Ask a question", onClick: actions.write },
              }
            : state.need === "decision"
              ? null // the question card itself is the ask, with "Let the defaults stand" beside its button
              : state.need === "triage"
                ? {
                    label: "Needs a decision",
                    title: "Plan it, or cancel it",
                    primary: { label: "Move to planning", onClick: act.plan },
                    secondary: { label: "Cancel story", onClick: act.cancel },
                  }
                : { label: "Needs direction", title: "No step applies right now", meta: "Tell the agent what to do next.", secondary: { label: "Write to the agent", onClick: actions.write } };
  // A refused button: the reason replaces the card's buttons, with a way to catch up.
  const askRefusal: AskRefusal | undefined = refusal ? { text: refusal, fix: { label: "See the change", onClick: catchUp } } : undefined;

  const send = ({ text, files: attached, rebuild: andRebuild }: { text: Segment[]; files: FileRef[]; rebuild: boolean }) => {
    setAtBottom(true);
    // This chat is the robots'. People talk in Team (in Messages), so nothing written here goes to a person.
    add({ kind: "message", id: nextId("me"), at: "Just now", author: me, text: text.length ? text : undefined, files: attached });
    // A closed story keeps the note, but the agent doesn't answer it (statuses guide §6).
    if (state.status === "done" || state.status === "cancelled") return;
    // While the agent holds a build, a note is read after the round; it never redirects the work (§4).
    if (job) {
      notesDuringJob.current += 1;
      return;
    }
    // A note, then Approved: refused if a teammate moved the story first (the note itself stays).
    if (andRebuild && pending) {
      setRefusal(refuse("rebuild it"));
      setDismissed(null);
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

  // Waiting on a teammate: one tap opens Team with a nudge written for them, which reaches them in Messages.
  const waitingOn = !busy && state.need && !isYours(state) ? data.people.find((p) => p.name === state.waitingOn && p.id !== data.viewer.id) : undefined;
  // Once you've written to them in Team in the last day, the nudge steps back.
  const nudged = waitingOn && storyMessages.some((m) => m.from === data.viewer.id && m.to.includes(waitingOn.id) && m.at > openedAt - 86_400_000);
  const nudge = waitingOn && !nudged && NUDGE[state.need!] ? `@${firstName(waitingOn)} ${NUDGE[state.need!]}` : null;
  const suggestions = busy
    ? []
    : isYours(state) && state.need
      ? (SUGGESTIONS[state.need] ?? [])
      : working
        ? (SUGGESTIONS.working ?? [])
        : [];
  const teamChips = waitingOnMe.length > 0 || waitingOnThem.length > 0 || (nudge && waitingOn);

  // The line above the message box: what a note does from here. A note is a conversation; a status is an instruction.
  const noteHint = (() => {
    if (job === "starting") return "Approved. A note written now may only reach the next build, so write notes before approving.";
    if (job) return "The agent reads a note after this round. It won’t change the work under way.";
    switch (state.status) {
      case "new":
      case "planning":
        return "A note revises the plan. Nothing is built until you approve it.";
      case "approved":
        return state.need === "stuck" ? "A note gets a reply. To build again, choose Try again." : "A note gets a reply. The build starts when Builder picks it up.";
      case "in_progress":
        return "The agent reads a note after this round. It won’t change the work under way.";
      case "in_review":
        return busy ? "A note in review gets a reply and never changes the code." : undefined; // the Rebuild switch says it
      default:
        return "This story is closed, so the agent won’t answer. To talk about it with your team, use Team.";
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
      onSoon={(m) => showToast(m)}
    />
  );

  const navCurrent = {
    id: story.id,
    title: story.title,
    status: state.status,
    need: state.need,
    waitingOn: state.waitingOn,
    meta: story.meta,
    outcome: story.outcome,
    pr: pr === "none" ? undefined : { state: pr, number: prNo },
    updated: story.updated,
  };

  return (
    <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
      {/* Desktop: a builder workspace, full height: the chat with the agent is the page (Shubham, 23 Nov). The stories
          list can open on the left (1280 px and wider, from the header's first button), split off by a hairline that
          runs from the top bar to the bottom of the window; the activity opens from the icon in the header's top-right
          corner, as a card over the chat. The builder is the one white surface. It scrolls on its own, and the message
          box stays pinned under the conversation. `relative` makes the frame hold everything absolutely positioned
          inside it (screen-reader text too), so nothing can stretch the page past the window. Phones scroll as one
          white page, the activity folded under "Activity". */}
      <main id="main" className="md:relative md:flex md:h-[calc(100dvh-var(--bar-h))] md:overflow-hidden md:border-t md:border-[var(--line)]">
        {/* The activity column's one announcement line: finishes only (the chat already says when work starts). */}
        <p role="status" className="sr-only">
          {said}
        </p>
        <StoryNav stories={data.queue} current={navCurrent} />
        {/* The builder: the conversation where the story is planned, built and changed. */}
        <div className="px-4 pt-4 pb-6 md:flex md:min-h-0 md:min-w-0 md:flex-1 md:flex-col md:bg-white md:p-0">
          {/* One header row across the top of the sheet from 1024 px: Stories / hq-21 / the story's name, then Team and
              the page's buttons. The name is the page's heading, the last step of the trail. Narrower (phones, and the
              sheet beside the activity at 768–1023 px): the trail and the buttons, then the name on its own row. */}
          <header className="flex flex-none flex-wrap items-center gap-x-3 gap-y-1.5 md:px-4 md:py-3 lg:h-14 lg:flex-nowrap lg:px-6 lg:py-0">
            <StoryNavToggle />
            <nav aria-label="Breadcrumb" className="flex flex-none items-center gap-2 text-[13px] leading-[18px] text-[var(--tx2)]">
              <a href="/stories" className="inline-flex items-center gap-1.5 rounded-[4px] hover:text-[var(--tx)]">
                <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.75} />
                Stories
              </a>
              <span aria-hidden="true">/</span>
              <span className="tabular-nums" aria-current="page">
                {ref}
              </span>
              <span aria-hidden="true" className="hidden lg:inline">
                /
              </span>
            </nav>
            <h1
              title={story.title}
              className="order-3 m-0 basis-full text-[20px] leading-7 font-semibold tracking-[-0.015em] text-[var(--tx)] lg:order-none lg:min-w-0 lg:basis-auto lg:truncate lg:text-[17px] lg:leading-6 lg:tracking-[-0.01em]"
            >
              {story.title}
            </h1>
            <span aria-hidden="true" className="hidden flex-1 lg:block" />
            <span className="ml-auto flex flex-none items-center gap-0.5 lg:ml-0">
              {/* The story's people chat (DESIGN.md §4.5: a facepile of members on the right), then the page's buttons. */}
              <span className="mr-1.5 flex">
                <TeamButton people={teamPeople} unread={teamUnread} onOpen={() => openTeam()} />
              </span>
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
              {/* The status moves (DESIGN.md §4.5: More in the header). The everyday next step is the chat's decision. */}
              <StatusMenu moves={statusMoves(state.status, state.need === "stuck")} locked={locked} onMove={changeStatus} onCatchUp={catchUp} storyLabel={ref} />
              {/* In the corner: the activity, as one icon that lights up while something is happening. It opens into
                  the activity card, over the chat. */}
              <span className="ml-1.5 flex max-md:hidden">
                <ActivityCorner items={activity} yours={yours}>
                  {rail(false)}
                </ActivityCorner>
              </span>
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

          <section aria-label="Conversation" className="mt-3 flex min-w-0 flex-1 flex-col md:mt-0 md:min-h-0">
            {/* At the top of the chat, as words: the story's status and what's under way, or whose turn it is.
                Read-only; it's changed from the ⋯ menu in the top row. Tones from DESIGN.md §3.1: working is ink,
                a person's turn is attention, done is positive, stopped is negative. */}
            {/* A teammate changed this story: one banner, until you've seen it. */}
            {banner && (
              <div className={`mb-1 flex-none ${COLUMN}`}>
                <TeammateBanner change={banner} onSee={seeChange} onDismiss={() => setBanner(null)} />
              </div>
            )}
            <div className={`flex h-10 min-w-0 flex-none items-center gap-2 text-[13px] leading-[18px] ${COLUMN}`}>
              <StatusLine status={state.status} detail={status.detail ?? status.turn} dot={status.dot} />
              {/* Requests still waiting in Team, and a nudge for the teammate the story waits on. Each opens Team. */}
              {teamChips && (
                <span className="ml-auto flex min-w-0 items-center gap-0.5">
                  {waitingOnMe.length > 0 && (
                    <TeamChip
                      person={waitingOnMe[0]}
                      text={`${names(waitingOnMe.map(firstName))} ${waitingOnMe.length === 1 ? "is" : "are"} waiting on you`}
                      onYou
                      onClick={() => openTeam()}
                    />
                  )}
                  {waitingOnThem.length > 0 && <TeamChip person={waitingOnThem[0]} text={`Waiting on ${names(waitingOnThem.map(firstName))}`} onClick={() => openTeam()} />}
                  {nudge && waitingOn && (
                    <TeamChip
                      icon={<BellRing aria-hidden="true" size={14} strokeWidth={1.75} />}
                      text={`Nudge ${firstName(waitingOn)}`}
                      onClick={() => openTeam(nudge)}
                    />
                  )}
                </span>
              )}
              {/* Who else is on this story right now, so people don't step on each other. */}
              {present && teammate && (
                <span title={`${teammate.name} is on this story`} className={`${teamChips ? "" : "ml-auto"} flex flex-none items-center gap-1.5 text-[12px] leading-4 text-[var(--tx2)] ${chat.labelIn}`}>
                  <span className="relative flex">
                    <PersonAvatar initials={teammate.initials} size={20} />
                    <span aria-hidden="true" className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-[var(--green)] ring-2 ring-white" />
                  </span>
                  <span className="max-sm:sr-only">
                    {mateFirst} is here · {DOING[state.status]}
                  </span>
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
              {/* The scroll area is the whole sheet, so the wheel works anywhere over it; the messages sit in the reading
                  column and bubbles keep their own width. Behind a decision it softens and can't be used, until the
                  decision is put back. */}
              <div inert={focused} className={`${COLUMN} ${focused ? chat.recede : ""}`}>
                <StoryThread
                  entries={entries}
                  stories={data.stories}
                  viewerInitials={data.viewer.initials}
                  live={live}
                  ask={focused ? null : ask}
                  refusal={askRefusal}
                  onAnswer={answer}
                  onSkipQuestion={state.need === "decision" && !busy ? act.defaults : undefined}
                  highlight={highlight}
                />
              </div>
            </div>

            <div className={`sticky bottom-0 flex-none bg-white pb-4 ${COLUMN}`}>
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
              {focused && <StoryDecision key={gateKey} ask={ask} refusal={askRefusal} onDismiss={dismissDecision} />}
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
                  viewerName={data.viewer.name}
                  onSend={send}
                  onWriteToTeam={openTeam}
                />
              </div>
            </div>
            </div>
          </section>
        </div>
      </main>

      <Toast toast={toast} onDismiss={dismissToast} offsetRight="0px" />
      <CancelStoryDialog
        open={confirmCancel}
        onClose={closeConfirm}
        onConfirm={cancelRunning}
        storyLabel={ref}
        consequence="Builder stops and this build is thrown away."
      />
      {demo && teammate && (
        <TeammateDemo
          who={mateFirst}
          present={present}
          onPresence={setPresent}
          onMove={teammateMove}
          waiting={Boolean(pending)}
          canPlan={state.status !== "new" && state.status !== "planning"}
          locked={job === "building" || job === "verifying"}
        />
      )}
    </Tooltip.Provider>
  );
}
