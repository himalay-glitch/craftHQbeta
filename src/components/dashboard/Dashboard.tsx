import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence } from "framer-motion";
import { Tooltip } from "radix-ui";
import { Plus } from "lucide-react";
import { ConnectAccountsModal } from "@/components/connect-accounts";
import type { DashboardData, DashboardStateOverride, NeedKind, Story, StoryStatus } from "@/types/dashboard";
import { BTN_PRIMARY } from "./classes";
import { clearStoryParam, NEEDS, readStoryParam, sortQueue, storyRef, URL_EVENT, writeStoryParam, type SortMode } from "./format";
import { ActivityPanel, type DetailsTab } from "./ActivityPanel";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { FilterPill, type FilterOption } from "./FilterPill";
import { NewStoryDialog, type NewStoryInput } from "@/components/stories";
import { addCreated, useCreatedStories } from "@/components/stories/created";
import { QueueList } from "./QueueList";
import { QueueMessage } from "./QueueMessage";
import { QueueTable } from "./QueueTable";
import { SetupBanner } from "./SetupBanner";
import { useConnectionSetup } from "./setup";
import { StoryPanel, type StoryAction } from "./StoryPanel";
import { SummaryCards } from "./SummaryCards";
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
type Show = "mine" | "team";

/** The dashboard island: the five stats, the stories that need a person, and the panels that open from them. */
export function Dashboard({ data }: { data: DashboardData }) {
  const override = useStateOverride();
  const urlStory = useUrlStory();
  const isWide = useIsWide();
  const setup = useConnectionSetup();

  const [stories, setStories] = useState(data.stories);
  const [show, setShow] = useState<Show>("mine");
  const [need, setNeed] = useState<"all" | NeedKind>("all");
  const [sort, setSort] = useState<SortMode>("group");
  const [localPanel, setLocalPanel] = useState<LocalPanel>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [nextId, setNextId] = useState(data.nextStoryId);
  const [creating, setCreating] = useState(false);
  const created = useCreatedStories();

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

  // ---- What's listed (the prototype's counting) ----
  const needing = override === "empty" ? [] : stories.filter((s) => s.need);
  const youCount = needing.filter((s) => s.waitingOn === "You").length;
  const othersWaiting = needing.filter((s) => s.need !== "stuck" && s.waitingOn !== "You").length;
  const reviewCount = needing.filter((s) => s.need === "review").length;
  const stuckCount = needing.filter((s) => s.need === "stuck").length;
  // The agent's side, as on the live app's "Agent's turn" card: what it's running now, by stage.
  const running = {
    inProgress: data.running.filter((r) => r.status === "In progress").length,
    inReview: data.running.filter((r) => r.status === "In review").length,
  };
  // "Mine" is what's waiting on you, plus stuck stories, because those need a person too.
  const inShow = show === "mine" ? needing.filter((s) => s.waitingOn === "You" || s.need === "stuck") : needing;
  const visible = sortQueue(need === "all" ? inShow : inShow.filter((s) => s.need === need), sort);
  const filtersAreDefault = show === "mine" && need === "all";

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
    showToast(message, {
      label: "Undo",
      run: () => setStories((ss) => ss.map((s) => (s.id === story.id ? story : s))),
    });
    closePanel(after?.id);
  };

  // One way to write a story everywhere: the Stories area's centred New story dialog. What's created here is
  // kept with the stories created on the Stories page, so it shows on the board too.
  const createStory = ({ title, why, detail, ownerId, files }: NewStoryInput) => {
    const id = Math.max(nextId, ...created.map((s) => s.id + 1));
    setNextId(id + 1);
    setStories((ss) => [...ss, { id, title, status: "new" }]);
    addCreated({
      id,
      title,
      why: why || undefined,
      detail: detail || undefined,
      files: files.length ? files.map((f) => f.name) : undefined,
      status: "new",
      owner: data.people.find((p) => p.id === ownerId)?.initials,
      updated: "just now",
      updatedMinutes: 0,
    });
    showToast(`${storyRef(id)} added. The agent drafts the spec from it.`, { label: "Open", run: () => window.location.assign(`/stories/${storyRef(id)}`) });
  };

  const copyLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => showToast("Link copied."))
      .catch(() => showToast("Couldn’t copy the link. Copy it from the address bar."));
  };

  // ---- Filters ----
  const showOptions: FilterOption<Show>[] = [
    { value: "mine", label: "Mine", count: needing.filter((s) => s.waitingOn === "You" || s.need === "stuck").length },
    { value: "team", label: "Team", count: needing.length },
  ];
  const needOptions: FilterOption<"all" | NeedKind>[] = [
    { value: "all", label: "Everything", count: inShow.length },
    ...NEEDS.map((n) => ({ value: n.kind, label: n.label, count: inShow.filter((s) => s.need === n.kind).length })).filter(
      (o) => o.count > 0 || o.value === need,
    ),
  ];
  const resetFilters = () => {
    setShow("mine");
    setNeed("all");
  };

  const activeCard = need === "stuck" ? "stuck" : need === "review" ? "review" : filtersAreDefault ? "mine" : null;
  const panelOpenWide = panel !== null && isWide;

  return (
    <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
      {/* Panels float over the page from the right; the table keeps its full width underneath. */}
      <main id="main" className="mx-auto w-full max-w-[1344px] px-4 pt-6 pb-16 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <h1
            id="dashboard-title"
            tabIndex={-1}
            className="text-[21px] leading-7 font-medium tracking-[-0.01em] text-[var(--tx)] outline-none"
          >
            {/* The project's name, not "Dashboard": the nav already says which page this is. */}
            {data.project}
          </h1>
          <button type="button" className={BTN_PRIMARY} onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" size={16} strokeWidth={2} />
            New story
          </button>
        </div>

        {!setup.open && <SetupBanner missing={setup.missing} onConnect={setup.reopen} />}

        {override === "loading" ? (
          <DashboardSkeleton />
        ) : override === "error" ? (
          <>
            <DashboardSkeleton part="cards" />
            <div className="mt-5">
              <QueueMessage kind="error" onRetry={() => window.location.assign(window.location.pathname)} />
            </div>
          </>
        ) : (
          <>
            <SummaryCards
              needsYou={youCount}
              othersWaiting={othersWaiting}
              readyToReview={reviewCount}
              stuck={stuckCount}
              running={running}
              queued={data.queued}
              loopTick={data.loopTick}
              active={activeCard}
              onNeedsYou={resetFilters}
              onReview={() => setNeed((n) => (n === "review" ? "all" : "review"))}
              onAgent={() => openLocal({ kind: "details", tab: "agent" })}
              onStuck={() => setNeed((n) => (n === "stuck" ? "all" : "stuck"))}
            />

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <FilterPill name="Show" value={show} defaultValue="mine" options={showOptions} onChange={setShow} showDefaultValue />
              <FilterPill
                name="Filter"
                value={need}
                defaultValue="all"
                options={needOptions}
                onChange={setNeed}
                formatActive={(label) => `Showing: ${label}`}
              />
              {!filtersAreDefault && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-[30px] rounded-full px-2.5 text-[13px] text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/[0.04] hover:text-[var(--tx)]"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="mt-4">
              {visible.length === 0 ? (
                need === "all" ? (
                  <QueueMessage kind="clear" mine={show === "mine"} />
                ) : (
                  <QueueMessage kind="filtered" onClear={() => setNeed("all")} />
                )
              ) : (
                <>
                  <div className="hidden md:block">
                    <QueueTable
                      stories={visible}
                      selectedId={openStory?.id ?? null}
                      sort={sort}
                      onSort={() =>
                        setSort((s) => (s === "group" ? "updated-desc" : s === "updated-desc" ? "updated-asc" : "group"))
                      }
                      onOpen={open}
                    />
                  </div>
                  <div className="md:hidden">
                    <QueueList stories={visible} onOpen={open} />
                  </div>
                </>
              )}
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
      </AnimatePresence>

      <NewStoryDialog
        open={creating}
        onClose={() => setCreating(false)}
        people={data.people}
        viewerId={data.viewer.id}
        onCreate={createStory}
        onDiscard={(undo) => showToast("Draft discarded.", { label: "Undo", run: undo })}
      />

      {/* With a panel open, toasts centre in the uncovered part of the page so they don't sit on the panel's buttons. */}
      <Toast toast={toast} onDismiss={dismissToast} offsetRight={panelOpenWide ? "var(--panel-w)" : "0px"} />

      {/* Shubham's modal: right after sign-in it opens over the dashboard until GitHub and Claude are connected. */}
      <ConnectAccountsModal open={setup.open} onClose={setup.close} />
    </Tooltip.Provider>
  );
}
