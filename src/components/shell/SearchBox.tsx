import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import type { SearchItem } from "@/types/dashboard";
import { ICON_BTN } from "@/components/dashboard/classes";
import { STATUS_LABEL, storyRef } from "@/components/dashboard/format";

/**
 * Story search in the top bar (a combobox). `/` focuses it. Choosing a result opens that story's page.
 * Below 1024 px it's an icon that expands into a field across the bar.
 */
export function SearchBox({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const q = query.trim().toLowerCase();
  const exactId = q.match(/^(?:hq-)?(\d+)$/)?.[1];
  const results = q
    ? items
        .filter((t) => t.title.toLowerCase().includes(q) || storyRef(t.id).includes(q) || String(t.id) === exactId)
        .sort((a, b) => Number(String(b.id) === exactId) - Number(String(a.id) === exactId))
        .slice(0, 8)
    : [];
  const showList = open && q.length > 0;

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      setExpanded(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const choose = (id: number) => {
    setQuery("");
    setOpen(false);
    setExpanded(false);
    inputRef.current?.blur();
    window.location.assign(`/stories/${storyRef(id)}`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (results.length) setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      choose(results[active].id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (query) setQuery("");
      else {
        setExpanded(false);
        inputRef.current?.blur();
      }
    }
  };

  return (
    <div className="relative">
      {!expanded && (
        <button
          type="button"
          aria-label="Search"
          className={`${ICON_BTN} lg:hidden`}
          onClick={() => {
            setExpanded(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          <Search aria-hidden="true" size={18} strokeWidth={1.5} />
        </button>
      )}
      <div
        className={`${
          expanded ? "fixed inset-x-0 top-0 z-50 flex h-[var(--bar-h)] items-center gap-2 bg-white px-4" : "hidden"
        } lg:static lg:flex lg:h-auto lg:bg-transparent lg:p-0`}
      >
        <div className="relative w-full lg:w-[280px] xl:w-[360px]">
          <Search
            aria-hidden="true"
            size={16}
            strokeWidth={1.5}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--tx2)]"
          />
          <input
            ref={inputRef}
            role="combobox"
            aria-label="Search stories"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && results[active] ? `${listId}-${results[active].id}` : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              setOpen(false);
              if (!query) setExpanded(false);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search"
            autoComplete="off"
            className="h-8 w-full rounded-full border border-[var(--ctl)] bg-white pr-3 pl-9 text-[16px] leading-5 text-[var(--tx)] transition-[border-color,box-shadow] duration-[120ms] hover:border-[var(--ctl-h)] focus:border-[var(--cta)] focus:shadow-[0_0_0_3px_rgb(47_111_237/0.16)] focus:outline-none lg:text-[14px]"
          />
          {showList && (
            <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-50 overflow-hidden rounded-[8px] bg-white py-1 ring-1 ring-black/[0.08] lg:left-auto lg:w-[400px]">
              <ul id={listId} role="listbox" aria-label="Stories" className="max-h-80 overflow-y-auto">
                {results.map((t, i) => (
                  <li
                    key={t.id}
                    id={`${listId}-${t.id}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(t.id)}
                    className={`mx-1 flex h-10 cursor-pointer items-center gap-3 rounded-[6px] px-3 text-[14px] leading-5 text-[var(--tx)] ${
                      i === active ? "bg-[var(--menu-h)]" : ""
                    }`}
                  >
                    <span className="w-11 flex-none text-[13px] text-[var(--tx2)] tabular-nums">{storyRef(t.id)}</span>
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <span className="flex-none text-[13px] text-[var(--tx2)]">{STATUS_LABEL[t.status]}</span>
                  </li>
                ))}
              </ul>
              {results.length === 0 && (
                <p role="status" className="px-4 py-2.5 text-[14px] leading-5 text-[var(--tx2)]">
                  No stories match &ldquo;{query.trim()}&rdquo;. Try a story ID, like hq-21.
                </p>
              )}
            </div>
          )}
        </div>
        {expanded && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery("");
              setExpanded(false);
            }}
            className="h-8 flex-none rounded-full px-2 text-[14px] text-[var(--tx2)] lg:hidden"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
