import { useEffect, useId, useRef, type MouseEvent } from "react";
import { X } from "lucide-react";
import { BTN_SECONDARY, ICON_BTN } from "@/components/dashboard/classes";

// A confirm (DESIGN.md §7.9): a native <dialog>, 384 px, fading and scaling in; a bottom sheet on phones.
const DIALOG =
  "m-auto w-full max-w-sm flex-col overflow-hidden rounded-2xl border-0 bg-white p-0 text-[var(--tx)] ring-1 ring-black/[0.08] open:flex backdrop:bg-scrim " +
  "opacity-0 scale-98 transition-all transition-discrete duration-200 ease-out " +
  "open:opacity-100 open:scale-100 starting:open:opacity-0 starting:open:scale-98 " +
  "backdrop:opacity-0 backdrop:transition-all backdrop:transition-discrete backdrop:duration-200 " +
  "open:backdrop:opacity-100 starting:open:backdrop:opacity-0 " +
  "motion-reduce:transition-none motion-reduce:backdrop:transition-none " +
  "max-sm:mb-0 max-sm:max-w-none max-sm:rounded-b-none";

const BTN_DANGER =
  "inline-flex h-8 items-center justify-center rounded-full bg-danger px-3.5 text-sm font-medium whitespace-nowrap " +
  "text-white transition-colors duration-[120ms] hover:bg-danger-hover active:translate-y-px";

interface CancelStoryDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** "hq-57". */
  storyLabel: string;
  /** One sentence of consequence: "Builder stops and this build is thrown away." */
  consequence: string;
}

/**
 * Cancelling a story while a robot is building it throws the build away, so it asks first (DESIGN.md §6.11):
 * the title names the action and the story, one sentence gives the consequence, and the safe choice comes first
 * and has the focus. Cancelling at any other time happens at once, with Undo.
 */
export function CancelStoryDialog({ open, onClose, onConfirm, storyLabel, consequence }: CancelStoryDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  // Keep the native dialog in step with `open`; focus goes to the safe button, and the page behind holds still.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      keepRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  // Nothing is lost by closing it, so a click on the scrim closes it too.
  const onScrimClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      // Esc, or the browser closing it by itself: keep the parent in step.
      onClose={() => open && onClose()}
      onClick={onScrimClick}
      className={DIALOG}
    >
      <header className="flex items-start gap-3 px-6 pt-6">
        <h2 id={titleId} className="m-0 min-w-0 flex-1 text-base font-semibold">
          Cancel {storyLabel}?
        </h2>
        <button type="button" aria-label="Close" onClick={onClose} className={`${ICON_BTN} -mt-1 -mr-2`}>
          <X aria-hidden="true" size={16} strokeWidth={1.75} />
        </button>
      </header>
      <p id={bodyId} className="m-0 px-6 pt-2 pb-6 text-sm text-[var(--tx2)]">
        {consequence}
      </p>
      <footer className="flex justify-end gap-2 px-6 pb-4">
        <button ref={keepRef} type="button" onClick={onClose} className={BTN_SECONDARY}>
          Keep building
        </button>
        <button type="button" onClick={onConfirm} className={BTN_DANGER}>
          Cancel story
        </button>
      </footer>
    </dialog>
  );
}
