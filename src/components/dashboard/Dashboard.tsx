import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Tooltip } from "radix-ui";
import { Plus } from "lucide-react";
import { ConnectAccountsModal } from "@/components/connect-accounts";
import type { BotId } from "@/types/ask";
import type { DashboardData, DashboardStateOverride, Story, StoryStatus } from "@/types/dashboard";
import { BTN_SECONDARY } from "./classes";
import { clearStoryParam, readStoryParam, sortQueue, storyRef, URL_EVENT, writeStoryParam } from "./format";
import { ActivityPanel, type DetailsTab } from "./ActivityPanel";
import { AllClear } from "./AllClear";
import { DashboardSkeleton } from "./DashboardSkeleton";
import type { DecisionOption, DecisionReply } from "./decisions";
import { NeedsDeck } from "./NeedsDeck";
import { NewStoryPanel } from "./NewStoryPanel";
import { QueueMessage } from "./QueueMessage";
import { SetupBanner } from "./SetupBanner";
import { useConnectionSetup } from "./setup";
import { ShippedRibbon } from "./ShippedRibbon";
import { StoryPanel, type StoryAction } from "./StoryPanel";
import { TeamStrip } from "./TeamStrip";
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

type LocalPanel = { kind: "details"; tab: DetailsTab } | { kind: "new" } | null;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The dashboard island, one focused column that answers what needs me, what's moving and what shipped (DESIGN.md
 * §5.6): a headline that counts down the decisions waiting for you; the team, each agent with what it's on; the
 * stage, a deck of those decisions one at a time (or the all clear); and this week's merges on a line.
 */
export function Dashboard({ data }: { data: DashboardData }) {
  const override = useStateOverride();
  const urlStory = useUrlStory();
  const isWide = useIsWide();
  const setup = useConnectionSetup();

  const reduced = useReducedMotion();
  const [stories, setStories] = useState(data.stories);
  // Decisions made since the page opened: the all-clear's count.
  const [answered, setAnswered] = useState(0);
  // The agent whose question is on top of the deck, for the team strip.
  const [asking, setAsking] = useState<BotId | null>(null);
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
  const stuck = mine.filter((s) => s.need === "stuck");
  const visible = mine;
  const allClear = mine.length === 0;

  const openStory = urlStory !== null && urlStory !== closing ? byId.get(urlStory) : undefined;
  const panel: "story" | "details" | "new" | null = openStory ? "story" : (localPanel?.kind ?? null);

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

  const createStory = ({ title }: { title: string; why: string; detail: string; ownerId: string }) => {
    const id = nextId;
    setNextId(id + 1);
    setStories((ss) => [...ss, { id, title, status: "new" }]);
    setLocalPanel(null);
    showToast(`${storyRef(id)} added. The agent drafts the spec from it.`, { label: "Open", run: () => open(id) });
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
      <main id="main" className="mx-auto w-full max-w-[1344px] px-4 pt-8 pb-20 md:px-8">
        {/* One column, centred: the page is about one thing at a time. */}
        <div className="mx-auto w-full max-w-[760px]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 id="dashboard-title" tabIndex={-1} className="text-[14px] leading-5 font-medium text-[var(--tx2)] outline-none">
                {/* The project's name, not "Dashboard": the nav already says which page this is. */}
                {data.project}
              </h1>
              {override !== "loading" && override !== "error" && (
                <>
                  {/* The headline is the progress: it counts down as you answer. */}
                  <p className="mt-1 text-[24px] leading-8 font-semibold tracking-[-0.015em] text-[var(--tx)]">
                    {allClear ? "You’re all caught up" : `${plural(mine.length, "decision is", "decisions are")} waiting for you`}
                  </p>
                  <p className="mt-1 text-[14px] leading-5 text-[var(--tx2)]">
                    The agents are on {plural(data.running.length, "story", "stories")} · {data.shipped.length} shipped this week
                  </p>
                </>
              )}
            </div>
            <button type="button" className={`${BTN_SECONDARY} mt-1 flex-none`} onClick={() => openLocal({ kind: "new" })}>
              <Plus aria-hidden="true" size={16} strokeWidth={2} />
              New story
            </button>
          </div>

          {!setup.open && <SetupBanner missing={setup.missing} onConnect={setup.reopen} />}

          {override === "loading" ? (
            <DashboardSkeleton />
          ) : (
            <>
              <div className="mt-8">
                <TeamStrip
                  running={data.running}
                  queued={data.queued}
                  loopTick={data.loopTick}
                  stuck={stuck}
                  waitingOnYou={mine.length - stuck.length}
                  asking={allClear ? null : asking}
                  onViewAll={() => openLocal({ kind: "details", tab: "agent" })}
                />
              </div>

              <div className="mt-8">
                {override === "error" ? (
                  <QueueMessage kind="error" onRetry={() => window.location.assign(window.location.pathname)} />
                ) : (
                  // The stage: the deck, or, once it's empty, the all clear. They cross-fade.
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={allClear ? "clear" : "deck"}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.2, 0, 0, 1] } }}
                      exit={{ opacity: 0, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } }}
                    >
                      {allClear ? (
                        <div className="pt-8">
                          <AllClear answered={answered} />
                        </div>
                      ) : (
                        <NeedsDeck stories={visible} onDecide={decide} onOpen={open} onAsking={setAsking} />
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              <div className="mt-14 border-t border-[var(--line)] pt-6">
                <ShippedRibbon shipped={data.shipped} done={data.done + answered} />
              </div>
            </>
          )}
        </div>
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
