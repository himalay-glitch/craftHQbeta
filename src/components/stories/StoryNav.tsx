import { useEffect, useRef } from "react";
import type { StoryNavItem } from "@/types/stories";
import { storyRef } from "@/components/dashboard/format";
import { COLUMNS, storyStage, type Stage } from "./stage";

// The builder's left column: every story, so you can move from ticket to ticket without leaving the builder (the
// list stays where it is, DESIGN.md §2.5). It sits on the grey canvas like a sidebar; the builder beside it is the
// one white surface. Grouped like the board: what needs you first, then the board's five groups in order.

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

interface StoryNavProps {
  stories: StoryNavItem[];
  /** The story open in the builder, as it is now on this page (its status moves as you work). */
  current: StoryNavItem;
}

export function StoryNav({ stories, current }: StoryNavProps) {
  const currentRef = useRef<HTMLAnchorElement>(null);
  // Bring the open story into view in the list once, when the page opens.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  const all = stories.some((s) => s.id === current.id) ? stories.map((s) => (s.id === current.id ? current : s)) : [current, ...stories];
  const groups = [
    { key: "you", label: "Needs you", items: all.filter(needsYou) },
    ...COLUMNS.map((c) => ({ key: c.key, label: c.label, items: all.filter((s) => !needsYou(s) && c.statuses.includes(s.status)) })),
  ].filter((g) => g.items.length > 0);

  return (
    <nav aria-label="Stories" className="hidden xl:flex xl:w-[264px] xl:flex-none xl:flex-col xl:border-r xl:border-[var(--line)] xl:bg-[var(--bar)]">
      {/* As tall as the builder's header row, so the three tops line up. */}
      <div className="flex h-14 flex-none items-center gap-1.5 px-4">
        <h2 className="m-0 text-sm font-medium text-[var(--tx)]">Stories</h2>
        <span className="text-xs text-[var(--tx2)] tabular-nums">· {all.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {groups.map((g, i) => (
          <section key={g.key} aria-labelledby={`story-nav-${g.key}`} className={i > 0 ? "mt-4" : undefined}>
            <h3 id={`story-nav-${g.key}`} className="m-0 flex h-7 items-center gap-1.5 px-2 text-xs font-medium text-[var(--tx2)]">
              {g.label}
              <span className="tabular-nums">· {g.items.length}</span>
            </h3>
            <ul className="m-0 flex list-none flex-col gap-px p-0">
              {g.items.map((s) => {
                const stage = storyStage(s);
                const open = s.id === current.id;
                return (
                  <li key={s.id}>
                    <a
                      ref={open ? currentRef : undefined}
                      href={`/stories/${storyRef(s.id)}`}
                      aria-current={open ? "page" : undefined}
                      title={`${s.title} · ${stage.text}`}
                      className={`flex h-8 items-center gap-2.5 rounded-lg px-2 text-sm text-[var(--tx)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cta)] pointer-coarse:h-11 ${
                        open ? "bg-pressed font-medium" : "hover:bg-hover"
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
          </section>
        ))}
      </div>
    </nav>
  );
}
