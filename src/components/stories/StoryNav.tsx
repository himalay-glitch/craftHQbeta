import { useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, PanelLeft } from "lucide-react";
import type { StoryNavItem } from "@/types/stories";
import { ICON_BTN } from "@/components/dashboard/classes";
import { storyRef } from "@/components/dashboard/format";
import { Tip } from "@/components/dashboard/Tip";
import { isGroupOpen, setGroupOpen, setStoriesOpen, usePanels } from "./panels";
import { COLUMNS, storyStage, type Stage } from "./stage";

// The builder's left column: every story, so you can move from ticket to ticket without leaving the builder (the
// list stays where it is, DESIGN.md §2.5). It sits on the grey canvas like a sidebar; the builder beside it is the
// one white surface. Grouped like the board: what needs you first, then the board's five groups in order. Groups
// fold (DESIGN.md §5.1). The column is put away until you open it from the builder's header, so the chat gets the
// room; it slides in from the left edge like a panel (DESIGN.md §3.7: 300 ms in, 200 ms out, none with reduced motion).

const NAV_ID = "story-nav";

const needsYou = (s: StoryNavItem) => s.need === "stuck" || (Boolean(s.need) && (s.waitingOn ?? "You") === "You");

/** The board's mark for where a story is, as a dot: attention when a person can act, red when stuck, ink while a
 *  robot works, an empty ring while it waits, the positive mark once merged (DESIGN.md §3.1). */
function dotFor(stage: Stage) {
  switch (stage.tone) {
    case "you":
    case "question":
      return "bg-warning";
    case "stuck":
      return "bg-danger";
    case "agent":
      return "bg-[var(--tx)]";
    case "done":
      return stage.outcome === "merged" ? "bg-success" : "bg-[var(--ctl-h)]";
    default:
      return "border-[1.5px] border-[var(--tx2)]";
  }
}

/** The first button in the builder's header: puts the stories column away, or brings it back (DESIGN.md §3.6: toggle
 *  the sidebar with `PanelLeft`). Shown from 1280 px, where the column is; the choice holds on every story page. */
export function StoryNavToggle() {
  const { stories: open } = usePanels();
  const label = open ? "Hide stories" : "Show stories";
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-controls={NAV_ID}
        onClick={() => setStoriesOpen(!open)}
        className={`${ICON_BTN} -ml-2 max-xl:hidden`}
      >
        <PanelLeft aria-hidden="true" size={16} strokeWidth={1.75} />
      </button>
    </Tip>
  );
}

interface StoryNavProps {
  stories: StoryNavItem[];
  /** The story open in the builder, as it is now on this page (its status moves as you work). */
  current: StoryNavItem;
}

export function StoryNav({ stories, current }: StoryNavProps) {
  const panels = usePanels();
  const hidden = !panels.stories;
  const listRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLAnchorElement>(null);
  // When the list appears (the page opening with it shown, or the column coming back), scroll it up or down so the
  // open story is in view. Not scrollIntoView: while the column slides open, that would also shift it sideways.
  useEffect(() => {
    const box = listRef.current;
    const row = currentRef.current;
    if (hidden || !box || !row) return;
    const top = row.offsetTop - 8;
    const bottom = row.offsetTop + row.offsetHeight + 8;
    if (top < box.scrollTop) box.scrollTop = top;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
  }, [hidden]);

  const all = stories.some((s) => s.id === current.id) ? stories.map((s) => (s.id === current.id ? current : s)) : [current, ...stories];
  const groups = [
    { key: "you", label: "Needs you", items: all.filter(needsYou) },
    ...COLUMNS.map((c) => ({ key: c.key, label: c.label, items: all.filter((s) => !needsYou(s) && c.statuses.includes(s.status)) })),
  ].filter((g) => g.items.length > 0);

  return (
    // Put away, it's still here at no width, and `inert` takes it out of the tab order and away from screen readers.
    <nav
      id={NAV_ID}
      aria-label="Stories"
      inert={hidden}
      // Duration and easing only with motion on too: a duration alone would animate every property, slide included.
      className={`hidden overflow-hidden xl:flex xl:flex-none xl:bg-[var(--bar)] motion-safe:transition-[width] ${
        hidden ? "xl:w-0 motion-safe:duration-200 motion-safe:ease-in" : "xl:w-[264px] motion-safe:duration-300 motion-safe:ease-out"
      }`}
    >
      {/* Full width inside while the column slides, so the list is uncovered or covered, never squeezed. */}
      <div className="flex w-[264px] flex-none flex-col border-r border-[var(--line)]">
        {/* As tall as the builder's header row, so the three tops line up. */}
        <div className="flex h-14 flex-none items-center gap-1.5 px-4">
          <h2 className="m-0 text-sm font-medium text-[var(--tx)]">Stories</h2>
          <span className="text-xs text-[var(--tx2)] tabular-nums">· {all.length}</span>
        </div>
        {/* `relative` keeps each row's screen-reader text (absolutely positioned) inside this scroll area. Without it the
            rows below the fold stretch the page, and the whole window scrolls up over an empty canvas. */}
        <div ref={listRef} className="relative min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {groups.map((g, i) => {
            const open = isGroupOpen(panels, g.key);
            // A folded group still shows the story you're on, so the list never loses your place.
            const rows = open ? g.items : g.items.filter((s) => s.id === current.id);
            const listId = `${NAV_ID}-${g.key}-list`;
            const Chevron = open ? ChevronDown : ChevronRight;
            return (
              <section key={g.key} aria-labelledby={`${NAV_ID}-${g.key}`} className={i > 0 ? "mt-2" : undefined}>
                <h3 id={`${NAV_ID}-${g.key}`} className="m-0">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={rows.length > 0 ? listId : undefined}
                    onClick={() => setGroupOpen(g.key, !open)}
                    className="flex h-7 w-full items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-hover hover:text-[var(--tx)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cta)] pointer-coarse:h-11"
                  >
                    <Chevron aria-hidden="true" size={14} strokeWidth={1.75} className="-ml-0.5 flex-none" />
                    {g.label}
                    <span className="tabular-nums">· {g.items.length}</span>
                  </button>
                </h3>
                {rows.length > 0 && (
                  <ul id={listId} className="m-0 flex list-none flex-col gap-px p-0 pb-2">
                    {rows.map((s) => {
                      const stage = storyStage(s);
                      const here = s.id === current.id;
                      return (
                        <li key={s.id}>
                          <a
                            ref={here ? currentRef : undefined}
                            href={`/stories/${storyRef(s.id)}`}
                            aria-current={here ? "page" : undefined}
                            title={`${s.title} · ${stage.text}`}
                            className={`flex h-8 items-center gap-2.5 rounded-lg px-2 text-sm text-[var(--tx)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cta)] pointer-coarse:h-11 ${
                              here ? "bg-pressed font-medium" : "hover:bg-hover"
                            }`}
                          >
                            <span aria-hidden="true" className={`size-2 flex-none rounded-full ${dotFor(stage)}`} />
                            <span className="min-w-0 flex-1 truncate">{s.title}</span>
                            <span className="sr-only">, {stage.text}</span>
                            <span className="flex-none text-xs font-normal text-[var(--tx2)] tabular-nums">{storyRef(s.id)}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
