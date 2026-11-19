import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { ICON_BTN } from "./classes";
import { Tip } from "./Tip";

interface SidePanelProps {
  title: ReactNode;
  titleId: string;
  /** Small line above the title, for example the ticket ID. */
  eyebrow?: ReactNode;
  /** Extra icon buttons beside Close. */
  actions?: ReactNode;
  footer?: ReactNode;
  /** 1024 px and wider: the page stays usable beside the panel. Narrower: it covers the page. */
  isWide: boolean;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * The right-hand panel, 480 px, full height under the top bar. Slides in over 200 ms. Below 1024 px it
 * covers the page with a scrim and keeps Tab inside itself; wider, it's a non-modal side panel.
 */
export function SidePanel({ title, titleId, eyebrow, actions, footer, isWide, onClose, children }: SidePanelProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape" && !e.defaultPrevented) {
      e.stopPropagation();
      onClose();
      return;
    }
    if (isWide || e.key !== "Tab" || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const [first, last] = [items[0], items[items.length - 1]];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      {!isWide && (
        <motion.div
          aria-hidden="true"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 top-[var(--bar-h)] bottom-0 z-30 bg-black/20"
        />
      )}
      <motion.aside
        ref={ref}
        role="dialog"
        aria-modal={!isWide}
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, x: 24, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        className="fixed top-[var(--bar-h)] right-0 bottom-0 z-30 flex w-full flex-col border-l border-[var(--card-line)] bg-white shadow-[var(--shadow-panel)] lg:w-[var(--panel-w)]"
      >
        <div className="flex h-12 flex-none items-center justify-between gap-2 pr-3 pl-6">
          <span className="text-[13px] leading-[18px] text-[var(--tx2)] tabular-nums">{eyebrow}</span>
          <span className="flex items-center gap-0.5">
            {actions}
            <Tip label="Close (Esc)">
              <button type="button" aria-label="Close" onClick={onClose} className={ICON_BTN}>
                <X aria-hidden="true" size={16} strokeWidth={1.75} />
              </button>
            </Tip>
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <h2
            id={titleId}
            tabIndex={-1}
            data-panel-title
            className="text-[21px] leading-7 font-medium tracking-[-0.01em] text-[var(--tx)] outline-none"
          >
            {title}
          </h2>
          {children}
        </div>
        {footer && <div className="flex-none border-t border-[var(--line)] px-6 py-3">{footer}</div>}
      </motion.aside>
    </>
  );
}
