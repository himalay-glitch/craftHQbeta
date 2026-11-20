import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { storyRef } from "@/components/dashboard/format";
import type { Person } from "@/types/dashboard";
import type { StoryItem } from "@/types/stories";
import { OwnerPicker } from "./OwnerPicker";
import { storyStage, type StoryColumn } from "./stage";
import { StageLabel } from "./StageLabel";

interface StoriesBoardProps extends OwnerProps {
  columns: StoryColumn[];
  /** Created on this visit; their cards flash once when they appear. */
  justAdded: number[];
  /** "+ New story" at the foot of Planning, the only stage people add to. */
  onNew: () => void;
}

interface OwnerProps {
  people: Person[];
  viewerInitials: string;
  onOwner: (id: number, initials: string | null) => void;
}

/** A card opens the story's own page (/stories/hq-N). The title is the link, stretched over the whole card,
 *  so the owner's avatar can sit above it as its own button. */
function StoryCard({ story, fresh, people, viewerInitials, onOwner }: { story: StoryItem; fresh: boolean } & OwnerProps) {
  const ref = storyRef(story.id);
  return (
    <li
      className="relative overflow-hidden rounded-[12px] border border-[var(--card-line)] bg-white p-4 text-left shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-[120ms] hover:border-[var(--card-line-h)] hover:shadow-[var(--shadow-card-h)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-[var(--cta)]"
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
      <div className="relative flex flex-col gap-3">
        <a
          href={`/stories/${ref}`}
          data-story-row={story.id}
          className="block outline-none after:absolute after:-inset-4 after:content-['']"
        >
          <span className="line-clamp-3 text-[15px] leading-[22px] text-[var(--tx)]">{story.title}</span>
          {story.why && <span className="mt-1 line-clamp-2 text-[13px] leading-[18px] text-[var(--tx2)]">{story.why}</span>}
          <span className="sr-only">
            , {storyStage(story).text}, {story.owner ? `owner ${people.find((p) => p.initials === story.owner)?.name ?? story.owner}` : "no owner"}
          </span>
        </a>
        <span aria-hidden="true" className="flex min-w-0">
          <StageLabel stage={storyStage(story)} />
        </span>
        <div className="flex items-center justify-between gap-2">
          {/* Above the stretched link, so clicking it picks an owner instead of opening the story. */}
          <span className="relative z-10 flex">
            <OwnerPicker
              owner={story.owner}
              people={people}
              viewerInitials={viewerInitials}
              onChange={(initials) => onOwner(story.id, initials)}
              storyLabel={ref}
            />
          </span>
          <span className="text-[12px] leading-4 text-[var(--tx2)] tabular-nums">
            {ref}
            {story.updated && ` · ${story.updated}`}
          </span>
        </div>
      </div>
    </li>
  );
}

/**
 * The stories as a board: one filled lane per stage, left (just asked) to right (done), each headed by its
 * name, count and a line saying what happens there. Cards that need a person carry a coloured chip.
 * Nothing is draggable: the agent moves stories between its own stages (DESIGN.md §5.2), which is also
 * why only Planning has "+ New story". Phones get one lane per screen, snapping.
 */
export function StoriesBoard({ columns, justAdded, onNew, ...owner }: StoriesBoardProps) {
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
                  <StoryCard key={s.id} story={s} fresh={fresh.has(s.id)} {...owner} />
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
