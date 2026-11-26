import { useEffect, useId, useRef, type MouseEvent } from "react";
import { X } from "lucide-react";
import { BTN_SECONDARY, ICON_BTN } from "@/components/dashboard/classes";
import { DIALOG } from "./StoryDetails";

// "How statuses work" (Shubham, 26 Nov: the old story page's link under its status box). The five stages in a sentence
// each, who moves the story on, and the few rules that make the rest make sense. Opened from the Status tab and from the
// status box's menu; nothing to act on, so Esc or a click outside closes it.

const STAGES: { name: string; text: (merger: string) => string }[] = [
  { name: "Planning", text: () => "The agent reads the story and writes a plan: a specification page and an engineering page. Nothing is built. Approving the plan starts the build." },
  { name: "Building", text: () => "Queued, then Builder builds it and Checker checks it against the story. It can’t be changed mid-build; notes are read when the round ends." },
  { name: "In review", text: () => "Try the preview. When it’s right, create the pull request. To change it, write a note and rebuild." },
  { name: "Pull request", text: (merger) => `${merger}, the one person with GitHub access, checks it and merges it on GitHub. Robots never merge. If main moves on, the robots bring it in by themselves.` },
  { name: "Done", text: () => "Merged, closed without merging, done with nothing to merge, or cancelled. Reopen a story to build it again." },
];

const RULES = [
  "A status is an instruction: changing it tells the robots what to do. A note is a conversation: it gets a reply and never changes the work by itself.",
  "Whose turn it is shows beside the status: Your review, Your OK, or With someone.",
  "Send to someone hands your decision to a teammate. Take it back whenever you like.",
  "Decisions are kept for good. Changing one keeps the old one, crossed out.",
];

export function StatusGuide({ open, onClose, merger }: { open: boolean; onClose: () => void; merger: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Keep the native dialog in step with `open`; the page behind holds still.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  const onScrimClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={() => open && onClose()} onClick={onScrimClick} className={DIALOG}>
      <header className="flex flex-none items-start gap-3 px-6 pt-6 pb-4">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="m-0 text-base font-semibold">
            How statuses work
          </h2>
          <p className="m-0 mt-1 text-sm text-[var(--tx2)]">Every story goes through five stages, and can go back when something needs to change.</p>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className={`${ICON_BTN} -mt-1 -mr-2`}>
          <X aria-hidden="true" size={16} strokeWidth={1.75} />
        </button>
      </header>
      <div tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto px-6 pt-1 pb-6 outline-none">
        <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
          {STAGES.map((s, i) => (
            <li key={s.name} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-field text-xs font-medium text-[var(--tx)] tabular-nums">
                {i + 1}
              </span>
              <p className="m-0 min-w-0 flex-1 text-sm text-pretty text-[var(--tx2)]">
                <span className="font-semibold text-[var(--tx)]">{s.name}.</span> {s.text(merger)}
              </p>
            </li>
          ))}
        </ol>
        <ul className="m-0 mt-5 flex list-none flex-col gap-2 rounded-[14px] bg-[#F7F7F5] p-4">
          {RULES.map((r) => (
            <li key={r} className="flex gap-2.5 text-sm text-pretty text-[var(--tx)]">
              <span aria-hidden="true" className="mt-2 size-1 flex-none rounded-full bg-[var(--tx2)]" />
              {r}
            </li>
          ))}
        </ul>
      </div>
      <footer className="flex flex-none justify-end px-6 py-4">
        <button type="button" onClick={onClose} className={BTN_SECONDARY}>
          Got it
        </button>
      </footer>
    </dialog>
  );
}
