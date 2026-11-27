import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BadgeAlert,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Hammer,
  OctagonAlert,
  type LucideIcon,
} from "lucide-react";
import { Indicator, type Tone } from "./Indicator";
import { storyRef } from "./format";
import { Tip } from "./Tip";

/** The small mark on a card's left: how its checks went, or what state it's in. */
export type StatMark = { type: "checks"; passed: number; total: number } | { type: "alert" } | { type: "building" } | { type: "checking" };

export interface StatItem {
  id: number;
  title: string;
  /** The card's second line, after the ID: "All 24 checks passed", "Building", why it stopped. */
  detail?: string;
  /** When, on the right of the title. */
  time?: string;
  mark?: StatMark;
}

// A mark's tile: a soft gradient in its tone, a hairline of the tone inside, and the icon in the tone's deep ink.
const LOOK = {
  good: "bg-linear-to-b from-[#F3FBF6] to-[#DCF3E5] text-[#15803D] shadow-[inset_0_0_0_1px_rgb(22_163_74/0.18)]",
  bad: "bg-linear-to-b from-[#FFF6F6] to-[#FBE0E0] text-[#C62828] shadow-[inset_0_0_0_1px_rgb(220_38_38/0.16)]",
} as const;

const MARKS: Record<"passed" | "failing" | "alert" | "building" | "checking", { icon: LucideIcon; look: string }> = {
  passed: { icon: BadgeCheck, look: LOOK.good },
  failing: { icon: BadgeAlert, look: LOOK.bad },
  alert: { icon: OctagonAlert, look: LOOK.bad },
  building: { icon: Hammer, look: LOOK.good },
  checking: { icon: FlaskConical, look: LOOK.good },
};

function Mark({ mark }: { mark?: StatMark }) {
  if (!mark) return null;
  const { icon: Icon, look } = MARKS[mark.type === "checks" ? (mark.passed === mark.total ? "passed" : "failing") : mark.type];
  return (
    <span aria-hidden="true" className={`inline-flex size-8 flex-none items-center justify-center rounded-[10px] ${look}`}>
      <Icon size={16} strokeWidth={2} />
    </span>
  );
}

interface StatPanelProps {
  label: string;
  value: number;
  sub: ReactNode;
  icon: LucideIcon;
  tone: Tone;
  spin?: boolean;
  ring?: boolean;
  /** The stories behind the number, each a small card; as many as fit are shown, a page at a time. */
  items: StatItem[];
  onItem: (id: number) => void;
  /** The tile's own action (filter the deck, open the Details panel), from its label and number. */
  onOpen: () => void;
  /** What the tile's button does, for screen readers, e.g. "Show only these in the deck". */
  openLabel: string;
  /** Said instead of the cards when there's nothing behind the number. */
  empty: string;
  /** For tiles that filter the deck: on while their filter is. */
  pressed?: boolean;
  className?: string;
}

// The cards' sizes, for working out how many fit: 48 px cards 6 px apart, and a little room kept free at the foot
// (with the tile's own 16 px padding) so the last card never touches the tile's edge.
const CARD_H = 48;
const GAP = 6;
const KEEP = 4;
const NARROW_PAGE = 3;
const WIDE = "(min-width: 1024px)";
const fitting = (space: number) => Math.max(1, Math.floor((space - KEEP + GAP) / (CARD_H + GAP)));

const PAGE_BTN =
  "inline-flex size-7 items-center justify-center rounded-full text-[var(--tx2)] transition-colors duration-[120ms] " +
  "hover:bg-black/[0.05] hover:text-[var(--tx)] disabled:opacity-35 disabled:hover:bg-transparent";

/**
 * A KPI tile beside the deck (DESIGN.md §5.6): the label, the number, one line of context, then the stories behind
 * the number as small cards: a mark for its state in a soft tile (checks passed or failing, stopped, building, in
 * checks), the title and when, then the ID as a tag and one fact. On a desktop the tile is as tall as the deck and
 * shows as many cards as fit; on narrower screens, where tiles stack, three. When there are more, the tile pages
 * through them in place, from its top right ("4–6 of 12", ‹ ›, as Needs you's header browses the deck), so nothing
 * opens over the page and the page never scrolls.
 */
export function StatPanel(p: StatPanelProps) {
  const box = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [space, setSpace] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  // Which way the last page turn went, so the cards come in from that side; null until the first turn.
  const [dir, setDir] = useState<1 | -1 | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSpace(window.matchMedia(WIDE).matches ? el.clientHeight : null);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  const total = p.items.length;
  const per = space === null ? NARROW_PAGE : fitting(space);
  const pages = Math.max(1, Math.ceil(total / per));
  const at = Math.min(page, pages - 1);
  const shown = p.items.slice(at * per, at * per + per);
  const turn = (d: 1 | -1) => {
    setDir(d);
    setPage(Math.min(Math.max(at + d, 0), pages - 1));
  };

  return (
    <section
      aria-label={p.label}
      className={`@container relative flex min-h-0 flex-col rounded-[12px] border bg-white p-4 transition-[border-color,box-shadow] duration-[120ms] ${
        p.pressed ? "border-[var(--cta)] shadow-[0_0_0_3px_rgb(47_111_237/0.12)]" : "border-[var(--card-line)]"
      } ${p.className ?? ""}`}
    >
      <button
        type="button"
        onClick={p.onOpen}
        aria-pressed={p.pressed}
        aria-label={`${p.label}: ${p.value}. ${p.openLabel}`}
        className="group -m-2 flex flex-col rounded-[8px] p-2 text-left transition-colors duration-[120ms] hover:bg-[#FAFAFA]"
      >
        {/* With a pager, the label leaves it room (less in a narrow tile, where the pager is just its arrows). */}
        <span className={`flex items-center gap-2 text-[13px] leading-5 text-[var(--tx2)] ${pages > 1 ? "pr-14 @min-[300px]:pr-28" : ""}`}>
          <Indicator icon={p.icon} tone={p.tone} on={p.value > 0} spin={p.spin} ring={p.ring} size={20} />
          <span className="min-w-0 truncate">{p.label}</span>
          <ChevronRight
            aria-hidden="true"
            size={16}
            strokeWidth={1.75}
            className={`flex-none opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100 ${
              pages > 1 ? "hidden @min-[300px]:block" : ""
            }`}
          />
        </span>
        <span className="mt-3 text-[30px] leading-9 font-medium tracking-[-0.02em] text-[var(--tx)] tabular-nums">{p.value}</span>
        <span className="truncate text-[13px] leading-[18px] text-[var(--tx2)]">{p.sub}</span>
      </button>

      {total === 0 ? (
        <p className="pt-4 text-[13px] leading-[18px] text-[var(--tx2)]">{p.empty}</p>
      ) : (
        // On a desktop the cards are laid over the space below the number, so they never make the tile taller than
        // the deck; only as many as fit are drawn.
        <div ref={box} className="relative mt-4 min-h-0 lg:flex-1">
          <div className="lg:absolute lg:inset-x-0 lg:top-0">
            <motion.ul
              key={at}
              initial={dir === null ? false : reduced ? { opacity: 0 } : { opacity: 0, x: dir * 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              // Stacked tiles keep their height on a short last page.
              style={pages > 1 ? { minHeight: per * CARD_H + (per - 1) * GAP } : undefined}
              className="flex list-none flex-col gap-1.5"
            >
              {shown.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    data-story={s.id}
                    onClick={() => p.onItem(s.id)}
                    className="flex h-[48px] w-full items-center gap-2.5 rounded-[10px] border border-[var(--card-line)] bg-white pr-2.5 pl-2 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[transform,border-color,box-shadow] duration-[120ms] hover:-translate-y-px hover:border-[var(--ctl-h)] hover:shadow-[0_6px_14px_-6px_rgb(0_0_0/0.16)] motion-reduce:hover:translate-y-0"
                  >
                    <Mark mark={s.mark} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex w-full items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] leading-[18px] font-medium text-[var(--tx)]">{s.title}</span>
                        {s.time && <span className="flex-none text-[12px] leading-4 text-[var(--tx2)]">{s.time}</span>}
                      </span>
                      <span className="flex w-full min-w-0 items-center gap-1.5 text-[12px] leading-4 text-[var(--tx2)]">
                        <span className="flex-none rounded-[4px] bg-black/[0.045] px-1 tabular-nums">{storyRef(s.id)}</span>
                        {s.detail && <span className="min-w-0 truncate">{s.detail}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </motion.ul>
          </div>
        </div>
      )}

      {/* More than fit: page through them here, a tile's worth at a time, from the tile's top right. */}
      {total > 0 && pages > 1 && (
        <div className="absolute top-3 right-3 flex items-center">
          {/* In a narrow tile the count is for screen readers only, so the label keeps its room. */}
          <p aria-live="polite" className="sr-only mr-1 text-[12px] leading-4 text-[var(--tx2)] tabular-nums @min-[300px]:not-sr-only">
            {shown.length > 1 ? `${at * per + 1}–${at * per + shown.length}` : at * per + 1} of {total}
          </p>
          <Tip label="Previous">
            <button type="button" onClick={() => turn(-1)} disabled={at === 0} aria-label={`Previous ${p.label}`} className={PAGE_BTN}>
              <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.75} />
            </button>
          </Tip>
          <Tip label="Next">
            <button type="button" onClick={() => turn(1)} disabled={at === pages - 1} aria-label={`Next ${p.label}`} className={PAGE_BTN}>
              <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} />
            </button>
          </Tip>
        </div>
      )}
    </section>
  );
}
