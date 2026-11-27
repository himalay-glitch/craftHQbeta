import { useId, type ReactNode } from "react";
import { Tabs } from "radix-ui";
import { motion, useReducedMotion } from "framer-motion";
import chat from "./chat.module.css";

// The right-hand side in tabs (Shubham, 26 Nov: one long column had grown past the screen). Status first, because it's
// the main thing and says whose turn it is; then the Output (what was made, in parts: the pages, the preview, the code
// and the files; Shubham, 27 Nov: "I would not say Work") and the History. No Story tab (Shubham, 27 Nov): what was
// written opens in Story details, from the story's title. The same pill tabs as Ask PM's side panel ("Chats | Team"), since the story page speaks Ask PM's design
// language (Shubham, 26 Nov: "we have a different tab style"): a grey rounded track, the chosen tab a white pill. ← and
// → move between them. A tab you're not on shows a dot when it needs you (Status) or while something is being made
// (Output), so nothing important hides.

export type PanelTab = "status" | "output" | "history";

export const PANEL_TABS: { key: PanelTab; label: string }[] = [
  { key: "status", label: "Status" },
  { key: "output", label: "Output" },
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
  // The white pill slides from the tab you were on to the one you picked (Shubham, 27 Nov: smooth), and the tab's
  // content fades in. Its own name per tab row, since the tablet card and the phone fold each have one.
  const pill = useId();
  const reduce = useReducedMotion();
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
              className="relative inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium text-[var(--tx2)] transition-colors duration-[120ms] hover:text-[var(--tx)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cta)] data-[state=active]:text-[var(--tx)]"
            >
              {key === tab && (
                <motion.span
                  aria-hidden="true"
                  layoutId={pill}
                  transition={reduce ? { duration: 0 } : { duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute inset-0 rounded-full bg-white ring-1 ring-black/[0.06]"
                />
              )}
              <span className="relative">{label}</span>
              {dot && (
                <>
                  <span aria-hidden="true" className={`relative size-1.5 flex-none rounded-full ${DOT[dot].className}`} />
                  <span className="sr-only">, {DOT[dot].say}</span>
                </>
              )}
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>
      </div>
      {tabs.map(({ key }) => (
        <Tabs.Content key={key} value={key} className={`relative min-h-0 flex-1 overflow-y-auto outline-none ${chat.tabIn} ${bodyClassName}`}>
          {content[key]}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
