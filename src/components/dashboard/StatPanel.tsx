import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Indicator, type Tone } from "./Indicator";
import { storyRef } from "./format";

export interface StatItem {
  id: number;
  title: string;
  /** The card's second line, after the ID: "8 of 8 checks passed", "Building", why it stopped. */
  detail?: string;
  /** When, on the right of the title. */
  time?: string;
  /** An agent is on it right now: a small green dot, pulsing. */
  live?: boolean;
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

// The cards' sizes, for working out how many fit: 52 px cards 6 px apart, the "+ n more" line, and a little room
// kept free at the foot so the last card never touches the tile's edge.
const CARD_H = 52;
const GAP = 6;
const MORE_H = 22;
const KEEP = 12;
const WIDE = "(min-width: 1024px)";
const fitting = (space: number, total: number) => {
  const per = CARD_H + GAP;
  if (Math.floor((space - KEEP + GAP) / per) >= total) return total;
  return Math.max(1, Math.floor((space - KEEP - MORE_H) / per));
};

/**
 * A KPI tile beside the deck (DESIGN.md §5.6): the label, the number, one line of context, then the stories behind
 * the number as small cards (title and when, then the ID and one fact). On a desktop the tile is as tall as the
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
                  className="flex h-[52px] w-full flex-col justify-center gap-0.5 rounded-[10px] border border-[var(--card-line)] bg-[#FAFAFA] px-3 text-left transition-colors duration-[120ms] hover:border-[var(--ctl-h)] hover:bg-white"
                >
                  <span className="flex w-full items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] leading-[18px] font-medium text-[var(--tx)]">{s.title}</span>
                    {s.time && <span className="flex-none text-[12px] leading-4 text-[var(--tx2)]">{s.time}</span>}
                  </span>
                  <span className="flex w-full min-w-0 items-center gap-1.5 text-[12px] leading-4 text-[var(--tx2)]">
                    {s.live && <span aria-hidden="true" className="size-1.5 flex-none rounded-full bg-[#16A34A] motion-safe:animate-pulse" />}
                    <span className="flex-none tabular-nums">{storyRef(s.id)}</span>
                    {s.detail && <span className="min-w-0 truncate">· {s.detail}</span>}
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
