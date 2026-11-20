import { useCallback, useEffect, useRef, useState } from "react";
import { Tooltip } from "radix-ui";
import { ListFilter, Plus } from "lucide-react";
import type { NewStoryInput, StoriesData, StoryItem } from "@/types/stories";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/dashboard/classes";
import type { FilterOption } from "@/components/dashboard/FilterPill";
import { storyRef } from "@/components/dashboard/format";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { Toast, type ToastMessage } from "@/components/dashboard/Toast";
import { addCreated, useCreatedStories } from "./created";
import { setDraft } from "./draft";
import { setView, useEmptyOverride, useView } from "./hooks";
import { NewStoryDialog } from "./NewStoryDialog";
import { storyColumns } from "./stage";
import { StoriesBoard } from "./StoriesBoard";
import { StoriesEmpty } from "./StoriesEmpty";
import { StoriesToolbar } from "./StoriesToolbar";
import { StoryList } from "./StoryList";

const rowLink = (id: number) => document.querySelector<HTMLElement>(`[data-story-row="${id}"]`);
const isTyping = (el: HTMLElement) => Boolean(el.closest("input, textarea, select, [contenteditable='true']"));

/**
 * The Stories island: every story on a board by stage (or as a list), with search and Owner. A card opens
 * the story's own page. The New story dialog is the one way to write a story (+ New story, or C).
 */
export function Stories({ data }: { data: StoriesData }) {
  const emptyOverride = useEmptyOverride();
  const view = useView();
  const created = useCreatedStories();

  const [justAdded, setJustAdded] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("anyone");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastKey = useRef(0);
  const focusAfterCreate = useRef<number | null>(null);

  // Stories created in this browser come first; `?state=empty` hides the sample ones, so creating can be tried.
  const all = emptyOverride ? created : [...created, ...data.stories];
  const nextId = Math.max(data.nextStoryId, ...created.map((s) => s.id + 1));
  const q = query.trim().toLowerCase();
  const shown = all.filter(
    (s) =>
      (owner === "anyone" || s.owner === owner) &&
      (!q || s.title.toLowerCase().includes(q) || s.why?.toLowerCase().includes(q) || storyRef(s.id).includes(q)),
  );
  const columns = storyColumns(shown, justAdded);

  // Owner: you first, then everyone who owns a story here, named when they're a teammate.
  const viewerInitials = data.viewer.initials;
  const names = new Map(data.people.map((p) => [p.initials, p.initials === viewerInitials ? "Me" : p.name]));
  const owners = [viewerInitials, ...new Set(all.flatMap((s) => (s.owner && s.owner !== viewerInitials ? [s.owner] : [])))];
  const ownerOptions: FilterOption<string>[] = [
    { value: "anyone", label: "Anyone", count: all.length },
    ...owners.map((i) => ({
      value: i,
      label: names.get(i) ?? i,
      icon: <PersonAvatar initials={i} />,
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

  const create = ({ title, why, detail, ownerId, files }: NewStoryInput) => {
    const id = nextId;
    const story: StoryItem = {
      id,
      title,
      why: why || undefined,
      detail: detail || undefined,
      files: files.length ? files.map((f) => f.name) : undefined,
      status: "new",
      owner: data.people.find((p) => p.id === ownerId)?.initials,
      updated: "just now",
      updatedMinutes: 0,
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

  const tryExample = (title: string) => {
    setDraft({ title });
    setCreating(true);
  };

  const firstUse = all.length === 0;

  return (
    <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
      {/* Desktop: the page fits the window under the top bar and never scrolls. The header and tabs stay
          put; the board scrolls sideways and each lane (or the list) scrolls on its own. Phones scroll normally. */}
      <main
        id="main"
        className="mx-auto w-full max-w-[1344px] px-4 pt-6 pb-16 md:flex md:h-[calc(100dvh-var(--bar-h))] md:flex-col md:overflow-hidden md:px-8 md:pb-0"
      >
        <div className="flex flex-none items-center justify-between gap-4">
          <h1
            id="stories-title"
            tabIndex={-1}
            className="flex items-baseline gap-2 text-[21px] leading-7 font-medium tracking-[-0.01em] text-[var(--tx)] outline-none"
          >
            Stories
            {!firstUse && <span className="text-[15px] font-normal tracking-normal text-[var(--tx2)] tabular-nums">{all.length}</span>}
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
              onView={setView}
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
                  <p className="mt-3 text-[15px] leading-[22px] font-medium">No stories match</p>
                  <p className="mt-1 text-[15px] leading-[22px] text-[var(--tx2)]">Try other words, or another owner.</p>
                  <button type="button" onClick={clearFilters} className={`${BTN_SECONDARY} mt-4`}>
                    Clear filters
                  </button>
                </div>
              ) : view === "board" ? (
                <StoriesBoard columns={columns} justAdded={justAdded} onNew={() => setCreating(true)} />
              ) : (
                <StoryList columns={columns} justAdded={justAdded} />
              )}
            </div>
          </>
        )}
      </main>

      <NewStoryDialog
        open={creating}
        onClose={() => setCreating(false)}
        people={data.people}
        viewerId={data.viewer.id}
        onCreate={create}
        onDiscard={(undo) => showToast("Draft discarded.", { label: "Undo", run: undo })}
      />

      <Toast toast={toast} onDismiss={dismissToast} offsetRight="0px" />
    </Tooltip.Provider>
  );
}
