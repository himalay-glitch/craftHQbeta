import { useEffect, useId } from "react";
import { ChevronRight, MessageCircle } from "lucide-react";
import type { Story } from "@/types/dashboard";
import { decisionFor, KINDS } from "./decisions";
import { chatHref, storyRef } from "./format";
import { SidePanel } from "./SidePanel";

interface NeedsPanelProps {
  /** What's on the deck, in the queue's order. */
  stories: Story[];
  isWide: boolean;
  onClose: () => void;
}

/**
 * See all: every decision on the deck, in the side panel that slides in from the right, as a list of small
 * horizontal cards grouped by kind. Each card is its story's title with the question under it; opening one goes to
 * that story's chat on the Stories page. A question every card in a group shares (Awaiting review) is said once,
 * under the group's name, and those cards show the story's ID instead.
 */
export function NeedsPanel({ stories, isWide, onClose }: NeedsPanelProps) {
  const id = useId();

  useEffect(() => {
    document.querySelector<HTMLElement>("[data-panel-title]")?.focus();
  }, []);

  const groups = KINDS.map((k) => {
    const items = stories.filter((s) => s.need === k.kind).map((s) => ({ story: s, question: decisionFor(s).question }));
    const shared = items.length > 1 && items.every((i) => i.question === items[0].question) ? items[0].question : null;
    return { ...k, items, shared };
  }).filter((g) => g.items.length > 0);

  return (
    <SidePanel
      title="Needs you"
      titleId={`${id}-title`}
      eyebrow={`${stories.length} ${stories.length === 1 ? "decision" : "decisions"}`}
      isWide={isWide}
      onClose={onClose}
    >
      <p className="mt-1 text-[14px] leading-5 text-[var(--tx2)]">Open one to answer it in the story’s chat.</p>

      {groups.map((g) => (
        <section key={g.kind} aria-labelledby={`${id}-${g.kind}`} className="mt-6">
          <h3 id={`${id}-${g.kind}`} className="text-[13px] leading-[18px] font-medium text-[var(--tx2)]">
            {g.label} <span className="font-normal tabular-nums">· {g.items.length}</span>
          </h3>
          {g.shared && <p className="mt-0.5 text-[13px] leading-[18px] text-[var(--tx2)]">Each asks: {g.shared}</p>}
          <ul className="mt-2 flex list-none flex-col gap-2">
            {g.items.map(({ story: s, question }) => (
              <li key={s.id}>
                <a
                  href={chatHref(s.id)}
                  className="group flex items-center gap-3 rounded-[12px] border border-[var(--card-line)] bg-white py-2.5 pr-3 pl-2.5 transition-[background-color,border-color] duration-[120ms] hover:border-[var(--ctl-h)] hover:bg-[var(--ctl-bg-h)]"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex size-8 flex-none items-center justify-center rounded-[8px] bg-[#F1F1F2] text-[var(--tx2)] transition-colors duration-[120ms] group-hover:bg-[#E3ECFD] group-hover:text-[var(--cta)]"
                  >
                    <MessageCircle size={16} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-[14px] leading-5 font-medium text-[var(--tx)]">{s.title}</span>
                      {s.updated && <span className="flex-none text-[12px] leading-4 text-[var(--tx2)]">{s.updated}</span>}
                    </span>
                    <span className="block truncate text-[13px] leading-[18px] text-[var(--tx2)]">
                      <span className="tabular-nums">{storyRef(s.id)}</span>
                      {!g.shared && ` · ${question}`}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </SidePanel>
  );
}
