import { useCallback, useEffect, useRef, useState } from "react";
import { Tooltip } from "radix-ui";
import { ListFilter, Plus } from "lucide-react";
import type { NewStoryInput, StoriesData, StoryItem } from "@/types/stories";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/dashboard/classes";
import type { FilterOption } from "@/components/dashboard/FilterPill";
import { storyRef } from "@/components/dashboard/format";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import tokens from "@/components/dashboard/tokens.module.css";
import { isOnline } from "./presence";
import { Toast, type ToastMessage } from "@/components/dashboard/Toast";
import { addCreated, useCreatedStories } from "./created";
import { setDraft } from "./draft";
import { BoardDemo, type DemoKind } from "./BoardDemo";
import { setView, useEmptyOverride, useLiveDemo, useView } from "./hooks";
import { clearPatches, patchStory, useStoryPatches, withPatch, type StoryPatch } from "./live";
import { ownerOf, setStoryOwner, useStoryOwners } from "./owners";
import { NewStoryDialog } from "./NewStoryDialog";
import { COLUMNS, storyColumns, type ColumnKey, type Hold } from "./stage";
import { StoriesBoard, type Landed, type Landing } from "./StoriesBoard";
import { StoriesEmpty } from "./StoriesEmpty";
import { StoriesToolbar } from "./StoriesToolbar";
import { StoryList } from "./StoryList";

const rowLink = (id: number) => document.querySelector<HTMLElement>(`[data-story-row="${id}"]`);
const laneOf = (s: Pick<StoryItem, "status">): ColumnKey => COLUMNS.find((c) => c.statuses.includes(s.status))?.key ?? "planning";

/** Where a move can be held: a board lane, or the whole list view. */
export type Zone = ColumnKey | "list";

/** What the board and the list report, so a move waits while someone is in a zone it touches. */
export interface ZoneEvents {
  pointer: (zone: Zone, inside: boolean) => void;
  focus: (zone: Zone, inside: boolean) => void;
  menu: (zone: Zone, open: boolean) => void;
  /** The board or list is going away (a view switch, or a filter that empties it): it can't report leaving. */
  gone: () => void;
}
const isTyping = (el: HTMLElement) => Boolean(el.closest("input, textarea, select, [contenteditable='true']"));

/**
 * The Stories island: every story on a board by stage (or as a list), with search and Owner. A card opens
 * the story's own page. The New story dialog is the one way to write a story (+ New story, or C).
 */
export function Stories({ data }: { data: StoriesData }) {
  const emptyOverride = useEmptyOverride();
  const view = useView();
  const created = useCreatedStories();
  const owners = useStoryOwners();
  const patches = useStoryPatches();
  const liveDemo = useLiveDemo();

  const [justAdded, setJustAdded] = useState<number[]>([]);
  // Live moves (DESIGN.md §8.4): stories kept in the lane they're leaving while someone is there, and cards that just
  // landed or changed (for their moment of highlight). Where the pointer, focus and an open menu are is kept in refs:
  // the handlers and timers read it when they run, never a value from an earlier render.
  const [held, setHeld] = useState<Map<number, Hold>>(() => new Map());
  const pointerZone = useRef<Zone | null>(null);
  const focusZone = useRef<Zone | null>(null);
  const menuZones = useRef(new Set<Zone>());
  const releaseTimer = useRef<number | undefined>(undefined);
  const [landed, setLanded] = useState<Landed>(() => new Map());
  const [landing, setLanding] = useState<Landing>("clear");
  const [recent, setRecent] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("anyone");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastKey = useRef(0);
  const focusAfterCreate = useRef<number | null>(null);

  // Stories created in this browser come first; `?state=empty` hides the sample ones, so creating can be tried.
  // An owner changed from a card's avatar replaces the one the story came with.
  // The board demo's changes (robots at work, moves, merges) apply on top, until the API sends real ones.
  const all = (emptyOverride ? created : [...created, ...data.stories])
    .map((s) => withPatch(s, patches[s.id]))
    .map((s) => (s.id in owners ? { ...s, owner: ownerOf(s, owners) } : s));
  const nextId = Math.max(data.nextStoryId, ...created.map((s) => s.id + 1));
  const q = query.trim().toLowerCase();
  const shown = all.filter(
    (s) =>
      (owner === "anyone" || s.owner === owner) &&
      (!q || s.title.toLowerCase().includes(q) || s.why?.toLowerCase().includes(q) || storyRef(s.id).includes(q)),
  );
  const columns = storyColumns(shown, justAdded, held, recent);

  // The latest render's stories, holds and view, for handlers and timers that outlive a render (Play the pipeline).
  const latest = useRef({ all, held, view });
  useEffect(() => {
    latest.current = { all, held, view };
  });
  useEffect(() => () => window.clearTimeout(releaseTimer.current), []);

  const zoneHot = (z: Zone) => pointerZone.current === z || focusZone.current === z || menuZones.current.has(z);
  /** Board: the lane it leaves or the lane it lands in is in use. List: anyone is in the list. */
  const holdsMove = (from: ColumnKey, to: ColumnKey) => (latest.current.view === "list" ? zoneHot("list") : zoneHot(from) || zoneHot(to));

  /** A moment of highlight on a card or row (DESIGN.md §8.4): it moved here, merged, or changed in place. */
  const mark = (id: number, kind: "move" | "merge" | "update") => {
    setLanded((m) => new Map(m).set(id, kind));
    window.setTimeout(
      () =>
        setLanded((m) => {
          const next = new Map(m);
          next.delete(id);
          return next;
        }),
      1200,
    );
  };

  const land = (id: number, kind: "move" | "merge") => {
    setRecent((r) => [id, ...r.filter((x) => x !== id)]);
    mark(id, kind);
  };

  /** Release the held moves whose zones are free, after a beat: a pointer travelling from the lane a card leaves
   *  into the lane it lands in keeps it held. */
  const release = () => {
    window.clearTimeout(releaseTimer.current);
    releaseTimer.current = window.setTimeout(() => {
      const { held: holds, all: stories } = latest.current;
      const free = [...holds].filter(([id, hold]) => {
        const story = stories.find((s) => s.id === id);
        return !story || !holdsMove(hold.lane, laneOf(story));
      });
      if (!free.length) return;
      setHeld((m) => {
        const next = new Map(m);
        free.forEach(([id]) => next.delete(id));
        return next;
      });
      free.forEach(([id, hold]) => land(id, hold.kind));
    }, 150);
  };

  const zones: ZoneEvents = {
    pointer: (zone, inside) => {
      if (inside) pointerZone.current = zone;
      else if (pointerZone.current === zone) pointerZone.current = null;
      if (!inside) release();
    },
    focus: (zone, inside) => {
      if (inside) focusZone.current = zone;
      else if (focusZone.current === zone) focusZone.current = null;
      if (!inside) release();
    },
    menu: (zone, open) => {
      if (open) menuZones.current.add(zone);
      else {
        menuZones.current.delete(zone);
        release();
      }
    },
    gone: () => {
      pointerZone.current = null;
      focusZone.current = null;
      menuZones.current.clear();
      release();
    },
  };
  const changeView = (next: typeof view) => {
    zones.gone();
    setView(next);
  };

  /** A change from a robot (the demo, later the API). A move waits while someone is in a zone it touches: the card
   *  stays where it is, already showing its new words with a moment of highlight, and moves when they leave. */
  const applyEvent = (id: number, patch: StoryPatch, kind: DemoKind) => {
    const { all: stories, held: holds } = latest.current;
    const before = stories.find((s) => s.id === id);
    patchStory(id, patch);
    if (!before) return;
    const holding = holds.get(id);
    const from = holding?.lane ?? laneOf(before);
    const to = patch.status ? laneOf({ status: patch.status }) : laneOf(before);
    if (kind === "update" || from === to) {
      // It changed in place (or came back to the lane it's shown in): no move left to make.
      if (holding) {
        setHeld((m) => {
          const next = new Map(m);
          next.delete(id);
          return next;
        });
      }
      mark(id, "update");
      return;
    }
    if (holdsMove(from, to)) {
      setHeld((m) => new Map(m).set(id, { lane: from, kind, was: holding?.was ?? before }));
      mark(id, "update");
    } else land(id, kind);
  };

  // Owner: you first, then everyone who owns a story here, named when they're a teammate.
  const viewerInitials = data.viewer.initials;
  const names = new Map(data.people.map((p) => [p.initials, p.initials === viewerInitials ? "Me" : p.name]));
  const ownerList = [viewerInitials, ...new Set(all.flatMap((s) => (s.owner && s.owner !== viewerInitials ? [s.owner] : [])))];
  const ownerOptions: FilterOption<string>[] = [
    { value: "anyone", label: "Anyone", count: all.length },
    ...ownerList.map((i) => ({
      value: i,
      label: names.get(i) ?? i,
      icon: <PersonAvatar initials={i} online={isOnline(i)} />,
      count: all.filter((s) => s.owner === i).length,
    })),
  ];
  const clearFilters = () => {
    setQuery("");
    setOwner("anyone");
  };

  const showToast = useCallback((message: string, action?: ToastMessage["action"]) => {
    toastKey.current += 1;
    setToast({ key: toastKey.current, message, action });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  // After Create, focus lands on the new story's card (the dialog's own effect has already closed it).
  useEffect(() => {
    if (creating || focusAfterCreate.current === null) return;
    const id = focusAfterCreate.current;
    focusAfterCreate.current = null;
    rowLink(id)?.focus();
  }, [creating]);

  // C, from anywhere on the page: write a new story (DESIGN.md §6.1).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.key !== "c") return;
      const target = e.target as HTMLElement;
      if (isTyping(target) || target.closest('[role="menu"], [role="listbox"], dialog')) return;
      e.preventDefault();
      setCreating(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const create = ({ title, why, detail, ownerId, files, source, attachments = [] }: NewStoryInput) => {
    const id = nextId;
    const story: StoryItem = {
      id,
      title,
      why: why || undefined,
      detail: detail || undefined,
      // Files attached here, then the imported ticket's (names only, for now).
      files: files.length || attachments.length ? [...files.map((f) => f.name), ...attachments] : undefined,
      importedFrom: source,
      status: "new",
      owner: data.people.find((p) => p.id === ownerId)?.initials,
      updated: "just now",
      updatedMinutes: 0,
      createdAt: Date.now(),
    };
    addCreated(story);
    setJustAdded((ids) => [id, ...ids]);
    focusAfterCreate.current = id;
    // A filter that would hide the new story is cleared, so it's always seen landing.
    if (owner !== "anyone" && owner !== story.owner) setOwner("anyone");
    if (q) setQuery("");
    showToast(`${storyRef(id)} created. The agent reads it first and writes a plan.`, {
      label: "Open",
      run: () => window.location.assign(`/stories/${storyRef(id)}`),
    });
  };

  const changeOwner = (id: number, initials: string | null) => {
    const before = all.find((s) => s.id === id)?.owner ?? null;
    if (before === initials) return;
    setStoryOwner(id, initials);
    const who = initials ? (initials === viewerInitials ? "you" : (data.people.find((p) => p.initials === initials)?.name ?? initials)) : null;
    showToast(who ? `${storyRef(id)} is now owned by ${who}.` : `${storyRef(id)} has no owner now.`, {
      label: "Undo",
      run: () => setStoryOwner(id, before),
    });
  };

  const tryExample = (title: string) => {
    setDraft({ title });
    setCreating(true);
  };

  const firstUse = all.length === 0;

  return (
    <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
      {/* Desktop: the page fits the window under the top bar and never scrolls. The header and tabs stay
          put; the board scrolls sideways and each lane (or the list) scrolls on its own. Phones scroll normally.
          Behind it, the wash the story page, Ask PM and the dashboard have (Shubham, 26 Nov). */}
      <div className={tokens.wash}>
      <main
        id="main"
        className="mx-auto w-full max-w-[1344px] px-4 pt-6 pb-16 md:flex md:h-[calc(100dvh-var(--bar-h))] md:flex-col md:overflow-hidden md:px-8 md:pb-0"
      >
        <div className="flex flex-none items-center justify-between gap-4">
          <h1
            id="stories-title"
            tabIndex={-1}
            className="flex items-baseline gap-2 text-xl font-semibold tracking-title text-[var(--tx)] outline-none"
          >
            Stories
            {!firstUse && <span className="text-sm font-normal tracking-normal text-[var(--tx2)] tabular-nums">{all.length}</span>}
          </h1>
          <button type="button" className={BTN_PRIMARY} onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" size={16} strokeWidth={2} />
            New story
          </button>
        </div>

        {firstUse ? (
          <StoriesEmpty onExample={tryExample} />
        ) : (
          <>
            <StoriesToolbar
              view={view}
              onView={changeView}
              query={query}
              onQuery={setQuery}
              owner={owner}
              ownerOptions={ownerOptions}
              onOwner={setOwner}
              onClear={clearFilters}
            />
            <div
              id="stories-view"
              role="tabpanel"
              aria-label={view === "board" ? "Board" : "List"}
              className="md:flex md:min-h-0 md:flex-1 md:flex-col"
            >
              {shown.length === 0 ? (
                <div className="mt-5 flex flex-col items-center rounded-[12px] border border-[var(--card-line)] px-4 py-16 text-center">
                  <ListFilter aria-hidden="true" size={20} strokeWidth={1.5} className="text-[var(--tx2)]" />
                  <p className="mt-3 text-base font-semibold">No stories match</p>
                  <p className="mt-1 text-sm text-[var(--tx2)]">Try other words, or another owner.</p>
                  <button type="button" onClick={clearFilters} className={`${BTN_SECONDARY} mt-4`}>
                    Clear filters
                  </button>
                </div>
              ) : view === "board" ? (
                <StoriesBoard
                  columns={columns}
                  justAdded={justAdded}
                  onNew={() => setCreating(true)}
                  people={data.people}
                  viewerInitials={viewerInitials}
                  onOwner={changeOwner}
                  landed={landed}
                  landing={landing}
                  zones={zones}
                />
              ) : (
                <StoryList columns={columns} justAdded={justAdded} landed={landed} zones={zones} />
              )}
            </div>
          </>
        )}
      </main>
      </div>

      <NewStoryDialog
        open={creating}
        onClose={() => setCreating(false)}
        people={data.people}
        viewerId={data.viewer.id}
        onCreate={create}
        onDiscard={(undo) => showToast("Draft discarded.", { label: "Undo", run: undo })}
      />

      {liveDemo && (
        <BoardDemo
          stories={all}
          onEvent={applyEvent}
          landing={landing}
          onLanding={setLanding}
          onStop={() => {
            clearPatches();
            setHeld(new Map());
            setRecent([]);
          }}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} offsetRight="0px" />
    </Tooltip.Provider>
  );
}
