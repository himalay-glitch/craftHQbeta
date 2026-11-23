import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence } from "framer-motion";
import { Tooltip } from "radix-ui";
import { Plus } from "lucide-react";
import { ConnectAccountsModal } from "@/components/connect-accounts";
import type { DashboardData, DashboardStateOverride, NeedKind } from "@/types/dashboard";
import { BTN_PRIMARY } from "./classes";
import { NEEDS, sortQueue, storyRef, type SortMode } from "./format";
import { ActivityPanel, type DetailsTab } from "./ActivityPanel";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { FilterPill, type FilterOption } from "./FilterPill";
import { NewStoryDialog, type NewStoryInput } from "@/components/stories";
import { addCreated, useCreatedStories } from "@/components/stories/created";
import { PauseToggle } from "@/components/stories/PauseToggle";
import type { LiveRow } from "@/components/stories/RowStatus";
import { finished as sampleFinished, working as sampleWorking } from "@/pages/stories/_sample-data";
import { QueueList } from "./QueueList";
import { QueueMessage } from "./QueueMessage";
import { QueueTable } from "./QueueTable";
import { SetupBanner } from "./SetupBanner";
import { useConnectionSetup } from "./setup";
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

type LocalPanel = { kind: "details"; tab: DetailsTab } | { kind: "new" } | null;
type Show = "mine" | "team";

/** The dashboard island: the five stats, the stories that need a person, and the agent's details panel. A story
 *  opens on its own page (the builder), not in a panel here (Shubham, 23 Nov): that page is where its work happens. */
export function Dashboard({ data }: { data: DashboardData }) {
  const override = useStateOverride();
  const isWide = useIsWide();
  const setup = useConnectionSetup();

  // Demo branch: the Stories sample's robot runs laid over these stories, and its merges from the last two days, so
  // the one list shows what needs you, what's moving and what just shipped (until the API reports them).
  const [stories, setStories] = useState<LiveRow[]>(() => [
    ...data.stories.map((s) => ({ ...s, ...sampleWorking[s.id] })),
    ...sampleFinished.filter((s) => (s.outcome === "merged" || s.pr?.state === "merged") && (s.updatedMinutes ?? Infinity) <= 2 * 1440),
  ]);
  const [show, setShow] = useState<Show>("mine");
  const [need, setNeed] = useState<"all" | NeedKind | "running">("all");
  const [sort, setSort] = useState<SortMode>("group");
  const [localPanel, setLocalPanel] = useState<LocalPanel>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [nextId, setNextId] = useState(data.nextStoryId);
  const [creating, setCreating] = useState(false);
  const created = useCreatedStories();

  const toastKey = useRef(0);
  const returnFocus = useRef<HTMLElement | null>(null);

  // ---- What's listed (the prototype's counting) ----
  const needing = override === "empty" ? [] : stories.filter((s) => s.need);
  const youCount = needing.filter((s) => s.waitingOn === "You").length;
  const othersWaiting = needing.filter((s) => s.need !== "stuck" && s.waitingOn !== "You").length;
  const reviewCount = needing.filter((s) => s.need === "review").length;
  const stuckCount = needing.filter((s) => s.need === "stuck").length;
  // Robots at work right now, and what just finished: rows in the same list, after the ones that need a person.
  // Running counts live runs, not statuses: a story in review isn't "running" unless a robot is on it.
  const moving = useMemo(() => (override === "empty" ? [] : stories.filter((s) => !s.need && s.live)), [override, stories]);
  const settled = useMemo(
    () =>
      override === "empty"
        ? []
        : stories.filter((s) => !s.need && !s.live && s.status === "done").sort((a, b) => (a.updatedMinutes ?? 0) - (b.updatedMinutes ?? 0)),
    [override, stories],
  );
  const running = {
    total: moving.length,
    planning: moving.filter((s) => s.status === "planning" || s.status === "new").length,
    inProgress: moving.filter((s) => s.status === "in_progress").length,
    inReview: moving.filter((s) => s.status === "in_review").length,
  };
  // "Mine" is what's waiting on you, plus stuck stories, because those need a person too.
  const inShow = show === "mine" ? needing.filter((s) => s.waitingOn === "You" || s.need === "stuck") : needing;
  const visible = useMemo(() => {
    // Robot rows sort by when their run started (newest first), so "Updated" puts a fresh run at the top.
    const timed = moving.map((s) => ({ ...s, updatedMinutes: s.updatedMinutes ?? s.live?.minutesAgo ?? 0 }));
    if (need === "running") return sortQueue(timed, sort === "group" ? "updated-desc" : sort);
    if (need !== "all") return sortQueue(inShow.filter((s) => s.need === need), sort);
    if (sort !== "group") return sortQueue([...inShow, ...timed, ...settled], sort);
    return [...sortQueue(inShow, "group"), ...timed, ...settled];
  }, [need, sort, inShow, moving, settled]);
  const filtersAreDefault = show === "mine" && need === "all";

  const panel: "details" | "new" | null = localPanel?.kind ?? null;

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

  // A story opens on its own page (the agent's details list opens them too).
  const open = (id: number) => window.location.assign(`/stories/${storyRef(id)}`);

  const openLocal = (next: Exclude<LocalPanel, null>) => {
    rememberFocus();
    setLocalPanel(next);
  };

  const closePanel = useCallback(() => setLocalPanel(null), []);

  // When the panel closes, focus goes back to where it came from.
  const hadPanel = useRef(false);
  useEffect(() => {
    if (panel !== null) {
      hadPanel.current = true;
      return;
    }
    if (!hadPanel.current) return;
    hadPanel.current = false;
    const el = (returnFocus.current?.isConnected ? returnFocus.current : undefined) ?? document.getElementById("dashboard-title");
    el?.focus();
  }, [panel]);

  // Esc closes the panel.
  useEffect(() => {
    if (panel === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Keys inside the connect-accounts modal (a <dialog>) belong to it, Esc included.
      if (target.closest('[role="menu"], [role="listbox"], [role="tablist"], dialog')) return;
      if (e.key === "Escape" && !e.defaultPrevented && !document.querySelector('[role="menu"]')) closePanel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [panel, closePanel]);

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

  // ---- Filters ----
  const showOptions: FilterOption<Show>[] = [
    { value: "mine", label: "Mine", count: needing.filter((s) => s.waitingOn === "You" || s.need === "stuck").length },
    { value: "team", label: "Team", count: needing.length },
  ];
  const needOptions: FilterOption<"all" | NeedKind | "running">[] = [
    { value: "all", label: "Everything", count: inShow.length + moving.length + settled.length },
    ...(moving.length > 0 || need === "running" ? [{ value: "running" as const, label: "Working now", count: moving.length }] : []),
    ...NEEDS.map((n) => ({ value: n.kind, label: n.label, count: inShow.filter((s) => s.need === n.kind).length })).filter(
      (o) => o.count > 0 || o.value === need,
    ),
  ];
  const resetFilters = () => {
    setShow("mine");
    setNeed("all");
  };

  const activeCard =
    need === "stuck"
      ? "stuck"
      : need === "review"
        ? "review"
        : need === "running"
          ? "running"
          : filtersAreDefault && moving.length + settled.length === 0
            ? "mine"
            : null;
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
              onRunning={() => setNeed((n) => (n === "running" ? "all" : "running"))}
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
              {/* Stops the rows' working marks turning, for this viewer (shared with the Stories board). */}
              <span className="ml-auto">
                <PauseToggle />
              </span>
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
                      sort={sort}
                      onSort={() =>
                        setSort((s) => (s === "group" ? "updated-desc" : s === "updated-desc" ? "updated-asc" : "group"))
                      }
                    />
                  </div>
                  <div className="md:hidden">
                    <QueueList stories={visible} />
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>

      <AnimatePresence>
        {panel === "details" && localPanel?.kind === "details" && (
          <ActivityPanel
            key="details"
            tab={localPanel.tab}
            onTab={(tab) => setLocalPanel({ kind: "details", tab })}
            running={moving.map((s) => ({
              id: s.id,
              title: s.title,
              status: s.status === "in_review" ? ("In review" as const) : ("In progress" as const),
              updated: s.updated ?? "",
            }))}
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
