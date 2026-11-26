import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "framer-motion";
import { DropdownMenu } from "radix-ui";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { Story } from "@/types/dashboard";
import { MENU_CONTENT, MENU_ITEM, MENU_SEPARATOR } from "./classes";
import { DecisionCard } from "./DecisionCard";
import { decisionFor, KINDS, type DecisionOption, type DecisionReply } from "./decisions";
import { storyRef } from "./format";

type KeyLike = Pick<globalThis.KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "preventDefault"> & {
  target: EventTarget | null;
};

/** How the top card leaves: you answered, you sent it to the back (Later), or an earlier card comes back on top. */
type Move = "answered" | "later" | "back";

const EASE_OUT = [0.2, 0, 0, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;
// The cards under the top one: each lower and a little smaller, so the pile reads as a deck (no rotation, §6.12).
const BEHIND = [
  { y: 16, scale: 0.955, opacity: 1 },
  { y: 32, scale: 0.91, opacity: 0.7 },
];
const SWIPE = 110; // px dragged, or …
const FLICK = 500; // … px/s flicked, to count as a swipe
const SAY_MS = 700; // how long the card says what happened before it leaves

const variants = {
  enter: (m: Move) => (m === "back" ? { opacity: 0, x: -56, y: 0, scale: 1 } : { opacity: 0, x: 0, y: BEHIND[0].y, scale: BEHIND[0].scale }),
  center: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.24, ease: EASE_OUT } },
  exit: (m: Move) =>
    m === "later"
      ? { opacity: 0, x: -80, transition: { duration: 0.15, ease: EASE_IN } }
      : m === "back"
        ? { opacity: 0, y: BEHIND[0].y, scale: BEHIND[0].scale, transition: { duration: 0.15, ease: EASE_IN } }
        : { opacity: 0, y: -28, scale: 0.98, transition: { duration: 0.18, ease: EASE_IN } },
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
      className={`relative rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-16px_rgb(0_0_0/0.14)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--cta)]/40 ${draggable ? "cursor-grab" : ""}`}
    >
      {/* Swipe hints, fading in with the drag. */}
      <motion.span
        aria-hidden="true"
        style={{ opacity: laterHint }}
        className="pointer-events-none absolute top-5 right-5 z-30 inline-flex items-center gap-1 rounded-full bg-[var(--ink)] px-2.5 py-1 text-[12px] font-medium text-white"
      >
        Later <ChevronRight size={13} strokeWidth={2} />
      </motion.span>
      <motion.span
        aria-hidden="true"
        style={{ opacity: backHint }}
        className="pointer-events-none absolute top-5 right-5 z-30 inline-flex items-center gap-1 rounded-full bg-[var(--ink)] px-2.5 py-1 text-[12px] font-medium text-white"
      >
        <ChevronLeft size={13} strokeWidth={2} /> Back
      </motion.span>
      {children}
    </motion.div>
  );
}

interface NeedsDeckProps {
  /** The stories that need you, in the queue's order (Stuck first). */
  stories: Story[];
  onDecide: (story: Story, answer: { option: DecisionOption } | { reply: DecisionReply; text: string }) => void;
  onOpen: (id: number) => void;
  /** A story picked beside the deck; each new key brings it to the top. */
  jump?: { id: number; key: number } | null;
}

const ICON_BTN =
  "inline-flex size-9 items-center justify-center rounded-full border border-[var(--card-line)] bg-white text-[var(--tx)] transition-colors duration-[120ms] hover:border-[var(--ctl-h)] disabled:opacity-40 disabled:hover:border-[var(--card-line)]";

/**
 * Needs you: one decision at a time, on a deck you can see the next ones under. Answer and the card says what
 * happened, then lifts away. Swiping only browses, so a stray swipe never approves anything: left sends the card
 * to the back (Later), right brings the last one back; ← → and the arrow buttons do the same, and 1–3 answer.
 * Under the deck, who's next, and All, to jump to any decision.
 */
export function NeedsDeck({ stories, onDecide, onOpen, jump }: NeedsDeckProps) {
  const reduced = useReducedMotion();
  const [seq, setSeq] = useState<number[]>([]);
  const [move, setMove] = useState<Move>("answered");
  const [sent, setSent] = useState<{ id: number; text: string } | null>(null);
  const root = useRef<HTMLElement>(null);
  const hadFocus = useRef(false);

  // The order: stories you haven't moved, in the queue's order, then the ones you browsed past. A story that comes
  // back (Undo) isn't in `seq`, so it lands on top.
  const ids = stories.map((s) => s.id);
  const order = [...ids.filter((id) => !seq.includes(id)), ...seq.filter((id) => ids.includes(id))];
  const byId = new Map(stories.map((s) => [s.id, s]));
  const top = order.length ? byId.get(order[0])! : null;
  const decision = top ? decisionFor(top) : null;
  const next = order.slice(1).map((id) => byId.get(id)!);
  const topId = top?.id ?? null;

  // A story picked beside the deck (Ready to review, Stuck) comes to the top, entering from the left.
  const [lastJump, setLastJump] = useState(jump?.key ?? 0);
  if (jump && jump.key !== lastJump) {
    setLastJump(jump.key);
    if (ids.includes(jump.id) && jump.id !== topId && !sent) {
      setMove("back");
      setSeq([jump.id, ...order.filter((x) => x !== jump.id)]);
    }
  }

  // If the keyboard was on the card that left, it moves to the new one.
  useEffect(() => {
    if (topId === null || !hadFocus.current) return;
    const active = document.activeElement as HTMLElement | null;
    const card = active?.closest<HTMLElement>("[data-deck-top]");
    const stranded = !active || active === document.body || !active.isConnected || (card && card.dataset.deckId !== String(topId));
    if (stranded) root.current?.querySelector<HTMLElement>(`[data-deck-top][data-deck-id="${topId}"]`)?.focus();
  }, [topId]);

  const later = () => {
    if (order.length < 2 || sent) return;
    setMove("later");
    setSeq([...order.slice(1), order[0]]);
  };
  const back = () => {
    if (order.length < 2 || sent) return;
    setMove("back");
    setSeq([order[order.length - 1], ...order.slice(0, -1)]);
  };
  const jumpTo = (id: number) => {
    if (id === topId || sent) return;
    setMove("back");
    setSeq([id, ...order.filter((x) => x !== id)]);
  };

  const answer = (story: Story, says: string, done: () => void) => {
    setMove("answered");
    setSent({ id: story.id, text: says });
    window.setTimeout(
      () => {
        setSent(null);
        done();
      },
      reduced ? 400 : SAY_MS,
    );
  };

  const choose = (option: DecisionOption) => {
    if (!top || sent) return;
    if (option.choice.kind === "open") return onOpen(top.id);
    answer(top, option.says, () => onDecide(top, { option }));
  };
  const reply = (text: string) => {
    if (!top || !decision || sent) return;
    const r = decision.reply;
    answer(top, r.says, () => onDecide(top, { reply: r, text }));
  };

  // ← → browse, 1–3 answer: inside the deck, or anywhere while nothing else has the keyboard and no panel is open.
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
      const n = Number(e.key);
      const option = decision.options[n - 1];
      if (option) {
        e.preventDefault();
        choose(option);
      } else if (n === decision.options.length + 1) {
        // The last number is Other: it puts you in its box.
        e.preventDefault();
        root.current?.querySelector<HTMLInputElement>(`[data-deck-id="${topId}"] [data-deck-other]`)?.focus();
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
      if (document.querySelector('[role="dialog"], dialog[open], [role="menu"]')) return;
      keys.current(e);
    };
    document.addEventListener("keydown", onDocument);
    return () => document.removeEventListener("keydown", onDocument);
  }, []);

  if (!top || !decision) return null;

  // All, grouped by kind of need, in the queue's order.
  const groups = KINDS.map((k) => ({ ...k, items: order.map((id) => byId.get(id)!).filter((s) => s.need === k.kind) })).filter((g) => g.items.length > 0);

  return (
    <section
      ref={root}
      aria-label={`Needs you, ${order.length} ${order.length === 1 ? "decision" : "decisions"}`}
      onKeyDown={onKeyDown}
      onFocus={() => (hadFocus.current = true)}
      onBlur={(e) => {
        if (e.relatedTarget && !root.current?.contains(e.relatedTarget as Node)) hadFocus.current = false;
      }}
      className="min-w-0"
    >
      {/* The deck: the top card on the next two, with room below for the cards behind. */}
      <div className="relative pb-8">
        {BEHIND.slice(0, Math.min(next.length, BEHIND.length))
          .map((b, i) => (
            <motion.div
              key={`behind-${i}`}
              aria-hidden="true"
              initial={false}
              animate={reduced ? { opacity: b.opacity } : b}
              transition={{ duration: 0.24, ease: EASE_OUT }}
              style={{ zIndex: 2 - i }}
              className="absolute inset-x-0 top-0 bottom-8 origin-bottom rounded-[24px] border border-black/[0.06] bg-white shadow-[0_8px_24px_-12px_rgb(0_0_0/0.12)]"
            />
          ))
          .reverse()}

        <AnimatePresence initial={false} mode="popLayout" custom={move}>
          <TopCard
            key={top.id}
            id={top.id}
            move={move}
            reduced={!!reduced}
            draggable={!sent && order.length > 1}
            onSwipe={(dir) => (dir === "later" ? later() : back())}
          >
            <DecisionCard
              story={top}
              decision={decision}
              sent={sent?.id === top.id ? sent.text : null}
              onChoose={choose}
              onReply={reply}
              onOpen={() => onOpen(top.id)}
            />
          </TopCard>
        </AnimatePresence>
      </div>

      {/* Under the deck: back and later, who's next, and All. */}
      <div className="flex items-center gap-3">
        <div className="flex flex-none gap-1.5">
          <button type="button" onClick={back} disabled={order.length < 2} aria-label="Back" aria-keyshortcuts="ArrowLeft" className={ICON_BTN}>
            <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.75} />
          </button>
          <button type="button" onClick={later} disabled={order.length < 2} aria-label="Later" aria-keyshortcuts="ArrowRight" className={ICON_BTN}>
            <ChevronRight aria-hidden="true" size={18} strokeWidth={1.75} />
          </button>
        </div>

        {next.length > 0 ? (
          <button
            type="button"
            onClick={later}
            className="group flex min-w-0 flex-1 items-center gap-2.5 text-left text-[13px] leading-[18px] text-[var(--tx2)]"
          >
            <span className="min-w-0 truncate">
              Next: <span className="text-[var(--tx)] group-hover:underline">{next[0].title}</span>
            </span>
          </button>
        ) : (
          <span className="flex-1 text-[13px] leading-[18px] text-[var(--tx2)]">The last one</span>
        )}

        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger className="inline-flex h-9 flex-none items-center gap-1 rounded-full px-3 text-[13px] leading-[18px] font-medium text-[var(--tx)] transition-colors duration-[120ms] hover:bg-black/[0.04] data-[state=open]:bg-black/[0.06]">
            All {order.length}
            <ChevronDown aria-hidden="true" size={14} strokeWidth={1.75} />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={6} className={`${MENU_CONTENT} max-h-[420px] w-[340px] overflow-y-auto`}>
              {groups.map((g, gi) => (
                <DropdownMenu.Group key={g.kind}>
                  {gi > 0 && <DropdownMenu.Separator className={MENU_SEPARATOR} />}
                  <DropdownMenu.Label className="px-4 pt-2 pb-1 text-[12px] leading-4 text-[var(--tx2)]">
                    {g.label} · {g.items.length}
                  </DropdownMenu.Label>
                  {g.items.map((s) => (
                    <DropdownMenu.Item key={s.id} onSelect={() => jumpTo(s.id)} className={`${MENU_ITEM} ${s.id === topId ? "font-medium" : ""}`}>
                      <span className="w-11 flex-none text-[12px] text-[var(--tx2)] tabular-nums">{storyRef(s.id)}</span>
                      <span className="truncate">{s.title}</span>
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Group>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <p aria-hidden="true" className="mt-3 hidden text-center text-[12px] leading-4 text-[var(--tx2)] [@media(pointer:fine)]:block">
        Swipe or use ← → to browse · 1–{decision.options.length} to answer · {decision.options.length + 1} to write your own
      </p>
    </section>
  );
}
