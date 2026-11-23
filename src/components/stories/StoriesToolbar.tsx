import { useRef, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import type { StoriesView } from "@/types/stories";
import { FilterPill, type FilterOption } from "@/components/dashboard/FilterPill";
import { PauseToggle } from "./PauseToggle";

interface StoriesToolbarProps {
  view: StoriesView;
  onView: (view: StoriesView) => void;
  query: string;
  onQuery: (query: string) => void;
  owner: string;
  ownerOptions: FilterOption<string>[];
  onOwner: (owner: string) => void;
  onClear: () => void;
}

const VIEWS: { key: StoriesView; label: string }[] = [
  { key: "board", label: "Board" },
  { key: "list", label: "List" },
];

/** Header row 2 (DESIGN.md §4.5): view tabs on the left, search and Owner on the right, on one hairline. */
export function StoriesToolbar({ view, onView, query, onQuery, owner, ownerOptions, onOwner, onClear }: StoriesToolbarProps) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // ← → move between the views (DESIGN.md §7.11).
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + VIEWS.length) % VIEWS.length;
    onView(VIEWS[next].key);
    tabs.current[next]?.focus();
  };

  return (
    <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 border-b border-[var(--line)]">
      <div role="tablist" aria-label="View" className="flex items-center gap-6">
        {VIEWS.map(({ key, label }, i) => {
          const selected = view === key;
          return (
            <button
              key={key}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="stories-view"
              tabIndex={selected ? 0 : -1}
              onClick={() => onView(key)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`-mb-px inline-flex h-10 items-center border-b-2 text-[14px] leading-5 font-medium transition-colors duration-[120ms] ${
                selected ? "border-[var(--tx)] text-[var(--tx)]" : "border-transparent text-[var(--tx2)] hover:text-[var(--tx)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 pb-2">
        <label className="relative">
          <span className="sr-only">Search stories</span>
          <Search
            aria-hidden="true"
            size={14}
            strokeWidth={1.75}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--tx2)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.preventDefault();
                onQuery("");
              }
            }}
            placeholder="Search stories"
            autoComplete="off"
            className="h-[30px] w-44 rounded-full border border-[var(--ctl)] bg-white pr-3 pl-8 text-[13px] leading-[18px] text-[var(--tx)] transition-[border-color,box-shadow,width] duration-[120ms] hover:border-[var(--ctl-h)] focus:w-56 focus:border-[var(--cta)] focus:shadow-[0_0_0_3px_rgb(47_111_237/0.16)] focus:outline-none"
          />
        </label>

        <FilterPill name="Owner" value={owner} defaultValue="anyone" options={ownerOptions} onChange={onOwner} />

        {(query || owner !== "anyone") && (
          <button
            type="button"
            onClick={onClear}
            className="h-[30px] rounded-full px-2.5 text-[13px] text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/[0.04] hover:text-[var(--tx)]"
          >
            Clear
          </button>
        )}

        {/* Stops the working marks turning (one-off moves still play); remembered for this viewer. */}
        <PauseToggle />
      </div>
    </div>
  );
}
