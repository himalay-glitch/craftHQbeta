import { motion } from "framer-motion";
import { Plus, UserRound } from "lucide-react";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { storyRef } from "@/components/dashboard/format";
import type { StoryItem } from "@/types/stories";
import { storyStage, type StoryColumn } from "./stage";
import { StageLabel } from "./StageLabel";

interface StoriesBoardProps {
  columns: StoryColumn[];
  /** Created on this visit; their cards flash once when they appear. */
  justAdded: number[];
  /** "+ New story" at the foot of Planning, the only stage people add to. */
  onNew: () => void;
}

/** A card is a link: every story opens on its own page (/stories/hq-N). */
function StoryCard({ story, fresh }: { story: StoryItem; fresh: boolean }) {
  return (
    <li>
      <a
        href={`/stories/${storyRef(story.id)}`}
        data-story-row={story.id}
        className="relative block w-full overflow-hidden rounded-[12px] border border-[var(--card-line)] bg-white p-4 text-left shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-[120ms] hover:border-[var(--card-line-h)] hover:shadow-[var(--shadow-card-h)]"
      >
        {/* A story created on this visit arrives tinted and fades to white. */}
        {fresh && (
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="pointer-events-none absolute inset-0 bg-[var(--row-sel)]"
          />
        )}
        <span className="relative flex flex-col gap-3">
          <span className="block">
            <span className="line-clamp-3 text-[15px] leading-[22px] text-[var(--tx)]">{story.title}</span>
            {story.why && <span className="mt-1 line-clamp-2 text-[13px] leading-[18px] text-[var(--tx2)]">{story.why}</span>}
          </span>
          <span className="flex min-w-0">
            <StageLabel stage={storyStage(story)} />
          </span>
          <span className="flex items-center justify-between gap-2">
            {story.owner ? (
              <>
                <PersonAvatar initials={story.owner} size={24} />
                <span className="sr-only">, owner {story.owner}</span>
              </>
            ) : (
              <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-[var(--ctl-h)] text-[var(--tx2)]">
                <UserRound aria-hidden="true" size={12} strokeWidth={1.75} />
                <span className="sr-only">, no owner</span>
              </span>
            )}
            <span className="text-[12px] leading-4 text-[var(--tx2)] tabular-nums">
              {storyRef(story.id)}
              {story.updated && ` · ${story.updated}`}
            </span>
          </span>
        </span>
      </a>
    </li>
  );
}

/**
 * The stories as a board: one filled lane per stage, left (just asked) to right (done), each headed by its
 * name, count and a line saying what happens there. Cards that need a person carry a coloured chip.
 * Nothing is draggable: the agent moves stories between its own stages (DESIGN.md §5.2), which is also
 * why only Planning has "+ New story". Phones get one lane per screen, snapping.
 */
export function StoriesBoard({ columns, justAdded, onNew }: StoriesBoardProps) {
  const fresh = new Set(justAdded);
  return (
    // Desktop: fills the space under the tabs and scrolls sideways inside it, never the page. A lane is as
    // tall as its cards, up to the full height; past that its cards scroll and its header stays put.
    <div className="-mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 items-start gap-3 overflow-x-auto px-4 pb-6 md:mx-0 md:min-h-0 md:flex-1 md:snap-none md:scroll-px-0 md:overflow-y-hidden md:px-0 md:pb-4">
      {columns.map((col) => (
        <section
          key={col.key}
          aria-labelledby={`column-${col.key}`}
          className="flex w-[85%] flex-none snap-start flex-col rounded-[14px] bg-[var(--ctl-bg-on)] md:max-h-full md:w-auto md:min-w-[240px] md:flex-1 md:basis-0"
        >
          <header className="flex-none px-4 pt-3.5 pb-3">
            <h2 id={`column-${col.key}`} className="flex items-baseline gap-2 text-[15px] leading-[22px] font-semibold text-[var(--tx)]">
              {col.label}
              <span className="text-[14px] font-normal text-[var(--tx2)] tabular-nums">{col.stories.length}</span>
            </h2>
            <p className="mt-0.5 text-[12px] leading-4 text-[var(--tx2)]">{col.hint}</p>
          </header>
          <div className="px-2 pb-2 md:min-h-0 md:overflow-y-auto">
            {col.stories.length > 0 ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {col.stories.map((s) => (
                  <StoryCard key={s.id} story={s} fresh={fresh.has(s.id)} />
                ))}
              </ul>
            ) : (
              <p className="m-0 flex h-16 items-center justify-center text-[13px] leading-[18px] text-[var(--tx2)]">No stories here</p>
            )}
          </div>
          {/* Pinned under the scrolling cards, so it's always in reach. */}
          {col.key === "planning" && (
            <div className="flex-none px-2 pb-2">
              <button
                type="button"
                onClick={onNew}
                className="flex h-10 w-full items-center gap-2 rounded-[10px] px-3 text-[14px] leading-5 text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/[0.05] hover:text-[var(--tx)]"
              >
                <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
                New story
              </button>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
