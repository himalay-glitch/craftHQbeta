import { useEffect, useRef, useState, type ReactNode } from "react";
import { LiveLine } from "@/components/stories/LiveLine";
import type { LiveRun } from "@/types/stories";
import { CircleExclamationPoint, Link } from "lucide-react";
import type { NeedKind, Story } from "@/types/dashboard";
import { BTN_PRIMARY, BTN_SECONDARY, ICON_BTN } from "./classes";
import { StatusPill } from "@/components/ui/StatusPill";
import { NEED_STATUS, needHint, STATUS_LABEL, storyRef } from "./format";
import { PersonAvatar } from "./PersonAvatar";
import { SidePanel } from "./SidePanel";
import { Tip } from "./Tip";

export type StoryAction =
  | { type: "accept" | "approve" | "defaults" | "restart" | "plan" | "cancel" }
  | { type: "note"; text: string; intent: "changes" | "question" | "note" };

interface StoryPanelProps {
  story: Story;
  isWide: boolean;
  onClose: () => void;
  onAct: (action: StoryAction) => void;
  onCopyLink: () => void;
}

type Composer = { intent: "changes" | "question" | "note"; send: string };
type Secondary = (Composer & { label: string }) | { label: string; action: "cancel" };

/** Buttons per group, worded as in the prototype: the primary on the right, at most one secondary. */
const ACTIONS: Record<NeedKind, { primary?: { label: string; action: Exclude<StoryAction["type"], "note"> }; secondary?: Secondary }> = {
  review: {
    primary: { label: "Accept · Done", action: "accept" },
    secondary: { label: "Ask for changes", intent: "changes", send: "Send changes" },
  },
  planning: {
    primary: { label: "Approve and build", action: "approve" },
    secondary: { label: "Ask a question", intent: "question", send: "Send question" },
  },
  decision: {
    primary: { label: "Let the defaults stand", action: "defaults" },
    secondary: { label: "Answer in a note", intent: "note", send: "Send note" },
  },
  stuck: {
    primary: { label: "Restart", action: "restart" },
    secondary: { label: "Add a note", intent: "note", send: "Send note" },
  },
  triage: {
    primary: { label: "Move to planning", action: "plan" },
    secondary: { label: "Cancel story", action: "cancel" },
  },
  next: { secondary: { label: "Add a note", intent: "note", send: "Send note" } },
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="flex h-9 items-center text-[13px] leading-[18px] text-[var(--tx2)]">{label}</dt>
      <dd className="flex h-9 min-w-0 items-center text-[14px] leading-5 text-[var(--tx)]">{children}</dd>
    </>
  );
}

/** One story: its facts, the latest from the agent, and the action it's waiting for. */
export function StoryPanel({ story, isWide, onClose, onAct, onCopyLink }: StoryPanelProps) {
  const [composer, setComposer] = useState<Composer | null>(null);
  const [draft, setDraft] = useState("");
  const [shownId, setShownId] = useState(story.id);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const need = story.need;
  const config = need ? ACTIONS[need] : undefined;
  const titleId = `story-${story.id}-title`;
  const latest = story.action ?? (need ? needHint(need) : "") ?? "";

  // A different story starts clean (reset while rendering, not in an effect).
  if (shownId !== story.id) {
    setShownId(story.id);
    setComposer(null);
    setDraft("");
  }

  // Focus moves to the title so screen readers announce the story.
  useEffect(() => {
    document.querySelector<HTMLElement>("[data-panel-title]")?.focus();
  }, [story.id]);

  useEffect(() => {
    if (composer) textRef.current?.focus();
  }, [composer]);

  const send = () => {
    if (!composer || !draft.trim()) return;
    onAct({ type: "note", text: draft.trim(), intent: composer.intent });
    setComposer(null);
    setDraft("");
  };

  let footer: ReactNode = null;
  if (need && composer) {
    footer = (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="story-note" className="sr-only">
          {composer.send}
        </label>
        <textarea
          id="story-note"
          ref={textRef}
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={"Send direction or ask a question…"}
          className="block max-h-60 min-h-24 w-full resize-y rounded-[8px] border border-[var(--ctl)] px-3 py-2 text-[15px] leading-[22px] text-[var(--tx)] transition-[border-color,box-shadow] duration-[120ms] hover:border-[var(--ctl-h)] focus:border-[var(--cta)] focus:shadow-[0_0_0_3px_rgb(47_111_237/0.16)] focus:outline-none"
        />
        <span className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[12px] leading-4 text-[var(--tx2)]">Notes get a reply. Code changes only after you approve.</span>
          <span className="flex flex-none items-center gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => setComposer(null)}>
              Cancel
            </button>
            <button type="submit" className={BTN_PRIMARY} disabled={!draft.trim()}>
              {composer.send}
            </button>
          </span>
        </span>
      </form>
    );
  } else if (need && config) {
    const sec = config.secondary;
    footer = (
      <span className="flex flex-wrap items-center justify-end gap-2">
        {sec && (
          <button
            type="button"
            className={BTN_SECONDARY}
            onClick={() => ("action" in sec ? onAct({ type: sec.action }) : setComposer(sec))}
          >
            {sec.label}
          </button>
        )}
        {config.primary && (
          <button type="button" className={BTN_PRIMARY} onClick={() => onAct({ type: config.primary!.action })}>
            {config.primary.label}
          </button>
        )}
      </span>
    );
  }

  return (
    <SidePanel
      title={story.title}
      titleId={titleId}
      eyebrow={storyRef(story.id)}
      isWide={isWide}
      onClose={onClose}
      footer={footer}
      actions={
        <Tip label="Copy link">
          <button type="button" aria-label="Copy link" onClick={onCopyLink} className={ICON_BTN}>
            <Link aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
        </Tip>
      }
    >
      <dl className="mt-4 grid grid-cols-[104px_minmax(0,1fr)]">
        {need && (
          <Field label="Status">
            <StatusPill status={NEED_STATUS[need]} />
          </Field>
        )}
        <Field label="Stage">{STATUS_LABEL[story.status]}</Field>
        {need && <Field label="Waiting on">{story.waitingOn ?? "Nobody: not being picked up"}</Field>}
        {story.owner && (
          <Field label="Owner">
            <span className="flex items-center gap-2">
              <PersonAvatar initials={story.owner} />
              {story.owner}
            </span>
          </Field>
        )}
        {story.meta && <Field label="Open items">{story.meta}</Field>}
        {story.updated && <Field label="Updated">{story.updated}</Field>}
      </dl>

      <div className="mt-5 border-t border-[var(--line)] pt-5">
        {!need ? (
          <>
            {"live" in story && story.live && (
              <p className="mb-2 flex">
                <LiveLine live={story.live as LiveRun} size={16} />
              </p>
            )}
            <p className="text-[15px] leading-[22px] text-[var(--tx2)]">Nothing is needed from you on this story right now.</p>
          </>
        ) : need === "stuck" ? (
          <p className="flex gap-2 rounded-[8px] bg-[var(--red-bg)] px-3 py-2.5 text-[14px] leading-5 text-[var(--red)]">
            <CircleExclamationPoint aria-hidden="true" size={16} strokeWidth={1.75} className="mt-0.5 flex-none" />
            <span>{latest}</span>
          </p>
        ) : (
          latest && (
            <section aria-labelledby={`${titleId}-latest`}>
              <h3 id={`${titleId}-latest`} className="text-[15px] leading-[22px] font-medium">
                Latest from the agent
              </h3>
              <p className="mt-2 text-[15px] leading-[22px] text-[var(--tx)]">{latest}</p>
            </section>
          )
        )}
      </div>
    </SidePanel>
  );
}
