import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Tooltip } from "radix-ui";
import { CircleX, Clock, GitPullRequest, LoaderCircle, Plus, X } from "lucide-react";
import { ConnectAccountsModal } from "@/components/connect-accounts";
import type { DashboardData, DashboardStateOverride, NeedKind, Story, StoryStatus } from "@/types/dashboard";
import { BTN_SECONDARY } from "./classes";
import { clearStoryParam, readStoryParam, sortQueue, storyRef, URL_EVENT, writeStoryParam } from "./format";
import { ActivityPanel, type DetailsTab } from "./ActivityPanel";
import { AllClear } from "./AllClear";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { stuckReason, type DecisionOption, type DecisionReply } from "./decisions";
import { NeedsDeck } from "./NeedsDeck";
import { NeedsPanel } from "./NeedsPanel";
import { NewStoryPanel } from "./NewStoryPanel";
import { QueueMessage } from "./QueueMessage";
import { SetupBanner } from "./SetupBanner";
import { useConnectionSetup } from "./setup";
import { StoryPanel, type StoryAction } from "./StoryPanel";
import { StatPanel } from "./StatPanel";
import { Toast, type ToastMessage } from "./Toast";

// ---- Browser state read without effects (server render uses the fallback, then React switches) ----

const STATES = ["loading", "empty", "error"] as const;
const subscribeNever = () => () => {};
function useStateOverride(): DashboardStateOverride {
  return useSyncExternalStore(
    subscribeNever,
    () => {
      const value = new URLSearchParams(window.location.search).get("state");
      return (STATES as readonly string[]).includes(value ?? "") ? (value as DashboardStateOverride) : null;
    },
    () => null,
  );
}

function subscribeUrl(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(URL_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(URL_EVENT, onChange);
  };
}
const useUrlStory = () => useSyncExternalStore(subscribeUrl, () => readStoryParam(window.location.search), () => null);

const WIDE = "(min-width: 1024px)";
function useIsWide() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(WIDE);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
}

const visibleStoryButton = (id: number) =>
  Array.from(document.querySelectorAll<HTMLElement>(`[data-story="${id}"]`)).find((el) => el.offsetParent !== null);

const NOTICE_KEY = "crafthq.setupNotice.dismissed";

type LocalPanel = { kind: "details"; tab: DetailsTab } | { kind: "new" } | { kind: "needs" } | null;

/**
 * The dashboard island (DESIGN.md §5.6: what needs me, what's moving, what shipped), in three columns that fill
 * the width: Awaiting review and Need a fix on the left, Needs you in the middle (a deck of decisions, one at a time, or
 * the all clear), Active runs and Queued runs on the right.
 */
export function Dashboard({ data }: { data: DashboardData }) {
  const override = useStateOverride();
  const urlStory = useUrlStory();
  const isWide = useIsWide();
  const setup = useConnectionSetup();
  // The setup notice, once dismissed, stays hidden in this browser until something else is missing.
  const missingKey = setup.missing.join(",");
  const [dismissed, setDismissed] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(NOTICE_KEY);
    } catch {
      return null;
    }
  });
  const noticeShown = setup.missing.length > 0 && dismissed !== missingKey;

  const reduced = useReducedMotion();
  const [stories, setStories] = useState(data.stories);
  // Decisions made since the page opened: the all-clear's count.
  const [answered, setAnswered] = useState(0);
  // Awaiting review and Need a fix filter the deck; the chip in the header brings the rest back.
  const [need, setNeed] = useState<"all" | NeedKind>("all");
  // A story picked in Awaiting review or Need a fix, for the deck to bring to the top.
  const [jump, setJump] = useState<{ id: number; key: number } | null>(null);
  // Where the deck puts its controls: the right of Needs you's header.
  const [deckControls, setDeckControls] = useState<HTMLDivElement | null>(null);
  const [localPanel, setLocalPanel] = useState<LocalPanel>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [nextId, setNextId] = useState(data.nextStoryId);

  // A story being closed hides at once, before the Back navigation lands.
  const [closing, setClosing] = useState<number | null>(null);
  const [lastUrlStory, setLastUrlStory] = useState(urlStory);
  if (lastUrlStory !== urlStory) {
    setLastUrlStory(urlStory);
    setClosing(null);
  }

  const toastKey = useRef(0);
  const returnFocus = useRef<HTMLElement | null>(null);
  const focusAfterClose = useRef<number | null>(null);

  const byId = useMemo(() => new Map(stories.map((s) => [s.id, s])), [stories]);

  // ---- What needs you (the prototype's counting) ----
  const needing = override === "empty" ? [] : stories.filter((s) => s.need);
  // Yours: what's waiting on you, plus stuck stories, because those need a person too. Stuck first.
  const mine = sortQueue(
    needing.filter((s) => s.waitingOn === "You" || s.need === "stuck"),
    "group",
  );
  const reviewCount = mine.filter((s) => s.need === "review").length;
  const stuck = mine.filter((s) => s.need === "stuck");
  const stuckCount = stuck.length;
  // The agents' side, as on the live app's "Agent's turn" card: what they're running now, by stage.
  const running = {
    inProgress: data.running.filter((r) => r.status === "In progress").length,
    inReview: data.running.filter((r) => r.status === "In review").length,
  };
  const visible = need === "all" ? mine : mine.filter((s) => s.need === need);
  const allClear = mine.length === 0;

  const openStory = urlStory !== null && urlStory !== closing ? byId.get(urlStory) : undefined;
  const panel: "story" | "details" | "new" | "needs" | null = openStory ? "story" : (localPanel?.kind ?? null);

  // ---- Toasts ----
  const showToast = useCallback((message: string, action?: ToastMessage["action"]) => {
    toastKey.current += 1;
    setToast({ key: toastKey.current, message, action });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  // ---- Opening and closing panels ----
  const rememberFocus = () => {
    const active = document.activeElement as HTMLElement | null;
    if (active && !active.closest('[role="dialog"]')) returnFocus.current = active;
  };

  const open = useCallback(
    (id: number) => {
      rememberFocus();
      setLocalPanel(null);
      writeStoryParam(id, urlStory === null ? "push" : "replace");
    },
    [urlStory],
  );

  const openLocal = (next: Exclude<LocalPanel, null>) => {
    rememberFocus();
    if (urlStory !== null) {
      setClosing(urlStory);
      clearStoryParam();
    }
    setLocalPanel(next);
  };

  const closePanel = useCallback(
    (focusStory?: number) => {
      if (focusStory !== undefined) focusAfterClose.current = focusStory;
      setLocalPanel(null);
      if (urlStory !== null) {
        setClosing(urlStory);
        clearStoryParam();
      }
    },
    [urlStory],
  );

  // When the last panel closes, focus goes back to where it came from, or to the next story after an action.
  const hadPanel = useRef(false);
  useEffect(() => {
    if (panel !== null) {
      hadPanel.current = true;
      return;
    }
    if (!hadPanel.current) return;
    hadPanel.current = false;
    const target = focusAfterClose.current;
    focusAfterClose.current = null;
    const el =
      (target !== null ? visibleStoryButton(target) : undefined) ??
      (returnFocus.current?.isConnected ? returnFocus.current : undefined) ??
      document.getElementById("dashboard-title");
    el?.focus();
  }, [panel]);

  // Esc closes the panel; ↑ ↓ (or J K) move through the list while a story is open.
  useEffect(() => {
    if (panel === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Keys inside the connect-accounts modal (a <dialog>) belong to it, Esc included.
      if (target.closest('[role="menu"], [role="listbox"], [role="tablist"], dialog')) return;
      if (e.key === "Escape") {
        if (!e.defaultPrevented && !document.querySelector('[role="menu"]')) closePanel();
        return;
      }
      if (panel !== "story" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      const delta = e.key === "ArrowDown" || e.key === "j" ? 1 : e.key === "ArrowUp" || e.key === "k" ? -1 : 0;
      if (!delta) return;
      e.preventDefault();
      const index = visible.findIndex((s) => s.id === urlStory);
      const nextStory = visible[index + delta];
      if (!nextStory) return;
      writeStoryParam(nextStory.id, "replace");
      visibleStoryButton(nextStory.id)?.scrollIntoView({ block: "nearest" });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [panel, visible, urlStory, closePanel]);

  // ---- Acting on a story ----
  const act = (story: Story, action: StoryAction) => {
    const ref = storyRef(story.id);
    let status: StoryStatus;
    let message: string;
    switch (action.type) {
      case "accept":
        status = "done";
        message = `${ref} accepted and moved to Done.`;
        break;
      case "approve":
        status = "approved";
        message = `${ref} approved. The agent starts building within a minute.`;
        break;
      case "defaults":
        status = "approved";
        message = `Defaults kept for ${ref}, and it’s approved.`;
        break;
      case "restart":
        status = "in_progress";
        message = `Restarting ${ref}. It’s back with the agent.`;
        break;
      case "plan":
        status = "planning";
        message = `${ref} moved to Planning.`;
        break;
      case "cancel":
        status = "cancelled";
        message = `${ref} cancelled.`;
        break;
      case "note":
        if (action.intent === "changes") {
          status = "approved";
          message = `Changes sent. ${ref} is back with the agent.`;
        } else if (action.intent === "question") {
          status = "planning";
          message = `Question sent. The agent replies on ${ref}.`;
        } else if (story.need === "stuck") {
          // A note doesn't unstick anything on its own; the story stays on the list.
          showToast(`Note sent on ${ref}.`);
          return;
        } else {
          status = "planning";
          message = `Note sent. The agent picks up ${ref}.`;
        }
        break;
    }

    const index = visible.findIndex((s) => s.id === story.id);
    const after = visible[index + 1] ?? visible[index - 1];
    setStories((ss) => ss.map((s) => (s.id === story.id ? { ...s, status, need: undefined } : s)));
    setAnswered((n) => n + 1);
    showToast(message, {
      label: "Undo",
      run: () => {
        setStories((ss) => ss.map((s) => (s.id === story.id ? story : s)));
        setAnswered((n) => Math.max(0, n - 1));
      },
    });
    closePanel(after?.id);
  };

  // An answer from the deck: one of the agent's answers, or a reply in your own words.
  const decide = (story: Story, answer: { option: DecisionOption } | { reply: DecisionReply; text: string }) => {
    if ("reply" in answer) act(story, { type: "note", text: answer.text, intent: answer.reply.intent });
    else if (answer.option.choice.kind === "act") act(story, answer.option.choice.action);
  };

  // A story picked in Awaiting review or Need a fix: bring that card to the top, showing the whole deck if the filter
  // hides it.
  const pick = (id: number) => {
    if (!visible.some((s) => s.id === id)) setNeed("all");
    setJump((j) => ({ id, key: (j?.key ?? 0) + 1 }));
    if (!isWide) document.getElementById("needs-title")?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
  };

  const createStory = ({ title }: { title: string; why: string; detail: string; ownerId: string }) => {
    const id = nextId;
    setNextId(id + 1);
    setStories((ss) => [...ss, { id, title, status: "new" }]);
    setLocalPanel(null);
    showToast(`${storyRef(id)} added. The agent drafts the spec from it.`, { label: "Open", run: () => open(id) });
  };

  const dismissNotice = () => {
    setDismissed(missingKey);
    try {
      window.localStorage.setItem(NOTICE_KEY, missingKey);
    } catch {
      // Private windows: it's hidden for now, and comes back next time.
    }
    showToast("Hidden. Connect accounts any time from Connectors in the sidebar.");
  };

  const copyLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => showToast("Link copied."))
      .catch(() => showToast("Couldn’t copy the link. Copy it from the address bar."));
  };

  const panelOpenWide = panel !== null && isWide;

  return (
    <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
      {/* Panels float over the page from the right; the page keeps its full width underneath. */}
      {/* No page scroll on a desktop: the columns fit the window, and tighten on short screens (820 px and less). */}
      <main id="main" className="mx-auto w-full max-w-[1344px] px-4 pt-6 pb-6 md:px-8 [@media(max-height:820px)]:pt-4 [@media(max-height:820px)]:pb-4">
        {/* The project's name is in the top bar, after the logo; the page keeps it as its heading for screen readers. */}
        <h1 id="dashboard-title" tabIndex={-1} className="sr-only">
          {data.project} dashboard
        </h1>
        {/* One line: what's missing (until it's dismissed), and New story on the right. */}
        <div className="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2">
          {!setup.open && noticeShown && <SetupBanner missing={setup.missing} onConnect={setup.reopen} onDismiss={dismissNotice} />}
          <button type="button" className={`${BTN_SECONDARY} ml-auto flex-none`} onClick={() => openLocal({ kind: "new" })}>
            <Plus aria-hidden="true" size={16} strokeWidth={2} />
            New story
          </button>
        </div>

        {override === "loading" ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Three columns that fill the width: what to review and what's stuck, Needs you with its deck in the
                middle, what's running and queued. The side cards stretch to the deck's height. */}
            <div className="mt-6 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_480px_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_528px_minmax(0,1fr)] [@media(max-height:820px)]:mt-4">
              {/* Needs you is a tray, top to bottom of the tiles beside it: its header (the title, the deck's controls on
                  the right) and the deck sit inside it, so nothing floats on the page around the card. */}
              <section
                aria-labelledby="needs-title"
                className="flex min-w-0 flex-col rounded-[20px] border border-black/[0.05] bg-black/[0.025] p-3 sm:p-4 lg:order-2 lg:p-5 [@media(min-width:1024px)_and_(max-height:820px)]:p-4"
              >
                <header className="flex h-8 items-center justify-between gap-3 pl-1">
                  <h2 id="needs-title" className="flex min-w-0 items-center gap-2 text-[15px] leading-[22px] font-semibold text-[var(--tx)]">
                    Needs you
                    <span className="font-normal text-[var(--tx2)] tabular-nums">{visible.length}</span>
                    {/* Only while a tile (Awaiting review, Need a fix) filters the deck: what it's showing, and the way back. */}
                    {need !== "all" && (
                      <button
                        type="button"
                        onClick={() => setNeed("all")}
                        aria-label={`Showing ${need === "review" ? "Awaiting review" : "Need a fix"} only. Show all ${mine.length}`}
                        className="inline-flex h-6 items-center gap-1 rounded-full bg-white pr-1.5 pl-2.5 text-[12px] leading-4 font-medium text-[var(--tx)] shadow-[0_0_0_1px_var(--card-line)] transition-colors duration-[120ms] hover:bg-[#FAFAFA]"
                      >
                        {need === "review" ? "Awaiting review" : "Need a fix"}
                        <X aria-hidden="true" size={13} strokeWidth={2} className="text-[var(--tx2)]" />
                      </button>
                    )}
                  </h2>
                  {/* The deck puts See all and ‹ › here. */}
                  <div ref={setDeckControls} className="flex flex-none items-center gap-0.5" />
                </header>

                <div className="mt-4 flex-1 [@media(max-height:820px)]:mt-3">
                  {override === "error" ? (
                    <QueueMessage kind="error" onRetry={() => window.location.assign(window.location.pathname)} />
                  ) : (
                    // The deck, or, once it's empty, the all clear. They cross-fade.
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={allClear ? "clear" : visible.length ? "deck" : "filtered"}
                        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.2, 0, 0, 1] } }}
                        exit={{ opacity: 0, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } }}
                      >
                        {allClear ? (
                          <AllClear answered={answered} />
                        ) : visible.length ? (
                          <NeedsDeck
                            stories={visible}
                            onDecide={decide}
                            onOpen={open}
                            jump={jump}
                            onSeeAll={() => openLocal({ kind: "needs" })}
                            controls={deckControls}
                          />
                        ) : (
                          <QueueMessage kind="filtered" onClear={() => setNeed("all")} />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </section>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:order-1 lg:flex lg:flex-col lg:gap-6">
                <StatPanel
                  label="Awaiting review"
                  value={reviewCount}
                  sub="waiting on you"
                  icon={GitPullRequest}
                  tone="attention"
                  items={mine
                    .filter((s) => s.need === "review")
                    .map((s) => ({
                      id: s.id,
                      title: s.title,
                      time: s.updated,
                      detail: s.checks
                        ? s.checks.passed === s.checks.total
                          ? `All ${s.checks.total} checks passed`
                          : `${s.checks.passed} of ${s.checks.total} checks passed`
                        : "Preview ready",
                      mark: s.checks ? { type: "checks" as const, ...s.checks } : { type: "checking" as const },
                    }))}
                  onItem={pick}
                  onOpen={() => setNeed((n) => (n === "review" ? "all" : "review"))}
                  openLabel={need === "review" ? "Show everything in the deck" : "Show only these in the deck"}
                  pressed={need === "review"}
                  empty="Nothing awaiting review."
                  className="lg:flex-[3]"
                />
                <StatPanel
                  label="Need a fix"
                  value={stuckCount}
                  sub="can’t proceed without you"
                  icon={CircleX}
                  tone="negative"
                  ring
                  items={stuck.map((s) => ({ id: s.id, title: s.title, time: s.updated, detail: stuckReason(s), mark: { type: "alert" as const } }))}
                  onItem={pick}
                  onOpen={() => setNeed((n) => (n === "stuck" ? "all" : "stuck"))}
                  openLabel={need === "stuck" ? "Show everything in the deck" : "Show only these in the deck"}
                  pressed={need === "stuck"}
                  empty="Nothing needs a fix."
                  className="lg:flex-[2]"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:order-3 lg:flex lg:flex-col lg:gap-6">
                <StatPanel
                  label="Active runs"
                  value={data.running.length}
                  sub={`${running.inProgress} building · ${running.inReview} in checks`}
                  icon={LoaderCircle}
                  tone="active"
                  spin
                  items={[...data.running]
                    .sort((a, b) => Number(b.status === "In progress") - Number(a.status === "In progress"))
                    .map((r) => ({
                      id: r.id,
                      title: r.title,
                      time: r.updated,
                      detail: r.status === "In progress" ? "Building" : "In checks",
                      mark: { type: r.status === "In progress" ? ("building" as const) : ("checking" as const) },
                    }))}
                  onItem={open}
                  onOpen={() => openLocal({ kind: "details", tab: "agent" })}
                  openLabel="See what the agents are doing"
                  empty="No active runs. The agents are idle."
                  className="lg:flex-[3]"
                />
                <StatPanel
                  label="Queued runs"
                  value={data.queued}
                  sub={`last polled ${data.loopTick}`}
                  icon={Clock}
                  tone="neutral"
                  items={[]}
                  onItem={open}
                  onOpen={() => openLocal({ kind: "details", tab: "agent" })}
                  openLabel="Open the queue"
                  empty="New work starts as soon as it’s approved."
                  className="lg:flex-[2]"
                />
              </div>
            </div>

          </>
        )}
      </main>

      <AnimatePresence>
        {panel === "story" && openStory && (
          <StoryPanel
            key="story"
            story={openStory}
            isWide={isWide}
            onClose={() => closePanel()}
            onAct={(action) => act(openStory, action)}
            onCopyLink={copyLink}
          />
        )}
        {panel === "details" && localPanel?.kind === "details" && (
          <ActivityPanel
            key="details"
            tab={localPanel.tab}
            onTab={(tab) => setLocalPanel({ kind: "details", tab })}
            running={data.running}
            queued={data.queued}
            loopTick={data.loopTick}
            activity={data.activity}
            about={data.about}
            version={data.version}
            isWide={isWide}
            onClose={() => closePanel()}
            onOpenStory={open}
          />
        )}
        {panel === "needs" && <NeedsPanel key="needs" stories={visible} isWide={isWide} onClose={() => closePanel()} />}
        {panel === "new" && (
          <NewStoryPanel
            key="new"
            people={data.people}
            viewerId={data.viewer.id}
            isWide={isWide}
            onClose={() => closePanel()}
            onCreate={createStory}
          />
        )}
      </AnimatePresence>

      {/* With a panel open, toasts centre in the uncovered part of the page so they don't sit on the panel's buttons. */}
      <Toast toast={toast} onDismiss={dismissToast} offsetRight={panelOpenWide ? "var(--panel-w)" : "0px"} />

      {/* Shubham's modal: right after sign-in it opens over the dashboard until GitHub and Claude are connected. */}
      <ConnectAccountsModal open={setup.open} onClose={setup.close} />
    </Tooltip.Provider>
  );
}
