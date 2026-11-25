export type SideTab = "activity" | "team";

interface SideTabsProps {
  tab: SideTab;
  onTab: (tab: SideTab) => void;
  /** Team messages to the viewer they haven't read: a count on the Team tab while Activity is showing. */
  unread: number;
  /** Something happening in Activity while Team is showing: a dot in the state's tone, and its words. */
  signal?: { dot: string; words: string };
  /** The corner card's smaller size (30 px tall), so its top row keeps the icon's height. */
  small?: boolean;
}

/**
 * Activity · Team, at the top of the card beside the story's chat (Shubham, 25 Nov): the story's people chat is a tab
 * next to its activity, so the chat with the agent keeps its width and nothing slides over it. The same control as
 * Ask PM's "Chats · Team". The tab you're not on still tells you when it wants you: a count on Team, a dot on Activity.
 */
export function SideTabs({ tab, onTab, unread, signal, small = false }: SideTabsProps) {
  const TAB = `inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] leading-[18px] font-medium transition-colors duration-[120ms] ${
    small ? "h-[26px]" : "h-8"
  }`;
  return (
    <div role="tablist" aria-label="Beside the chat" className={`flex rounded-full bg-[#F4F4F5] ${small ? "p-0.5" : "p-1"}`}>
      {(["activity", "team"] as const).map((t) => {
        const on = tab === t;
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onTab(t)}
            className={`${TAB} ${on ? "bg-white text-[var(--tx)] shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-[var(--tx2)] hover:text-[var(--tx)]"}`}
          >
            {t === "activity" ? "Activity" : "Team"}
            {t === "activity" && !on && signal && (
              <>
                <span aria-hidden="true" className={`size-1.5 flex-none rounded-full ${signal.dot}`} />
                <span className="sr-only">, {signal.words}</span>
              </>
            )}
            {t === "team" && !on && unread > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--cta)] px-1 text-[10px] leading-none font-semibold text-white tabular-nums">
                {unread > 9 ? "9+" : unread}
                <span className="sr-only"> unread</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
