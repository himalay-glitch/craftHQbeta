import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Story } from "@/types/dashboard";
import { storyRef } from "./format";
import { NeedChip } from "./NeedChip";
import { PersonAvatar } from "./PersonAvatar";

/** The stories below 768 px: two-line rows (title, then chip, ID and update time). */
export function QueueList({ stories, onOpen }: { stories: Story[]; onOpen: (id: number) => void }) {
  const reduced = useReducedMotion();
  return (
    <ul className="-mx-4 border-t border-[var(--line)]">
      <AnimatePresence initial={false}>
        {stories.map((s) => (
          <motion.li
            key={s.id}
            layout={reduced ? false : "position"}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="border-b border-[var(--line)]"
          >
            <button
              type="button"
              data-story={s.id}
              onClick={() => onOpen(s.id)}
              className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-[80ms] active:bg-[var(--row-h)]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] leading-[22px] text-[var(--tx)]">{s.title}</span>
                <span className="mt-1 flex items-center gap-2">
                  <NeedChip need={s.need!} />
                  <span className="truncate text-[13px] leading-[18px] text-[var(--tx2)] tabular-nums">
                    {[storyRef(s.id), s.waitingOn, s.updated].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </span>
              {s.owner && <PersonAvatar initials={s.owner} size={24} />}
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
