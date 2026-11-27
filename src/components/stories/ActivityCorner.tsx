import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Activity as ActivityIcon } from "lucide-react";
import type { NeedKind } from "@/types/dashboard";
import type { ActivityItem } from "@/types/stories";
import { Tip } from "@/components/dashboard/Tip";
import { livePreview, nowOf, reasonOf } from "./activity";
import chat from "./chat.module.css";
import { reasonWord } from "./StoryActivity";

const PANEL_ID = "story-activity";
/** The card's width once open; its content is laid out at this width from the start, so it never reflows. */
const OPEN_W = 320;

// A hairline edge, no shadow (Shubham, 26 Nov: a clean layout), written out so it can grow from nothing as the icon opens.
const SHADOW_OPEN = "0 0 0 1px rgba(0, 0, 0, 0.08)";
const SHADOW_SHUT = "0 0 0 0px rgba(0, 0, 0, 0)";

type Signal = { kind: "working" | "running" | "waiting" | "failed" | "finished" | "quiet"; words: string };

/** What the icon shows: the robot's working ring while something is under way (DESIGN.md §8.5), otherwise a dot in
 *  the state's tone (§3.1), or nothing at all. The words go to its name and tooltip, in the column's own wording. */
export function signalOf(items: ActivityItem[], yours?: NeedKind): Signal {
  const top = nowOf(items)[0];
  if (top) {
    const reason = reasonOf(top, top.settling ? undefined : yours);
    const words = `${top.title}, ${reasonWord(top, reason, yours).toLowerCase()}`;
    if (reason === "working" || reason === "starting") return { kind: "working", words };
    if (reason === "running") return { kind: "running", words };
    if (reason === "failed") return { kind: "failed", words };
    if (reason === "waiting" || reason === "yours") return { kind: "waiting", words };
    if (reason === "finished") return { kind: "finished", words };
    return { kind: "quiet", words };
  }
  const preview = livePreview(items);
  return preview ? { kind: "running", words: `${preview.title}, running` } : { kind: "quiet", words: "nothing running" };
}

const DOT: Partial<Record<Signal["kind"], string>> = {
  running: "bg-[var(--green)]",
  finished: "bg-[var(--green)]",
  waiting: "bg-[#d97706]",
  failed: "bg-[var(--red)]",
};

/** Activity's state as a dot for the Activity tab while Team is showing: the robot's colour while one works. */
export function activityDot(items: ActivityItem[], yours?: NeedKind) {
  const signal = signalOf(items, yours);
  const dot = signal.kind === "working" ? "bg-[var(--bot-builder)]" : DOT[signal.kind];
  return dot ? { dot, words: signal.words } : undefined;
}

interface ActivityCornerProps {
  items: ActivityItem[];
  yours?: NeedKind;
  /** Open is the page's to say, so the faces in the header can open it straight on Team. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The open card's top row, left of the icon: "Activity", or the Activity · Team tabs. */
  title?: ReactNode;
  children: ReactNode;
}

/**
 * The top-right corner of the builder: the story's activity, as one quiet icon, so the chat with the agent has the
 * page (Shubham, 23 Nov). The icon says when something is happening: its outline turns into the working ring while a
 * robot is at work, and a dot shows a preview running, something waiting on you, a failure or a fresh finish; with
 * nothing going on it holds still. Clicking it grows the icon into the activity card, from its own corner, over the
 * chat (nothing moves aside); Esc or a click anywhere else folds it back. Only at 768–1023 px: from 1024 the
 * activity and Team are always in view as a card beside the chat, and phones keep Activity folded over the chat. The
 * open card carries the same Activity · Team tabs. Open: 300 ms out, 200 ms back (DESIGN.md §3.7), no motion with
 * reduced motion.
 */
export function ActivityCorner({ items, yours, open, onOpenChange, title, children }: ActivityCornerProps) {
  const setOpen = onOpenChange;
  const reduce = useReducedMotion();
  const surface = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const signal = signalOf(items, yours);

  // Like a popover: Esc, or a press anywhere outside it, folds it back into the icon.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!surface.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, setOpen]);

  const size = reduce ? { duration: 0 } : open ? { duration: 0.3, ease: "easeOut" as const } : { duration: 0.2, ease: "easeIn" as const };

  return (
    // Holds the icon's place in the header. The surface grows from its top-right corner, over the chat; everything in
    // it is laid out at the open width and held to the right, so the icon stays put and the rest is uncovered.
    <div className="relative size-8 flex-none">
      <motion.div
        ref={surface}
        initial={false}
        animate={{ width: open ? OPEN_W : 32, height: open ? "auto" : 32, boxShadow: open ? SHADOW_OPEN : SHADOW_SHUT }}
        transition={size}
        className={`absolute top-0 right-0 z-30 flex max-h-[calc(100dvh-var(--bar-h)-64px)] flex-col items-end overflow-hidden rounded-2xl border bg-white ${
          open ? "border-[var(--card-line)]" : "border-[var(--ctl)]"
        }`}
      >
        <div className="flex h-[30px] w-[318px] flex-none items-center justify-end">
          {open &&
            (title ? (
              <div id={titleId} className="mr-2 min-w-0 flex-1 pl-0.5">
                {title}
              </div>
            ) : (
              <h2 id={titleId} className="m-0 mr-auto pl-3.5 text-sm font-medium text-[var(--tx)]">
                This story
              </h2>
            ))}
          <Tip label={open ? "Close" : `Status, output and history: ${signal.words}`}>
            <button
              ref={button}
              type="button"
              aria-label={`Status, output and history: ${signal.words}`}
              aria-expanded={open}
              aria-controls={PANEL_ID}
              onClick={() => setOpen(!open)}
              className="relative flex size-[30px] flex-none items-center justify-center rounded-full text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/5 hover:text-[var(--tx)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cta)]"
            >
              <ActivityIcon aria-hidden="true" size={16} strokeWidth={1.75} className={signal.kind === "quiet" ? undefined : "text-[var(--tx)]"} />
              {/* The outline becomes the working ring: its gap travels round while a robot works. */}
              {signal.kind === "working" && !open && (
                <svg aria-hidden="true" viewBox="0 0 32 32" className="pointer-events-none absolute -inset-px size-8">
                  <circle cx="16" cy="16" r="15" pathLength="100" fill="none" stroke="var(--bot-builder)" strokeWidth="2" strokeDasharray="72 28" className={chat.ring} />
                </svg>
              )}
              {DOT[signal.kind] && !open && <span aria-hidden="true" className={`absolute top-px right-px size-2 rounded-full ring-2 ring-white ${DOT[signal.kind]}`} />}
            </button>
          </Tip>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="activity"
              id={PANEL_ID}
              aria-label="Status, output and history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: reduce ? 0 : 0.12, duration: reduce ? 0 : 0.15 } }}
              exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.1 } }}
              className="min-h-0 w-[318px] overflow-y-auto px-3 pt-1 pb-3"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
