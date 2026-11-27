import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight, CircleAlert, LoaderCircle, ShieldCheck, type LucideIcon } from "lucide-react";
import { Indicator, type Tone } from "./Indicator";
import { storyRef } from "./format";

/** The small mark on a card's left: its checks as a ring, or what state it's in. */
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

const TINT = {
  good: "bg-[#E8F6EE] text-[#15803D]",
  bad: "bg-[#FDECEC] text-[#C62828]",
  plain: "bg-[#F1F1F2] text-[var(--tx2)]",
} as const;

/** The checks as a ring that fills as they pass, with a tick when they all have. */
function ChecksRing({ passed, total }: { passed: number; total: number }) {
  const r = 6.5;
  const c = 2 * Math.PI * r;
  const done = total > 0 ? passed / total : 0;
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.25" />
      <circle
        cx="9"
        cy="9"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeDasharray={`${c * done} ${c}`}
        transform="rotate(-90 9 9)"
      />
      {passed === total && (
        <path d="M6.1 9.2 8 11.1l3.9-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function Mark({ mark }: { mark?: StatMark }) {
  if (!mark) return null;
  const tint =
    mark.type === "checks" ? (mark.passed === mark.total ? TINT.good : TINT.bad) : mark.type === "alert" ? TINT.bad : TINT.good;
  return (
    <span aria-hidden="true" className={`inline-flex size-7 flex-none items-center justify-center rounded-[8px] ${tint}`}>
      {mark.type === "checks" ? (
        <ChecksRing passed={mark.passed} total={mark.total} />
      ) : mark.type === "alert" ? (
        <CircleAlert size={15} strokeWidth={2} />
      ) : mark.type === "building" ? (
        <LoaderCircle size={15} strokeWidth={2.25} className="motion-safe:animate-spin" />
      ) : (
        <ShieldCheck size={15} strokeWidth={2} />
      )}
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
  /** The stories behind the number, each a small card; as many as fit are shown. */
  items: StatItem[];
  onItem: (id: number) => void;
  /** The tile's own action (filter the deck, open the Details panel), from its label and number, and "+ n more". */
  onOpen: () => void;
  /** What the tile's button does, for screen readers, e.g. "Show only these in the deck". */
  openLabel: string;
  /** Said instead of the cards when there's nothing behind the number. */
  empty: string;
  /** For tiles that filter the deck: on while their filter is. */
  pressed?: boolean;
  className?: string;
}

// The cards' sizes, for working out how many fit: 48 px cards 6 px apart, the "+ n more" line, and a little room
// kept free at the foot (with the tile's own 16 px padding) so the last card never touches the tile's edge.
const CARD_H = 48;
const GAP = 6;
const MORE_H = 22;
const KEEP = 4;
const WIDE = "(min-width: 1024px)";
const fitting = (space: number, total: number) => {
  const per = CARD_H + GAP;
  if (Math.floor((space - KEEP + GAP) / per) >= total) return total;
  return Math.max(1, Math.floor((space - KEEP - MORE_H) / per));
};

/**
 * A KPI tile beside the deck (DESIGN.md §5.6): the label, the number, one line of context, then the stories behind
 * the number as small cards: a tinted mark for its state (the checks as a ring, an alert, building, in checks),
 * the title and when, then the ID as a tag and one fact. On a desktop the tile is as tall as the
 * deck, so it shows as many cards as fit, with "+ n more" when some don't, and a little room left at its foot;
 * on narrower screens, where tiles stack, three.
 */
export function StatPanel(p: StatPanelProps) {
  const box = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSpace(window.matchMedia(WIDE).matches ? el.clientHeight : null);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  const count = space === null ? Math.min(3, p.items.length) : fitting(space, p.items.length);
  const shown = p.items.slice(0, count);
  const more = p.items.length - shown.length;

  return (
    <section
      aria-label={p.label}
      className={`flex min-h-0 flex-col rounded-[12px] border bg-white p-4 transition-[border-color,box-shadow] duration-[120ms] ${
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
        <span className="flex items-center gap-2 text-[13px] leading-5 text-[var(--tx2)]">
          <Indicator icon={p.icon} tone={p.tone} on={p.value > 0} spin={p.spin} ring={p.ring} size={20} />
          <span className="min-w-0 flex-1 truncate">{p.label}</span>
          <ChevronRight
            aria-hidden="true"
            size={16}
            strokeWidth={1.75}
            className="flex-none opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        </span>
        <span className="mt-3 text-[30px] leading-9 font-medium tracking-[-0.02em] text-[var(--tx)] tabular-nums">{p.value}</span>
        <span className="truncate text-[13px] leading-[18px] text-[var(--tx2)]">{p.sub}</span>
      </button>

      {p.items.length === 0 ? (
        <p className="pt-4 text-[13px] leading-[18px] text-[var(--tx2)]">{p.empty}</p>
      ) : (
        // On a desktop the cards are laid over the space below the number, so they never make the tile taller than
        // the deck; only as many as fit are drawn.
        <div ref={box} className="relative mt-4 min-h-0 lg:flex-1">
          <ul className="flex list-none flex-col gap-1.5 lg:absolute lg:inset-x-0 lg:top-0">
            {shown.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  data-story={s.id}
                  onClick={() => p.onItem(s.id)}
                  className="flex h-[48px] w-full items-center gap-2.5 rounded-[10px] border border-[var(--card-line)] bg-white px-2.5 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[transform,border-color,box-shadow] duration-[120ms] hover:-translate-y-px hover:border-[var(--ctl-h)] hover:shadow-[0_6px_14px_-6px_rgb(0_0_0/0.16)] motion-reduce:hover:translate-y-0"
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
            {more > 0 && (
              <li>
                <button
                  type="button"
                  onClick={p.onOpen}
                  className="h-[22px] px-1 text-[12px] leading-4 text-[var(--tx2)] underline-offset-2 hover:text-[var(--tx)] hover:underline"
                >
                  + {more} more
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
