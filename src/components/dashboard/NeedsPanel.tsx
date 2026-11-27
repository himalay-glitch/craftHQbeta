import { useEffect, useId } from "react";
import { ChevronRight } from "lucide-react";
import type { Story } from "@/types/dashboard";
import { decisionFor, KINDS } from "./decisions";
import { storyRef } from "./format";
import { SidePanel } from "./SidePanel";

interface NeedsPanelProps {
  /** What's on the deck, in the queue's order. */
  stories: Story[];
  /** The card on top of the deck when the panel opened. */
  top: number | null;
  isWide: boolean;
  onClose: () => void;
  /** Puts that decision on top of the deck (the panel closes). */
  onPick: (id: number) => void;
}

/**
 * See all: every decision on the deck, in the side panel that slides in from the right, grouped by kind. Each one
 * is its question, the card's headline, with the story under it, so you can scan them all and pick the one to
 * answer first. Picking puts it on top of the deck and closes the panel; the answering stays on the card.
 */
export function NeedsPanel({ stories, top, isWide, onClose, onPick }: NeedsPanelProps) {
  const id = useId();

  useEffect(() => {
    document.querySelector<HTMLElement>("[data-panel-title]")?.focus();
  }, []);

  const groups = KINDS.map((k) => ({ ...k, items: stories.filter((s) => s.need === k.kind) })).filter((g) => g.items.length > 0);

  return (
    <SidePanel
      title="Needs you"
      titleId={`${id}-title`}
      eyebrow={`${stories.length} ${stories.length === 1 ? "decision" : "decisions"}`}
      isWide={isWide}
      onClose={onClose}
    >
      <p className="mt-1 text-[14px] leading-5 text-[var(--tx2)]">Pick one to answer it on the deck.</p>

      {groups.map((g) => (
        <section key={g.kind} aria-labelledby={`${id}-${g.kind}`} className="mt-6">
          <h3 id={`${id}-${g.kind}`} className="text-[13px] leading-[18px] font-medium text-[var(--tx2)]">
            {g.label} <span className="font-normal tabular-nums">· {g.items.length}</span>
          </h3>
          <ul className="mt-1 list-none">
            {g.items.map((s) => {
              const onTop = s.id === top;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onPick(s.id)}
                    aria-current={onTop ? "true" : undefined}
                    className="group -mx-3 flex w-[calc(100%+24px)] items-start gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-[80ms] hover:bg-[var(--row-h)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[14px] leading-5 font-medium text-[var(--tx)]">{decisionFor(s).question}</span>
                      <span className="mt-0.5 block truncate text-[13px] leading-[18px] text-[var(--tx2)]">
                        {s.title} · <span className="tabular-nums">{storyRef(s.id)}</span>
                        {s.updated && ` · ${s.updated}`}
                      </span>
                    </span>
                    {onTop ? (
                      <span className="mt-px flex-none rounded-full bg-[#EEF4FF] px-2 py-0.5 text-[12px] leading-4 font-medium text-[#1F57C3]">On top</span>
                    ) : (
                      <ChevronRight
                        aria-hidden="true"
                        size={16}
                        strokeWidth={1.75}
                        className="mt-0.5 flex-none text-[var(--tx2)] opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </SidePanel>
  );
}
