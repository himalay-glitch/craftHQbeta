import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { storyRef } from "@/components/dashboard/format";
import type { StoryItem } from "@/types/stories";
import { LiveLine, liveSpoken } from "./LiveLine";
import { storyStage, type ColumnKey, type StoryColumn } from "./stage";
import { StageLabel } from "./StageLabel";
import type { Landed } from "./StoriesBoard";
import type { ZoneEvents } from "./Stories";

interface StoryListProps {
  columns: StoryColumn[];
  /** Created on this visit; their rows flash once when they appear. */
  justAdded: number[];
  /** Rows that just moved group or changed: a moment of highlight (green for a merge). */
  landed: Landed;
  /** Where the pointer and focus are: a row changes group only once both have left the list. */
  zones: ZoneEvents;
}

// One grid for the header and the rows, so the columns line up. Phones drop to ID + title, stage below.
const GRID = "grid-cols-[44px_minmax(0,1fr)] md:grid-cols-[44px_minmax(0,1fr)_232px_56px_72px]";

function StoryRow({ story, fresh, arrived }: { story: StoryItem; fresh: boolean; arrived?: "move" | "merge" | "update" }) {
  const stage = storyStage(story);
  // A robot at work shows its live line in place of the stage words (one state at a time). Read once, through the
  // row's screen-reader text below, so the visible copies are hidden from screen readers.
  const where = story.live ? <LiveLine live={story.live} /> : <StageLabel stage={stage} />;
  return (
    <li className="relative border-t border-[var(--line)]">
      {/* Created here: the selected tint (fading after 0.8 s). Moved or changed: the hover tint, or the positive one for
          a merge (§8.4, §8.6). On a layer of its own, so the row itself never remounts and keeps its focus. */}
      {fresh && (
        <motion.span aria-hidden="true" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.6, delay: 0.8 }} className="pointer-events-none absolute inset-0 bg-[var(--row-sel)]" />
      )}
      {arrived && (
        <motion.span
          key={arrived}
          aria-hidden="true"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`pointer-events-none absolute inset-0 ${arrived === "merge" ? "bg-success-tint" : "bg-hover"}`}
        />
      )}
      <a
        href={`/stories/${storyRef(story.id)}`}
        data-story-row={story.id}
        className={`grid w-full ${GRID} items-center gap-x-3 px-4 py-3 text-left transition-colors duration-[80ms] hover:bg-[var(--row-h)] focus-visible:bg-[var(--row-h)] md:min-h-[46px] md:py-0`}
      >
        <span className="self-start text-[13px] leading-[22px] text-[var(--tx2)] tabular-nums md:self-center">{storyRef(story.id)}</span>
        <span className="min-w-0 md:py-3">
          <span className="block truncate text-[15px] leading-[22px] text-[var(--tx)]">{story.title}</span>
          {story.why && <span className="block truncate text-[13px] leading-[18px] text-[var(--tx2)]">{story.why}</span>}
          <span aria-hidden="true" className="mt-1.5 flex md:hidden">
            {where}
          </span>
          <span className="sr-only">, {story.live ? liveSpoken(story.live) : stage.text}</span>
        </span>
        <span aria-hidden="true" className="hidden min-w-0 md:flex">
          {where}
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
    </li>
  );
}

/**
 * The same stories as rows, grouped by the board's stages, for scanning many at once. Each group folds;
 * Done starts folded. A row opens the story's panel.
 */
export function StoryList({ columns, justAdded, landed, zones }: StoryListProps) {
  // Going away (a switch to the board): it can't report the pointer leaving.
  const gone = useRef(zones.gone);
  useEffect(() => {
    gone.current = zones.gone;
  });
  useEffect(() => () => gone.current(), []);
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
    // While the pointer or focus is in the list, a row's group change waits until both have left (DESIGN.md §5.1, §8.4).
    <div
      onPointerEnter={() => zones.pointer("list", true)}
      onPointerLeave={() => zones.pointer("list", false)}
      onFocus={() => zones.focus("list", true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) zones.focus("list", false);
      }}
      className="relative mt-5 flex flex-col gap-6 md:min-h-0 md:flex-1 md:overflow-y-auto md:pb-6"
    >
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
                      <StoryRow key={s.id} story={s} fresh={fresh.has(s.id)} arrived={landed.get(s.id)} />
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
