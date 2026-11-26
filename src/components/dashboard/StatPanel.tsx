import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Indicator, type Tone } from "./Indicator";
import { storyRef } from "./format";

export interface StatItem {
  id: number;
  title: string;
  /** Right of the title, e.g. "Building", "just now". */
  meta?: string;
}

interface StatPanelProps {
  label: string;
  value: number;
  sub: ReactNode;
  icon: LucideIcon;
  tone: Tone;
  spin?: boolean;
  ring?: boolean;
  /** The stories behind the number. */
  items: StatItem[];
  /** How many fit before "+ n more". */
  max: number;
  onItem: (id: number) => void;
  /** The card's own action (filter the deck, open the Details panel), from its header and its foot. */
  onOpen: () => void;
  /** The foot's words, e.g. "Review them one by one". */
  action: string;
  /** Shown instead of the list when there's nothing behind the number. */
  empty: string;
  /** For cards that filter the deck: shown while their filter is on. */
  pressed?: boolean;
  className?: string;
}

/**
 * A stat beside the deck: its indicator, label and number as before, then the stories behind the number, and its
 * action at the foot. It stretches to its column, so the list and the foot fill the height and nothing is left
 * blank beside the deck.
 */
export function StatPanel(p: StatPanelProps) {
  const shown = p.items.slice(0, p.max);
  return (
    <section
      aria-label={p.label}
      className={`flex min-h-0 flex-col rounded-[12px] border bg-white shadow-[var(--shadow-card)] ${
        p.pressed ? "border-[var(--cta)]" : "border-[var(--card-line)]"
      } ${p.className ?? ""}`}
    >
      <button
        type="button"
        onClick={p.onOpen}
        aria-pressed={p.pressed}
        className="group flex flex-col rounded-t-[12px] px-4 pt-3 pb-3 text-left transition-colors duration-[120ms] hover:bg-[#FAFAFA]"
      >
        <span className="flex items-center justify-between gap-2 text-[13px] leading-[18px] text-[var(--tx2)]">
          <span className="flex min-w-0 items-center gap-2">
            <Indicator icon={p.icon} tone={p.tone} on={p.value > 0} spin={p.spin} ring={p.ring} />
            <span className="truncate">{p.label}</span>
          </span>
          <ChevronRight
            aria-hidden="true"
            size={16}
            strokeWidth={1.5}
            className="flex-none opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        </span>
        <span className="mt-2 flex items-baseline gap-2">
          <span className="text-[32px] leading-9 font-normal tracking-[-0.02em] text-[var(--tx)] tabular-nums">{p.value}</span>
          <span className="min-w-0 truncate text-[13px] leading-[18px] text-[var(--tx2)]">{p.sub}</span>
        </span>
      </button>

      <div className="mx-4 h-px bg-[var(--line)]" />

      {shown.length === 0 ? (
        <p className="flex flex-1 items-center px-4 py-3 text-[13px] leading-[18px] text-[var(--tx2)]">{p.empty}</p>
      ) : (
        <ul className="flex min-h-0 flex-1 list-none flex-col px-2 py-1.5">
          {shown.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                data-story={s.id}
                onClick={() => p.onItem(s.id)}
                className="flex w-full items-baseline gap-2 rounded-[8px] px-2 py-1.5 text-left text-[13px] leading-[18px] transition-colors duration-[80ms] hover:bg-[var(--row-h)]"
              >
                <span className="w-10 flex-none text-[12px] text-[var(--tx2)] tabular-nums">{storyRef(s.id)}</span>
                <span className="min-w-0 flex-1 truncate text-[var(--tx)]">{s.title}</span>
                {s.meta && <span className="flex-none text-[12px] text-[var(--tx2)]">{s.meta}</span>}
              </button>
            </li>
          ))}
          {p.items.length > shown.length && (
            <li className="px-2 py-1 text-[12px] leading-4 text-[var(--tx2)]">+ {p.items.length - shown.length} more</li>
          )}
        </ul>
      )}

      <button
        type="button"
        onClick={p.onOpen}
        className="mt-auto flex items-center justify-between rounded-b-[12px] border-t border-[var(--line)] px-4 py-2.5 text-left text-[13px] leading-[18px] font-medium text-[var(--tx)] transition-colors duration-[120ms] hover:bg-[#FAFAFA]"
      >
        {p.action}
        <ChevronRight aria-hidden="true" size={15} strokeWidth={1.75} className="text-[var(--tx2)]" />
      </button>
    </section>
  );
}
