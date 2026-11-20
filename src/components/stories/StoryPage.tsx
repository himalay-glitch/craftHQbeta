import { useCallback, useEffect, useRef, useState } from "react";
import { Tooltip } from "radix-ui";
import { ArrowDown, ArrowLeft, ChevronLeft, ChevronRight, Link as LinkIcon } from "lucide-react";
import type { NeedKind, StoryStatus } from "@/types/dashboard";
import type { AskCard, Author, FileRef, LiveState, Segment, StoryItem, StoryPageData, ThreadEntry } from "@/types/stories";
import { BTN_SECONDARY, ICON_BTN } from "@/components/dashboard/classes";
import { storyRef } from "@/components/dashboard/format";
import { Tip } from "@/components/dashboard/Tip";
import { Toast, type ToastMessage } from "@/components/dashboard/Toast";
import chat from "./chat.module.css";
import { findCreated } from "./created";
import { Mascot } from "./Mascot";
import { COMPOSER_INPUT_ID, StoryComposer } from "./StoryComposer";
import { StoryRail } from "./StoryRail";
import { StoryThread } from "./StoryThread";
import { AGENT, buildFacts, buildThread, personFor } from "./thread";

interface State {
  status: StoryStatus;
  need?: NeedKind;
  waitingOn?: string;
}

const isYours = (s: State) => Boolean(s.need) && (s.waitingOn ?? "You") === "You";

/** What the agent is doing when nothing is happening on this page right now. */
function restingLive(s: State): LiveState | null {
  if (s.status === "cancelled") return { kind: "quiet", text: "Cancelled. Nothing more will happen." };
  if (s.status === "done") return { kind: "quiet", text: "Done · merged into main" };
  if (s.need === "stuck" || isYours(s)) return null; // the card says what's needed
  if (s.need) return { kind: "waiting", text: `Waiting on ${s.waitingOn}` };
  if (s.status === "in_progress") return { kind: "working", label: "Building the change" };
  if (s.status === "in_review") return { kind: "working", label: "Checking the work" };
  if (s.status === "planning") return { kind: "working", label: "Writing the plan" };
  if (s.status === "approved") return { kind: "quiet", text: "Approved · waiting to start" };
  return { kind: "working", label: "Reading your story" };
}

function turnWords(s: State) {
  if (s.status === "done") return "Accepted";
  if (s.status === "cancelled") return "Cancelled";
  if (s.need === "stuck") return "Stuck: not being picked up";
  if (isYours(s)) return "Your turn";
  if (s.need) return `Waiting on ${s.waitingOn}`;
  return "With the agent";
}

const SUGGESTIONS: Partial<Record<NeedKind | "working", string[]>> = {
  review: ["What changed since last time?", "How do I test it?", "Looks good to me"],
  planning: ["Explain the plan simply", "What could go wrong?"],
  next: ["Build the next step", "What’s left to do?"],
  decision: ["Which would you pick, and why?"],
  working: ["How’s it going?"],
};

// The build the agent runs after an approval, a restart or a change request (front end only).
// Steps read as a to-do list while it works (like a coding agent's plan); each ticks off when done.
const BUILD = [
  { step: "Read the plan", doing: "Reading the plan" },
  { step: "Make the change", doing: "Making the change" },
  { step: "Write the checks", doing: "Writing the checks" },
  { step: "Run every check", doing: "Running the checks" },
  { step: "Build the preview", doing: "Building the preview" },
];

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
  const [state, setState] = useState<State>({ status: story.status, need: story.need, waitingOn: story.waitingOn });
  const [changed, setChanged] = useState(false);
  const [busy, setBusy] = useState<LiveState | null>(null);
  const [rebuild, setRebuild] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastKey = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const firstScroll = useRef(true);

  const me: Author = { kind: "person", name: data.viewer.name, initials: data.viewer.initials };
  const owner = story.owner ? personFor(story.owner, data.people, data.viewer) : undefined;
  const ownerName = owner?.kind === "person" ? owner.name : undefined;
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

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const stopAgent = () => {
    timers.current.splice(0).forEach((t) => window.clearTimeout(t));
    setBusy(null);
  };
  const add = (...more: ThreadEntry[]) => setEntries((es) => [...es, ...more.map((e) => ({ ...e, fresh: true }))]);
  const move = (s: State) => {
    setState(s);
    setChanged(true);
  };
  const focusComposer = () => document.getElementById(COMPOSER_INPUT_ID)?.focus();

  /** The agent builds: thinks, then ticks through its steps live, then hands the story back for review. */
  const runBuild = (label: string) => {
    const runId = nextId("run");
    const step = 1500;
    move({ status: "in_progress" });
    add({ kind: "stage", id: nextId("stage"), at: "Just now", text: label });
    setBusy({ kind: "thinking" });
    later(1000, () => {
      add({ kind: "run", id: runId, at: "Just now", summary: "Building", steps: BUILD.map((b) => b.step), running: true, done: 0 });
      setBusy({ kind: "working", label: BUILD[0].doing });
    });
    BUILD.forEach((_, i) =>
      later(1000 + step * (i + 1), () => {
        setEntries((es) => es.map((e) => (e.id === runId && e.kind === "run" ? { ...e, done: i + 1 } : e)));
        setBusy({ kind: "working", label: BUILD[i + 1]?.doing ?? "Finishing up" });
      }),
    );
    later(1000 + step * (BUILD.length + 1), () => {
      setEntries((es) => es.map((e) => (e.id === runId && e.kind === "run" ? { ...e, running: false, summary: `Built · ${BUILD.length} steps` } : e)));
      add({
        kind: "message",
        id: nextId("agent"),
        at: "Just now",
        author: AGENT,
        report: {
          outcome: "Done. It’s ready for your review, and every check passed.",
          next: "Open the preview and try it, then accept it or ask for changes.",
        },
      });
      move({ status: "in_review", need: "review", waitingOn: "You" });
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

  const withUndo = (message: string) => {
    const before = { entries, state, changed };
    showToast(message, {
      label: "Undo",
      run: () => {
        stopAgent();
        setEntries(before.entries);
        setState(before.state);
        setChanged(before.changed);
      },
    });
  };

  const ref = storyRef(story.id);
  const actions = {
    accept: () => {
      withUndo(`${ref} accepted and moved to Done.`);
      move({ status: "done" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Accepted by you · merged into main" });
    },
    approve: () => {
      withUndo(`${ref} approved. The agent is building it.`);
      runBuild("Plan approved by you");
    },
    defaults: () => {
      withUndo(`Defaults kept for ${ref}, and it’s approved.`);
      setEntries((es) => es.map((e) => (e.kind === "question" && !e.answer ? { ...e, answer: { option: 0, by: "Default", at: "Just now" }, fresh: true } : e)));
      runBuild("Defaults kept · plan approved by you");
    },
    restart: () => {
      withUndo(`Restarting ${ref}.`);
      runBuild("Restarted by you");
    },
    plan: () => {
      withUndo(`${ref} moved to Planning.`);
      move({ status: "planning" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Moved to planning by you" });
      reply("I’ll write the plan and ask here if anything is unclear.");
    },
    cancel: () => {
      withUndo(`${ref} cancelled.`);
      move({ status: "cancelled" });
      add({ kind: "stage", id: nextId("stage"), at: "Just now", text: "Cancelled by you" });
    },
    changes: () => {
      setRebuild(true);
      focusComposer();
    },
    write: () => {
      setRebuild(false);
      focusComposer();
    },
  };

  // "Needs your OK": what's waiting on the viewer, as the conversation's last card.
  const ask: AskCard | null = busy
    ? null
    : state.need === "stuck"
      ? { label: "Stuck", title: "The preview couldn’t start", meta: "Restart it, or add a note if something has changed.", primary: { label: "Restart", onClick: actions.restart } }
      : !isYours(state)
        ? null
        : state.need === "review"
          ? {
              label: "Needs your OK",
              title: `${story.title} · ready for review`,
              meta: `${facts.checks.line} · preview ready`,
              primary: { label: "Accept · Done", onClick: actions.accept },
              secondary: { label: "Ask for changes", onClick: actions.changes },
            }
          : state.need === "planning"
            ? {
                label: "Needs your OK",
                title: "The plan is ready",
                meta: "Read it, then approve it to start the build.",
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
    if (andRebuild) {
      setRebuild(false);
      runBuild("Sent back to build by you");
      return;
    }
    reply(
      state.status === "in_review"
        ? "Thanks, I’ve read it. A note doesn’t change the code. If you want it changed, switch on “Rebuild after sending” and send it again."
        : "Thanks, noted. I’ll take it into account and reply here if I need anything from you.",
    );
  };

  const answer = (entryId: string, option: number) => {
    const updated = entries.map((e) => (e.id === entryId && e.kind === "question" ? { ...e, answer: { option, by: data.viewer.name, at: "Just now" }, fresh: true } : e));
    setEntries(updated);
    if (state.need === "decision" && !updated.some((e) => e.kind === "question" && !e.answer)) {
      move({ status: "planning" });
      reply("Thanks, that settles it. I’ll finish the plan with that and let you know when it’s ready.");
    }
  };

  const copyLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => showToast("Link copied."))
      .catch(() => showToast("Couldn’t copy the link. Copy it from the address bar."));
  };

  const suggestions = busy ? [] : isYours(state) && state.need ? (SUGGESTIONS[state.need] ?? []) : working ? (SUGGESTIONS.working ?? []) : [];

  const rail = (
    <StoryRail
      status={state.status}
      turn={turnWords(state)}
      facts={facts}
      owner={owner}
      updated={changed ? "Just now" : story.updated}
      files={files}
      onSoon={(m) => showToast(m)}
    />
  );

  return (
    <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
      {/* Desktop: fits the window. The conversation scrolls on its own with the message box pinned under it;
          the facts column scrolls on its own. Phones scroll as one page, facts folded under "Story details". */}
      <main
        id="main"
        className="mx-auto w-full max-w-[1344px] px-4 pt-4 pb-6 md:flex md:h-[calc(100dvh-var(--bar-h))] md:flex-col md:overflow-hidden md:px-8 md:pb-0"
      >
        <div className="flex flex-none items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px] leading-[18px] text-[var(--tx2)]">
            <a href="/stories" className="inline-flex items-center gap-1.5 rounded-[4px] hover:text-[var(--tx)]">
              <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.75} />
              Stories
            </a>
            <span aria-hidden="true">/</span>
            <span className="tabular-nums" aria-current="page">
              {ref}
            </span>
          </nav>
          <span className="flex items-center gap-0.5">
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
        </div>

        <div className="mt-1.5 flex flex-none flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="m-0 min-w-0 text-[22px] leading-7 font-semibold tracking-[-0.02em] text-[var(--tx)]">{story.title}</h1>
          {/* The agent's presence: is it working, or waiting on someone? */}
          <span className="inline-flex h-8 flex-none items-center gap-2 rounded-full border border-[var(--card-line)] bg-white pr-3 pl-1 text-[13px] leading-[18px] shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
            <Mascot size={24} />
            <span className="font-medium">Agent</span>
            <span aria-hidden="true" className={`size-1.5 rounded-full ${working ? "animate-pulse bg-[var(--green)] motion-reduce:animate-none" : isYours(state) ? "bg-[var(--cta)]" : "bg-[var(--ctl-h)]"}`} />
            <span className="text-[var(--tx2)]">{working ? "Working" : isYours(state) ? "Waiting on you" : turnWords(state)}</span>
          </span>
        </div>

        <details className="mt-3 rounded-[12px] border border-[var(--card-line)] px-4 md:hidden">
          <summary className="cursor-pointer py-3 text-[14px] font-medium">Story details</summary>
          {rail}
        </details>

        <div className="mt-3 md:flex md:min-h-0 md:flex-1 md:gap-8">
          <section aria-label="Conversation" className="relative flex min-w-0 flex-1 flex-col md:min-h-0">
            {/* Older messages fade out under the title, as newer ones do under the box. */}
            <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-6 md:block ${chat.fadeTop}`} />
            <div
              ref={scrollRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
              }}
              className={`md:min-h-0 md:flex-1 md:overflow-y-auto ${chat.transcript}`}
            >
              <div className="mx-auto max-w-[760px]">
                <StoryThread
                  entries={entries}
                  stories={data.stories}
                  viewerInitials={data.viewer.initials}
                  live={live}
                  ask={ask}
                  onAnswer={answer}
                  onSkipQuestion={state.need === "decision" && !busy ? actions.defaults : undefined}
                />
              </div>
            </div>

            <div className="sticky bottom-0 flex-none bg-white pb-4">
              {/* Messages fade out as they pass under the box. */}
              <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 -top-10 h-10 ${chat.fade}`} />
              {!atBottom && (
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
              <div className="mx-auto max-w-[760px]">
                <StoryComposer
                  storyId={story.id}
                  people={data.people}
                  stories={data.stories}
                  canRebuild={state.status === "in_review" && !busy}
                  rebuild={rebuild}
                  onRebuildChange={setRebuild}
                  suggestions={suggestions}
                  onSend={send}
                />
              </div>
            </div>
          </section>

          <aside aria-label="Story details" className="hidden md:block md:w-[320px] md:flex-none md:overflow-y-auto md:border-l md:border-[var(--line)] md:pb-6 md:pl-8">
            {rail}
          </aside>
        </div>
      </main>

      <Toast toast={toast} onDismiss={dismissToast} offsetRight="0px" />
    </Tooltip.Provider>
  );
}
