import { useEffect, useId, type KeyboardEvent } from "react";
import type { ActivityItem, RunningItem } from "@/types/dashboard";
import { storyRef } from "./format";
import { SidePanel } from "./SidePanel";

export type DetailsTab = "agent" | "activity";

interface ActivityPanelProps {
  tab: DetailsTab;
  onTab: (tab: DetailsTab) => void;
  running: RunningItem[];
  queued: number;
  loopTick: string;
  activity: ActivityItem[];
  about: string;
  version: string;
  isWide: boolean;
  onClose: () => void;
  onOpenStory: (id: number) => void;
}

const TABS: { key: DetailsTab; label: string }[] = [
  { key: "agent", label: "With the agent" },
  { key: "activity", label: "Recent activity" },
];
const SECTION = "text-[13px] leading-[18px] font-medium text-[var(--tx2)]";
const ROW = "flex min-h-11 w-full items-center gap-3 border-b border-[var(--line)] py-2 text-left last:border-b-0";

/** The prototype's Details panel: what the agent has (With the agent) and what happened (Recent activity). */
export function ActivityPanel(p: ActivityPanelProps) {
  const id = useId();

  useEffect(() => {
    document.querySelector<HTMLElement>("[data-panel-title]")?.focus();
  }, []);

  // Tabs follow the ARIA pattern: ← → move between them.
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = TABS[(TABS.findIndex((t) => t.key === p.tab) + 1) % TABS.length].key;
    p.onTab(next);
    document.getElementById(`${id}-${next}`)?.focus();
  };

  return (
    <SidePanel title="Details" titleId={`${id}-title`} isWide={p.isWide} onClose={p.onClose}>
      <div role="tablist" aria-label="Details" onKeyDown={onTabKey} className="mt-3 flex gap-5 border-b border-[var(--line)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`${id}-${t.key}`}
            type="button"
            role="tab"
            aria-selected={p.tab === t.key}
            aria-controls={`${id}-panel`}
            tabIndex={p.tab === t.key ? 0 : -1}
            onClick={() => p.onTab(t.key)}
            className={`-mb-px h-10 border-b-2 text-[14px] leading-5 transition-colors duration-[120ms] ${
              p.tab === t.key
                ? "border-[var(--tx)] font-medium text-[var(--tx)]"
                : "border-transparent text-[var(--tx2)] hover:text-[var(--tx)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${p.tab}`} className="pt-5">
        {p.tab === "agent" ? (
          <>
            <div className="flex items-center justify-between">
              <h3 className={SECTION}>Agent&rsquo;s turn</h3>
              <span className="flex items-center gap-1.5 text-[12px] leading-4 text-[var(--green)]">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--green)]" />
                Loop tick · {p.loopTick}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-[12px] border border-[var(--card-line)]">
              {[
                { n: p.running.length, l: "Active runs" },
                { n: p.queued, l: "Queued runs" },
              ].map((c, i) => (
                <div key={c.l} className={`px-4 py-3 ${i ? "border-l border-[var(--card-line)]" : ""}`}>
                  <span className="block text-[24px] leading-8 tabular-nums">{c.n}</span>
                  <span className="text-[13px] leading-[18px] text-[var(--tx2)]">{c.l}</span>
                </div>
              ))}
            </div>

            <h3 className={`${SECTION} mt-6 flex justify-between`}>
              Active runs <span className="tabular-nums">{p.running.length}</span>
            </h3>
            <ul className="mt-1">
              {p.running.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => p.onOpenStory(r.id)} className={`${ROW} group`}>
                    <span className="w-11 flex-none text-[13px] text-[var(--tx2)] tabular-nums">{storyRef(r.id)}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] leading-5 group-hover:underline group-hover:underline-offset-2">
                      {r.title}
                    </span>
                    <span
                      className={`flex-none rounded-full px-2 py-0.5 text-[12px] leading-4 font-medium ${
                        r.status === "In progress" ? "bg-[#E9F0FE] text-[#1F57C3]" : "bg-[#F0F0F0] text-[#4A4B4D]"
                      }`}
                    >
                      {r.status}
                    </span>
                    <span className="w-14 flex-none text-right text-[13px] text-[var(--tx2)]">{r.updated}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[13px] leading-[18px] text-[var(--tx2)]">
              Blocked stories are in Needs you, because they need a person.
            </p>
          </>
        ) : (
          <>
            <ul>
              {p.activity.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    disabled={a.storyId === undefined}
                    onClick={() => a.storyId !== undefined && p.onOpenStory(a.storyId)}
                    className={`${ROW} group items-start`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-[7px] size-2 flex-none rounded-full ${a.finished ? "bg-[var(--green)]" : "bg-[var(--cta)]"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] leading-5 font-medium">{a.title}</span>
                      <span className="block truncate text-[13px] leading-[18px] text-[var(--tx2)] group-hover:underline group-hover:underline-offset-2">
                        {a.detail}
                      </span>
                    </span>
                    <span className="flex-none text-[13px] leading-5 text-[var(--tx2)]">{a.updated}</span>
                  </button>
                </li>
              ))}
            </ul>
            <h3 className={`${SECTION} mt-6`}>About</h3>
            <p className="mt-2 text-[14px] leading-5 text-[var(--tx2)]">{p.about}</p>
            <dl className="mt-3 grid grid-cols-[104px_minmax(0,1fr)] text-[14px] leading-5">
              <dt className="text-[13px] text-[var(--tx2)]">Version</dt>
              <dd className="tabular-nums">{p.version}</dd>
            </dl>
          </>
        )}
      </div>
    </SidePanel>
  );
}
