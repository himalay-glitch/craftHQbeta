import { useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import { ArrowUp, AtSign, Maximize2, Minimize2, Plus, RefreshCw, Sparkles } from "lucide-react";
import type { Person } from "@/types/dashboard";
import type { FileRef, Segment } from "@/types/stories";
import { ICON_BTN } from "@/components/dashboard/classes";
import { storyRef } from "@/components/dashboard/format";
import { AttachedFiles, type Attachment } from "./AttachedFiles";
import { names, parseText } from "./RichText";
import { SuggestionList, useSuggestions, type Suggestion } from "./Suggestions";
import chat from "./chat.module.css";
import { nextAsk, type NextAskInput } from "./nextAsk";

export const COMPOSER_INPUT_ID = "story-composer-input";

interface StoryComposerProps {
  storyId: number;
  people: Person[];
  stories: { id: number; title: string }[];
  /** Offer "Rebuild after sending" (the story is in review). */
  canRebuild: boolean;
  rebuild: boolean;
  onRebuildChange: (rebuild: boolean) => void;
  /** Quick replies shown above the box; choosing one fills it in. */
  suggestions?: string[];
  /** What the suggested next message is chosen from (nextAsk.ts); null while the robot reads or works. The suggestion
   *  shows faintly in the empty box, Tab writes it in, Esc puts it away, and it takes the quick replies' place. */
  suggestFrom?: NextAskInput | null;
  /** The line above the box: what a note does in the story's status (statuses guide: a note is a conversation,
   *  a status is an instruction). */
  hint?: string;
  /** The writer: tagging yourself needs no warning. */
  viewerName?: string;
  onSend: (message: { text: Segment[]; files: FileRef[]; rebuild: boolean }) => void;
}

const draftKey = (id: number) => `crafthq:story-draft:${id}`;
function readDraft(id: number) {
  try {
    return window.localStorage.getItem(draftKey(id)) ?? "";
  } catch {
    return "";
  }
}
function writeDraft(id: number, text: string) {
  try {
    if (text) window.localStorage.setItem(draftKey(id), text);
    else window.localStorage.removeItem(draftKey(id));
  } catch {
    // Storage blocked: the draft lives until the page closes.
  }
}

const kindOf = (f: File): FileRef["kind"] => (f.type.startsWith("image/") ? "image" : f.type.startsWith("video/") ? "video" : "file");

/** A paste longer than this becomes a card above the field instead of filling the box (as Claude does with long
 *  pastes): an error log or a spec stays readable, and the message around it stays short. */
const LONG_PASTE = { lines: 12, chars: 1200 };
const lineCount = (t: string) => t.split(/\r\n|\r|\n/).length;

/** The field's usual most, 160 px; past it the expand button shows, and expanded it grows to most of the window. */
const FIELD_MAX = 160;

/** A key, as DESIGN.md §7.18 draws it: muted on the field fill, at least 18 px square. */
const KBD = "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-sm bg-field px-1 font-sans text-xs font-medium text-[var(--tx2)]";

// Ask PM's message box, so the two chats feel like one (Shubham, 25 Nov): a two-row card, the field with a sparkle
// on top and the controls under it. Since 27 Nov the controls are quiet, as in today's AI chat boxes (ChatGPT,
// Claude, Gemini): a round "+" to attach, a borderless Rebuild toggle that turns blue when it's on, and the send
// button, soft until there's something to send.

/**
 * The message box of the story's chat, which is the robots': a two-row card with Attach (or paste, or drop anything
 * on it) and a send button that wakes up as you type. Everything sent here goes to the agent; people talk
 * in Messages (Shubham, 26 Nov: no Team on the story page). So "@" lists nobody, and a teammate tagged here anyway
 * gets a line saying they won't see it. "#" links another story. In review, "Rebuild after sending"
 * turns a note into a change request (a note, then Approved). The draft is kept per story. A long paste becomes a
 * card above the field ("Edit as text" puts it back), and a long message can make the box bigger.
 */
export function StoryComposer({ storyId, people, stories, canRebuild, rebuild, onRebuildChange, suggestions = [], suggestFrom, hint, viewerName, onSend }: StoryComposerProps) {
  // The story page renders only in the browser (client:only), so local storage can be read straight away.
  const [text, setText] = useState(() => readDraft(storyId));
  const [files, setFiles] = useState<Attachment[]>([]);
  const [caret, setCaret] = useState(0);
  const [dragging, setDragging] = useState(false);
  // The field holds more than its usual height (the expand button shows), and whether it's expanded.
  const [tall, setTall] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // The suggestion put away with Esc, for this turn of the conversation: once the robot replies again, even the same
  // sentence can come back.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const nextFileId = useRef(0);

  const update = (value: string, at: number) => {
    setText(value);
    setCaret(at);
    writeDraft(storyId, value);
  };

  const list = useSuggestions({
    text,
    caret,
    inputRef,
    apply: update,
    find: (sigil, q): Suggestion[] =>
      sigil === "@"
        ? []
        : stories
            .filter((s) => s.id !== storyId && (storyRef(s.id).includes(q) || String(s.id).startsWith(q.replace(/^hq-/, "")) || s.title.toLowerCase().includes(q)))
            .map((s) => ({ key: String(s.id), insert: `#${storyRef(s.id)}`, label: s.title, meta: storyRef(s.id), icon: null })),
  });

  const canSend = Boolean(text.trim() || files.length);
  // The suggested next message shows only in an empty box, as Claude's does: typing hides it, emptying the box brings
  // it back.
  const suggestion = suggestFrom ? nextAsk(suggestFrom) : null;
  const turn = `${suggestFrom?.entries.length ?? 0}:${suggestion}`;
  const ghost = suggestion && turn !== dismissed && !text && files.length === 0 ? suggestion : null;
  /** Tab (or the hint, or "Use suggestion" on touch): the suggestion is written into the box, ready to send or edit. */
  const takeGhost = () => {
    if (!ghost) return;
    list.placeCaret(ghost.length);
    update(ghost, ghost.length);
    inputRef.current?.focus();
  };
  // A teammate tagged here (typed out, not picked from the list) won't be told: say so before it's sent.
  const tagged = [
    ...new Set(
      (text.trim() ? parseText(text, people, stories) : []).flatMap((seg) => (typeof seg !== "string" && seg.type === "person" && seg.name !== viewerName ? [seg.name.split(" ")[0]] : [])),
    ),
  ];

  /** Long text pasted: kept as a text file, shown as a card that says how many lines it has. */
  const addPasted = (value: string) => {
    nextFileId.current += 1;
    const lines = lineCount(value);
    const file = new File([value], "Pasted text.txt", { type: "text/plain" });
    setFiles((fs) => [...fs, { id: nextFileId.current, file, pasted: { text: value, lines } }]);
  };

  /** "Edit as text": the pasted card goes back into the field, where the caret is. */
  const editPasted = (id: number) => {
    const card = files.find((a) => a.id === id);
    if (!card?.pasted) return;
    setFiles((fs) => fs.filter((a) => a.id !== id));
    const at = Math.min(caret, text.length);
    const value = `${text.slice(0, at)}${card.pasted.text}${text.slice(at)}`;
    list.placeCaret(at + card.pasted.text.length);
    update(value, at + card.pasted.text.length);
    setTall(true);
  };

  const addFiles = (list: FileList | File[] | null) => {
    if (!list || !list.length) return;
    const added = Array.from(list).map((file) => {
      nextFileId.current += 1;
      return { id: nextFileId.current, file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined };
    });
    setFiles((fs) => [...fs, ...added]);
  };

  const send = () => {
    if (!canSend) return;
    onSend({
      text: text.trim() ? parseText(text.trim(), people, stories) : [],
      files: files.map((a) => ({
        // In the chat, a pasted text says how long it was.
        name: a.pasted ? `Pasted text (${a.pasted.lines.toLocaleString()} lines).txt` : a.file.name,
        kind: kindOf(a.file),
        preview: a.preview,
      })),
      rebuild: canRebuild && rebuild,
    });
    update("", 0);
    setFiles([]);
    setTall(false);
    setExpanded(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (list.onKeyDown(e)) return;
    if (e.key === "Escape" && expanded) {
      e.preventDefault();
      setExpanded(false);
      return;
    }
    // Tab takes the suggestion; with nothing suggested (or Shift+Tab) it moves focus as usual. Esc puts it away, so
    // Tab moves on from then.
    if (ghost && e.key === "Tab" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      takeGhost();
      return;
    }
    if (ghost && e.key === "Escape") {
      e.preventDefault();
      setDismissed(turn);
      return;
    }
    // Enter sends, Shift+Enter is a new line (as in any chat app). ⌘/Ctrl+Enter also sends.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const described = tagged.length > 0 || Boolean(hint);

  return (
    <div className="relative">
      {suggestions.length > 0 && !text && files.length === 0 && !ghost && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                list.placeCaret(s.length);
                update(s, s.length);
              }}
              className="h-8 rounded-full border border-[var(--card-line)] bg-white px-3 text-sm text-[var(--tx)] transition-colors duration-[120ms] hover:border-[var(--ctl)] hover:bg-[var(--ctl-bg-h)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {tagged.length > 0 && (
        <p id={`${COMPOSER_INPUT_ID}-hint`} className="m-0 mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-3 text-xs text-[var(--tx)]">
          <AtSign aria-hidden="true" size={12} strokeWidth={2} className="flex-none text-[var(--tx2)]" />
          <span>
            {names(tagged)} won’t see this. Messages here go to the agent; to reach {tagged.length === 1 ? "them" : "them all"}, use Messages.
          </span>
        </p>
      )}

      <div
        onDragOver={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`relative rounded-[20px] border bg-white p-3 transition-[border-color] duration-[160ms] ${
          dragging ? "border-[var(--cta)]" : "border-[var(--card-line)] focus-within:border-[var(--ctl)]"
        }`}
      >
        {list.shown.length > 0 && (
          <SuggestionList
            items={list.shown}
            active={list.active}
            label="Stories"
            onHover={list.setActive}
            onChoose={list.choose}
          />
        )}

        {files.length > 0 && (
          <div className="mb-2.5 px-1">
            <AttachedFiles
              files={files}
              onRemove={(id) => {
                setFiles((fs) => fs.filter((a) => a.id !== id));
                inputRef.current?.focus();
              }}
              onEdit={editPasted}
            />
          </div>
        )}

        {/* Long messages: grow the box to most of the window, or back (Esc too), as ChatGPT's box does. */}
        {(tall || expanded) && (
          <button
            type="button"
            aria-label={expanded ? "Make the box smaller" : "Make the box bigger"}
            aria-expanded={expanded}
            aria-controls={COMPOSER_INPUT_ID}
            title={expanded ? "Make the box smaller (Esc)" : "Make the box bigger"}
            onClick={() => {
              setExpanded((x) => !x);
              inputRef.current?.focus();
            }}
            className={`${ICON_BTN} absolute top-2 right-2 z-10 size-7`}
          >
            {expanded ? <Minimize2 aria-hidden="true" size={14} strokeWidth={1.75} /> : <Maximize2 aria-hidden="true" size={14} strokeWidth={1.75} />}
          </button>
        )}

        <div className={`flex items-start gap-2 px-1 ${tall || expanded ? "pr-8" : ""}`}>
          {/* As tall as one line of the box, so the mark sits on the first line's middle. */}
          <span className="flex h-6 flex-none items-center">
            <Sparkles aria-hidden="true" size={16} strokeWidth={1.75} className="text-[var(--tx2)]" />
          </span>
          <label htmlFor={COMPOSER_INPUT_ID} className="sr-only">
            Tell PM about {storyRef(storyId)}
          </label>
          {/* The field and the suggestion share one grid cell, so a suggestion longer than a line makes the box taller
              instead of running over the buttons. */}
          <div className="grid min-w-0 flex-1">
          <textarea
            id={COMPOSER_INPUT_ID}
            ref={inputRef}
            value={text}
            rows={1}
            onChange={(e) => {
              update(e.target.value, e.target.selectionStart);
              // The text is in the field already, so its full height can be read now.
              setTall(e.target.scrollHeight > FIELD_MAX);
            }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
            onKeyDown={onKeyDown}
            onPaste={(e: ClipboardEvent<HTMLTextAreaElement>) => {
              if (e.clipboardData.files.length) {
                e.preventDefault();
                addFiles(e.clipboardData.files);
                return;
              }
              const pastedText = e.clipboardData.getData("text/plain");
              if (pastedText.length > LONG_PASTE.chars || lineCount(pastedText) > LONG_PASTE.lines) {
                e.preventDefault();
                addPasted(pastedText);
              }
            }}
            placeholder={ghost ? "" : `Tell PM about ${storyRef(storyId)}`}
            aria-describedby={
              described || canRebuild || ghost
                ? [tagged.length > 0 && `${COMPOSER_INPUT_ID}-hint`, (hint || canRebuild) && `${COMPOSER_INPUT_ID}-note`, ghost && `${COMPOSER_INPUT_ID}-ghost`].filter(Boolean).join(" ")
                : undefined
            }
            className={`field-sizing-content block min-h-6 w-full min-w-0 resize-none bg-transparent text-base text-[var(--tx)] transition-[max-height] duration-200 ease-[cubic-bezier(0.2,0,0,1)] placeholder:text-[var(--tx2)] focus:outline-none motion-reduce:transition-none [grid-area:1/1] ${
              expanded ? "max-h-[min(60vh,520px)]" : "max-h-40"
            }`}
          />
          {ghost && (
            <p key={ghost} aria-hidden="true" className={`pointer-events-none m-0 line-clamp-3 text-base text-pretty text-[var(--tx2)] [grid-area:1/1] ${chat.labelIn}`}>
              {ghost}
            </p>
          )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => pickerRef.current?.click()}
            aria-label="Attach files"
            title="Attach files, screenshots, recordings or logs (or paste, or drop them here)"
            className={ICON_BTN}
          >
            <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
          {canRebuild && (
            <button
              type="button"
              aria-pressed={rebuild}
              onClick={() => onRebuildChange(!rebuild)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-colors duration-[120ms] ${
                rebuild ? "bg-[#E9F0FE] text-[#1F57C3] hover:bg-[#DCE7FD]" : "text-[var(--tx2)] hover:bg-black/5 hover:text-[var(--tx)]"
              }`}
            >
              <RefreshCw aria-hidden="true" size={14} strokeWidth={1.75} />
              Rebuild after sending
            </button>
          )}
          <span className="flex-1" />
          {/* With a suggestion showing: Tab to use it, in the send hint's place (pressing the hint works too). Touch
              screens have no Tab key, so there it's a "Use suggestion" button. */}
          {ghost && (
            <button
              type="button"
              onClick={takeGhost}
              tabIndex={-1}
              aria-label="Use suggestion"
              className="mr-1 inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-hover hover:text-[var(--tx)] pointer-coarse:text-sm"
            >
              <kbd className={`${KBD} pointer-coarse:hidden`}>Tab</kbd>
              <span className="pointer-coarse:hidden">to use</span>
              <span className="hidden pointer-coarse:inline">Use suggestion</span>
            </button>
          )}
          {/* How to send, once there's something to send; not on touch screens, which have no Enter key to hint at. */}
          {canSend && (
            <span aria-hidden="true" className="mr-2 hidden items-center gap-1 text-xs text-[var(--tx2)] md:inline-flex pointer-coarse:hidden">
              <kbd className={KBD}>↵</kbd>
              {canRebuild && rebuild ? "to send and rebuild" : "to send"}
            </span>
          )}
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            aria-label={canRebuild && rebuild ? "Send and rebuild" : "Send"}
            title={canRebuild && rebuild ? "Send and rebuild" : "Send (Enter)"}
            className="inline-flex size-8 flex-none items-center justify-center rounded-full bg-[var(--cta)] text-white transition-[background-color,color,transform] duration-[120ms] hover:bg-[var(--cta-h)] active:scale-95 disabled:bg-field disabled:text-faint"
          >
            {canRebuild && rebuild ? <RefreshCw aria-hidden="true" size={16} strokeWidth={2} /> : <ArrowUp aria-hidden="true" size={16} strokeWidth={2} />}
          </button>
        </div>

        {dragging && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded-[20px] bg-white/90 text-sm font-medium text-[var(--cta)] ${chat.appear}`}
          >
            Drop files to attach them
          </div>
        )}
      </div>

      {/* What a note does here (in review, what Rebuild after sending changes). Not on screen (Shubham, 26 Nov: no line
          under the box); screen readers still hear it as the box's description. */}
      {ghost && (
        <p id={`${COMPOSER_INPUT_ID}-ghost`} className="sr-only">
          Suggested message: “{ghost}”. Press Tab to use it, or Escape to dismiss it.
        </p>
      )}
      {(hint || canRebuild) && (
        <p id={`${COMPOSER_INPUT_ID}-note`} className="sr-only">
          {canRebuild
            ? rebuild
              ? "Sets the story to Approved: Builder rebuilds with your note, Checker checks it again, then you review."
              : "A note gets a reply. It never changes the code unless you turn on Rebuild after sending."
            : hint}
        </p>
      )}

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
    </div>
  );
}
