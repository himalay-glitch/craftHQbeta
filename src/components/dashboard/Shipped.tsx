import { GitMerge } from "lucide-react";
import type { ShippedItem } from "@/types/dashboard";
import { storyRef } from "./format";

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Shipped this week (DESIGN.md §5.6, what shipped): the week's merges, newest first, and the project's done count.
 * Beside the deck it's a short list; under the team board it lays the merges out side by side.
 */
export function Shipped({ shipped, done, layout }: { shipped: ShippedItem[]; done: number; layout: "side" | "board" }) {
  const board = layout === "board";
  return (
    <section aria-labelledby="shipped-title" className="rounded-[16px] border border-[var(--card-line)] bg-white p-4">
      <header className="flex items-baseline justify-between gap-3">
        <h2 id="shipped-title" className="text-[15px] leading-[22px] font-semibold text-[var(--tx)]">
          Shipped this week
        </h2>
        <span className="text-[13px] leading-[18px] text-[var(--tx2)] tabular-nums">{done} done in all</span>
      </header>
      {shipped.length === 0 ? (
        <p className="mt-2 text-[13px] leading-[18px] text-[var(--tx2)]">Nothing has merged this week yet.</p>
      ) : (
        <ul className={`mt-2 list-none ${board ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-4" : "flex flex-col"}`}>
          {shipped.map((s) => (
            <li
              key={s.id}
              className={`flex items-start gap-2.5 ${board ? "rounded-[12px] bg-[#F6FAF8] px-3 py-2.5" : "border-b border-[var(--line)] py-2 last:border-b-0"}`}
            >
              <GitMerge aria-hidden="true" size={15} strokeWidth={1.75} className="mt-0.5 flex-none text-[#2F755D]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] leading-[18px] text-[var(--tx)]">{s.title}</span>
                <span className="block text-[12px] leading-4 text-[var(--tx2)]">
                  <span className="tabular-nums">{storyRef(s.id)}</span> · {capitalise(s.when)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
