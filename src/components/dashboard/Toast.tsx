import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

export interface ToastMessage {
  /** Changes for every toast, so a new one restarts the timer and the animation. */
  key: number;
  message: string;
  action?: { label: string; run: () => void };
}

const DURATION = 6000;

/**
 * The result of the person's own action, with one action (Undo or Open). Bottom centre of the content,
 * 6 s, paused while hovered or focused. Announced politely.
 */
export function Toast({ toast, onDismiss, offsetRight }: { toast: ToastMessage | null; onDismiss: () => void; offsetRight: string }) {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!toast || paused) return;
    const timer = window.setTimeout(onDismiss, DURATION);
    return () => window.clearTimeout(timer);
  }, [toast, paused, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ right: offsetRight }}
      className="pointer-events-none fixed bottom-6 left-0 z-[60] flex justify-center px-4 transition-[right] duration-200"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className="pointer-events-auto flex min-h-11 max-w-[min(560px,100%)] items-center gap-4 rounded-[8px] bg-[var(--ink)] py-2 pr-2 pl-4 text-[14px] leading-5 text-white shadow-[0_8px_24px_rgb(0_0_0/0.16)]"
          >
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.run();
                  onDismiss();
                }}
                className="flex-none rounded-[4px] font-medium text-[#A9C4FF] underline-offset-2 hover:underline"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={onDismiss}
              className="inline-flex size-7 flex-none items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X aria-hidden="true" size={16} strokeWidth={1.75} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
