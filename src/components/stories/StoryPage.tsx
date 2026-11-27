import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Tooltip } from "radix-ui";
import { ArrowDown, ArrowLeft, ChevronLeft, ChevronRight, FileText, Link as LinkIcon } from "lucide-react";
import type { NeedKind, Person, StoryStatus } from "@/types/dashboard";
import type { ActivityItem, AskCard, AskRefusal, Author, Decision, Device, FileRef, LiveState, MainState, PhaseKey, PrMerge, PreviewActions, PullRequest, RunPhase, Segment, StoryItem, StoryNavItem, StoryPageData, ThreadEntry } from "@/types/stories";
import { BTN_SECONDARY, ICON_BTN } from "@/components/dashboard/classes";
import { sortQueue, storyRef } from "@/components/dashboard/format";
import { Tip } from "@/components/dashboard/Tip";
import { Toast } from "@/components/dashboard/Toast";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { anyWorking, buildActivity, DEVICE_NAME, livePreview, mainDetail, PR_DETAIL, restoreActivity, taskFor, type Task } from "./activity";
import { ActivitySummary } from "./ActivitySummary";
import chat from "./chat.module.css";
import { CancelStoryDialog } from "./CancelStoryDialog";
import { findCreated } from "./created";
import { LIVE_WORDS } from "./LiveLine";
import { PHASE_LABEL } from "./phases";
import { PreviewRow } from "./PreviewControl";
import { columnLabel, prStage, statusMoves, type StatusMove } from "./stage";
import { DecisionDock } from "./DecisionDock";
import { MainDemo, type MainDemoStep } from "./MainDemo";
import { MORE_BUTTON_ID, StatusBadge, StatusMenu } from "./StatusMenu";
import { ownerOf, useStoryOwners } from "./owners";
import { COMPOSER_INPUT_ID, StoryComposer } from "./StoryComposer";
import { ActivityCorner } from "./ActivityCorner";
import { StoryRail } from "./StoryRail";
import { StoryDetails, storyCardFor, type StoryBrief } from "./StoryDetails";
import { StatusGuide } from "./StatusGuide";
import { StatusPicker, type Turn } from "./StatusPicker";
import type { RobotRun } from "./estimate";
import { addDecision, decisionsFrom, removeDecision, useSavedDecisions } from "./decisions";
import { StoryDecisions } from "./StoryDecisions";
import { HistoryList } from "./StoryHistory";
import { openSection, PanelSection } from "./PanelSection";
import { PanelTabs, type PanelTab } from "./PanelTabs";
import { useIsWide } from "./hooks";
import type { ChatFile } from "./StoryMore";
import { writeMs } from "./stream";
import { StoryThread } from "./StoryThread";
import { StoryTour } from "./StoryTour";
import { ago, TeammateBanner, type TeammateChange } from "./TeammateBanner";
import { TeammateDemo, type TeammateMove } from "./TeammateDemo";
import { useToastQueue } from "./toasts";
import { AGENT, buildFacts, buildThread, personFor, prNumberFor, titleOnlyAsk } from "./thread";

interface State {
  status: StoryStatus;
  need?: NeedKind;
  waitingOn?: string;
}

const isYours = (s: State) => Boolean(s.need) && (s.waitingOn ?? "You") === "You";

/** What the robots are doing when nothing is happening on this page right now (the statuses guide, §2–6).
 *  `run`: the build under way that the board shows (its phase and start), so both say the same words and time. */
function restingLive(s: State, run?: { phase: PhaseKey; since?: number }, ship?: { pr: string; merger: string; merge?: PrMerge }): LiveState | null {
  if (s.status === "cancelled") return { kind: "quiet", text: "Cancelled. Nothing more will happen." };
  if (s.status === "done")
    return { kind: "quiet", text: ship?.pr === "merged" ? "Done · merged into main" : ship?.pr === "closed" ? "Closed · the pull request wasn’t merged" : "Done · nothing to merge" };
  // The pull request waits on the one person with GitHub access; nobody here has to act.
  // A refused update is stuck: the card says so, never "with the person who merges" (hq-35, 25 Nov).
  if (s.status === "pull_request" && ship?.merge === "blocked") return null;
  if (s.status === "pull_request" && !s.need) return { kind: "quiet", text: `With ${ship?.merger ?? "the person who merges"} to check and merge on GitHub` };
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
  if (s.status === "approved") return { kind: "quiet", text: "Queued · Builder picks it up next" };
  // New is not a plan being written.
  return { kind: "quiet", text: "Nothing has been planned yet" };
}

/** What an approval has under way on this page: waiting to be picked up, then the build, then the second
 *  agent's check. While the agent holds the build or the check, the status menu is locked. */
type Job = "starting" | "building" | "verifying";

/** The message box and what takes its place: in, a fade and a 6 px rise over 200 ms; out, a fade over 120 ms
 *  (DESIGN.md §3.7: exits are faster). Under reduced motion, a fade only. */
const SWAP = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.2, 0, 0, 1] } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } },
} as const;
const SWAP_FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
} as const;

const SUGGESTIONS: Partial<Record<NeedKind | "working", string[]>> = {
  review: ["Take mobile screenshots", "Start the preview on mobile", "What changed since last time?"],
  planning: ["Show me the markup", "Add a note to the spec", "Explain the plan simply"],
  next: ["Build the next step", "What’s left to do?"],
  decision: ["Which would you pick, and why?"],
  working: ["How’s it going?"],
};

// The phases of the build the agent runs after an approval, a restart or a change request (front end only),
// with how long each takes here. They show one at a time while it works, then fold under its reply. There's no
// "writing a reply" phase: the report writes itself into the chat (Shubham, 27 Nov).
const BUILD_PHASES: RunPhase[] = [
  { key: "plan", ms: 2400 }, // makes the story's branch and reads the plan
  { key: "implement", ms: 3600 },
  { key: "ui-check", ms: 2400 }, // opens the running app and looks at the screens
  { key: "review", ms: 2400 }, // runs every check and reviews its own work
  { key: "verify", ms: 2600 }, // a second agent, not the builder, checks it against the story
];

/** How long something that just finished stays on top of the activity column before it goes down. */
const SETTLE_MS = 1500;

/** Desktop: the chat's reading column, Ask PM's (Shubham, 25 Nov: the story chat and the PM chat are the same thing, so
 *  they share one design language). The card fills the screen at any width; the conversation stays a readable 720 px
 *  column in it, its words at 15/24 (DESIGN.md §3.2, about 70 characters a line). The status row and the thread use
 *  it, so they line up. */
const COLUMN = "md:mx-auto md:w-full md:max-w-[720px] md:px-6";
/** The message box and the decision over it: 24 px wider each side than the words, as Ask's box is. */
const BOX_COLUMN = "md:mx-auto md:w-full md:max-w-[768px] md:px-6";

let seq = 0;
const nextId = (p: string) => `${p}-${Date.now()}-${(seq += 1)}`;

/** What one of the robot's replies carries: its words or its report, the files it made, the run behind it. */
type Reply = Pick<Extract<ThreadEntry, { kind: "message" }>, "text" | "report" | "files" | "run">;

/** A note about main or the pull request on built work ("does it clash with main?", "update the pr", "merge main
 *  in"): answered with where it stands, and an update started if main moved on. Never "move it back to Approved":
 *  bringing in main is upkeep, not a change to what the story does (hq-35, 17–25 Nov). */
const ABOUT_MAIN = /\b(merge|rebase|conflicts?|clash(es)?|up to date|out of date|behind main|latest main|from main|with main|the pr|pull request)\b/i;

const refsOf = (ids: number[]) => ids.map((id) => `hq-${id}`).join(", ");

/** What a ⋯ menu move does, for the reason it was refused: "Couldn’t cancel it: …". */
const MOVE_VERB: Record<StatusMove, string> = {
  planning: "move it to Planning",
  approved: "start the build",
  pull_request: "create the pull request",
  close: "close the pull request",
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

const firstName = (p: Person) => p.name.split(" ")[0];

/** What a teammate is sent a story to do, by the decision it was waiting on (Shubham, 26 Nov: "Send to someone"). */
const HANDOFF: Partial<Record<NeedKind, { to: string; until: string }>> = {
  planning: { to: "approve the plan", until: "approves the plan" },
  review: { to: "review it", until: "reviews it" },
};

/** The island for /stories/hq-N: renders only in the browser, so created stories can be read from storage. */
export function StoryPage({ data }: { data: StoryPageData }) {
  const story = data.story ?? findCreated(data.storyId);
  if (!story) {
    return (
      <main id="main" className="mx-auto w-full max-w-[1344px] px-4 pt-16 text-center md:px-8">
        <p className="text-base font-semibold">There’s no story {storyRef(data.storyId)}</p>
        <p className="mt-1 text-sm text-[var(--tx2)]">It may have been created in another browser, or the link is wrong.</p>
        <a href="/stories" className={`${BTN_SECONDARY} mt-5`}>
          Back to stories
        </a>
      </main>
    );
  }
  return <StoryView story={story} data={data} />;
}

function StoryView({ story, data }: { story: StoryItem; data: StoryPageData }) {
  const initial = data.thread ?? buildThread(story, data.people, data.viewer, data.story === null && !story.createdAt ? "Earlier" : undefined);
  const [entries, setEntries] = useState<ThreadEntry[]>(initial.entries);
  const [activity, setActivity] = useState<ActivityItem[]>(() => buildActivity(story, initial.facts, Date.now()));
  const [state, setState] = useState<State>({ status: story.status, need: story.need, waitingOn: story.waitingOn });
  const [changed, setChanged] = useState(false);
  const [busy, setBusy] = useState<LiveState | null>(null);
  const reduce = useReducedMotion();
  const [rebuild, setRebuild] = useState(false);
  // The activity's corner card (768–1023 px), open.
  const [cornerOpen, setCornerOpen] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  // The story's pull request: the agent opens it once the work passes its check; a person merges it.
  const [pr, setPr] = useState(initial.facts.pullRequest.state);
  const [prNo, setPrNo] = useState(() => story.pr?.number ?? prNumberFor(story.id));
  // While it waits to be merged: what's happening to the pull request (the sample's state until this page moves it).
  const [prMerge, setPrMerge] = useState<PrMerge | undefined>(story.pr?.merge);
  const [unsent, setUnsent] = useState(story.pr?.unsent ?? 0);
  // Where the branch stands against main; the PM brings main in by itself when another story merges.
  const [main, setMain] = useState<MainState>(story.main ?? { behind: [], checked: "5m ago" });
  const updatingMain = useRef(false);
  // Creating the pull request compared the story with main and found a conflict: the card that says so is open.
  const [pushConflict, setPushConflict] = useState(false);
  // A question about main open in the chat (main removed something this story needs), and a rebuild that brings
  // main in along with the change, so "Latest main" turns up to date when the build ends.
  const [mainQuestion, setMainQuestion] = useState<string | null>(null);
  const mainWithBuild = useRef(false);
  // hq-35's demo: how far through its steps (it replays the live story's 24–25 Nov, handled the new way).
  const [demoAt, setDemoAt] = useState(0);
  // Which waiting decision you chose to write about first ("Ask something first", "Ask for changes"): the message box is
  // back for that one; a new decision docks again.
  const [writingFor, setWritingFor] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  // Notes written while the agent holds a build: read after the round, never mid-build.
  const notesDuringJob = useRef(0);
  // Toasts for the result of your own action, one at a time; the rest wait (DESIGN.md §6.5).
  const { toast, show: showToast, dismiss: dismissToast, dropUndo } = useToastQueue();
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const firstScroll = useRef(true);
  // Until when (epoch ms) the chat doesn't follow the bottom: a jump up to an older message ("See in chat", "See what
  // changed") starts while the chat still counts as at the bottom, and following it would pull the chat straight back.
  const holdScroll = useRef(0);
  // The one screen-reader line for the activity column: finishes, a preview running or stopped, the build's end.
  const [said, setSaid] = useState("");
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
  // Story details: the whole story as it was written, to read (Shubham, 26 Nov).
  const [detailsOpen, setDetailsOpen] = useState(false);
  // "How statuses work", from the Status box (or the Status tab below 1024 px).
  const [guideOpen, setGuideOpen] = useState(false);
  // The right-hand side's tab (Shubham, 26 Nov), from ?tab= so a link opens the same one; Status when there's none.
  const [tab, setTab] = useState<PanelTab>(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    // ?tab=work: the Output tab's name until 27 Nov, so an older link still opens it. ?tab=story (no Story tab since
    // 27 Nov) opens Status.
    if (t === "work") return "output";
    return t === "output" || t === "history" ? t : "status";
  });
  // From 1024 px the tabs sit in a card beside the chat; below it they open from the header's corner icon (tablets) or
  // the fold under the header (phones), so only one set is mounted where it shows.
  const wide = useIsWide();
  // Decisions people saved here (messages saved as decisions, and changes), kept in this browser until there's an API.
  const savedDecisions = useSavedDecisions(story.id);
  // Sent to a teammate from the decision card: the story waits on them and is paused for you (Shubham, 26 Nov).
  // Read against the state, so Undo (which puts the state back) ends it too.
  const [handoff, setHandoff] = useState<{ name: string; initials: string; need: NeedKind } | null>(null);
  const handedTo = handoff && state.need === handoff.need && state.waitingOn === handoff.name ? handoff : null;
  const handedFirst = handedTo?.name.split(" ")[0] ?? "";

  const me: Author = { kind: "person", name: data.viewer.name, initials: data.viewer.initials };
  const [openedAt] = useState(() => Date.now());
  const owners = useStoryOwners();
  const ownerInitials = ownerOf(story, owners);
  const owner = ownerInitials ? personFor(ownerInitials, data.people, data.viewer) : undefined;
  const ownerName = owner?.kind === "person" ? owner.name : undefined;
  // The teammate in the demo: the story's owner when that isn't you, else the first teammate.
  const teammate = data.people.find((p) => p.initials === ownerInitials && p.id !== data.viewer.id) ?? data.people.find((p) => p.id !== data.viewer.id);
  const mateName = teammate?.name ?? "A teammate";
  const mateFirst = mateName.split(" ")[0];
  // The one person with GitHub access, who checks and merges every pull request (Shubham, 26 Nov).
  const merger = data.people.find((p) => p.initials === data.merger);
  const mergerName = merger ? (merger.id === data.viewer.id ? "you" : merger.name) : "the person who merges";
  const mergerFirst = merger ? (merger.id === data.viewer.id ? "you" : firstName(merger)) : "the person who merges";
  // While it waits to be merged: the sample's state (a story merged first, main moved on) until this page changes it.
  const prNow: PullRequest | undefined = state.status === "pull_request" ? { state: "open", number: prNo, merge: prMerge ?? "ready", conflictWith: story.pr?.conflictWith } : undefined;
  // The status row at the top of the chat: the status and what's under way (the status menu), a dot, and whose
  // turn it is when nobody's working. A status says what was asked for; the detail says what's running.
  // The board's run on this story (StoryItem.live), until this page changes the status: same words, same start.
  const seed = story.live && !changed ? { phase: story.live.phase, since: story.live.startedAt ?? openedAt - (story.live.minutesAgo ?? 0) * 60_000 } : undefined;
  const live = busy ?? restingLive(state, seed, { pr, merger: mergerFirst, merge: prNow?.merge });
  const working = live?.kind === "working" || live?.kind === "thinking" || live?.kind === "writing";
  // The robot's one current phase, by its name: the same words as the chat's live line and the board.
  const phase = live?.kind === "working" ? live.phase : undefined;
  const status: { dot: string; detail?: string; turn?: string } = (() => {
    // Green only for merged (DESIGN.md §3.1); closed without merging, or done with nothing to merge, is quiet.
    if (state.status === "done") return { dot: pr === "merged" ? "bg-[#16a34a]" : "bg-[var(--tx2)]", detail: pr === "closed" ? "Not merged" : undefined };
    if (state.status === "cancelled") return { dot: "bg-[var(--tx2)]" };
    if (job === "starting") return { dot: "bg-[var(--tx2)]", detail: "Queued" };
    if (phase) return { dot: "bg-[var(--tx)]", detail: LIVE_WORDS[phase] };
    if (job === "building") return { dot: "bg-[var(--tx)]", detail: "Building" };
    if (job === "verifying") return { dot: "bg-[var(--tx)]", detail: "Verifying" };
    if (state.need === "stuck") return { dot: "bg-[#b91c1c]", detail: "Stopped" };
    if (isYours(state)) return { dot: "bg-[#d97706]", turn: "Waiting on you" };
    if (state.need) return { dot: "bg-[var(--tx2)]", turn: `Waiting on ${state.waitingOn}` };
    if (state.status === "approved") return { dot: "bg-[var(--tx2)]", detail: "Queued" };
    if (state.status === "in_progress") return { dot: "bg-[var(--tx)]", detail: "Building" };
    // A robot job started here with no build phase (sending to GitHub, bringing in main): say what it is.
    if (busy?.kind === "working") return { dot: "bg-[var(--tx)]", detail: busy.label };
    if (prNow) {
      const stage = prStage(prNow);
      if (stage.tone === "stuck") return { dot: "bg-[#b91c1c]", detail: stage.text };
      return { dot: stage.tone === "agent" ? "bg-[var(--tx)]" : "bg-[var(--tx2)]", detail: stage.text, turn: stage.tone === "agent" ? undefined : `With ${mergerFirst}` };
    }
    return { dot: state.status === "planning" && busy ? "bg-[var(--tx)]" : "bg-[var(--tx2)]" };
  })();
  const locked =
    job === "building"
      ? "Builder is building; you can change this when it finishes."
      : job === "verifying"
        ? "Checker is verifying; you can change this when it finishes."
        : handedTo
          ? `It’s with ${handedTo.name}; take it back to change it.`
          : undefined;
  // Once the stage moves, the facts follow it, but the story's own checks count stays.
  const moved = buildFacts({ ...story, ...state }, ownerName);
  const facts = !changed
    ? initial.facts
    : { ...moved, checks: moved.checks.state === "passed" && initial.facts.checks.state === "passed" ? initial.facts.checks : moved.checks };
  // Previous and Next in ⋯ (Shubham, 26 Nov: no stories list beside the chat). They go through the stories that need
  // you, in the order the dashboard lists them under Mine, round to the start, so you can work through them one after
  // another. A story that doesn't need you starts from the top of that list. When none needs you: the stories in order.
  const forYou = (s: StoryNavItem) => s.need === "stuck" || (Boolean(s.need) && (s.waitingOn ?? "You") === "You");
  const mine = sortQueue(data.queue.filter(forYou), "group");
  const smart = mine.some((s) => s.id !== story.id);
  const at = data.queue.findIndex((s) => s.id === story.id);
  const here = mine.findIndex((s) => s.id === story.id);
  const prev = smart ? mine.at(here === -1 ? -1 : (here - 1 + mine.length) % mine.length) : at > 0 ? data.queue[at - 1] : undefined;
  const next = smart ? mine[here === -1 ? 0 : (here + 1) % mine.length] : at >= 0 ? data.queue[at + 1] : undefined;

  // Pending agent timers stop when the page goes away.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  // Newest at the bottom, like a chat: open at the end, and follow new messages unless you've scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !atBottom || Date.now() < holdScroll.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: firstScroll.current ? "auto" : "smooth" });
    firstScroll.current = false;
  }, [entries, busy, atBottom]);
  // A reply writing itself in grows the chat with no new message: keep its newest words in view, as long as you were at
  // the bottom before it grew (scrolled up to read, it stays put, as with new messages). The chat glides down after
  // the words, a little of the way each frame, instead of jumping a line each time one starts (Shubham, 27 Nov: "one
  // line and the second line is coming", smoothly). Scrolling yourself stops the glide at once; under reduced motion
  // it keeps up without gliding.
  useEffect(() => {
    const el = scrollRef.current;
    const content = el?.firstElementChild;
    if (!el || !content) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let height = el.scrollHeight;
    let frame = 0;
    const glide = () => {
      const gap = el.scrollHeight - el.clientHeight - el.scrollTop;
      if (gap <= 0.5) {
        frame = 0;
        return;
      }
      el.scrollTop += Math.max(1, gap * 0.2);
      frame = requestAnimationFrame(glide);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const follow = new ResizeObserver(() => {
      const before = height;
      height = el.scrollHeight;
      if (!(height > before && before - el.scrollTop - el.clientHeight < 80 && Date.now() >= holdScroll.current)) return;
      if (still.matches) el.scrollTop = height;
      else if (!frame) frame = requestAnimationFrame(glide);
    });
    follow.observe(content);
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("touchstart", stop, { passive: true });
    return () => {
      follow.disconnect();
      stop();
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchstart", stop);
    };
  }, []);

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
  /** The robot's reply: it writes itself into the chat word by word, with no "Builder is writing a reply" line first
   *  (Shubham, 27 Nov: the words come straight away). Until its words are out, nothing waits on you yet (no decision
   *  card, no question), and `then` (a second message) waits for it. With reduced motion it's all there at once. */
  const post = (message: Reply, then?: () => void) => {
    add({ kind: "message", id: nextId("agent"), at: "Just now", author: AGENT, ...message });
    setBusy({ kind: "writing" });
    later(reduce ? 0 : writeMs(message), () => (then ? then() : setBusy(null)));
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
  // The preview machine: started and stopped from the activity card, timed here. Two previews use it, this story's own
  // and the whole app (Shubham, 27 Nov), and one runs at a time: starting one stops the other.
  const previewTitle = (app: boolean, d: Device) => `${app ? "Whole app" : "Preview"} · ${DEVICE_NAME[d]}`;
  const preview: PreviewActions = {
    start: (id, d) => {
      const it = activity.find((x) => x.id === id);
      const where = d ?? it?.device ?? "web";
      const app = it?.scope === "app";
      const other = activity.find((x) => x.kind === "preview" && x.id !== id && (x.run === "on" || x.run === "starting"));
      if (other) {
        window.clearTimeout(previewTimers.current.get(other.id));
        previewTimers.current.delete(other.id);
        patch(other.id, { run: "off", detail: "Stopped" });
        if (other.run === "on") showToast(other.scope === "app" ? "The whole app preview stopped: one runs at a time." : "This story’s preview stopped: one runs at a time.");
      }
      patch(id, {
        run: "starting",
        startedAt: Date.now(),
        device: where,
        title: previewTitle(app, where),
        detail: app ? `Starting the whole app on ${where}` : `Starting the preview on ${where}`,
      });
      const t = later(2400, () => {
        previewTimers.current.delete(id);
        patch(id, { run: "on", startedAt: Date.now(), detail: `Running on ${where}` });
        say(app ? `Whole app running on ${where}.` : `Preview running on ${where}.`);
      });
      previewTimers.current.set(id, t);
    },
    stop: (id) => {
      window.clearTimeout(previewTimers.current.get(id));
      previewTimers.current.delete(id);
      const it = activity.find((x) => x.id === id);
      const wasOn = it?.run === "on";
      patch(id, { run: "off", detail: wasOn ? "Stopped" : "Ready to try" });
      if (wasOn) showToast(it?.scope === "app" ? "The whole app preview stopped." : "Preview stopped.");
    },
    device: (id, d) => {
      const it = activity.find((x) => x.id === id);
      if (it?.run === "on" || it?.run === "starting") return;
      patch(id, { device: d, title: previewTitle(it?.scope === "app", d) });
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
   * builder) checks the work against the story, and the story moves to In review. The pull request is created from
   * there, by a person (Shubham, 26 Nov); a rebuild while one is open updates it, and the story comes back for review.
   */
  const runBuild = (label: string, stageId?: string) => {
    const buildId = nextId("act");
    const shotsId = nextId("act");
    const verifyId = nextId("act");
    const updating = pr === "open";
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
    // Approving puts it in Building, queued; a rebuild that's already there doesn't move.
    const from = columnLabel(state.status);
    log({ kind: "stage", title: label, state: "info", detail: "", move: from === "Building" ? undefined : { from, to: "Building" } });
    move({ status: "approved" });
    add({ kind: "stage", id: stageId ?? nextId("stage"), at: "Just now", text: label });
    setJob("starting");
    setBusy({ kind: "waiting", text: "Queued · Builder picks it up next" });

    later(picked, () => {
      since = Date.now();
      setJob("building");
      move({ status: "in_progress" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Builder started building" });
      // Still Building: queued is its first step, so starting isn't a move between columns.
      log({ kind: "stage", title: "Started building", state: "info", detail: "" });
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
    };
    phases.forEach((p, i) => {
      if (i === 0) return;
      later(picked + starts[i], () => {
        effects[p.key]?.();
        enter(i);
      });
    });
    later(end, () => {
      patch(verifyId, { state: "done", detail: "Passed · does what the story asks" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Verified by Checker · it does what the story asks" });
      // A pull request that's already open gets the new build too, and waits for the story to be reviewed again.
      if (updating) log({ kind: "pr", title: `Pull request #${prNo}`, state: "done", detail: "Updated with the new build · review it again" });
      log({ kind: "preview", title: "Preview · Web", device: "web", run: "off", state: "done", detail: "Ready to try" });
      // The whole app has this story in it now.
      setActivity((a) => a.map((x) => (x.kind === "preview" && x.scope === "app" ? { ...x, withStory: true } : x)));
      // Notes written during the round are read now; they never redirected the build under way. That reply follows the
      // report once its words are out.
      const notes = notesDuringJob.current > 0;
      notesDuringJob.current = 0;
      post(
        {
          report: {
            outcome: "Done. Checker verified it: it does what the story asks, and every check passed.",
            next: updating
              ? `Try the preview. When it’s right, update pull request #${prNo}, and it goes back to ${mergerName} to merge. To change something, write a note and rebuild.`
              : `Try the preview. When it’s right, create the pull request, and it goes to ${mergerName} to check and merge on GitHub. To change something, write a note and rebuild.`,
          },
          // The phases, folded into one line under the reply.
          run: phases,
        },
        notes
          ? () =>
              post({
                text: ["I’ve read your note now that this round is over. It didn’t change the build that was running. To have it built, pick Building under Status: the next build is given every note since this one."],
              })
          : undefined,
      );
      move({ status: "in_review", need: "review", waitingOn: "You" });
      setJob(null);
      // Main came in with this build (the answer to a question about main): it's up to date now.
      if (mainWithBuild.current) {
        mainWithBuild.current = false;
        setMain({ behind: [], checked: "just now" });
        log({ kind: "main", title: "Latest main", state: "done", detail: "Up to date · brought in with this build" });
      }
      say("Build finished and verified by Checker. The preview is ready to try.");
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
    // After an answer, the agent first picks up where it left off; then it plans, and its reply writes itself in.
    const lead = from === "answers" ? 1100 : 0;
    const replyAt = 6200;
    const phases: RunPhase[] = [...(lead ? [{ key: "resume" as const, ms: lead }] : []), { key: "plan", ms: replyAt - lead }];
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
      post({
        report: {
          outcome: fresh ? "The plan is ready." : from === "note" ? "I’ve updated the plan with your note." : "Thanks, that settles it. The plan is ready.",
          next: "Read it, then approve it to start the build. Nothing is built until you do.",
        },
        run: phases,
      });
      move({ status: "planning", need: "planning", waitingOn: "You" });
    });
  };

  /** A plain reply: the agent reads your message, then its answer writes itself in. */
  const reply = (text: string) => {
    setBusy({ kind: "thinking" });
    later(1300, () => post({ text: [text] }));
  };

  // ---- Keeping built work up to date with main (Shubham, 26 Nov, from hq-35) ----

  /** The newest "Latest main" line in Activity, and the pull request's. */
  const rowOf = (kind: ActivityItem["kind"]) => activity.find((x) => x.kind === kind)?.id;

  /**
   * Another story merged and touched the same files, so main moved on under this one. The PM brings it in by itself,
   * without asking and without moving the story: a merge of main into this branch, never a rebase, on the same branch
   * and the same pull request. Clashes where both sides can stay are settled by keeping both, and said in one line.
   * Then the checks run again, and the pull request gets the new version. The story stays where it was.
   * `at`: where to pick up, for a story whose update was already under way (the sample's "Fixing conflicts").
   */
  const updateFromMain = ({
    at = "start",
    behind = main.behind,
    clashes = main.clashes ?? 0,
    refused = false,
  }: { at?: "start" | "clashes"; behind?: number[]; clashes?: number; refused?: boolean } = {}) => {
    if (updatingMain.current || !behind.length) return;
    updatingMain.current = true;
    setMain((m) => ({ ...m, behind, clashes }));
    const who = refsOf(behind);
    const onPr = state.status === "pull_request";
    const mainId = rowOf("main");
    const prId = rowOf("pr");
    const since = Date.now();
    const step = (label: string, detail: string, merge?: PrMerge) => {
      setBusy({ kind: "working", label, since });
      if (mainId) patch(mainId, { state: "working", detail });
      if (onPr && merge) {
        setPrMerge(merge);
        if (prId) patch(prId, { state: "working", detail: merge === "checks" ? "Checks running" : "Bringing in the latest main" });
      }
    };
    let t = 0;
    if (at === "start") {
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: `${who} merged into main · the PM is bringing it into this story (a merge, not a rebase)` });
      step(`Developer is bringing in ${who}`, `Bringing in ${who} · merging main in, not rebasing`, "updating");
      t += 1800;
    }
    if (clashes) {
      later(t, () => step(`Developer is fitting in both sides of ${clashes} clashes`, `${clashes} clashes with ${who} · keeping both sides`, "conflict"));
      t += 2200;
    }
    later(t, () => step("Tester is running the checks again", "Clashes settled · checks running", "checks"));
    t += 2000;
    later(t, () => {
      updatingMain.current = false;
      setBusy(null);
      const now: MainState = { behind: [], checked: "just now", settled: clashes || undefined };
      setMain(now);
      if (mainId) patch(mainId, mainDetail(now));
      const settled = clashes ? ` · ${clashes} clashes settled, both sides kept` : " · nothing clashed";
      // GitHub refused the update: the work here is up to date, the pull request isn't. Stuck, never "ready".
      if (onPr && refused) {
        setPrMerge("blocked");
        setUnsent(2);
        if (prId) patch(prId, { state: "failed", detail: PR_DETAIL.blocked() });
        add({ kind: "stage", id: nextId("stage"), at: "Just now", text: `Brought in ${who}${settled} · all checks passed · GitHub refused the update to pull request #${prNo}` });
        say(`GitHub refused the update to pull request #${prNo}.`);
        return;
      }
      if (onPr) {
        setPrMerge("ready");
        if (prId) patch(prId, { state: "done", detail: "Updated · ready to merge on GitHub" });
      }
      add({
        kind: "stage",
        id: nextId("stage"),
        at: "Just now",
        text: `Brought in ${who}${settled} · all checks passed${onPr ? ` · pull request #${prNo} updated` : ""}`,
      });
      say(`Up to date with main.${onPr ? ` Pull request #${prNo} updated.` : ""}`);
    });
  };

  /** GitHub refused the update (CraftHQ can't write to it): reconnecting sends what's waiting, straight away. */
  const sendToGitHub = () => {
    const prId = rowOf("pr");
    const n = Math.max(1, unsent);
    setBusy({ kind: "working", label: `Sending ${n} ${n === 1 ? "update" : "updates"} to pull request #${prNo}`, since: Date.now() });
    if (prId) patch(prId, { state: "working", detail: "Sending to GitHub" });
    later(1800, () => {
      setBusy(null);
      setPrMerge("ready");
      setUnsent(0);
      if (prId) patch(prId, { state: "done", detail: "Updated · ready to merge on GitHub" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: `GitHub reconnected · pull request #${prNo} updated with ${n} ${n === 1 ? "update" : "updates"} · with ${mergerName} to merge` });
      showToast(`Pull request #${prNo} updated.`);
    });
  };

  // ---- A conflict found when you create the pull request (Shubham, 27 Nov: hq-26 against Deepak's merged hq-25) ----

  /**
   * Create pull request on a story that main moved on under: it's compared with main first. Nothing conflicts and the
   * pull request is created straight away (actions.createPr). Something does, and the story stays In review while one
   * card says who merged first, what it touches and what happens next, with one button to settle it and carry on.
   */
  const checkBeforePr = () => {
    const who = refsOf(main.behind);
    const n = main.clashes ?? 0;
    const mainId = rowOf("main");
    setBusy({ kind: "working", label: "Comparing this story with the latest main", since: Date.now() });
    if (mainId) patch(mainId, { state: "working", detail: `Comparing with ${who}` });
    later(1800, () => {
      setBusy(null);
      setPushConflict(true);
      if (mainId) patch(mainId, { state: "waiting", detail: `${n} conflicts with ${who} · waiting for your OK` });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: `Compared with main before creating the pull request · ${who} merged first and changed the same lines in ${n} places` });
      say(`${n} conflicts with ${who}. Nothing was sent to GitHub.`);
    });
  };

  /** The card's one button: main is merged in (never a rebase), both sides of every conflict are kept, the checks run
   *  again, and only then is the pull request created. A step that can't be settled this way would stop and ask. */
  const createPrNow = useRef(() => {});
  useEffect(() => {
    createPrNow.current = () => actions.createPr();
  });
  const settleThenPr = () => {
    const who = refsOf(main.behind);
    const n = main.clashes ?? 0;
    const mainId = rowOf("main");
    const since = Date.now();
    const step = (label: string, detail: string) => {
      setBusy({ kind: "working", label, since });
      if (mainId) patch(mainId, { state: "working", detail });
    };
    setPushConflict(false);
    add({ kind: "stage", id: nextId("stage"), at: "Just now", text: `Settling the conflicts with ${who}, asked by you · main is merged in, not rebased` });
    step(`Developer is bringing in ${who}`, `Bringing in ${who} · merging main in, not rebasing`);
    later(1800, () => step(`Developer is keeping both sides of ${n} conflicts`, `${n} conflicts with ${who} · keeping both sides`));
    later(4000, () => step("Tester is running the checks again", "Conflicts settled · checks running"));
    later(6000, () => {
      setMain({ behind: [], checked: "just now", settled: n || undefined });
      if (mainId) patch(mainId, { state: "done", detail: `Up to date · ${n} conflicts, both sides kept` });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: `Brought in ${who} · ${n} conflicts settled, both sides kept · all checks passed` });
      setBusy({ kind: "working", label: "Creating the pull request", since });
    });
    // A beat later, so the page has the settled state when the pull request is created.
    later(6900, () => {
      setBusy(null);
      createPrNow.current();
    });
  };

  // A story opened while main is being brought in (another story merged first): the update plays on from where it
  // was, without anyone asking. The latest function is kept in a ref so the effect runs once, on open.
  const resumeUpdate = useRef(() => {});
  useEffect(() => {
    resumeUpdate.current = () => updateFromMain({ at: story.pr?.merge === "conflict" ? "clashes" : "start" });
  });
  useEffect(() => {
    if (!story.main?.behind.length || story.main.onPush || (story.status !== "pull_request" && story.status !== "in_review")) return;
    const t = window.setTimeout(() => resumeUpdate.current(), 1200);
    return () => window.clearTimeout(t);
  }, [story]);

  /**
   * The one kind of clash that asks you: main removed or changed something this story needs (hq-35's decision #127:
   * main replaced the Home events list its ETA button sat on). Both sides can't simply stay, so the PM stops, says
   * what happened, and asks, with a recommendation and a default. Every other clash it settles itself.
   */
  const askAboutRemoval = () => {
    const mainId = rowOf("main");
    add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "hq-5 merged into main · the PM is bringing it into this story (a merge, not a rebase)" });
    setBusy({ kind: "working", label: "Developer is bringing in hq-5", since: Date.now() });
    setMain((m) => ({ ...m, behind: [5], clashes: 0 }));
    if (mainId) patch(mainId, { state: "working", detail: "Bringing in hq-5 · merging main in, not rebasing" });
    later(2200, () => {
      setBusy(null);
      const id = nextId("question");
      setMainQuestion(id);
      if (mainId) patch(mainId, { state: "waiting", detail: "hq-5 removed something this story needs" });
      setPrMerge("conflict");
      move({ status: state.status, need: "decision", waitingOn: "You" });
      add({
        kind: "question",
        id,
        at: "Just now",
        question:
          "hq-5 replaced the Home events list with the real Home feed, and this story’s ETA button sat on that list. Both can’t stay. Where should the button go? With no answer by tomorrow, the first choice goes ahead.",
        options: [
          "On the event page, beside Check in, as the design shows (recommended)",
          "A small events list back on Home, just for the button",
          "Leave it for now: the pull request can’t be merged until this is settled",
        ],
      });
      say("A question about main: hq-5 removed something this story needs.");
    });
  };

  /** The answer to that question. Moving the button changes what the story does, so it's a rebuild, not upkeep. */
  const answerRemoval = (option: number) => {
    setMainQuestion(null);
    if (option === 2) {
      move({ status: state.status });
      reply("Left as it is. The pull request stays behind main and can’t be merged until the button has a place. Say here when you want to settle it.");
      return;
    }
    mainWithBuild.current = true;
    setPrMerge("ready");
    move({ status: state.status });
    const mainId = rowOf("main");
    if (mainId) patch(mainId, { state: "working", detail: "Bringing in hq-5 with the rebuild" });
    runBuild(option === 0 ? "Answered by you · rebuild with the ETA button on the event page" : "Answered by you · rebuild with a small events list on Home");
  };

  /** "Does it clash with main?", "update the pr": where it stands, in plain words, and an update if main moved on. */
  const answerAboutMain = () => {
    if (prMerge === "blocked" && state.status === "pull_request") {
      reply(
        `Pull request #${prNo} isn’t updated: GitHub refused it, because CraftHQ can’t write to the repository. The work here is up to date with main (checked ${main.checked}), and ${unsent} ${unsent === 1 ? "update is" : "updates are"} waiting to be sent. Reconnect GitHub on the card below and they’re sent straight away.`,
      );
      return;
    }
    if (updatingMain.current) {
      openSection("code");
      reply(`I’m bringing in ${refsOf(main.behind)} right now. It’s under Code, and this story stays where it is.`);
      return;
    }
    if (main.behind.length) {
      reply(
        `${refsOf(main.behind)} merged into main since this story last took it in. I’m bringing it in now: a merge, not a rebase, on the same branch${pr === "open" ? ` and pull request #${prNo}` : ""}. Where both sides can stay, I keep both; I’ll ask you only if main removed something this story needs.`,
      );
      later(3000, () => updateFromMain());
      return;
    }
    const mainId = rowOf("main");
    if (mainId) patch(mainId, mainDetail({ ...main, checked: "just now", settled: undefined }));
    setMain((m) => ({ ...m, checked: "just now" }));
    reply(
      state.status === "pull_request"
        ? `Up to date with main (checked just now), and nothing clashes. Pull request #${prNo} on GitHub has this exact version, with ${mergerName} to merge.`
        : "There’s no pull request yet. When you create it, it starts from this version, which is up to date with main (checked just now), with nothing clashing.",
    );
  };

  /** A job from a message: in the log and the chat while it works, then done, with the agent's reply. */
  const runTask = (task: Task, built: boolean) => {
    // What was asked for shows where it lands: its box opens if it was folded.
    openSection(task.kind === "spec" || task.kind === "engineering" ? "pages" : "preview");
    // The whole app, asked for in a message ("show me the whole app"): started on its own line, as its play button does,
    // so it never leaves the Preview part while it starts.
    const wholeApp = task.kind === "preview" && task.scope === "app" ? activity.find((x) => x.kind === "preview" && x.scope === "app") : undefined;
    if (wholeApp) {
      setBusy({ kind: "thinking" });
      later(700, () => {
        if (wholeApp.run !== "on") preview.start(wholeApp.id, task.device);
        setBusy({ kind: "working", label: `Builder is ${task.doing.charAt(0).toLowerCase()}${task.doing.slice(1)}`, since: Date.now() });
      });
      later(700 + task.ms, () => post({ text: [task.reply] }));
      return;
    }
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
      post({ text: [task.reply], files: task.files });
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
  // What Story details shows: the why and detail as typed into New story, or, for a conversation written by hand, its
  // first message as sent; the files with it; who wrote it and when.
  const created = entries.find((e) => e.kind === "created");
  const storyEntry = entries.find((e) => e.kind === "message" && e.author.kind === "person");
  const brief: StoryBrief = {
    ref,
    title: story.title,
    column: columnLabel(state.status),
    why: story.why,
    detail: story.detail,
    ask:
      !story.why && !story.detail && storyEntry?.kind === "message" && storyEntry.text && storyEntry.text.join("") !== titleOnlyAsk(story.title)
        ? storyEntry.text
        : undefined,
    files: storyEntry?.kind === "message" ? storyEntry.files : undefined,
    writtenBy: created?.kind === "created" ? (created.by.kind === "agent" ? "the agent" : created.by.name) : undefined,
    writtenAt: created?.at,
    owner: ownerName,
    source: facts.source,
    repository: facts.repository,
  };
  // A long story shows in the chat as its "why" and a card that opens Story details (Shubham, 26 Nov).
  const card = storyEntry ? storyCardFor(brief) : null;
  const storyCard = card && storyEntry ? { entryId: storyEntry.id, ...card } : undefined;
  const actions = {
    // Done from In review: there was nothing to merge. A story with code is done when its pull request is merged.
    accept: () => {
      withUndo(`${ref} marked Done.`);
      move({ status: "done" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Marked Done by you · nothing to merge" });
      log({ kind: "stage", title: "Marked Done by you", state: "info", detail: "", move: { from: columnLabel(state.status), to: "Done" } });
    },
    // The review is done: the PM opens the pull request on GitHub (or updates the open one), and it goes to the one
    // person with GitHub access to check and merge. Robots never merge.
    createPr: () => {
      // Main moved on under a story still in review: compare first, and say so if something conflicts.
      if (main.onPush && main.behind.length) return checkBeforePr();
      const updating = pr === "open";
      const number = pr === "merged" || pr === "closed" ? prNo + 1 : prNo;
      withUndo(`Pull request #${number} ${updating ? "updated" : "created"}. It’s with ${mergerFirst} to check and merge.`);
      setPr("open");
      setPrNo(number);
      setPrMerge("ready");
      setUnsent(0);
      move({ status: "pull_request" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: `Pull request ${updating ? "updated" : "created"} by you · the PM ${updating ? "updated" : "opened"} #${number} on GitHub, with ${mergerName} to merge` });
      log({ kind: "pr", title: `Pull request #${number}`, state: "done", detail: `Ready to merge · with ${mergerFirst}` });
      log({ kind: "stage", title: updating ? "Pull request updated by you" : "Pull request created by you", state: "info", detail: "", move: { from: "In review", to: "Pull request" } });
    },
    // Not merging after all: the pull request closes on GitHub and the story is closed, not merged.
    close: () => {
      withUndo(`Pull request #${prNo} closed without merging. ${ref} is closed.`);
      setPr("closed");
      move({ status: "done" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: `Pull request #${prNo} closed without merging, by you` });
      log({ kind: "pr", title: `Pull request #${prNo}`, state: "done", detail: "Closed without merging" });
      log({ kind: "stage", title: "Closed by you", state: "info", detail: "", move: { from: "Pull request", to: "Done" } });
    },
    approve: () => {
      withUndo(`${ref} approved. Builder starts building when it picks it up.`);
      settlePlan();
      runBuild(state.status === "new" ? "Approved by you" : "Plan approved by you");
    },
    defaults: () => {
      withUndo(`Defaults kept for ${ref}, and it’s approved.`);
      // Each open question takes what it said happens with no answer (its fallback), else its first option.
      setEntries((es) => es.map((e) => (e.kind === "question" && !e.answer ? { ...e, answer: { option: e.fallback?.option ?? 0, by: "Default", at: "Just now" }, fresh: true } : e)));
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
    // Not yours to decide: the decision goes to a teammate, and the story is paused for you until they act or you take
    // it back. Only the turn moves; the owner stays.
    handoff: (initials: string) => {
      const p = data.people.find((x) => x.initials === initials);
      const what = state.need ? HANDOFF[state.need] : undefined;
      if (!p || !state.need || !what) return;
      withUndo(`${ref} sent to ${p.name}. It’s paused for you until ${firstName(p)} ${what.until}.`);
      setHandoff({ name: p.name, initials: p.initials, need: state.need });
      move({ ...state, waitingOn: p.name });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: `Sent to ${p.name} by you, to ${what.to}` });
      log({ kind: "stage", title: `Sent to ${p.name}`, state: "info", detail: `To ${what.to}. Paused for you until then.` });
    },
    takeBack: () => {
      if (!handedTo) return;
      setHandoff(null);
      move({ ...state, waitingOn: "You" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: `Taken back from ${handedTo.name} by you` });
      log({ kind: "stage", title: `Taken back from ${handedTo.name}`, state: "info", detail: "It’s your decision again." });
      dropUndo(); // the send's Undo would only do the same now
      showToast(`${ref} is back with you.`);
    },
    // These hand over to the message box, which comes back in the decision's place.
    changes: () => {
      setRebuild(true);
      writeFirst();
    },
    write: () => {
      setRebuild(false);
      writeFirst();
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
    holdScroll.current = Date.now() + 1200;
    requestAnimationFrame(() => document.querySelector(`[data-entry="${id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  };

  /** Every move is checked against the story as it is, not as this page last showed it (statuses guide §7). If a
   *  teammate changed it first, nothing is applied and this says why. */
  const refuse = (verb: string) =>
    pending ? `Couldn’t ${verb}: ${mateFirst} ${pending.to === "planning" ? "moved it back to Planning" : "approved it again"} ${ago(Date.now(), pending.at)}.` : null;
  const guard = (verb: string, fn: () => void) => {
    const why = refuse(verb);
    if (!why) return fn();
    setRefusal(why); // shown on the decision card in the chat, where the button was
  };
  // The decision's buttons, each checked when pressed (closures, so nothing runs while the page renders).
  const act = {
    accept: () => guard("mark it Done", actions.accept),
    createPr: () => guard("create the pull request", actions.createPr),
    approve: () => guard("approve it", actions.approve),
    defaults: () => guard("approve it", actions.defaults),
    restart: () => guard("start it again", actions.restart),
    plan: () => guard("move it to Planning", actions.plan),
    cancel: () => guard("cancel it", actions.cancel),
    changes: () => guard("ask for changes", actions.changes),
    handoff: (initials: string) => guard("send it on", () => actions.handoff(initials)),
    takeBack: () => guard("take it back", actions.takeBack),
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
    else if (to === "pull_request") actions.createPr();
    else if (to === "close") actions.close();
    else if (to === "done") actions.accept();
    else if (to === "planning") actions.plan();
    // Approved: build, rebuild, reopen or try again, depending on where the story is.
    else if (state.status === "new" || state.status === "planning") actions.approve();
    else if (state.status === "in_review" || state.status === "pull_request") {
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

  // The story that merged first, by name ("hq-25 (Phone sign-up and verification code)"), for the conflict card.
  const mergedFirst = main.behind.map((id) => `hq-${id}${data.stories.some((x) => x.id === id) ? ` (${data.stories.find((x) => x.id === id)?.title})` : ""}`).join(", ");
  // Who a decision can be sent to: everyone on the team but you.
  const teammates = data.people.filter((p) => p.id !== data.viewer.id);
  // "Needs your OK": what's waiting on the viewer, as the conversation's last card.
  const ask: AskCard | null = busy
    ? null
    : state.need === "stuck"
      ? {
          label: "Stopped",
          tone: "stuck",
          title: "The preview couldn’t start",
          meta: "Approve it again for a new build from the story as it is now, or write a note.",
          primary: { label: "Try again", onClick: act.restart },
        }
      : state.status === "pull_request" && prMerge === "blocked"
        ? {
            label: "Stuck",
            tone: "stuck",
            title: `Couldn’t update pull request #${prNo}`,
            meta: `GitHub refused it: CraftHQ can’t write to the repository. ${unsent} ${unsent === 1 ? "update is" : "updates are"} saved here (the latest main brought in, checks passed), but GitHub still shows the older version. Reconnect GitHub with write access and they’re sent straight away.`,
            primary: { label: "Reconnect GitHub", onClick: sendToGitHub },
          }
      : pushConflict && state.status === "in_review"
        ? {
            label: "Conflict with main",
            title: `${refsOf(main.behind)} changed the same lines`,
            meta: `${mergedFirst} was merged into main while this story was in review, and it changes ${main.clashes ?? 0} places this story changes too. Nothing was sent to GitHub. Both changes can stay: Developer keeps both, Tester runs every check again, then the pull request is created and goes to ${mergerFirst} to merge.`,
            move: { from: "In review", to: "Pull request" },
            primary: { label: "Settle and create pull request", onClick: settleThenPr },
            secondary: { label: "Not now", onClick: () => setPushConflict(false) },
          }
      : !isYours(state)
        ? null
        : state.need === "review"
          ? {
              label: "Needs your OK",
              title: `${story.title} · ready for review`,
              // Anyone on the story can review; the pull request goes to the one person with GitHub access.
              meta: `${facts.checks.line} · verified by Checker. Try the preview; when it’s right, ${pr === "open" ? `update pull request #${prNo}` : "create the pull request"} and ${mergerName === "you" ? "you merge it" : `${mergerFirst} merges it`} on GitHub.`,
              move: { from: "In review", to: "Pull request" },
              primary: { label: pr === "open" ? "Update pull request" : "Create pull request", onClick: act.createPr },
              secondary: { label: "Ask for changes", onClick: act.changes },
              handoff: { people: teammates, onSend: act.handoff },
            }
          : state.need === "planning"
            ? {
                label: "Needs your OK",
                title: "The plan is ready",
                meta: "Read it, then approve it. Nothing is built until you do.",
                move: { from: "Planning", to: "Approved" },
                primary: { label: "Approve and build", onClick: act.approve },
                secondary: { label: "Ask a question", onClick: actions.write },
                handoff: { people: teammates, onSend: act.handoff },
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
  // While a decision waits on you (the card above, or the agent's open question), it takes the message box's place, so
  // nothing is typed past it (Shubham, 26 Nov). Writing first is a choice: "Ask something first", "Ask for changes".
  const openQuestion =
    !busy && state.need === "decision" ? entries.find((e): e is Extract<ThreadEntry, { kind: "question" }> => e.kind === "question" && !e.answer) : undefined;
  const decisionKey = handedTo ? null : ask ? `ask:${ask.label}:${ask.title}` : openQuestion ? `question:${openQuestion.id}` : null;
  const docked = decisionKey !== null && writingFor !== decisionKey;
  function writeFirst() {
    setWritingFor(decisionKey);
    requestAnimationFrame(focusComposer);
  }
  const skipQuestion = state.need === "decision" && !busy ? (mainQuestion ? () => answer(mainQuestion, 0) : act.defaults) : undefined;

  // A refused button: the reason replaces the card's buttons, with a way to catch up.
  const askRefusal: AskRefusal | undefined = refusal ? { text: refusal, fix: { label: "See the change", onClick: catchUp } } : undefined;

  const send = ({ text, files: attached, rebuild: andRebuild }: { text: Segment[]; files: FileRef[]; rebuild: boolean }) => {
    setAtBottom(true);
    // Written, so a decision still waiting docks again.
    setWritingFor(null);
    // This chat is the robots'. People talk in Team (in Messages), so nothing written here goes to a person.
    add({ kind: "message", id: nextId("me"), at: "Just now", author: me, text: text.length ? text : undefined, files: attached });
    // A closed story keeps the note, but the agent doesn't answer it (statuses guide §6).
    if (state.status === "done" || state.status === "cancelled") return;
    // You only talk to the PM: it passes your note to the robot holding the story, and says so.
    const holder = state.status === "new" || state.status === "planning" ? "Asker" : "Builder";
    // While the agent holds a build, a note is read after the round; it never redirects the work (§4).
    if (job) {
      notesDuringJob.current += 1;
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: `PM passes your note to ${holder} when this round ends` });
      return;
    }
    // A note, then Approved: refused if a teammate moved the story first (the note itself stays).
    if (andRebuild && pending) {
      setRefusal(refuse("rebuild it"));
      return;
    }
    add({ kind: "stage", id: nextId("stage"), at: "Just now", text: `PM passed your note to ${holder}` });
    // A note, then Approved: the change request (§5).
    if (andRebuild) {
      setRebuild(false);
      runBuild("Approved again by you · rebuild with your note");
      return;
    }
    const words = text.map((seg) => (typeof seg === "string" ? seg : seg.type === "person" ? seg.name : seg.type === "agent" ? "agent" : `hq-${seg.id}`)).join(" ");
    const built = state.status === "in_review" || state.status === "pull_request";
    // About main or the pull request: answered where the story is, never bounced to Approved.
    if (built && ABOUT_MAIN.test(words)) {
      answerAboutMain();
      return;
    }
    // Asked for a page edit, screenshots, markup or a preview: the agent does it, and the log shows it live.
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
      state.status === "in_review" || state.status === "pull_request"
        ? "Thanks, I’ve read it. A note here never changes the code. To have it built, switch on “Rebuild after sending” and send it again, or pick Building under Status."
        : state.need === "stuck"
          ? "Thanks, noted. To build again with it, choose Try again: a new build reads the story as it is now."
          : "Thanks, noted. I’ll take it into account and reply here if I need anything from you.",
    );
  };

  const answer = (entryId: string, option: number, text?: string) => {
    const updated = entries.map((e) =>
      e.id === entryId && e.kind === "question" ? { ...e, answer: { option, by: data.viewer.name, at: "Just now", ...(text ? { text } : {}) }, fresh: true } : e,
    );
    setEntries(updated);
    if (entryId === mainQuestion) {
      answerRemoval(option);
      return;
    }
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


  const suggestions = busy
    ? []
    : isYours(state) && state.need
      ? (SUGGESTIONS[state.need] ?? [])
      : working
        ? (SUGGESTIONS.working ?? [])
        : [];
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
      case "pull_request":
        return busy ? "A note gets a reply and never changes the pull request." : undefined; // the Rebuild switch says it
      default:
        return "This story is closed, so the agent won’t answer. To talk about it with your team, use Messages.";
    }
  })();

  // hq-35's demo (Shubham, 26 Nov): the live story's 17–25 Nov, replayed and handled the new way, one step at a time.
  const demoSteps: MainDemoStep[] = [
    {
      label: "You review it: “all good, update the PR”",
      live: "Live: Aakash wrote “all good pls update the pr”. Here it’s one button on the card.",
      run: () => {
        setDemoAt(1);
        act.createPr();
      },
    },
    {
      label: "hq-8 and hq-12 merge into main",
      live: "Live: Aakash asked “does it clash with main?” again and again, and got 37, 13, none and 21.",
      run: () => {
        setDemoAt(2);
        updateFromMain({ behind: [8, 12], clashes: 13 });
      },
    },
    {
      label: "You ask: “does it clash with main?”",
      live: "Live: “This story is in review, move it back to Approved”, four times.",
      run: () => {
        setDemoAt(3);
        send({ text: ["does it clash with main?"], files: [], rebuild: false });
      },
    },
    {
      label: "hq-1 merges, and GitHub refuses the update",
      live: "Live: “Ready for your review”, while PR #38 never changed.",
      run: () => {
        setDemoAt(4);
        updateFromMain({ behind: [1], clashes: 0, refused: true });
      },
    },
    {
      label: "hq-5 merges and removes the Home events list",
      live: "Live: decision #127. The PM asks only when main changes what the story needs.",
      run: () => {
        setDemoAt(5);
        askAboutRemoval();
      },
    },
  ];
  const demoWait = busy
    ? "Watch the chat and Activity…"
    : prMerge === "blocked" && state.status === "pull_request"
      ? "Press Reconnect GitHub on the card first."
      : mainQuestion
        ? "Answer the question in the chat."
        : job
          ? "Wait for the rebuild to finish."
          : undefined;

  // For the activity column: what the viewer has to decide now (its evidence says "Waiting on you"), and a
  // preview that's starting or running, whose Stop must always be on a sharp surface.
  const yours = !busy && isYours(state) ? state.need : undefined;
  const runningPreview = livePreview(activity);
  // The status moves, for ⋯ and the Status section: an open pull request's move reads "Update pull request #N", and
  // with a teammate it's paused for you, Cancel too (it's on while a robot builds, but not here).
  const statusMoveList = statusMoves(state.status, state.need === "stuck")
    .map((mv) => (mv.move === "pull_request" && pr === "open" ? { ...mv, label: `Update pull request #${prNo}` } : mv))
    .filter((mv) => !handedTo || mv.move !== "cancelled");
  // What the agent suggests doing now: the decision card's main button, when it's your turn.
  const suggestedMove: StatusMove | undefined =
    busy || !isYours(state)
      ? undefined
      : state.need === "planning" || state.need === "stuck"
        ? "approved"
        : state.need === "review"
          ? "pull_request"
          : state.need === "triage"
            ? "planning"
            : undefined;
  // The Status section, first on the right (Shubham, 26 Nov): the five stages, where the story is, and the moves.
  // The Status tab's picker (Shubham, 26 Nov: "users are used to changing the status"): whose turn it is, said in the
  // box; what's under way, under the status; and what a note does now.
  const turn: Turn =
    state.need === "stuck"
      ? { kind: "stuck" }
      : isYours(state)
        ? { kind: "you" }
        : state.need && state.waitingOn
          ? { kind: "other", name: state.waitingOn.split(" ")[0] }
          : // Waiting to be merged: the status line already says "With Deepak" then (not while the robots update it).
            state.status === "pull_request" && status.turn
            ? { kind: "other", name: mergerFirst }
            : working || job === "building" || job === "verifying"
              ? { kind: "working" }
              : { kind: "none" };
  // For the Status tab's rough estimate of how long the robots still need: their run under way (the live line's phase
  // and start), or the queue before Builder picks it up.
  const robotRun: RobotRun | undefined =
    live?.kind === "working" && live.phase
      ? { phase: live.phase, since: live.since }
      : job === "starting" || (state.status === "approved" && !job && state.need !== "stuck")
        ? { queued: true }
        : undefined;
  const pickerDetail =
    // A finished story says how it ended; otherwise what's happening, or what the stage is waiting for.
    state.status === "done"
      ? pr === "merged"
        ? "Merged into main"
        : pr === "closed"
          ? "Closed, not merged"
          : "Nothing to merge"
      : state.status === "cancelled"
        ? "Nothing more will happen"
        : state.need === "stuck"
          ? "The preview couldn’t start" // the tag already says Stopped
          : state.status === "approved" && !job
            ? "Builder picks it up next" // the box already says Queued
            : (status.detail ??
          (state.need === "planning"
            ? "The plan is ready to read"
            : state.need === "decision"
              ? "Questions to answer before the plan"
              : state.need === "review"
                ? "Built and checked · try the preview"
                : state.need === "triage"
                  ? "Plan it, or cancel it"
                  : state.status === "new"
                    ? "Not planned yet"
                    : undefined));
  // No "what a note does" line in Status (Shubham, 26 Nov: not under the box, not here); the composer keeps it for screen
  // readers only.
  // ---- Decisions (Shubham, 26 Nov): kept for good, so a misunderstanding or a debate can be settled. People make
  // them directly (answers, approvals, messages saved as decisions); nothing here waits on an agent. ----
  const decisions = decisionsFrom(entries, savedDecisions, data.viewer.name);
  const savedIds = new Set(savedDecisions.flatMap((d) => (d.entryId && !d.replaces ? [d.entryId] : [])));
  const openQuestions = entries.flatMap((e) => (e.kind === "question" && !e.answer ? [{ id: e.id, question: e.question }] : []));
  const inChat = (id: string) => entries.some((e) => e.id === id);
  /** "See in chat": the chat scrolls to the entry and tints it. An open question waiting in the message box's place
   *  isn't in the chat itself, so it goes to the foot, where the question is. */
  const seeEntry = (id: string) => {
    setCornerOpen(false);
    setHighlight(undefined);
    requestAnimationFrame(() => {
      setHighlight(id);
      const el = document.querySelector(`[data-entry="${id}"]`);
      if (el) {
        holdScroll.current = Date.now() + 1200;
        setAtBottom(false);
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      } else {
        setAtBottom(true);
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }
    });
  };
  const saveDecision = (entryId: string, text: string, from: string) => {
    const id = nextId("decision");
    addDecision(story.id, { id, kind: "saved", text, by: data.viewer.name, at: "Today", ts: Date.now(), entryId, from });
    showToast("Saved as a decision. It’s listed on the right, for good.", { label: "Undo", run: () => removeDecision(story.id, id) });
  };
  const changeDecision = (d: Decision, text: string) => {
    const id = nextId("decision");
    addDecision(story.id, { id, kind: "saved", text, by: data.viewer.name, at: "Today", ts: Date.now(), entryId: d.entryId, question: d.question, replaces: d.id });
    showToast("Decision changed. The old one stays, crossed out.", { label: "Undo", run: () => removeDecision(story.id, id) });
  };
  const decisionsPanel = (boxed: boolean) => (
    <StoryDecisions decisions={decisions} open={openQuestions} onSee={seeEntry} inChat={inChat} onChange={changeDecision} boxed={boxed} />
  );
  // Everything attached in the chat, for Files; a file opens the message it came with.
  const chatFiles: ChatFile[] = entries.flatMap((e) => (e.kind === "message" && e.files ? e.files.map((file, i) => ({ key: `${e.id}-${i}`, entryId: e.id, file })) : []));
  const changeTab = (t: PanelTab) => {
    setTab(t);
    const url = new URL(window.location.href);
    if (t === "status") url.searchParams.delete("tab");
    else url.searchParams.set("tab", t);
    window.history.replaceState(window.history.state, "", url);
  };
  /** A decision's "Read more in the plan": the Pages box (opened, if it was folded) or the Output tab, wherever the
   *  pages are at this width. */
  const openOutput = () => {
    changeTab("output");
    if (window.matchMedia("(min-width: 1024px)").matches) {
      openSection("pages");
      requestAnimationFrame(() => document.getElementById("story-box-pages")?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    } else if (window.matchMedia("(min-width: 768px) and (max-width: 1023.98px)").matches) setCornerOpen(true);
    else if (window.matchMedia("(max-width: 767.98px)").matches) {
      const fold = document.querySelector<HTMLDetailsElement>('[data-tour="fold"]');
      if (fold) {
        fold.open = true;
        fold.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }
  };
  // Output: what's running and what was made, then the files attached after the story was written (the story's own
  // files are in Story details).
  const outputFiles = chatFiles.filter((f) => f.entryId !== storyEntry?.id);
  // No Story tab (Shubham, 27 Nov): what was written opens in Story details, from the title. Output is always there: its
  // parts are defined up front and say what's in them or when it comes (Shubham, 27 Nov).
  const shownTabs: PanelTab[] = ["status", "output", "history"];
  const openTab: PanelTab = shownTabs.includes(tab) ? tab : "status";
  // A tab you're not on says when it needs you, or while something is being made there.
  const tabDots: Partial<Record<PanelTab, "yours" | "busy">> = {
    status: yours ? "yours" : undefined,
    output: anyWorking(activity) ? "busy" : undefined,
  };
  // What the right-hand side holds, in this order: today's status, what's been decided (Shubham, 26 Nov: both, the
  // first thing you see), what was made, and the history. `boxed`: from 1024 px each is a white box of its own that
  // folds (Shubham, 27 Nov); below that they're the tabs' contents.
  const statusPicker = (boxed: boolean) => (
    <StatusPicker
      status={state.status}
      need={state.need}
      turn={turn}
      detail={pickerDetail}
      robotRun={robotRun}
      dot={status.dot}
      moves={statusMoveList}
      // Not twice: while the decision is showing in the chat, the chat holds its button.
      suggested={docked ? undefined : suggestedMove}
      suggestedLabel={ask?.primary?.label}
      locked={locked}
      merger={mergerFirst === "you" ? "You" : mergerFirst}
      onMove={changeStatus}
      onGuide={() => setGuideOpen(true)}
      boxed={boxed}
    />
  );
  const outputs = (boxed: boolean) => (
    <StoryRail
      activity={activity}
      status={state.status}
      yours={yours}
      restartInChat={state.need === "stuck"}
      preview={preview}
      onSoon={(m) => showToast(m)}
      files={outputFiles}
      onOpenFile={seeEntry}
      boxed={boxed}
    />
  );
  const historyList = <HistoryList entries={entries} onSee={seeEntry} />;
  // Below 1024 px (the tablet's corner card, the phone's fold) they're tabs (Shubham, 26 Nov), so the fold stays short:
  // Status with the decisions under it, Output, History.
  const panelTabs = () => (
    <PanelTabs
      tab={openTab}
      shown={shownTabs}
      onTab={changeTab}
      dots={tabDots}
      bodyClassName="pt-4"
      content={{
        status: (
          <div className="flex flex-col gap-6 px-1">
            {statusPicker(false)}
            <div className="border-t border-[var(--line)] pt-4">{decisionsPanel(false)}</div>
          </div>
        ),
        // No side padding of its own: the rows reach the edges, so a preview's line keeps one row.
        output: outputs(false),
        history: <div className="px-1">{historyList}</div>,
      }}
    />
  );
  // From 1024 px there are no tabs: a link to one (?tab=output, ?tab=history) scrolls to its box instead, once.
  const arrivedOn = useRef<PanelTab | null>(openTab);
  useEffect(() => {
    if (!wide || !arrivedOn.current) return;
    if (arrivedOn.current !== "status") document.getElementById(`story-box-${arrivedOn.current}`)?.scrollIntoView({ block: "start" });
    arrivedOn.current = null;
  }, [wide]);
  // The way back and ⋯ (one of each: they sit over the chat below 1024 px and at the top of the right-hand side from it).
  const backLink = (
    <Tip label="All stories">
      <a href="/stories" aria-label="All stories" className={`${ICON_BTN} -ml-2`}>
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
      </a>
    </Tip>
  );
  const moreMenu = (
    // ⋯ (DESIGN.md §4.5): Story details, Previous, Next and Copy link, then the status moves. The everyday next step is
    // the chat's decision.
    <StatusMenu
      links={[
        { label: "Story details", icon: FileText, onSelect: () => setDetailsOpen(true) },
        { label: smart ? "Previous that needs you" : "Previous story", icon: ChevronLeft, hint: prev ? storyRef(prev.id) : undefined, disabled: !prev, onSelect: () => prev && window.location.assign(`/stories/${storyRef(prev.id)}`) },
        { label: smart ? "Next that needs you" : "Next story", icon: ChevronRight, hint: next ? storyRef(next.id) : undefined, disabled: !next, onSelect: () => next && window.location.assign(`/stories/${storyRef(next.id)}`) },
        { label: "Copy link", icon: LinkIcon, onSelect: copyLink },
      ]}
      moves={statusMoveList}
      locked={locked}
      onMove={changeStatus}
      onCatchUp={catchUp}
      storyLabel={ref}
    />
  );


  return (
    <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
      {/* Desktop: Ask PM's frame (Shubham, 25 Nov). A soft wash behind floating cards, cool at the top left and warm at
          the bottom right; the chat with the agent is the main card and fills the rest of the screen (23 Nov). No
          stories list beside it (Shubham, 26 Nov): ← goes to the board, and ⋯ has Previous and Next. The activity is always in view from 1024 px, a card on the right like Ask's side panel (Shubham, 25 Nov: "don't
          hide it"); at 768–1023 px it opens from the icon in the header's corner, over the chat. The chat scrolls on
          its own, and the message box stays pinned under the conversation. `relative` makes the frame hold everything
          absolutely positioned inside it (screen-reader text too), so nothing can stretch the page past the window.
          Phones scroll as one white page, the activity folded under "Activity". */}
      <main
        id="main"
        className="md:relative md:flex md:h-[calc(100dvh-var(--bar-h))] md:overflow-hidden md:p-2 md:[background:radial-gradient(60%_55%_at_0%_0%,#E9EEFA_0%,transparent_70%),radial-gradient(55%_60%_at_100%_100%,#FBE3D6_0%,transparent_72%),#F4F4F6] lg:p-4"
      >
        {/* The activity column's one announcement line: finishes only (the chat already says when work starts). */}
        <p role="status" className="sr-only">
          {said}
        </p>
        {/* The builder: the conversation where the story is planned, built and changed. */}
        <div className="px-4 pt-4 pb-6 md:flex md:min-h-0 md:min-w-0 md:flex-1 md:flex-col md:overflow-hidden md:rounded-[24px] md:bg-white md:p-0 md:ring-1 md:ring-black/[0.06]">
          {/* One quiet row across the top of the card, like Ask PM's title row (Shubham, 25 Nov: simpler): the way back,
              the story's name with its ID and its status (said once, here), then ⋯, which also holds Previous, Next and
              Copy link. Phones: the way back, the status and the buttons, then the name on its own row. */}
          {/* One quiet row across the top of the chat (Shubham, 26 Nov: the story's name, ID and status stay here, over
              the chat, at every width): the way back, the name with its ID and status, then ⋯. Phones: the way back, the
              status and ⋯, then the name on its own row. */}
          <header className="flex flex-none flex-wrap items-center gap-x-2 gap-y-1.5 md:px-5 md:py-3 lg:h-14 lg:flex-nowrap lg:py-0">
            {backLink}
            {/* The name opens Story details: the title in full and everything that was written (Shubham, 26 Nov). */}
            <h1 className="order-3 m-0 flex min-w-0 basis-full text-xl font-semibold tracking-title text-[var(--tx)] lg:order-none lg:basis-auto">
              {/* The full name stays in the tooltip, as wherever a title is cut (DESIGN.md §3.2). */}
              <Tip
                side="bottom"
                label={
                  <>
                    {story.title}
                    <span className="mt-0.5 block text-white/70">Open story details</span>
                  </>
                }
              >
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setDetailsOpen(true)}
                  // A soft highlight behind the title on hover, no underline (Shubham, 27 Nov).
                  className="-mx-1.5 min-w-0 rounded-[8px] px-1.5 text-left transition-colors duration-[120ms] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary lg:truncate"
                >
                  {story.title}
                </button>
              </Tip>
            </h1>
            <span className="inline-flex h-5 flex-none items-center rounded-md bg-field px-1.5 font-mono text-xs text-[var(--tx2)]">{ref}</span>
            <StatusBadge status={state.status} detail={status.detail ?? status.turn} dot={status.dot} />
            <span aria-hidden="true" className="hidden flex-1 lg:block" />
            <span className="ml-auto flex flex-none items-center gap-1 lg:ml-0">
              {moreMenu}
              {/* 768–1023 px, where there's no room for the card beside the chat: one icon in the corner that lights up
                  while something is happening and opens into the same tabs, over the chat. */}
              <span className="ml-1 flex max-md:hidden lg:hidden">
                <ActivityCorner
                  items={activity}
                  yours={yours}
                  open={cornerOpen}
                  onOpenChange={setCornerOpen}
                >
                  <div className="pt-1">{panelTabs()}</div>
                </ActivityCorner>
              </span>
            </span>
          </header>

          {!wide && (
            <details data-tour="fold" className="group peer mt-3 rounded-[12px] border border-[var(--card-line)] px-4 md:hidden">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-2 [&::-webkit-details-marker]:hidden">
                <ActivitySummary items={activity} yours={yours} />
              </summary>
              <div className="pt-1 pb-4">{panelTabs()}</div>
            </details>
          )}
          {/* Phones, with Activity closed: a running preview's Stop stays one tap away. */}
          {runningPreview && (
            <div className="mt-2 flex h-12 items-center rounded-xl border border-[var(--card-line)] bg-white pr-1.5 pl-3 peer-open:hidden md:hidden">
              <PreviewRow item={runningPreview} preview={preview} onSoon={(m) => showToast(m)} />
            </div>
          )}

          {/* Under the header: the conversation with the agent. */}
          <div className="md:relative md:flex md:min-h-0 md:min-w-0 md:flex-1">
          {/* data-tour: the first-visit tour (StoryTour) points at these parts. */}
          <section aria-label="Conversation" data-tour="chat" className="mt-3 flex min-w-0 flex-1 flex-col md:mt-0 md:min-h-0">
            {/* hq-35's demo: a slim strip at the top of the chat, covering nothing. */}
            {story.id === 35 && (
              <div className={`mb-1 flex-none md:pt-3 ${BOX_COLUMN}`}>
                <MainDemo steps={demoSteps} at={demoAt} wait={demoWait} />
              </div>
            )}
            {/* A teammate changed this story: one banner, until you've seen it. */}
            {banner && (
              <div className={`mb-1 flex-none ${COLUMN}`}>
                <TeammateBanner change={banner} onSee={seeChange} onDismiss={() => setBanner(null)} />
              </div>
            )}
            <div className="relative flex min-h-0 flex-1 flex-col">
            {/* Older messages fade out under the box's header, as newer ones do under the message box. */}
            <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-6 md:block ${chat.fadeTop}`} />
            <div
              ref={scrollRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
              }}
              className={`md:min-h-0 md:flex-1 md:overflow-y-auto ${chat.transcript}`}
            >
              {/* The scroll area is the whole sheet, so the wheel works anywhere over it; the messages sit in the reading
                  column and bubbles keep their own width. Always readable: a decision is a card at the end of the
                  chat, never in front of it (Shubham, 25 Nov). */}
              <div className={`pt-3 ${COLUMN}`}>
                <StoryThread
                  entries={entries}
                  stories={data.stories}
                  viewerInitials={data.viewer.initials}
                  live={live}
                  ask={ask}
                  refusal={askRefusal}
                  onAnswer={answer}
                  onSkipQuestion={skipQuestion}
                  onReadMore={openOutput}
                  highlight={highlight}
                  storyCard={storyCard}
                  onReadStory={() => setDetailsOpen(true)}
                  docked={docked}
                  onSaveDecision={saveDecision}
                  savedIds={savedIds}
                />
              </div>
            </div>

            <div data-tour="box" className={`sticky bottom-0 flex-none bg-white pt-2 pb-4 ${BOX_COLUMN}`}>
              {/* Messages fade out as they pass under the box. */}
              <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 -top-10 h-10 ${chat.fade}`} />
              {!atBottom && (
                <button
                  type="button"
                  onClick={() => {
                    setAtBottom(true);
                    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
                  }}
                  className={`absolute -top-12 left-1/2 z-10 inline-flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border border-[var(--card-line)] bg-white px-3 text-sm font-medium ${chat.enter}`}
                >
                  <ArrowDown aria-hidden="true" size={14} strokeWidth={2} />
                  Jump to latest
                </button>
              )}
              {/* The message box, the decision in its place, or who it's with: one gives way to the next with a cross-fade
                  (Shubham, 27 Nov: everything that opens should be smooth). The one leaving is lifted out (popLayout) and
                  fades where it was; the decision brings its own rise (DecisionDock). Nothing moves on the first paint. */}
              <AnimatePresence initial={false} mode="popLayout">
              {handedTo ? (
                // Sent to a teammate: the message box gives way to who has it, until they act or you take it back.
                <motion.div key="handed" {...(reduce ? SWAP_FADE : SWAP)}>
                  {/* Narrow screens: the words get the row, and Take it back goes under them, full width. */}
                  <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2.5 rounded-[20px] border border-[var(--card-line)] bg-[#FAFAFA] py-2.5 pr-2.5 pl-4 max-sm:p-3">
                    <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
                      <PersonAvatar initials={handedTo.initials} size={24} />
                      <p className="m-0 min-w-0 flex-1 text-sm text-[var(--tx)]">
                        <span className="font-medium">With {handedTo.name}</span>
                        <span className="text-[var(--tx2)]">
                          {" "}
                          · paused for you until {handedFirst} {HANDOFF[handedTo.need]?.until ?? "acts"}
                        </span>
                      </p>
                    </div>
                    <button type="button" onClick={act.takeBack} className={`${BTN_SECONDARY} max-sm:w-full`}>
                      Take it back
                    </button>
                  </div>
                </motion.div>
              ) : docked ? (
                <motion.div key={`dock:${decisionKey}`} exit={SWAP.exit}>
                  <DecisionDock seen={decisionKey ?? undefined} ask={ask} question={openQuestion} refusal={askRefusal} onAnswer={answer} onSkip={skipQuestion} onWrite={actions.write} onReadMore={openOutput} />
                </motion.div>
              ) : (
              <motion.div key="box" {...(reduce ? SWAP_FADE : SWAP)}>
                {/* Writing first, with a decision still waiting: the way back to it. */}
                {decisionKey && (
                  <button
                    type="button"
                    onClick={() => {
                      // Back without writing: whatever "Ask for changes" switched on goes off again.
                      setRebuild(false);
                      setWritingFor(null);
                    }}
                    className="mb-2 inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/5 hover:text-[var(--tx)]"
                  >
                    <ArrowLeft aria-hidden="true" size={12} strokeWidth={2} />
                    Back to the decision
                  </button>
                )}
                <StoryComposer
                  storyId={story.id}
                  people={data.people}
                  stories={data.stories}
                  canRebuild={(state.status === "in_review" || state.status === "pull_request") && !busy}
                  rebuild={rebuild}
                  onRebuildChange={setRebuild}
                  suggestions={suggestions}
                  // The suggested next message, faint in the empty box, Tab to use it (Shubham, 27 Nov: as Claude does).
                  // Only once the robot is done (its reply written in), never while it reads or works.
                  suggestFrom={
                    working
                      ? null
                      : { status: state.status, need: state.need, waitingOn: state.waitingOn, entries, viewerInitials: data.viewer.initials, prNo, merger: mergerFirst }
                  }
                  hint={noteHint}
                  viewerName={data.viewer.name}
                  onSend={send}
                />
              </motion.div>
              )}
              </AnimatePresence>
            </div>
            </div>
          </section>
          </div>
        </div>

        {/* Beside the chat from 1024 px: white boxes on the page's wash, one under the other, in place of one tall card
            with tabs (Shubham, 27 Nov: "the status as a first white box, then Decisions, then pages in a second box, then
            preview", and "Decisions is also a separate part, and for all the sections there will be a collapsible
            icon"). Every section is a box of its own with a fold icon (PanelSection): Status, Decisions, then what was
            made (Pages, Preview, Code, Files), then History. As wide as Ask PM's side panel (300 px, 320 px from 1280);
            the column scrolls, its top in line with the chat card's. No Team here (Shubham, 26 Nov): people talk in
            Messages. */}
        {wide && (
          <aside data-tour="panel" aria-label="Status, decisions, output and history" className="hidden w-[300px] flex-none lg:ml-4 lg:flex xl:w-[320px]">
            {/* The scroll area is a pixel larger all round, so it doesn't clip the boxes' hairline rings (the same ring
                as the chat card's, so their edges line up). `relative` keeps the rows' screen-reader text inside it. */}
            <div className="relative -m-px flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-px">
              {statusPicker(true)}
              {decisionsPanel(true)}
              {outputs(true)}
              <PanelSection id="history" title="History" boxed>
                <div className="mt-2">{historyList}</div>
              </PanelSection>
            </div>
          </aside>
        )}
      </main>

      <Toast toast={toast} onDismiss={dismissToast} offsetRight="0px" />
      <CancelStoryDialog
        open={confirmCancel}
        onClose={closeConfirm}
        onConfirm={cancelRunning}
        storyLabel={ref}
        consequence="Builder stops and this build is thrown away."
      />
      <StatusGuide open={guideOpen} onClose={() => setGuideOpen(false)} merger={mergerName === "you" ? "You" : mergerName} />
      {/* A first visit, as a new person sees it (Shubham, 26 Nov): on hq-28, the first story in Planning, once a session. */}
      <StoryTour storyId={story.id} storyRef={ref} wide={wide} need={state.need} onStart={() => changeTab("status")} />
      <StoryDetails
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        brief={brief}
        stories={data.stories}
        onWriteNote={() => {
          setDetailsOpen(false);
          writeFirst();
        }}
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
