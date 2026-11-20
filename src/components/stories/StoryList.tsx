import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { storyRef } from "@/components/dashboard/format";
import type { StoryItem } from "@/types/stories";
import { storyStage, type ColumnKey, type StoryColumn } from "./stage";
import { StageLabel } from "./StageLabel";

interface StoryListProps {
  columns: StoryColumn[];
  /** Created on this visit; their rows flash once when they appear. */
  justAdded: number[];
}

// One grid for the header and the rows, so the columns line up. Phones drop to ID + title, stage below.
const GRID = "grid-cols-[44px_minmax(0,1fr)] md:grid-cols-[44px_minmax(0,1fr)_232px_56px_72px]";

function StoryRow({ story, fresh }: { story: StoryItem; fresh: boolean }) {
  const stage = storyStage(story);
  return (
    // A story created on this visit arrives with the selected tint and fades to white.
    <motion.li
      initial={fresh ? { backgroundColor: "rgba(238, 243, 253, 1)" } : false}
      animate={{ backgroundColor: "rgba(238, 243, 253, 0)" }}
      transition={{ duration: 0.6, delay: 0.8 }}
      className="border-t border-[var(--line)]"
    >
      <a
        href={`/stories/${storyRef(story.id)}`}
        data-story-row={story.id}
        className={`grid w-full ${GRID} items-center gap-x-3 px-4 py-3 text-left transition-colors duration-[80ms] hover:bg-[var(--row-h)] focus-visible:bg-[var(--row-h)] md:min-h-[46px] md:py-0`}
      >
        <span className="self-start text-[13px] leading-[22px] text-[var(--tx2)] tabular-nums md:self-center">{storyRef(story.id)}</span>
        <span className="min-w-0 md:py-3">
          <span className="block truncate text-[15px] leading-[22px] text-[var(--tx)]">{story.title}</span>
          {story.why && <span className="block truncate text-[13px] leading-[18px] text-[var(--tx2)]">{story.why}</span>}
          <span className="mt-1.5 flex md:hidden">
            <StageLabel stage={stage} />
          </span>
        </span>
        <span className="hidden min-w-0 md:flex">
          <StageLabel stage={stage} />
        </span>
        <span className="hidden md:flex">
          {story.owner && (
            <>
              <PersonAvatar initials={story.owner} />
              <span className="sr-only">, owner {story.owner}</span>
            </>
          )}
        </span>
        <span className="hidden text-right text-[13px] leading-[18px] text-[var(--tx2)] tabular-nums md:block">{story.updated}</span>
      </a>
    </motion.li>
  );
}

/**
 * The same stories as rows, grouped by the board's stages, for scanning many at once. Each group folds;
 * Done starts folded. A row opens the story's panel.
 */
export function StoryList({ columns, justAdded }: StoryListProps) {
  const [folded, setFolded] = useState<ReadonlySet<ColumnKey>>(() => new Set(["done"]));
  const fresh = new Set(justAdded);

  const toggle = (key: ColumnKey) =>
    setFolded((f) => {
      const next = new Set(f);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    // Desktop: fills the space under the tabs and scrolls on its own; the page doesn't. `relative` keeps the
    // rows' screen-reader-only text (absolutely positioned) inside this scroll area, or it stretches the page.
    <div className="relative mt-5 flex flex-col gap-6 md:min-h-0 md:flex-1 md:overflow-y-auto md:pb-6">
      {columns
        .filter((c) => c.stories.length > 0)
        .map((g) => {
          const isFolded = folded.has(g.key);
          const Chevron = isFolded ? ChevronRight : ChevronDown;
          return (
            <section key={g.key} aria-labelledby={`group-${g.key}`}>
              <h2 id={`group-${g.key}`} className="flex flex-wrap items-baseline gap-x-2 text-[13px] leading-[18px] font-medium">
                <button
                  type="button"
                  aria-expanded={!isFolded}
                  aria-controls={`group-${g.key}-list`}
                  onClick={() => toggle(g.key)}
                  className="-ml-1.5 inline-flex h-7 items-center gap-1.5 rounded-[6px] pr-2 pl-1 text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/[0.04] hover:text-[var(--tx)]"
                >
                  <Chevron aria-hidden="true" size={14} strokeWidth={1.75} />
                  <span className="text-[14px] text-[var(--tx)]">{g.label}</span>
                  <span className="tabular-nums">{g.stories.length}</span>
                </button>
                <span className="text-[12px] leading-4 font-normal text-[var(--tx2)]">{g.hint}</span>
              </h2>
              {!isFolded && (
                <div id={`group-${g.key}-list`} className="mt-1.5 overflow-clip rounded-[12px] border border-[var(--card-line)] bg-white">
                  <div aria-hidden="true" className={`hidden h-9 ${GRID} items-center gap-x-3 px-4 text-[12px] leading-4 text-[var(--tx2)] md:grid`}>
                    <span />
                    <span>Story</span>
                    <span>Where it is</span>
                    <span>Owner</span>
                    <span className="text-right">Updated</span>
                  </div>
                  <ul className="m-0 list-none p-0 [&>li:first-child]:max-md:border-t-0">
                    {g.stories.map((s) => (
                      <StoryRow key={s.id} story={s} fresh={fresh.has(s.id)} />
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
    </div>
  );
}
