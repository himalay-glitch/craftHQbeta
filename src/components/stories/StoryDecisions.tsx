import { useId, useState, type SubmitEvent } from "react";
import { ChevronRight } from "lucide-react";
import type { Decision } from "@/types/stories";

// Decisions, under the status on the right (Shubham, 26 Nov): what was settled on this story, by whom and when, kept
// for good, so a misunderstanding or a debate can always be settled by looking it up. Newest first, one line each;
// a row opens to say where it came from, with "See in chat" and, for answers and saved decisions, "Change". A change
// never edits the old decision: it adds a new one, and the old one stays, crossed out.

const SHOWN = 4;

const LINK =
  "inline-flex min-h-6 items-center rounded-[4px] text-xs font-medium text-[var(--tx)] underline decoration-black/20 underline-offset-2 transition-colors duration-[120ms] hover:decoration-current pointer-coarse:min-h-9";

interface StoryDecisionsProps {
  /** Newest first. */
  decisions: Decision[];
  /** Questions still waiting on an answer, oldest first. */
  open: { id: string; question: string }[];
  /** Scrolls the chat to an entry and tints it for a moment. */
  onSee: (entryId: string) => void;
  /** Whether that entry is in the chat on this visit (decisions saved on an earlier visit may point at a note that isn't). */
  inChat: (entryId: string) => boolean;
  onChange: (d: Decision, text: string) => void;
}

export function StoryDecisions({ decisions, open, onSee, inChat, onChange }: StoryDecisionsProps) {
  const headingId = useId();
  const [all, setAll] = useState(false);
  const current = decisions.filter((d) => !d.replacedBy).length;
  const shown = all ? decisions : decisions.filter((d) => !d.replacedBy).slice(0, SHOWN);
  const hidden = decisions.length - shown.length;

  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <div className="flex h-6 items-center justify-between gap-2">
        <h3 id={headingId} className="m-0 flex items-center gap-1.5 text-xs font-medium text-[var(--tx2)]">
          Decisions
          {current > 0 && <span className="tabular-nums">· {current}</span>}
        </h3>
        {/* A question still waiting: one tap to it, wherever it is. */}
        {open.length > 0 && (
          <button
            type="button"
            onClick={() => onSee(open[0].id)}
            className="inline-flex h-6 items-center gap-1.5 rounded-full bg-warning-tint px-2 text-xs font-medium text-warning-ink transition-[filter] duration-[120ms] hover:brightness-95"
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#d97706]" />
            {open.length} open
          </button>
        )}
      </div>
      {decisions.length === 0 ? (
        <p className="m-0 mt-1 text-xs text-pretty text-[var(--tx2)]">
          Nothing decided yet. Answers to questions, approvals and messages you save as decisions are kept here for good.
        </p>
      ) : (
        <ul className="-mx-2 mt-1 flex list-none flex-col p-0">
          {shown.map((d) => (
            <DecisionRow key={d.id} d={d} onSee={onSee} inChat={inChat} onChange={onChange} />
          ))}
        </ul>
      )}
      {(hidden > 0 || all) && decisions.length > SHOWN && (
        <button type="button" onClick={() => setAll((a) => !a)} className={`${LINK} mt-1 self-start text-[var(--tx2)]`}>
          {all ? "Show fewer" : `Show all ${decisions.length}`}
        </button>
      )}
    </section>
  );
}

function DecisionRow({ d, onSee, inChat, onChange }: { d: Decision; onSee: (id: string) => void; inChat: (id: string) => boolean; onChange: (d: Decision, text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(d.text);
  const inputId = useId();
  const replaced = Boolean(d.replacedBy);
  // Approvals are changed by moving the story, not by rewording them.
  const changeable = !replaced && d.kind !== "approval";
  const where =
    d.kind === "answer"
      ? d.question && `Answered: ${d.question}`
      : d.kind === "approval"
        ? "A move on the story’s status"
        : d.replaces
          ? "Replaces an earlier decision"
          : d.from && `Saved from ${d.from === "You" ? "your" : `${d.from}’s`} message`;

  const save = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || text === d.text) return;
    onChange(d, text);
    setEditing(false);
    setOpen(false);
  };

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors duration-[120ms] hover:bg-hover"
      >
        <span className="min-w-0 flex-1">
          <span className={`block text-sm text-pretty ${replaced ? "text-[var(--tx2)] line-through decoration-[var(--tx2)]/60" : "text-[var(--tx)]"}`}>
            {d.text}
          </span>
          <span className="block text-xs text-[var(--tx2)]">
            {d.replacedBy ? `Replaced by ${d.replacedBy.by} · ${d.replacedBy.at}` : `${d.by} · ${d.at}`}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          size={14}
          strokeWidth={1.75}
          className={`mt-[3px] flex-none text-[var(--tx2)] opacity-0 transition-[transform,opacity] duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100 ${open ? "rotate-90 opacity-100" : ""}`}
        />
      </button>
      {open && (
        <div className="px-2 pt-0.5 pb-2">
          {where && <p className="m-0 text-xs text-pretty text-[var(--tx2)]">{where}</p>}
          {d.others && d.others.length > 0 && (
            <p className="m-0 mt-1 text-xs text-pretty text-[var(--tx2)]">
              Not chosen: {d.others.join(" · ")}
            </p>
          )}
          {editing ? (
            <form onSubmit={save} className="mt-2 flex flex-col gap-2">
              <label htmlFor={inputId} className="text-xs font-medium text-[var(--tx)]">
                The new decision
              </label>
              <textarea
                id={inputId}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                autoFocus
                className="field-sizing-content max-h-32 min-h-14 w-full resize-none rounded-[10px] border border-[var(--ctl)] bg-white px-2.5 py-1.5 text-sm text-[var(--tx)] outline-none focus:border-[var(--cta)]"
              />
              <p className="m-0 text-xs text-[var(--tx2)]">The old one stays, crossed out, so you can see what changed.</p>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!draft.trim() || draft.trim() === d.text}
                  className="inline-flex h-7 items-center rounded-full bg-[var(--cta)] px-3 text-sm font-medium text-white transition-colors duration-[120ms] hover:bg-[var(--cta-h)] disabled:bg-[#E4E4E7]"
                >
                  Save change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDraft(d.text);
                  }}
                  className="inline-flex h-7 items-center rounded-full border border-[var(--ctl)] bg-white px-3 text-sm font-medium text-[var(--tx)] hover:bg-[var(--ctl-bg-h)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            (d.entryId && inChat(d.entryId)) || changeable ? (
              <div className="mt-1 flex flex-wrap gap-x-3">
                {d.entryId && inChat(d.entryId) && (
                  <button type="button" onClick={() => d.entryId && onSee(d.entryId)} className={LINK}>
                    See in chat
                  </button>
                )}
                {changeable && (
                  <button type="button" onClick={() => setEditing(true)} className={LINK}>
                    Change
                  </button>
                )}
              </div>
            ) : null
          )}
        </div>
      )}
    </li>
  );
}
