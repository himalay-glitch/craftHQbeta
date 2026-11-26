import { Fragment, useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { PencilLine, X } from "lucide-react";
import type { FileRef, Segment } from "@/types/stories";
import { BTN_SECONDARY, ICON_BTN } from "@/components/dashboard/classes";
import { RichText } from "./RichText";
import { Files } from "./StoryThread";

// The whole story as it was written, to read (Shubham, 26 Nov: descriptions can run to a pasted spec, and the chat
// shows a long one as a card). A form-size modal (DESIGN.md §7.9, 576 px) whose body scrolls inside it; full
// screen on phones, since it can be long. Read-only: a change goes through the chat as a note, because once the plan
// is approved a changed story is an instruction to rebuild.
/** The reading modal (Story details, History): form size, its body scrolling inside; full screen on phones. */
export const DIALOG =
  "m-auto max-h-[min(760px,calc(100dvh-64px))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border-0 bg-white p-0 text-[var(--tx)] ring-1 ring-black/[0.08] open:flex backdrop:bg-scrim " +
  "opacity-0 scale-98 transition-all transition-discrete duration-200 ease-out " +
  "open:opacity-100 open:scale-100 starting:open:opacity-0 starting:open:scale-98 " +
  "backdrop:opacity-0 backdrop:transition-all backdrop:transition-discrete backdrop:duration-200 " +
  "open:backdrop:opacity-100 starting:open:backdrop:opacity-0 " +
  "motion-reduce:transition-none motion-reduce:backdrop:transition-none " +
  "max-sm:m-0 max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:rounded-none";

const SECTION = "m-0 text-xs font-medium text-[var(--tx2)]";
const TEXT = "text-base text-pretty text-[var(--tx)]";
const BODY = TEXT;

export interface StoryBrief {
  /** "hq-23". */
  ref: string;
  title: string;
  /** The board column it's in now: "Planning". */
  column: string;
  why?: string;
  detail?: string;
  /** No why or detail kept apart (a hand-written conversation): the first message, as it was sent. */
  ask?: Segment[];
  files?: FileRef[];
  writtenBy?: string;
  writtenAt?: string;
  owner?: string;
  /** "Typed in CraftHQ". */
  source?: string;
  /** "we-pop". */
  repository?: string;
}

interface StoryDetailsProps {
  open: boolean;
  onClose: () => void;
  brief: StoryBrief;
  /** "Write a note": closes this and puts the cursor in the chat's message box. */
  onWriteNote: () => void;
  stories: { id: number; title: string }[];
}

/** Past this many characters (or three lines), the story shows in the chat as a card instead of its whole text. */
const LONG = 320;
/** A "why" this short is said in words above the card. */
const LEAD = 240;

/**
 * How a long story shows in the chat: its "why" as words, then a card with the details' first line and how much was
 * written. Null when it's short enough to read in the chat as it is.
 */
export function storyCardFor(b: StoryBrief): { lead?: string; preview: string; meta: string } | null {
  const ask = b.ask?.every((x) => typeof x === "string") ? (b.ask as string[]).join("") : undefined;
  const all = [b.why, b.detail].filter(Boolean).join("\n\n") || ask || "";
  if (all.length <= LONG && all.split("\n").filter((l) => l.trim()).length <= 3) return null;
  let lead: string | undefined;
  let body = all;
  if (b.detail) {
    lead = b.why && b.why.length <= LEAD ? b.why : undefined;
    if (lead) body = b.detail;
  } else {
    // A hand-written first message: its opening paragraph, when short, is said as words.
    const [first, ...rest] = all.split(/\n\s*\n/);
    if (rest.length > 0 && first.length <= LEAD) {
      lead = first;
      body = rest.join("\n\n");
    }
  }
  const preview = body.split("\n").map((l) => l.replace(/^\s*(?:#{1,6}|[-*•]|\d+[.)])\s+/, "").trim()).find(Boolean) ?? "";
  const words = all.trim().split(/\s+/).length;
  const files = b.files?.length ?? 0;
  const meta = [`${words.toLocaleString("en-US")} words`, files ? `${files} ${files === 1 ? "file" : "files"}` : ""].filter(Boolean).join(" · ");
  return { lead, preview, meta };
}

const URL_RE = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;
const LIST_RE = /^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/;
const HEADING_RE = /^#{1,6}\s+(.*)$/;

/** Web addresses in plain text, as links that open in a new tab. */
function linkify(text: string): ReactNode[] {
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all underline decoration-black/25 underline-offset-2 hover:decoration-current">
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export type Block = { kind: "p"; lines: string[] } | { kind: "h"; text: string } | { kind: "list"; ordered: boolean; items: string[] };

/** Pasted text as blocks: paragraphs (blank lines between), "- " and "1. " lists, and "## " headings from a spec. */
export function blocks(text: string): Block[] {
  const out: Block[] = [];
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const last = out[out.length - 1];
    if (!line.trim()) {
      // A paragraph ends at a blank line; a list doesn't, so items with blank lines between them stay one list.
      if (last?.kind === "p" && last.lines.length > 0) out.push({ kind: "p", lines: [] });
      continue;
    }
    const heading = HEADING_RE.exec(line);
    const item = LIST_RE.exec(line);
    if (heading) out.push({ kind: "h", text: heading[1] });
    else if (item && last?.kind === "list" && last.ordered === Boolean(item[1])) last.items.push(item[2]);
    else if (item) out.push({ kind: "list", ordered: Boolean(item[1]), items: [item[2]] });
    else if (last?.kind === "p") last.lines.push(line);
    else out.push({ kind: "p", lines: [line] });
  }
  return out.filter((b) => b.kind !== "p" || b.lines.length > 0);
}

/** `compact`: 14 px, for the narrow Story tab beside the chat. */
export function Prose({ text, compact }: { text: string; compact?: boolean }) {
  const TEXT = compact ? "text-sm text-pretty text-[var(--tx)]" : BODY;
  return (
    <div className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
      {blocks(text).map((b, i) =>
        b.kind === "h" ? (
          <h4 key={i} className={`m-0 mt-1 font-semibold text-[var(--tx)] ${compact ? "text-sm" : "text-base"}`}>
            {linkify(b.text)}
          </h4>
        ) : b.kind === "list" ? (
          b.ordered ? (
            <ol key={i} className={`${TEXT} m-0 flex list-decimal flex-col gap-1 pl-6`}>
              {b.items.map((it, j) => (
                <li key={j}>{linkify(it)}</li>
              ))}
            </ol>
          ) : (
            <ul key={i} className={`${TEXT} m-0 flex list-disc flex-col gap-1 pl-5`}>
              {b.items.map((it, j) => (
                <li key={j}>{linkify(it)}</li>
              ))}
            </ul>
          )
        ) : (
          <p key={i} className={`${TEXT} m-0 whitespace-pre-wrap`}>
            {linkify(b.lines.join("\n"))}
          </p>
        ),
      )}
    </div>
  );
}

/** Who wrote it and who owns it, in one line: "Written by Skye Rao · Nov 14 · Owner rtdp". */
export function byline({ writtenBy, writtenAt, owner }: StoryBrief) {
  const parts: string[] = [];
  if (writtenBy) parts.push(`Written by ${writtenBy}`);
  if (writtenAt) parts.push(writtenAt);
  if (owner && owner !== writtenBy) parts.push(`Owner ${owner}`);
  return parts.join(" · ");
}

/**
 * "Story details": the title in full, why it matters, everything else that was written (paragraphs, lists and links
 * kept), the attached files, and who wrote it. Opened from the story's name at the top of its page, from ⋯ and from
 * the Story details card a long story shows as in the chat.
 */
export function StoryDetails({ open, onClose, brief, onWriteNote, stories }: StoryDetailsProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // A hairline over the footer only while the body scrolls (DESIGN.md §7.9).
  const [scrolls, setScrolls] = useState(false);

  // Keep the native dialog in step with `open`; the page behind holds still.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      bodyRef.current?.scrollTo({ top: 0 });
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const body = bodyRef.current;
    const measure = () => setScrolls(Boolean(body && body.scrollHeight > body.clientHeight + 1));
    measure();
    const observer = new ResizeObserver(measure);
    if (body) observer.observe(body);
    return () => {
      root.style.overflow = previous;
      observer.disconnect();
    };
  }, [open]);

  // Nothing can be lost here, so a click on the scrim closes it.
  const onScrimClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const line = byline(brief);
  const written = Boolean(brief.why || brief.detail || (brief.ask && brief.ask.length > 0));

  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={() => open && onClose()} onClick={onScrimClick} className={DIALOG}>
      <header className="flex flex-none items-start gap-3 px-6 pt-6 pb-4">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-xs text-[var(--tx2)] tabular-nums">
            {brief.ref} · {brief.column}
          </p>
          <h2 id={titleId} className="m-0 mt-1 text-base font-semibold text-pretty break-words">
            {brief.title}
          </h2>
          {line && <p className="m-0 mt-1 text-xs text-[var(--tx2)]">{line}</p>}
          {/* Where it came from and where the code goes (the old story page's top-left facts, Shubham, 26 Nov). */}
          {(brief.source || brief.repository) && (
            <p className="m-0 mt-0.5 text-xs text-[var(--tx2)]">{[brief.source, brief.repository && `Repository ${brief.repository}`].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className={`${ICON_BTN} -mt-1 -mr-2`}>
          <X aria-hidden="true" size={16} strokeWidth={1.75} />
        </button>
      </header>

      {/* tabIndex: the long text scrolls with the keyboard too. */}
      <div ref={bodyRef} tabIndex={-1} className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pt-1 pb-6 outline-none">
        {brief.why && (
          <section className="flex flex-col gap-1.5">
            <h3 className={SECTION}>Why it matters</h3>
            <Prose text={brief.why} />
          </section>
        )}
        {brief.detail && (
          <section className="flex flex-col gap-1.5">
            <h3 className={SECTION}>Details</h3>
            <Prose text={brief.detail} />
          </section>
        )}
        {!brief.why && !brief.detail && brief.ask && brief.ask.length > 0 && (
          <section className="flex flex-col gap-1.5">
            <h3 className={SECTION}>The story</h3>
            {brief.ask.every((s) => typeof s === "string") ? (
              <Prose text={brief.ask.join("")} />
            ) : (
              <p className={`${TEXT} m-0 whitespace-pre-wrap`}>
                <RichText segments={brief.ask} stories={stories} />
              </p>
            )}
          </section>
        )}
        {!written && <p className={`${TEXT} m-0 text-[var(--tx2)]`}>Only the title was written. The rest of the story is in the chat.</p>}
        {brief.files && brief.files.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className={SECTION}>Files</h3>
            <Files files={brief.files} mine={false} />
          </section>
        )}
      </div>

      <footer className={`flex flex-none items-center gap-3 px-6 py-4 max-sm:pb-[max(16px,env(safe-area-inset-bottom))] ${scrolls ? "border-t border-[var(--line)]" : ""}`}>
        <p className="m-0 min-w-0 flex-1 text-sm text-[var(--tx2)]">To change something, say it in the chat.</p>
        <button type="button" onClick={onWriteNote} className={BTN_SECONDARY}>
          <PencilLine aria-hidden="true" size={16} strokeWidth={1.75} />
          Write a note
        </button>
      </footer>
    </dialog>
  );
}
