import { useEffect, useRef, type Ref } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { storyRef } from "@/components/dashboard/format";
import type { Person } from "@/types/dashboard";
import type { StoryItem } from "@/types/stories";
import { CardStatus } from "./CardStatus";
import { liveSpoken, runStart } from "./LiveLine";
import { useMinute } from "./minute";
import { useSettled } from "./settled";
import type { ZoneEvents } from "./Stories";
import { OwnerPicker } from "./OwnerPicker";
import { storyStage, type StoryColumn } from "./stage";

/** How a card that moved stage lands (Shubham picks in the demo): clear, a 24 px drop over 300 ms; subtle, 8 px
 *  over 200 ms. Both on --ease-out (DESIGN.md §3.7), both just a fade with reduced motion. */
export type Landing = "clear" | "subtle";

/** A card that just changed on this visit: it landed here, merged (green), or changed in place (a robot's update, or
 *  a move waiting for you to leave its lane). Each gets a moment of highlight. */
export type Landed = Map<number, "move" | "merge" | "update">;

interface StoriesBoardProps extends OwnerProps {
  columns: StoryColumn[];
  /** Created on this visit; their cards flash once when they appear. */
  justAdded: number[];
  /** "+ New story" at the foot of Planning, the only stage people add to. */
  onNew: () => void;
  landed: Landed;
  landing: Landing;
  /** Where the pointer, keyboard focus and an open owner menu are: moves wait while one is in a lane they touch. */
  zones: ZoneEvents;
}

const EASE_OUT = [0.2, 0, 0, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

interface OwnerProps {
  people: Person[];
  viewerInitials: string;
  onOwner: (id: number, initials: string | null) => void;
}

/** A card opens the story's own page (/stories/hq-N). The title is the link, stretched over the whole card,
 *  so the owner's avatar can sit above it as its own button. Three rows, compact (DESIGN.md §7.16, 12 px padding):
 *  a light top line (ID · owner · when), the title, then one status chip with the owner's avatar beside it. */
/** "started 4 minutes ago", for screen readers (whole minutes; nothing is announced as it ticks). */
function spokenSince(ms: number) {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just started";
  return `started ${m} minute${m === 1 ? "" : "s"} ago`;
}

function StoryCard({
  story,
  fresh,
  arrived,
  landing,
  people,
  viewerInitials,
  onOwner,
  onMenu,
  ref: cardRef,
}: {
  story: StoryItem;
  fresh: boolean;
  arrived?: "move" | "merge" | "update";
  landing: Landing;
  onMenu: (open: boolean) => void;
  ref?: Ref<HTMLLIElement>;
} & OwnerProps) {
  const { now, loadedAt } = useMinute();
  const started = story.live ? runStart(story.live, loadedAt) : undefined;
  const ref = storyRef(story.id);
  const drop = landing === "clear" ? { y: -24, duration: 0.3 } : { y: -8, duration: 0.2 };
  const ownerName = story.owner ? people.find((p) => p.initials === story.owner)?.name : undefined;
  const who = story.owner === viewerInitials ? "You" : (ownerName?.split(" ")[0] ?? story.owner);
  const meta = [ref, who, story.updated].filter(Boolean).join(" · ");
  return (
    <motion.li
      // popLayout hands its ref here, so a card that's leaving lifts out of the flow as it fades.
      ref={cardRef}
      // Cards below close the gap when one leaves (200 ms); a card that moved here drops in on top of its group.
      layout="position"
      transition={{ layout: { duration: 0.2, ease: EASE_OUT } }}
      initial={arrived === "move" || arrived === "merge" ? { opacity: 0, y: drop.y } : false}
      animate={{ opacity: 1, y: 0, transition: { duration: drop.duration, ease: EASE_OUT } }}
      exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_IN } }}
      className="relative overflow-hidden rounded-xl border border-[var(--card-line)] bg-white p-3 text-left shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-[120ms] hover:border-[var(--card-line-h)] hover:shadow-[var(--shadow-card-h)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-[var(--cta)]"
    >
      {/* Just moved here: a moment of highlight (DESIGN.md §8.4), green when it merged (§8.6). */}
      {arrived && (
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className={`pointer-events-none absolute inset-0 ${arrived === "merge" ? "bg-success-tint" : "bg-hover"}`}
        />
      )}
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
      <div className="relative flex flex-col gap-2.5">
        <a
          href={`/stories/${ref}`}
          data-story-row={story.id}
          className="flex flex-col gap-1 outline-none after:absolute after:-inset-3 after:content-['']"
        >
          {/* The light top line: which story, whose, and when it last moved. */}
          <span className="truncate text-[12px] leading-4 text-[var(--tx2)] tabular-nums">{meta}</span>
          <span className="line-clamp-2 text-[14px] leading-5 font-medium text-[var(--tx)]">{story.title}</span>
          {story.why && <span className="line-clamp-1 text-[12px] leading-4 text-[var(--tx2)]">{story.why}</span>}
          <span className="sr-only">
            , {story.live ? `${liveSpoken(story.live)}${now && started !== undefined ? `, ${spokenSince(now - started)}` : ""}` : storyStage(story).text}
            , {ownerName ? `owner ${ownerName}` : story.owner ? `owner ${story.owner}` : "no owner"}
          </span>
        </a>
        <div className="flex items-center justify-between gap-2">
          {/* One status chip: a robot at work (it turns), a person's turn, or how it ended. Above the stretched link,
              so hovering a robot's chip shows who's doing what. */}
          <span aria-hidden="true" className="relative z-10 flex min-w-0">
            <CardStatus story={story} />
          </span>
          {/* Above the stretched link, so clicking it picks an owner instead of opening the story. */}
          <span className="relative z-10 flex flex-none">
            <OwnerPicker
              owner={story.owner}
              people={people}
              viewerInitials={viewerInitials}
              onChange={(initials) => onOwner(story.id, initials)}
              storyLabel={ref}
              size={20}
              onOpenChange={onMenu}
            />
          </span>
        </div>
      </div>
    </motion.li>
  );
}

/**
 * The stories as a board: one filled lane per stage, left (just asked) to right (done), each headed by its
 * name, count and a line saying what happens there. Cards that need a person carry a coloured chip.
 * Nothing is draggable: the agent moves stories between its own stages (DESIGN.md §5.2), which is also
 * why only Planning has "+ New story". Phones get one lane per screen, snapping.
 */
export function StoriesBoard({ columns, justAdded, onNew, landed, landing, zones, ...owner }: StoriesBoardProps) {
  const fresh = new Set(justAdded);
  const settled = useSettled();
  // Going away (a switch to the list, or a filter that empties the board): it can't report the pointer leaving.
  const gone = useRef(zones.gone);
  useEffect(() => {
    gone.current = zones.gone;
  });
  useEffect(() => () => gone.current(), []);
  return (
    // Reduced motion: framer drops the movement and keeps the fades (DESIGN.md §3.7). Until the page has painted
    // once, no movement either: a reload with saved demo changes doesn't reshuffle with motion.
    <MotionConfig reducedMotion={settled ? "user" : "always"}>
    {/* Desktop: fills the space under the tabs and scrolls sideways inside it, never the page. A lane is as
        tall as its cards, up to the full height; past that its cards scroll and its header stays put. */}
    <div className="-mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 items-start gap-3 overflow-x-auto px-4 pb-6 md:mx-0 md:min-h-0 md:flex-1 md:snap-none md:scroll-px-0 md:overflow-y-hidden md:px-0 md:pb-4">
      {columns.map((col) => (
        <section
          key={col.key}
          aria-labelledby={`column-${col.key}`}
          // While the pointer, keyboard focus or a card's open owner menu is in a lane, a move into or out of it waits
          // (nothing moves under you, and a focused card is never taken away).
          onPointerEnter={() => zones.pointer(col.key, true)}
          onPointerLeave={() => zones.pointer(col.key, false)}
          onFocus={() => zones.focus(col.key, true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) zones.focus(col.key, false);
          }}
          className="flex w-[85%] flex-none snap-start flex-col rounded-[14px] bg-[var(--ctl-bg-on)] md:max-h-full md:w-auto md:min-w-[240px] md:flex-1 md:basis-0"
        >
          <header className="flex-none px-4 pt-3.5 pb-3">
            <h2 id={`column-${col.key}`} className="flex items-baseline gap-2 text-[15px] leading-[22px] font-semibold text-[var(--tx)]">
              {col.label}
              {/* The count changes in place, with a moment of highlight. */}
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={col.stories.length}
                  initial={{ opacity: 0, backgroundColor: "rgba(0,0,0,0.08)" }}
                  animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)", transition: { opacity: { duration: 0.15 }, backgroundColor: { duration: 0.6 } } }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="-mx-1 rounded-[6px] px-1 text-[14px] font-normal text-[var(--tx2)] tabular-nums"
                >
                  {col.stories.length}
                </motion.span>
              </AnimatePresence>
            </h2>
            <p className="mt-0.5 text-[12px] leading-4 text-[var(--tx2)]">{col.hint}</p>
          </header>
          <motion.div layoutScroll className="px-2 pb-2 md:min-h-0 md:overflow-y-auto">
            {/* Always there, so a card landing in an empty lane still drops in, and the last one leaving still fades. */}
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              <AnimatePresence initial={false} mode="popLayout">
                {col.stories.map((s) => (
                  <StoryCard
                    key={s.id}
                    story={s}
                    fresh={fresh.has(s.id)}
                    arrived={landed.get(s.id)}
                    landing={landing}
                    onMenu={(open) => zones.menu(col.key, open)}
                    {...owner}
                  />
                ))}
              </AnimatePresence>
            </ul>
            {col.stories.length === 0 && (
              <p className="m-0 flex h-16 items-center justify-center text-[13px] leading-[18px] text-[var(--tx2)]">No stories here</p>
            )}
          </motion.div>
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
    </MotionConfig>
  );
}
