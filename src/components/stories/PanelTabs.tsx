import type { ReactNode } from "react";
import { Tabs } from "radix-ui";

// The right-hand side in tabs (Shubham, 26 Nov: one long column had grown past the screen). Status first, because it's
// the main thing and says whose turn it is; then the Story (what was written), the Work (the plan, the preview, the code
// and the files, as they come to exist) and the History. The same pill tabs as Ask PM's side panel ("Chats | Team"),
// since the story page speaks Ask PM's design language (Shubham, 26 Nov: "we have a different tab style"): a grey
// rounded track, the chosen tab a white pill. ← and → move between them. A tab you're not on shows a dot when it needs
// you (Status) or while something is being made (Work), so nothing important hides.

export type PanelTab = "status" | "story" | "work" | "history";

export const PANEL_TABS: { key: PanelTab; label: string }[] = [
  { key: "status", label: "Status" },
  { key: "story", label: "Story" },
  { key: "work", label: "Work" },
  { key: "history", label: "History" },
];

const DOT = {
  yours: { className: "bg-[#d97706]", say: "needs you" },
  busy: { className: "bg-[var(--tx)]", say: "something is being made" },
} as const;

interface PanelTabsProps {
  tab: PanelTab;
  /** The tabs that have something in them (Shubham, 26 Nov: "if the Story tab is empty, why is it there?"). A tab
   *  appears once it has content, the same rule as the parts inside it. Status is always there. */
  shown: PanelTab[];
  onTab: (tab: PanelTab) => void;
  dots: Partial<Record<PanelTab, keyof typeof DOT>>;
  content: Record<PanelTab, ReactNode>;
  /** Padding for the tab row and the tab's content, so the desktop card and the phone fold can each fit it. */
  listClassName?: string;
  bodyClassName?: string;
}

export function PanelTabs({ tab, shown, onTab, dots, content, listClassName = "", bodyClassName = "" }: PanelTabsProps) {
  const tabs = PANEL_TABS.filter((t) => t.key === "status" || shown.includes(t.key));
  return (
    <Tabs.Root value={tab} onValueChange={(v) => onTab(v as PanelTab)} className="flex min-h-0 flex-1 flex-col">
      <div className={`flex-none ${listClassName}`}>
      <Tabs.List aria-label="About this story" className="flex rounded-full bg-[#F4F4F5] p-1">
        {tabs.map(({ key, label }) => {
          const dot = key === tab ? undefined : dots[key];
          return (
            <Tabs.Trigger
              key={key}
              value={key}
              className="inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium text-[var(--tx2)] transition-colors duration-[120ms] hover:text-[var(--tx)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cta)] data-[state=active]:bg-white data-[state=active]:text-[var(--tx)] data-[state=active]:ring-1 data-[state=active]:ring-black/[0.06]"
            >
              {label}
              {dot && (
                <>
                  <span aria-hidden="true" className={`size-1.5 flex-none rounded-full ${DOT[dot].className}`} />
                  <span className="sr-only">, {DOT[dot].say}</span>
                </>
              )}
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>
      </div>
      {tabs.map(({ key }) => (
        <Tabs.Content key={key} value={key} className={`relative min-h-0 flex-1 overflow-y-auto outline-none ${bodyClassName}`}>
          {content[key]}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
