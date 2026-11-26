import { ChevronDown } from "lucide-react";
import type { NeedKind } from "@/types/dashboard";
import type { ActivityItem } from "@/types/stories";
import { livePreview, nowOf, readyOf, reasonOf } from "./activity";
import { reasonWord, statusOf, Tile } from "./StoryActivity";

/**
 * Phones: the Activity disclosure's summary line. Closed, it shows what's happening now in one line (updating
 * live), or how many things are ready; open, it says "This story" over the tabs. It never opens by itself.
 */
export function ActivitySummary({ items, yours }: { items: ActivityItem[]; yours?: NeedKind }) {
  const top = nowOf(items)[0];
  const ready = readyOf(items).length;
  const running = livePreview(items);
  const reason = top ? reasonOf(top, top.settling ? undefined : yours) : null;

  return (
    <>
      <span className="sr-only">This story: </span>
      {top && reason ? (
        <span className="contents group-open:hidden">
          <Tile key={top.state} item={top} size={28} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{top.title}</span>
            <span className="block truncate text-xs text-[var(--tx2)]">
              {reasonWord(top, reason, yours)}
              {statusOf(top) && ` · ${statusOf(top)}`}
            </span>
          </span>
        </span>
      ) : (
        <span className="min-w-0 flex-1 group-open:hidden">
          <span className="block text-sm font-medium">This story</span>
          <span className="block truncate text-xs text-[var(--tx2)]">
            Nothing running{ready > 0 && ` · ${ready} ready`}
          </span>
        </span>
      )}
      {running && running.id !== top?.id && (
        <span className="contents group-open:hidden">
          <span aria-hidden="true" className="size-2 flex-none rounded-full bg-[var(--green)]" />
          <span className="sr-only">, preview running</span>
        </span>
      )}
      <span className="hidden flex-1 text-sm font-medium group-open:block">This story</span>
      <ChevronDown aria-hidden="true" size={16} strokeWidth={1.75} className="flex-none text-[var(--tx2)] transition-transform duration-[120ms] group-open:rotate-180 motion-reduce:transition-none" />
    </>
  );
}
