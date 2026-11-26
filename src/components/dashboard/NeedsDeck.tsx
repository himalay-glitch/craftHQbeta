import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, CircleExclamationPoint, Users } from "lucide-react";
import type { NeedKind, Story } from "@/types/dashboard";
import { BTN_SECONDARY } from "./classes";
import { DecisionCard, type Writing } from "./DecisionCard";
import { decisionFor, KINDS, OTHER, type DecisionOption } from "./decisions";
import { DOT, Indicator } from "./Indicator";

type KeyLike = Pick<globalThis.KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "preventDefault"> & {
  target: EventTarget | null;
};

/** How the top card leaves: you decided, you sent it to the back (Later), or an earlier card comes back on top. */
type Move = "decided" | "later" | "back";

const EASE_OUT = [0.2, 0, 0, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;
// The two cards showing behind the top one: each a little lower and smaller (no rotation, DESIGN.md §6.12).
const BEHIND = [
  { y: 12, scale: 0.965 },
  { y: 24, scale: 0.93 },
];
const SWIPE = 110; // px dragged, or …
const FLICK = 500; // … px/s flicked, to count as a swipe
const SAY_MS = 420; // how long the card says what you chose before it leaves

const variants = {
  enter: (m: Move) => (m === "back" ? { opacity: 0, x: -48, y: 0, scale: 1 } : { opacity: 0, x: 0, ...BEHIND[0] }),
  center: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.2, ease: EASE_OUT } },
  exit: (m: Move) =>
    m === "later"
      ? { opacity: 0, x: -72, transition: { duration: 0.15, ease: EASE_IN } }
      : m === "back"
        ? { opacity: 0, ...BEHIND[0], transition: { duration: 0.15, ease: EASE_IN } }
        : { opacity: 0, y: -18, scale: 0.98, transition: { duration: 0.15, ease: EASE_IN } },
};
const fades = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

/** The card on top. It owns its drag, so a card on its way out never moves the one taking its place. */
function TopCard({
  id,
  move,
  reduced,
  draggable,
  onSwipe,
  children,
}: {
  id: number;
  move: Move;
  reduced: boolean;
  draggable: boolean;
  onSwipe: (dir: "later" | "back") => void;
  children: ReactNode;
}) {
  const x = useMotionValue(0);
  const laterHint = useTransform(x, [-SWIPE, -24], [1, 0]);
  const backHint = useTransform(x, [24, SWIPE], [0, 1]);
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE || info.velocity.x < -FLICK) onSwipe("later");
    else if (info.offset.x > SWIPE || info.velocity.x > FLICK) onSwipe("back");
  };
  return (
    <motion.div
      data-deck-top
      data-deck-id={id}
      tabIndex={-1}
      custom={move}
      variants={reduced ? fades : variants}
      initial="enter"
      animate="center"
      exit="exit"
      drag={draggable ? "x" : false}
      dragSnapToOrigin
      dragElastic={0.7}
      dragConstraints={{ left: 0, right: 0 }}
      whileDrag={{ scale: 1.02, cursor: "grabbing" }}
      onDragEnd={onDragEnd}
      style={{ x, zIndex: 3 }}
      className={`relative rounded-[20px] border border-[var(--card-line)] bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.07)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--cta)]/40 md:p-6 ${draggable ? "cursor-grab" : ""}`}
    >
      {/* Swipe hints, fading in with the drag. */}
      <motion.span
        aria-hidden="true"
        style={{ opacity: laterHint }}
        className="pointer-events-none absolute top-4 right-4 z-20 inline-flex items-center gap-1 rounded-full bg-[var(--ink)] px-2.5 py-1 text-[12px] font-medium text-white"
      >
        Later <ChevronRight size={13} strokeWidth={2} />
      </motion.span>
      <motion.span
        aria-hidden="true"
        style={{ opacity: backHint }}
        className="pointer-events-none absolute top-4 left-4 z-20 inline-flex items-center gap-1 rounded-full bg-[var(--ink)] px-2.5 py-1 text-[12px] font-medium text-white"
      >
        <ChevronLeft size={13} strokeWidth={2} /> Back
      </motion.span>
      {children}
    </motion.div>
  );
}

interface NeedsDeckProps {
  /** The stories that need you, in the queue's order (Stuck first), with the filter applied. */
  stories: Story[];
  /** All of them, for the chips' counts. */
  all: Story[];
  filter: "all" | NeedKind;
  onFilter: (f: "all" | NeedKind) => void;
  /** Answered since the page opened, for the progress. */
  answered: number;
  othersWaiting: number;
  onDecide: (story: Story, option: DecisionOption, text?: string) => void;
  onOpen: (id: number) => void;
}

/**
 * Needs you, as a deck: one decision at a time, with the next two showing behind it. Pick an answer and the card
 * says what you chose, then lifts away. Swiping only browses (left sends the card to the back, right brings the
 * last one back), so nothing is ever approved by a stray swipe; ← → and the Later / Back buttons do the same.
 */
export function NeedsDeck({ stories, all, filter, onFilter, answered, othersWaiting, onDecide, onOpen }: NeedsDeckProps) {
  const reduced = useReducedMotion();
  const [seq, setSeq] = useState<number[]>([]);
  const [move, setMove] = useState<Move>("decided");
  const [writing, setWriting] = useState<Writing | null>(null);
  const [leaving, setLeaving] = useState<{ id: number; label: string } | null>(null);
  const root = useRef<HTMLElement>(null);
  // Whether the keyboard was in the deck, so it stays there when the card it was on leaves.
  const hadFocus = useRef(false);

  // The deck's order: stories you haven't moved, in the queue's order, then the ones you browsed past. A story that
  // comes back (Undo) isn't in `seq`, so it lands on top.
  const ids = stories.map((s) => s.id);
  const order = [...ids.filter((id) => !seq.includes(id)), ...seq.filter((id) => ids.includes(id))];
  const byId = new Map(stories.map((s) => [s.id, s]));
  const top = order.length ? byId.get(order[0])! : null;
  const decision = top ? decisionFor(top) : null;
  const total = answered + order.length;

  // A new top card drops whatever was being written on the last one.
  const topId = top?.id ?? null;
  const [lastTop, setLastTop] = useState(topId);
  if (lastTop !== topId) {
    setLastTop(topId);
    setWriting(null);
  }

  // Keep the keyboard in the deck as cards come and go: if it was on the card that left, it moves to the new one.
  useEffect(() => {
    if (topId === null || !hadFocus.current) return;
    const active = document.activeElement as HTMLElement | null;
    const card = active?.closest<HTMLElement>("[data-deck-top]");
    const stranded = !active || active === document.body || !active.isConnected || (card && card.dataset.deckId !== String(topId));
    if (stranded) root.current?.querySelector<HTMLElement>(`[data-deck-top][data-deck-id="${topId}"]`)?.focus();
  }, [topId]);

  const later = () => {
    if (order.length < 2 || leaving) return;
    setMove("later");
    setSeq([...order.slice(1), order[0]]);
  };
  const back = () => {
    if (order.length < 2 || leaving) return;
    setMove("back");
    setSeq([order[order.length - 1], ...order.slice(0, -1)]);
  };

  const decide = (story: Story, option: DecisionOption, text?: string) => {
    setMove("decided");
    setLeaving({ id: story.id, label: option.done });
    window.setTimeout(
      () => {
        setLeaving(null);
        setWriting(null);
        onDecide(story, option, text);
      },
      reduced ? 150 : SAY_MS,
    );
  };

  const choose = (option: DecisionOption) => {
    if (!top || leaving) return;
    if (option.choice.kind === "open") return onOpen(top.id);
    if (option.choice.kind === "write") {
      setWriting((w) => (w?.option.label === option.label ? null : { option, text: "" }));
      return;
    }
    decide(top, option);
  };

  const send = () => {
    if (top && writing?.text.trim()) decide(top, writing.option, writing.text.trim());
  };

  // ← → browse, 1–4 answer: inside the deck, or anywhere while nothing else has the keyboard and no panel is open.
  const onKeyDown = (e: KeyLike) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.target as HTMLElement | null)?.closest?.("textarea, input, select, [contenteditable='true']")) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      later();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      back();
    } else if (decision && /^[1-9]$/.test(e.key)) {
      const option = [...decision.options, OTHER][Number(e.key) - 1];
      if (option) {
        e.preventDefault();
        choose(option);
      }
    }
  };

  const keys = useRef(onKeyDown);
  useEffect(() => {
    keys.current = onKeyDown;
  });
  useEffect(() => {
    const onDocument = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.target !== document.body) return;
      if (document.querySelector('[role="dialog"], dialog[open]')) return;
      keys.current(e);
    };
    document.addEventListener("keydown", onDocument);
    return () => document.removeEventListener("keydown", onDocument);
  }, []);

  const count = (k: NeedKind) => all.filter((s) => s.need === k).length;
  const chips = [{ kind: "all" as const, label: "All", n: all.length, tone: null }, ...KINDS.map((k) => ({ ...k, n: count(k.kind) }))].filter(
    (c) => c.n > 0 || c.kind === filter,
  );

  return (
    <section
      ref={root}
      aria-labelledby="needs-title"
      onKeyDown={onKeyDown}
      onFocus={() => (hadFocus.current = true)}
      onBlur={(e) => {
        if (e.relatedTarget && !root.current?.contains(e.relatedTarget as Node)) hadFocus.current = false;
      }}
      className="min-w-0"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Indicator icon={CircleExclamationPoint} tone="attention" on={all.length > 0} />
        <h2 id="needs-title" className="text-[17px] leading-6 font-semibold text-[var(--tx)]">
          Needs you
        </h2>
        <span className="rounded-full bg-[#FCEFD6] px-2 py-px text-[13px] leading-[18px] font-medium text-[#7A4A00] tabular-nums">
          {all.length}
        </span>
        <span className="ml-auto hidden text-[12px] leading-4 text-[var(--tx2)] md:inline">
          Swipe or <kbd className="font-sans">←</kbd> <kbd className="font-sans">→</kbd> to browse ·{" "}
          <kbd className="font-sans">1</kbd>–<kbd className="font-sans">4</kbd> to answer
        </span>
      </header>

      {/* The kinds of need, with their counts: these are the old Ready to review and Stuck numbers. */}
      <div role="group" aria-label="Show" className="mt-3 flex flex-wrap items-center gap-1.5">
        {chips.map((c) => {
          const on = filter === c.kind;
          return (
            <button
              key={c.kind}
              type="button"
              aria-pressed={on}
              onClick={() => onFilter(on && c.kind !== "all" ? "all" : c.kind)}
              className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[13px] leading-[18px] transition-colors duration-[120ms] ${
                on
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--card-line)] bg-white text-[var(--tx)] hover:border-[var(--ctl-h)]"
              }`}
            >
              {c.tone && <span aria-hidden="true" className={`size-1.5 rounded-full ${DOT[c.tone]}`} />}
              {c.label}
              <span className={`tabular-nums ${on ? "text-white/70" : "text-[var(--tx2)]"}`}>{c.n}</span>
            </button>
          );
        })}
        {othersWaiting > 0 && (
          <span className="ml-1 inline-flex items-center gap-1.5 text-[13px] leading-[18px] text-[var(--tx2)]">
            <Users aria-hidden="true" size={14} strokeWidth={1.75} />
            {othersWaiting} more waiting on teammates
          </span>
        )}
      </div>

      {top && decision ? (
        <>
          {/* The stack: the top card on two blank cards. Room below for the ones behind. */}
          <div className="relative mt-4 pb-6">
            {BEHIND.slice(0, Math.min(order.length - 1, BEHIND.length))
              .map((b, i) => (
                <motion.div
                  key={`behind-${i}`}
                  aria-hidden="true"
                  initial={false}
                  animate={reduced ? { opacity: 1 } : { y: b.y, scale: b.scale, opacity: 1 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  style={{ zIndex: 2 - i }}
                  className="absolute inset-x-0 top-0 bottom-6 origin-bottom rounded-[20px] border border-[var(--card-line)] bg-[#FBFBFB]"
                />
              ))
              .reverse()}

            <AnimatePresence initial={false} mode="popLayout" custom={move}>
              <TopCard
                key={top.id}
                id={top.id}
                move={move}
                reduced={!!reduced}
                draggable={!writing && !leaving && order.length > 1}
                onSwipe={(dir) => (dir === "later" ? later() : back())}
              >
                <DecisionCard
                  story={top}
                  decision={decision}
                  writing={writing}
                  leaving={leaving?.id === top.id ? leaving.label : null}
                  onChoose={choose}
                  onWrite={(text) => setWriting((w) => (w ? { ...w, text } : w))}
                  onSend={send}
                  onCancelWrite={() => setWriting(null)}
                  onOpen={() => onOpen(top.id)}
                />
              </TopCard>
            </AnimatePresence>
          </div>

          {/* Where you are: answered (green), this one (blue), still to come (grey); Back and Later either side. */}
          <div className="mt-1 flex items-center gap-3">
            <button type="button" onClick={back} disabled={order.length < 2} className={BTN_SECONDARY} aria-keyshortcuts="ArrowLeft">
              <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.75} />
              Back
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5">
              {total <= 24 && (
                <span aria-hidden="true" className="hidden items-center gap-1 sm:flex">
                  {Array.from({ length: total }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-[background-color,width] duration-200 ${
                        i < answered ? "w-1.5 bg-[#16A34A]" : i === answered ? "w-4 bg-[var(--cta)]" : "w-1.5 bg-[#DCDCDC]"
                      }`}
                    />
                  ))}
                </span>
              )}
              <span className="text-[13px] leading-[18px] whitespace-nowrap text-[var(--tx2)] tabular-nums" aria-live="polite">
                {answered + 1} of {total}
              </span>
            </div>
            <button type="button" onClick={later} disabled={order.length < 2} className={BTN_SECONDARY} aria-keyshortcuts="ArrowRight">
              Later
              <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} />
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-col items-center rounded-[20px] border border-dashed border-[var(--ctl)] px-4 py-14 text-center">
          <p className="text-[15px] leading-[22px] font-medium text-[var(--tx)]">
            No {KINDS.find((k) => k.kind === filter)?.label.toLowerCase() ?? "stories"} left
          </p>
          <p className="mt-1 text-[14px] leading-5 text-[var(--tx2)]">The rest still need you.</p>
          <button type="button" onClick={() => onFilter("all")} className={`${BTN_SECONDARY} mt-4`}>
            Show all
          </button>
        </div>
      )}
    </section>
  );
}
