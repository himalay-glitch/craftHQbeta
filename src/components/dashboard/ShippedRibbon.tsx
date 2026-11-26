import type { ShippedItem } from "@/types/dashboard";
import { storyRef } from "./format";

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * What shipped (DESIGN.md §5.6): this week's merges on one line, oldest on the left, newest at the right, each a
 * point on the week with its title and when it merged; the project's done count on the right of the heading.
 */
export function ShippedRibbon({ shipped, done }: { shipped: ShippedItem[]; done: number }) {
  const week = [...shipped].reverse();
  return (
    <section aria-labelledby="shipped-title">
      <header className="flex items-baseline justify-between gap-3">
        <h2 id="shipped-title" className="text-[14px] leading-5 font-semibold text-[var(--tx)]">
          Shipped this week
        </h2>
        <span className="text-[13px] leading-[18px] text-[var(--tx2)] tabular-nums">{done} done in all</span>
      </header>
      {week.length === 0 ? (
        <p className="mt-3 text-[13px] leading-[18px] text-[var(--tx2)]">Nothing has merged this week yet.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          <ol className="relative mt-4 grid min-w-[560px] list-none" style={{ gridTemplateColumns: `repeat(${week.length}, minmax(0, 1fr))` }}>
            {/* The week's line, running on past the last merge to now. */}
            <span aria-hidden="true" className="absolute top-[6px] right-0 left-[6px] h-px bg-[linear-gradient(90deg,#D6E8DE,#D6E8DE_85%,transparent)]" />
            {week.map((s) => (
              <li key={s.id} className="relative min-w-0 pr-4">
                <span aria-hidden="true" className="relative z-10 flex size-[13px] items-center justify-center rounded-full bg-white ring-2 ring-[#2F755D]">
                  <span className="size-[5px] rounded-full bg-[#2F755D]" />
                </span>
                <p className="mt-2.5 truncate text-[13px] leading-[18px] text-[var(--tx)]">{s.title}</p>
                <p className="text-[12px] leading-4 text-[var(--tx2)]">
                  {capitalise(s.when)} · <span className="tabular-nums">{storyRef(s.id)}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
