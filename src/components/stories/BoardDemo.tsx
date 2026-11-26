import { useEffect, useRef, useState } from "react";
import { ChevronDown, Cpu } from "lucide-react";
import type { StoryItem } from "@/types/stories";
import type { PhaseKey } from "@/types/stories";
import type { Landing } from "./StoriesBoard";
import type { StoryPatch } from "./live";

/** What a step does to a story: "move" lands it in another stage, "merge" lands it in Done as merged. */
export type DemoKind = "move" | "merge" | "update";

interface BoardDemoProps {
  stories: StoryItem[];
  onEvent: (id: number, patch: StoryPatch, kind: DemoKind) => void;
  landing: Landing;
  onLanding: (landing: Landing) => void;
  onStop: () => void;
}

const NEXT_PHASE: Partial<Record<PhaseKey, PhaseKey>> = { plan: "implement", implement: "ui-check", "ui-check": "review", review: "verify", verify: "implement" };

const now = () => ({ updated: "just now", updatedMinutes: 0 });

/**
 * Demo only (`?demo=live`): plays robots' work on the board on demand, since there's no back end yet. Every story
 * is in the sample, and no step skips the approval: a person approves, a robot starts, checks pass, a person
 * merges. Never on a timer unless "Play the pipeline" is pressed, which stops at the end. Same look as the story
 * page's teammate demo, docked bottom right, clear of Planning's "+ New story".
 */
export function BoardDemo({ stories, onEvent, landing, onLanding, onStop }: BoardDemoProps) {
  const [open, setOpen] = useState(true);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const find = (id: number) => stories.find((s) => s.id === id);
  const s30 = find(30);
  const s57 = find(57);
  const s54 = find(54);
  const s43 = find(43);

  const steps: { label: string; can: boolean; run: () => void }[] = [
    {
      label: "Approve hq-30’s plan (as you)",
      can: s30?.status === "planning",
      run: () => onEvent(30, { status: "approved", clear: ["need", "waitingOn", "meta", "live"], ...now() }, "move"),
    },
    {
      label: "Builder starts hq-30",
      can: s30?.status === "approved",
      run: () => onEvent(30, { status: "in_progress", live: { phase: "implement", startedAt: Date.now() }, ...now() }, "move"),
    },
    {
      label: "Next phase on hq-57",
      can: Boolean(s57?.live),
      run: () => {
        const live = find(57)?.live;
        if (live) onEvent(57, { live: { ...live, phase: NEXT_PHASE[live.phase] ?? "implement" } }, "update");
      },
    },
    {
      label: "hq-57’s checks pass",
      can: s57?.status === "in_progress",
      run: () => onEvent(57, { status: "in_review", need: "review", waitingOn: "You", clear: ["live"], ...now() }, "move"),
    },
    {
      label: "hq-54 needs an answer",
      can: s54?.status === "in_progress",
      run: () => onEvent(54, { status: "planning", need: "decision", waitingOn: "You", meta: "1 open question", clear: ["live"], ...now() }, "move"),
    },
    {
      label: "Create hq-43’s pull request",
      can: s43?.status === "in_review",
      run: () => onEvent(43, { status: "pull_request", pr: { state: "open", number: 229, merge: "ready" }, clear: ["need", "waitingOn", "live"], ...now() }, "move"),
    },
    {
      label: "Deepak merges hq-43 on GitHub",
      can: s43?.status === "pull_request",
      run: () => onEvent(43, { status: "done", outcome: "merged", pr: { state: "merged", number: 229 }, ...now() }, "merge"),
    },
  ];

  // The latest render's steps, so a step played later sees the board as it is then, not as it was when Play was
  // pressed (and the hold rule sees where the pointer is now).
  const latestSteps = useRef(steps);
  useEffect(() => {
    latestSteps.current = steps;
  });

  // Steps 1, 2, 4, 5 and 6 in order, one every 3 s; a step that no longer applies when its turn comes is skipped.
  const play = () => {
    setPlaying(true);
    const order = [0, 1, 3, 4, 5];
    order.forEach((i, n) =>
      timers.current.push(
        window.setTimeout(() => {
          const step = latestSteps.current[i];
          if (step.can) step.run();
          if (n === order.length - 1) setPlaying(false);
        }, n * 3000),
      ),
    );
  };
  const stop = () => {
    timers.current.splice(0).forEach((t) => window.clearTimeout(t));
    setPlaying(false);
    onStop();
  };

  // Unavailable steps stay focusable (aria-disabled), so pressing one never drops keyboard focus.
  const base =
    "h-7 rounded-full border border-[var(--ctl)] bg-white px-3 text-left text-xs whitespace-nowrap text-[var(--tx)] transition-colors duration-[120ms] hover:border-[var(--ctl-h)] hover:bg-[var(--ctl-bg-h)] aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:border-[var(--ctl)] aria-disabled:hover:bg-white";
  const btn = `${base} w-full`;

  return (
    <aside
      aria-label="Demo controls"
      className="fixed right-4 bottom-4 z-50 w-64 rounded-xl border border-dashed border-[var(--ctl-h)] bg-white/95 p-2 backdrop-blur"
    >
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-xs font-medium text-[var(--tx2)]">
        <Cpu aria-hidden="true" size={14} strokeWidth={1.75} />
        <span className="flex-1 text-left">Demo · simulated robots</span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.75} className={`transition-transform duration-[120ms] ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          {steps.map((st) => {
            const off = !st.can || playing;
            return (
              <button key={st.label} type="button" className={btn} aria-disabled={off} onClick={off ? undefined : st.run}>
                {st.label}
              </button>
            );
          })}
          <div className="flex items-center gap-1.5 px-1 pt-0.5 text-xs text-[var(--tx2)]">
            <span className="flex-1">Landing</span>
            {(["clear", "subtle"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={landing === l}
                onClick={() => onLanding(l)}
                className={`h-6 rounded-full px-2.5 ${landing === l ? "bg-[var(--ctl-bg-on)] font-medium text-[var(--tx)]" : "hover:text-[var(--tx)]"}`}
              >
                {l === "clear" ? "Clear" : "Subtle"}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 pt-0.5">
            <button type="button" className={`${base} min-w-0 flex-1`} aria-disabled={playing} onClick={playing ? undefined : play}>
              Play the pipeline
            </button>
            <button type="button" className={`${base} flex-none`} onClick={stop}>
              Stop
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
