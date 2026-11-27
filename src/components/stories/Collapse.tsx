import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// What opens under a line (a run's steps, a box on the right, a decision's detail) grows open and folds shut instead
// of appearing all at once (Shubham, 27 Nov: "whenever you are clicking something, the opening should be smooth").
// DESIGN.md §3.7: height and fade through framer-motion, in on ease-out, out faster on ease-in. Under reduced motion it
// only fades, 150 ms. Nothing animates on the first paint, so a page that opens with a box already open just shows it.

const EASE_OUT = [0.2, 0, 0, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

export function Collapse({ open, children, id, className }: { open: boolean; children: ReactNode; id?: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="open"
          id={id}
          className={className}
          initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0, overflow: "hidden" }}
          animate={
            reduce
              ? { opacity: 1, transition: { duration: 0.15 } }
              : {
                  height: "auto",
                  opacity: 1,
                  // Once open, nothing inside is clipped (a focus ring, a menu's shadow-free edge).
                  transitionEnd: { overflow: "visible" },
                  transition: { height: { duration: 0.26, ease: EASE_OUT }, opacity: { duration: 0.2, delay: 0.05, ease: EASE_OUT } },
                }
          }
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.1 } }
              : { height: 0, opacity: 0, overflow: "hidden", transition: { height: { duration: 0.18, ease: EASE_IN }, opacity: { duration: 0.12, ease: EASE_IN } } }
          }
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
