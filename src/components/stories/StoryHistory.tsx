import { Fragment, useState } from "react";
import { ArrowRight, CircleHelp, Hammer, MessageSquare, Sparkles, type LucideIcon } from "lucide-react";
import type { ThreadEntry } from "@/types/stories";
import { plainText } from "./decisions";
import { answerText } from "./questions";

// The History tab (Shubham, 26 Nov: "the history is very long, how can we show it?"). Three things keep a long log
// short: the newest first, so what you came for is at the top; Updates by default (status changes, robot runs,
// questions and their answers), with the chat's messages only under Everything, since the chat already shows them;
// and the first dozen lines, then "Show older". One line each, two at most; a line opens the moment in the chat.

interface Line {
  id: string;
  icon: LucideIcon;
  text: string;
  /** Muted after the text: who, or what came of it. */
  note?: string;
  /** Messages show only under Everything. */
  message?: boolean;
}

type Filter = "updates" | "all";

const FIRST = 12;

/** The day an entry belongs to: "Just now" and times of day are today. */
const dayOf = (at: string) => (at === "Just now" || /^\d{1,2}:\d{2}\s?[AP]M$/.test(at) ? "Today" : at);

function lineOf(e: ThreadEntry): Line | null {
  switch (e.kind) {
    case "created":
      return { id: e.id, icon: Sparkles, text: `${e.by.kind === "agent" ? "The agent" : e.by.name} created the story` };
    case "stage":
      return { id: e.id, icon: ArrowRight, text: e.text };
    case "run":
      // The summary usually says its steps already ("Built in 42m · 6 steps").
      return e.running ? null : { id: e.id, icon: Hammer, text: e.summary, note: /step/i.test(e.summary) ? undefined : `${e.steps.length} steps` };
    case "question":
      return { id: e.id, icon: CircleHelp, text: e.question, note: e.answer ? `${answerText(e)} · ${e.answer.by}` : "Not answered yet" };
    case "message": {
      const words = plainText(e.text, e.report);
      if (!words && !e.files?.length) return null;
      return {
        id: e.id,
        icon: MessageSquare,
        text: words || `${e.files?.length} ${e.files?.length === 1 ? "file" : "files"}`,
        note: e.author.kind === "agent" ? "Agent" : e.author.name,
        message: true,
      };
    }
  }
}

const SEGMENT =
  "inline-flex h-7 flex-1 items-center justify-center rounded-md px-2.5 text-sm font-medium text-[var(--tx2)] transition-colors duration-[120ms] hover:text-[var(--tx)] aria-pressed:bg-white aria-pressed:text-[var(--tx)] aria-pressed:ring-1 aria-pressed:ring-black/[0.06]";

export function HistoryList({ entries, onSee }: { entries: ThreadEntry[]; onSee: (entryId: string) => void }) {
  const [filter, setFilter] = useState<Filter>("updates");
  const [all, setAll] = useState(false);
  const lines: (Line & { day: string })[] = [];
  for (const e of entries) {
    const line = lineOf(e);
    if (line && (filter === "all" || !line.message)) lines.push({ ...line, day: dayOf(e.at) });
  }
  lines.reverse(); // newest first
  const shown = all ? lines : lines.slice(0, FIRST);
  const older = lines.length - shown.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Updates or Everything (DESIGN.md §7.11 segmented control). */}
      <div role="group" aria-label="Show" className="flex rounded-lg bg-field p-0.5">
        <button type="button" aria-pressed={filter === "updates"} onClick={() => setFilter("updates")} className={SEGMENT}>
          Updates
        </button>
        <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={SEGMENT}>
          Everything
        </button>
      </div>
      {lines.length === 0 ? (
        <p className="m-0 text-sm text-[var(--tx2)]">Nothing has happened yet.</p>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {shown.map((line, i) => (
            <Fragment key={line.id}>
              {(i === 0 || shown[i - 1].day !== line.day) && (
                <li className={`pb-1 text-xs font-medium text-[var(--tx2)] ${i === 0 ? "" : "pt-3"}`}>{line.day}</li>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => onSee(line.id)}
                  title="See it in the chat"
                  className="-mx-2 flex w-[calc(100%+16px)] gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors duration-[120ms] hover:bg-hover"
                >
                  <span aria-hidden="true" className="mt-px flex size-5 flex-none items-center justify-center rounded-full bg-[#F4F4F5] text-[var(--tx2)]">
                    <line.icon size={12} strokeWidth={1.75} />
                  </span>
                  <span className="line-clamp-2 min-w-0 flex-1 text-sm text-pretty text-[var(--tx)]">
                    {line.text}
                    {line.note && <span className="text-[var(--tx2)]"> · {line.note}</span>}
                  </span>
                </button>
              </li>
            </Fragment>
          ))}
        </ol>
      )}
      {(older > 0 || all) && lines.length > FIRST && (
        <button
          type="button"
          onClick={() => setAll((a) => !a)}
          className="inline-flex min-h-6 items-center self-start rounded-[4px] text-xs font-medium text-[var(--tx2)] underline decoration-black/20 underline-offset-2 hover:text-[var(--tx)] pointer-coarse:min-h-9"
        >
          {all ? "Show fewer" : `Show older · ${older}`}
        </button>
      )}
    </div>
  );
}
