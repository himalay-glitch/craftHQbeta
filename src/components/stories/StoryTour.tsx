import { useEffect, useId, useRef, useState } from "react";
import type { NeedKind } from "@/types/dashboard";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/dashboard/classes";
import { BotAvatar } from "@/components/ask/BotAvatar";

// A first visit to a story page, as a new person sees it (Shubham, 26 Nov: "show the first story in Planning, hq-28, as
// a first-time user coming on that story"). A welcome, then a few steps that light up one part of the page at a time
// (the chat, the place where the story asks for you, the status, the decisions, the tabs), each with two sentences and
// Back / Next. Skip or Esc ends it at any point. The page itself never changes: the story, its number and its state stay
// as they are. Front end only: it shows on hq-28 (the demo story) once per browser session, and on any story with
// ?tour in the address.

type Rect = { top: number; left: number; width: number; height: number };

interface Step {
  key: string;
  title: string;
  body: string;
  /** What to light up; nothing means a card in the middle of the screen. */
  target?: () => HTMLElement | null;
  /** Where the card goes beside it. */
  place?: "left" | "above" | "below" | "inside";
}

const q = (sel: string) => document.querySelector<HTMLElement>(sel);
const decisions = () => [...document.querySelectorAll<HTMLElement>("[data-tour=panel] section")].find((s) => s.querySelector("h3")?.textContent?.trim().startsWith("Decisions")) ?? null;

function stepsFor(storyRef: string, wide: boolean, need?: NeedKind): Step[] {
  const welcome: Step = {
    key: "welcome",
    title: `Welcome to ${storyRef}`,
    body: "This is a story’s page: one piece of work, from the first message to the merge. Here’s a quick look around.",
  };
  const chat: Step = {
    key: "chat",
    title: "Talk here",
    body: "Say what you want in your own words. The PM answers and hands the work to the robots. A message is a conversation: it never changes the work by itself.",
    target: () => q("[data-tour=chat]"),
    place: "inside",
  };
  const box: Step = {
    key: "box",
    title: "It asks when it needs you",
    body:
      need === "decision"
        ? "Right now the plan waits on one answer. Choose one and the PM writes the plan. Nothing is built until you approve it."
        : "When it’s your turn, the decision waits here: an answer, an approval or the next step, with one button.",
    // The card itself (the question, the decision or the message box), not the white strip it sits on.
    target: () => q("[data-tour=box] > :last-child") ?? q("[data-tour=box]"),
    place: "above",
  };
  if (!wide) {
    return [
      welcome,
      chat,
      box,
      {
        key: "fold",
        title: "Everything else is here",
        body: "The story’s status, its decisions, what was made and the history. Open it whenever you need them.",
        target: () => q("[data-tour=fold]"),
        place: "below",
      },
    ];
  }
  return [
    welcome,
    chat,
    box,
    {
      key: "status",
      title: "Where it is, and whose turn",
      body: "Planning, Building, In review, Pull request, Done, in that order. To move the story yourself, click a status with an outline: it moves at once, and you can undo it.",
      target: () => q("[data-tour=panel] section[aria-label=Status]"),
      place: "left",
    },
    {
      key: "decisions",
      title: "Decisions are kept for good",
      body: "Every answer and approval lands here with a name and a date, so a disagreement can always be settled.",
      target: decisions,
      place: "left",
    },
    {
      key: "tabs",
      title: "What was made, and the history",
      body: "Pages, Preview and Code each open to show what’s there or when it comes. Preview has this story on its own, or the whole app. History is the last box, newest first.",
      // From 1024 px the right-hand side is boxes (Shubham, 27 Nov): the Pages, Preview and Code boxes together; a tab
      // row where there are tabs.
      target: () => q("[data-tour=panel] [data-tour=output]") ?? q("[data-tour=panel] [role=tablist]"),
      place: "left",
    },
  ];
}

const KEY = (id: number) => `crafthq:story-tour:${id}`;

/** hq-28 shows it once per browser session; any story shows it with ?tour. */
function shouldShow(storyId: number) {
  try {
    if (new URLSearchParams(window.location.search).has("tour")) return true;
    return storyId === 28 && !window.sessionStorage.getItem(KEY(storyId));
  } catch {
    return storyId === 28;
  }
}

const PAD = 8;
const GAP = 16;
const EDGE = 12;

/** Where the card goes: beside the lit part when there's room, else inside it near the top, else in the middle. */
function cardPosition(rect: Rect | null, place: Step["place"], card: { w: number; h: number }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x: number) => Math.min(Math.max(x, EDGE), vw - card.w - EDGE);
  const clampY = (y: number) => Math.min(Math.max(y, EDGE), vh - card.h - EDGE);
  if (!rect) return { left: (vw - card.w) / 2, top: (vh - card.h) / 2 };
  const r = { top: rect.top - PAD, left: rect.left - PAD, right: rect.left + rect.width + PAD, bottom: rect.top + rect.height + PAD };
  if (place === "left" && r.left - GAP - card.w >= EDGE) return { left: r.left - GAP - card.w, top: clampY(r.top) };
  if (place === "above" && r.top - GAP - card.h >= EDGE) return { left: clampX(rect.left + rect.width / 2 - card.w / 2), top: r.top - GAP - card.h };
  // A tall part with no room above it (hq-28's decision card, with its context and three options): beside it, over the
  // dimmed right-hand side, rather than on top of what it explains.
  if (place === "above" && r.right + GAP + card.w <= vw - EDGE) return { left: r.right + GAP, top: clampY(r.top) };
  if (place === "above" && r.left - GAP - card.w >= EDGE) return { left: r.left - GAP - card.w, top: clampY(r.top) };
  if (place === "below" && r.bottom + GAP + card.h <= vh - EDGE) return { left: clampX(rect.left + rect.width / 2 - card.w / 2), top: r.bottom + GAP };
  // Inside, near the top: for a big part like the chat, or when there's no room beside it.
  return { left: clampX(rect.left + rect.width / 2 - card.w / 2), top: clampY(Math.max(r.top, 0) + 48) };
}

const same = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);

interface StoryTourProps {
  storyId: number;
  /** "hq-28". */
  storyRef: string;
  /** From 1024 px: the right-hand card is there to point at. */
  wide: boolean;
  need?: NeedKind;
  /** Called before the steps on the right: the Status tab is the one they point at. */
  onStart?: () => void;
}

export function StoryTour({ storyId, storyRef, wide, need, onStart }: StoryTourProps) {
  const [open, setOpen] = useState(() => shouldShow(storyId));
  const [at, setAt] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [card, setCard] = useState({ w: 340, h: 200 });
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const all = stepsFor(storyRef, wide, need);
  const step = all[Math.min(at, all.length - 1)];
  const last = at >= all.length - 1;
  const counted = all.length - 1; // the welcome isn't a numbered step

  // Follow the lit part as the page lays out, scrolls or resizes (a frame loop while open; state only changes when the
  // numbers do).
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const tick = () => {
      const el = step.target?.() ?? null;
      const r = el?.getBoundingClientRect();
      const next = r && r.width > 0 && r.height > 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null;
      setRect((prev) => (same(prev, next) ? prev : next));
      const c = cardRef.current;
      if (c) setCard((prev) => (Math.abs(prev.w - c.offsetWidth) < 0.5 && Math.abs(prev.h - c.offsetHeight) < 0.5 ? prev : { w: c.offsetWidth, h: c.offsetHeight }));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, step]);

  // The main button has the focus on every step; Esc skips, ← and → move.
  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus({ preventScroll: true });
  }, [open, at]);

  const finish = () => {
    try {
      window.sessionStorage.setItem(KEY(storyId), "1");
    } catch {
      // Storage blocked: it shows again next time, nothing else.
    }
    setOpen(false);
  };
  const next = () => {
    if (last) return finish();
    if (at === 0) onStart?.();
    setAt((a) => a + 1);
  };
  const back = () => setAt((a) => Math.max(0, a - 1));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      } else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;
  // A step whose part isn't on the page (a tab that isn't open, a phone layout) shows its card in the middle.
  const pos = cardPosition(step.target ? rect : null, step.place, card);

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Blocks the page while the tour is open; the lit part is for looking, not clicking. */}
      <div aria-hidden="true" className="absolute inset-0" />
      {rect && step.target ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-[20px] ring-2 ring-white/70 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            // Not a shadow: the backdrop, with a hole where the lit part is (the no-shadow rule doesn't apply).
            boxShadow: "0 0 0 9999px rgb(17 17 18 / 0.5)",
          }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-[rgb(17_17_18/0.5)]" />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute w-[min(340px,calc(100vw-24px))] rounded-[18px] bg-white p-4 ring-1 ring-black/[0.08] transition-[top,left] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
        style={{ top: pos.top, left: pos.left }}
      >
        {at === 0 ? (
          <div className="mb-3 flex items-center gap-2.5">
            <BotAvatar id="pm" size={32} />
            <span className="text-xs text-[var(--tx2)]">The PM, for this story</span>
          </div>
        ) : (
          <p className="m-0 mb-1.5 text-xs text-[var(--tx2)] tabular-nums">
            {at} of {counted}
          </p>
        )}
        <h2 id={titleId} className="m-0 text-base font-semibold text-[var(--tx)]">
          {step.title}
        </h2>
        <p className="m-0 mt-1 text-sm text-pretty text-[var(--tx)]">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          {/* Where you are: a dot per step. */}
          {at > 0 && (
            <span aria-hidden="true" className="mr-auto flex items-center gap-1">
              {all.slice(1).map((s, i) => (
                <span key={s.key} className={`size-1.5 rounded-full ${i + 1 === at ? "bg-[var(--tx)]" : "bg-[var(--ctl)]"}`} />
              ))}
            </span>
          )}
          {at === 0 && <span className="mr-auto" />}
          {!last && (
            <button type="button" onClick={finish} className="inline-flex h-8 items-center rounded-full px-2.5 text-sm font-medium text-[var(--tx2)] transition-colors duration-[120ms] hover:text-[var(--tx)]">
              Skip
            </button>
          )}
          {at > 1 && (
            <button type="button" onClick={back} className={BTN_SECONDARY}>
              Back
            </button>
          )}
          <button ref={primaryRef} type="button" onClick={next} className={BTN_PRIMARY}>
            {at === 0 ? "Show me around" : last ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
