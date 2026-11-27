import { Check, GitMerge } from "lucide-react";
import type { ShippedItem } from "@/types/dashboard";
import { Indicator } from "./Indicator";

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface ShippedThisWeekProps {
  shipped: ShippedItem[];
  /** Stories done in the whole project, and how many there are. */
  done: number;
  total: number;
  onOpen: (id: number) => void;
}

/**
 * What shipped (DESIGN.md §5.6, the third question): proof the work is moving, and the way to check it. On the
 * columns' grid: under the left tiles, this week's number as a KPI with the project's progress; beside it, what
 * merged, newest first, in two columns under the deck and the right tiles, each opening its story. No timeline: the merges aren't evenly spaced in time, so points on
 * a line would say something false.
 */
export function ShippedThisWeek({ shipped, done, total, onOpen }: ShippedThisWeekProps) {
  return (
    <section
      aria-labelledby="shipped-title"
      className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1fr)_480px_minmax(0,1fr)]"
    >
      <div className="px-4">
        <h2 id="shipped-title" className="flex items-center gap-2 text-[13px] leading-5 font-normal text-[var(--tx2)]">
          <Indicator icon={Check} tone="done" on={shipped.length > 0} size={20} />
          Shipped this week
        </h2>
        <p className="mt-3 text-[30px] leading-9 font-medium tracking-[-0.02em] text-[var(--tx)] tabular-nums">{shipped.length}</p>
        <p className="text-[13px] leading-[18px] text-[var(--tx2)] tabular-nums">
          {done} of {total} stories done
        </p>
      </div>

      {shipped.length === 0 ? (
        <p className="px-4 text-[13px] leading-[18px] text-[var(--tx2)] lg:col-span-2 lg:pt-8">
          Nothing has merged this week yet. Merged stories show here, newest first.
        </p>
      ) : (
        <ul aria-label="Merged this week, newest first" className="grid list-none grid-cols-1 content-start gap-x-6 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-[480px_minmax(0,1fr)] lg:pt-7">
          {shipped.map((s) => (
            <li key={s.id} className="min-w-0">
              <button
                type="button"
                data-story={s.id}
                onClick={() => onOpen(s.id)}
                className="flex w-full items-center gap-2.5 rounded-[8px] px-4 py-2 text-left text-[13px] leading-5 transition-colors duration-[80ms] hover:bg-black/[0.04]"
              >
                <GitMerge aria-hidden="true" size={14} strokeWidth={2} className="flex-none text-[var(--success-ink)]" />
                <span className="min-w-0 flex-1 truncate text-[var(--tx)]">{s.title}</span>
                <span className="flex-none text-[12px] text-[var(--tx2)]">{capitalise(s.when)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
