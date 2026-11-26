import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Indicator, type Tone } from "./Indicator";

export interface StatItem {
  id: number;
  title: string;
}

interface StatPanelProps {
  label: string;
  value: number;
  sub: ReactNode;
  icon: LucideIcon;
  tone: Tone;
  spin?: boolean;
  ring?: boolean;
  /** The stories behind the number; the first three are named. */
  items: StatItem[];
  onItem: (id: number) => void;
  /** The tile's own action (filter the deck, open the Details panel), from its label and number. */
  onOpen: () => void;
  /** What the tile's button does, for screen readers, e.g. "Show only these in the deck". */
  openLabel: string;
  /** Said instead of the names when there's nothing behind the number. */
  empty: string;
  /** For tiles that filter the deck: on while their filter is. */
  pressed?: boolean;
  className?: string;
}

const SHOWN = 3;

/**
 * A KPI tile beside the deck (DESIGN.md §5.6): the label, the number, one line of context, then the first few
 * stories behind the number. Nothing else: no ids, no times, no dividers. Every tile reads the same way
 * down, and it stretches to its column, so whatever room is left is the tile's own, not a gap in the page.
 */
export function StatPanel(p: StatPanelProps) {
  const shown = p.items.slice(0, SHOWN);
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

      {shown.length === 0 ? (
        <p className="pt-5 text-[13px] leading-[18px] text-[var(--tx2)]">{p.empty}</p>
      ) : (
        <ul className="flex list-none flex-col pt-5">
          {shown.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                data-story={s.id}
                onClick={() => p.onItem(s.id)}
                className="-mx-2 block w-[calc(100%+16px)] truncate rounded-[6px] px-2 py-1 text-left text-[13px] leading-5 text-[var(--tx)] transition-colors duration-[80ms] hover:bg-[var(--row-h)]"
              >
                {s.title}
              </button>
            </li>
          ))}
          {more > 0 && <li className="pt-1 text-[12px] leading-4 text-[var(--tx2)]">+ {more} more</li>}
        </ul>
      )}
    </section>
  );
}
