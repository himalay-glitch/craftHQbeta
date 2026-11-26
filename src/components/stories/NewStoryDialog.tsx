import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent, type SyntheticEvent } from "react";
import { Check, ChevronDown, Link2, Paperclip, X } from "lucide-react";
import type { Person } from "@/types/dashboard";
import type { NewStoryInput } from "@/types/stories";
import { BTN_PRIMARY, BTN_SECONDARY, ICON_BTN } from "@/components/dashboard/classes";
import { AttachedFiles, type Attachment } from "./AttachedFiles";
import { clearDraft, setDraft, useDraft, type StoryDraft } from "./draft";
import { ImportFrom, LogoMark } from "./ImportFrom";
import { detailOf, TOOLS, type Ticket, type TicketTool } from "./imports";

export interface NewStoryDialogProps {
  open: boolean;
  onClose: () => void;
  /** Teammates who can own the story. The person writing it is the default owner. */
  people: Person[];
  viewerId: string;
  onCreate: (story: NewStoryInput) => void;
  /** After Discard draft (which also closes the dialog), with a way to bring the draft back: the toast's Undo. */
  onDiscard?: (undo: () => void) => void;
}

/** The title field's ID, for anything that needs to point at it. */
export const NEW_STORY_TITLE_ID = "new-story-title";

// Like the connect-accounts modal: a native <dialog>, 576 px, fading and scaling in, a bottom sheet on
// phones (DESIGN.md §7.9). `open:flex` rather than `flex`, so the closed dialog stays hidden.
const DIALOG =
  "m-auto max-h-[min(90dvh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border-0 bg-white p-0 " +
  "text-[var(--tx)] ring-1 ring-black/[0.08] open:flex backdrop:bg-scrim " +
  "opacity-0 scale-98 transition-all transition-discrete duration-200 ease-out " +
  "open:opacity-100 open:scale-100 starting:open:opacity-0 starting:open:scale-98 " +
  "backdrop:opacity-0 backdrop:transition-all backdrop:transition-discrete backdrop:duration-200 " +
  "open:backdrop:opacity-100 starting:open:backdrop:opacity-0 " +
  "motion-reduce:transition-none motion-reduce:backdrop:transition-none " +
  "max-sm:mb-0 max-sm:max-w-none max-sm:rounded-b-none";

/** Characters after which a title no longer fits a board card's two lines. */
const TITLE_LONG = 80;
const LABEL = "block text-sm font-medium text-[var(--tx)]";
const OPTIONAL = "font-normal text-[var(--tx2)]";
const HINT = "mt-0.5 block text-xs text-[var(--tx2)]";
const FIELD =
  "mt-1.5 block w-full rounded-[8px] border border-[var(--ctl)] bg-white px-3 text-sm text-[var(--tx)] pointer-coarse:text-base " +
  "transition-[border-color,box-shadow] duration-[120ms] hover:border-[var(--ctl-h)] focus:border-[var(--cta)] " +
  "focus:shadow-[0_0_0_3px_rgb(47_111_237/0.16)] focus:outline-none";

const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;
const draggingFiles = (e: DragEvent | globalThis.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

/**
 * The one way to write a new story, from any page: "+ New story" or the C key. Plain questions instead of
 * field names; only "What do you want built?" is required. Closing it keeps what was typed (and the files,
 * until the page reloads), so Esc and the scrim never lose anything. Discard draft is the only way to clear it.
 */
export function NewStoryDialog({ open, onClose, people, viewerId, onCreate, onDiscard }: NewStoryDialogProps) {
  const draft = useDraft();
  const [files, setFiles] = useState<Attachment[]>([]);
  const [dragDepth, setDragDepth] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const whyRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLButtonElement>(null);
  const nextFileId = useRef(0);
  const headingId = useId();
  const descriptionId = useId();
  // Write it here, or import it from a ticket tool (Shubham, 26 Nov: Jira and any tool with stories or tickets).
  const [mode, setMode] = useState<"write" | "import">("write");

  const ownerId = draft.ownerId && people.some((p) => p.id === draft.ownerId) ? draft.ownerId : viewerId;
  const hasContent = Boolean(draft.title || draft.why || draft.detail || files.length || draft.source);
  // Past about two lines on a board card (DESIGN.md: a card's title shows two lines).
  const longTitle = draft.title.trim().length > TITLE_LONG;
  const canCreate = draft.title.trim().length > 0;

  // Keep the native dialog in step with `open`. Focus goes to the first question, and the page behind
  // doesn't scroll while it's open.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      titleRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  // A file dropped outside the dialog would make the browser open it and leave the page. Catch those
  // drops, and clear the drop highlight however a drag ends.
  useEffect(() => {
    const onDragOver = (e: globalThis.DragEvent) => {
      if (draggingFiles(e)) e.preventDefault();
    };
    const onDropOrEnd = (e: globalThis.DragEvent) => {
      if (draggingFiles(e)) e.preventDefault();
      setDragDepth(0);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDropOrEnd);
    window.addEventListener("dragend", onDropOrEnd);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDropOrEnd);
      window.removeEventListener("dragend", onDropOrEnd);
    };
  }, []);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const known = new Set(files.map((a) => fileKey(a.file)));
    const added: Attachment[] = [];
    for (const file of Array.from(list)) {
      if (known.has(fileKey(file))) continue;
      known.add(fileKey(file));
      nextFileId.current += 1;
      added.push({ id: nextFileId.current, file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined });
    }
    setFiles((fs) => [...fs, ...added]);
  };

  const removeFile = (id: number) => {
    const gone = files.find((a) => a.id === id);
    if (gone?.preview) URL.revokeObjectURL(gone.preview);
    setFiles((fs) => fs.filter((a) => a.id !== id));
    attachRef.current?.focus();
  };

  const create = () => {
    if (!canCreate) return;
    onCreate({
      title: draft.title.trim(),
      why: draft.why.trim(),
      detail: draft.detail.trim(),
      ownerId,
      files: files.map((a) => a.file),
      source: draft.source ?? undefined,
      attachments: draft.source ? draft.attachments : [],
    });
    files.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
    setFiles([]);
    clearDraft();
    onClose();
  };

  /** "Use this ticket": the form fills in from it, to edit before creating; the story keeps a link back. */
  const applyTicket = (tool: TicketTool, t: Ticket) => {
    setDraft({ title: t.title, why: t.why ?? "", detail: detailOf(t), source: { tool: tool.name, key: t.key }, attachments: t.attachments ?? [] });
    setMode("write");
    requestAnimationFrame(() => titleRef.current?.focus());
  };

  const discard = () => {
    const saved: StoryDraft = draft;
    const savedFiles = files;
    clearDraft();
    setFiles([]);
    onClose();
    onDiscard?.(() => {
      setDraft(saved);
      setFiles(savedFiles);
    });
  };

  // Esc: let the parent close it, so `open` stays the one source of truth. Nothing is lost.
  const onCancel = (e: SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault();
    onClose();
  };

  // A click on the <dialog> itself, rather than on its content, is a click on the scrim.
  const onScrimClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && mode === "write") {
      e.preventDefault();
      create();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      onCancel={onCancel}
      // The browser can close the dialog by itself (a second Esc, for example). Keep the parent in step.
      onClose={() => open && onClose()}
      onClick={onScrimClick}
      onKeyDown={onKeyDown}
      className={DIALOG}
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
        onDragEnter={(e) => {
          if (!draggingFiles(e)) return;
          e.preventDefault();
          setDragDepth((d) => d + 1);
        }}
        onDragOver={(e) => {
          if (draggingFiles(e)) e.preventDefault();
        }}
        onDragLeave={(e) => {
          if (draggingFiles(e)) setDragDepth((d) => Math.max(0, d - 1));
        }}
        onDrop={(e) => {
          if (!draggingFiles(e)) return;
          e.preventDefault();
          e.stopPropagation();
          setDragDepth(0);
          addFiles(e.dataTransfer.files);
        }}
        className="relative flex min-h-0 flex-1 flex-col"
      >
        <header className="flex flex-none items-start gap-3 px-6 pt-6 pb-4">
          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="text-base font-semibold">
              New story
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-[var(--tx2)]">
              {mode === "write"
                ? "Say what you want built, in your own words. The agent reads it and writes a plan first. Nothing is built until the plan is approved."
                : "Bring in a ticket from where your team already writes them. You can edit it before creating the story."}
            </p>
            {/* Write it, or import it: the same pill switch as the story page's tabs. */}
            <div role="group" aria-label="How to start" className="mt-3 inline-flex rounded-full bg-[#F4F4F5] p-1">
              {(["write", "import"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={`h-7 rounded-full px-3 text-sm font-medium transition-colors duration-[120ms] ${
                    mode === m ? "bg-white text-[var(--tx)] ring-1 ring-black/[0.06]" : "text-[var(--tx2)] hover:text-[var(--tx)]"
                  }`}
                >
                  {m === "write" ? "Write it" : "Import"}
                </button>
              ))}
            </div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className={`${ICON_BTN} -mt-1 -mr-2`}>
            <X aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
        </header>

        {mode === "import" ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-1 pb-6">
            <ImportFrom
              onUse={applyTicket}
              onOpenStory={(id) => window.location.assign(`/stories/hq-${id}`)}
              replaces={Boolean(draft.title || draft.why || draft.detail)}
            />
          </div>
        ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pt-1 pb-6">
          {/* Imported: the ticket it came from, kept as a link on the story. */}
          {draft.source && (
            <div className="flex items-center gap-2 rounded-[10px] bg-field px-3 py-2 text-xs text-[var(--tx2)]">
              {/* The tool's own mark, when it's one we have; otherwise a plain link mark. */}
              {(() => {
                const logo = TOOLS.find((t) => t.name === draft.source?.tool)?.logo;
                return logo ? (
                  <LogoMark src={logo} name={draft.source?.tool ?? ""} />
                ) : (
                  <Link2 aria-hidden="true" size={14} strokeWidth={2} className="flex-none" />
                );
              })()}
              <span className="min-w-0 flex-1 truncate">
                From <span className="font-medium text-[var(--tx)]">{draft.source.tool}</span> <span className="font-mono">{draft.source.key}</span> · the story links back to it
              </span>
              <button
                type="button"
                onClick={() => setDraft({ source: null, attachments: [] })}
                className="flex-none rounded-[4px] font-medium text-[var(--tx)] underline decoration-black/20 underline-offset-2 hover:decoration-current"
              >
                Unlink
              </button>
            </div>
          )}
          <div>
            <label htmlFor={NEW_STORY_TITLE_ID} className={LABEL}>
              What do you want built?
            </label>
            <input
              id={NEW_STORY_TITLE_ID}
              ref={titleRef}
              value={draft.title}
              onChange={(e) => setDraft({ title: e.target.value })}
              onKeyDown={(e) => {
                // Enter moves on to the next question rather than creating a story with only a title.
                if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  whyRef.current?.focus();
                }
              }}
              placeholder="For example: let people reset their password from the sign-in page"
              autoComplete="off"
              enterKeyHint="next"
              aria-describedby={longTitle ? "new-story-title-hint" : undefined}
              className={`${FIELD} h-11`}
            />
            {/* A paragraph typed as the title gets cut on the board's cards (two lines): say so while it's typed. */}
            {longTitle && (
              <span id="new-story-title-hint" aria-live="polite" className={`${HINT} mt-1.5`}>
                Long titles get cut on the board. Keep the title short and put the rest in “Anything else”.
              </span>
            )}
          </div>

          <div>
            <label htmlFor="new-story-why" className={LABEL}>
              Why does it matter? <span className={OPTIONAL}>(optional)</span>
            </label>
            <span id="new-story-why-hint" className={HINT}>
              One line. It shows under the title on the board.
            </span>
            <input
              id="new-story-why"
              ref={whyRef}
              value={draft.why}
              onChange={(e) => setDraft({ why: e.target.value })}
              aria-describedby="new-story-why-hint"
              placeholder="For example: people get locked out and have to email us"
              autoComplete="off"
              className={`${FIELD} h-10`}
            />
          </div>

          <div>
            <label htmlFor="new-story-detail" className={LABEL}>
              Anything else the agent should know? <span className={OPTIONAL}>(optional)</span>
            </label>
            <span id="new-story-detail-hint" className={HINT}>
              Rules, examples, links. Paste a full spec if you have one.
            </span>
            <textarea
              id="new-story-detail"
              value={draft.detail}
              onChange={(e) => setDraft({ detail: e.target.value })}
              aria-describedby="new-story-detail-hint"
              rows={4}
              className={`${FIELD} field-sizing-content max-h-60 min-h-24 resize-y py-2`}
            />
          </div>

          <div>
            <span className={LABEL}>
              Screens or files <span className={OPTIONAL}>(optional)</span>
            </span>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <button ref={attachRef} type="button" onClick={() => pickerRef.current?.click()} className={BTN_SECONDARY}>
                <Paperclip aria-hidden="true" size={16} strokeWidth={1.75} />
                Attach files
              </button>
              <span className="text-xs text-[var(--tx2)]">or drop them anywhere here</span>
            </div>
            {draft.source && draft.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-[var(--tx2)]">From {draft.source.tool}:</span>
                {draft.attachments.map((a) => (
                  <span key={a} className="inline-flex h-6 items-center gap-1 rounded-md bg-field px-2 text-xs text-[var(--tx)]">
                    <Paperclip aria-hidden="true" size={12} strokeWidth={2} className="text-[var(--tx2)]" />
                    {a}
                  </span>
                ))}
              </div>
            )}
            {files.length > 0 && (
              <div className="mt-3">
                <AttachedFiles files={files} onRemove={removeFile} />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="new-story-owner" className={LABEL}>
              Owner
            </label>
            <span className="relative block">
              <select
                id="new-story-owner"
                value={ownerId}
                onChange={(e) => setDraft({ ownerId: e.target.value === viewerId ? null : e.target.value })}
                className={`${FIELD} h-10 cursor-pointer appearance-none pr-9`}
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id === viewerId ? `Me (${p.name})` : p.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                size={16}
                strokeWidth={1.5}
                className="pointer-events-none absolute top-1/2 right-3 mt-[3px] -translate-y-1/2 text-[var(--tx2)]"
              />
            </span>
          </div>
        </div>
        )}

        <footer className="flex flex-none flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--line)] px-6 py-4">
          <span className="flex min-w-0 flex-1 items-center gap-2 text-xs text-[var(--tx2)]">
            {hasContent ? (
              <>
                <Check aria-hidden="true" size={14} strokeWidth={2} className="flex-none text-[var(--green)]" />
                <span>Draft saved</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={discard}
                  className="rounded-[4px] font-medium text-[var(--tx)] underline-offset-2 hover:underline"
                >
                  Discard draft
                </button>
              </>
            ) : mode === "write" ? (
              <span className="hidden md:inline">⌘/Ctrl + Enter to create</span>
            ) : null}
          </span>
          <span className="flex items-center gap-2">
            <button type="button" onClick={onClose} className={BTN_SECONDARY}>
              Cancel
            </button>
            {mode === "write" && (
              <button type="submit" className={BTN_PRIMARY} disabled={!canCreate}>
                Create story
              </button>
            )}
          </span>
        </footer>

        <input
          ref={pickerRef}
          type="file"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span role="status" className="sr-only">
          {files.length === 0 ? "" : files.length === 1 ? "1 file attached" : `${files.length} files attached`}
        </span>

        {dragDepth > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-[12px] border-2 border-dashed border-[var(--cta)] bg-white/90 text-sm font-medium text-[var(--cta)]"
          >
            Drop files to attach them
          </div>
        )}
      </form>
    </dialog>
  );
}
