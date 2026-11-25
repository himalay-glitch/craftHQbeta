import { useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import { ArrowUp, AtSign, Plus, RefreshCw } from "lucide-react";
import type { Person } from "@/types/dashboard";
import type { FileRef, Segment } from "@/types/stories";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { storyRef } from "@/components/dashboard/format";
import { AttachedFiles, type Attachment } from "./AttachedFiles";
import { names, parseText } from "./RichText";
import { SuggestionList, useSuggestions, type Suggestion } from "./Suggestions";

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
  /** The line above the box: what a note does in the story's status (statuses guide: a note is a conversation,
   *  a status is an instruction). */
  hint?: string;
  /** The writer, left out of the "@" list. */
  viewerName?: string;
  onSend: (message: { text: Segment[]; files: FileRef[]; rebuild: boolean }) => void;
  /** Moves a draft meant for a teammate to the story's Team conversation, where people talk. */
  onWriteToTeam: (draft: string) => void;
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

/**
 * The message box of the story's chat, which is the robots': a rounded field with + to attach (or paste, or drop
 * anything on it) and a send button that wakes up as you type. Everything sent here goes to the agent; people talk
 * in Team. So "@" lists teammates only to move the draft to Team, and a teammate tagged here anyway gets a line
 * saying they won't see it, with the same way out. "#" links another story. In review, "Rebuild after sending"
 * turns a note into a change request (a note, then Approved). The draft is kept per story.
 */
export function StoryComposer({ storyId, people, stories, canRebuild, rebuild, onRebuildChange, suggestions = [], hint, viewerName, onSend, onWriteToTeam }: StoryComposerProps) {
  // The story page renders only in the browser (client:only), so local storage can be read straight away.
  const [text, setText] = useState(() => readDraft(storyId));
  const [files, setFiles] = useState<Attachment[]>([]);
  const [caret, setCaret] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const nextFileId = useRef(0);

  const update = (value: string, at: number) => {
    setText(value);
    setCaret(at);
    writeDraft(storyId, value);
  };

  // The draft goes to Team as it is, tag included (and a space, to go on typing), and this box empties.
  const toTeam = (draft: string) => {
    onWriteToTeam(`${draft.trim()} `);
    update("", 0);
  };

  const teammates = people.filter((p) => p.name !== viewerName);
  const list = useSuggestions({
    text,
    caret,
    inputRef,
    apply: update,
    find: (sigil, q): Suggestion[] =>
      sigil === "@"
        ? teammates
            .filter((p) => p.name.toLowerCase().includes(q))
            .map((p) => ({ key: p.id, insert: `@${p.name.split(" ")[0]}`, label: p.name, meta: "Write in Team", icon: <PersonAvatar initials={p.initials} />, pick: toTeam }))
        : stories
            .filter((s) => s.id !== storyId && (storyRef(s.id).includes(q) || String(s.id).startsWith(q.replace(/^hq-/, "")) || s.title.toLowerCase().includes(q)))
            .map((s) => ({ key: String(s.id), insert: `#${storyRef(s.id)}`, label: s.title, meta: storyRef(s.id), icon: null })),
  });

  const canSend = Boolean(text.trim() || files.length);
  // A teammate tagged here (typed out, not picked from the list) won't be told: say so before it's sent.
  const tagged = [
    ...new Set(
      (text.trim() ? parseText(text, people, stories) : []).flatMap((seg) => (typeof seg !== "string" && seg.type === "person" && seg.name !== viewerName ? [seg.name.split(" ")[0]] : [])),
    ),
  ];

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
      files: files.map((a) => ({ name: a.file.name, kind: kindOf(a.file), preview: a.preview })),
      rebuild: canRebuild && rebuild,
    });
    update("", 0);
    setFiles([]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (list.onKeyDown(e)) return;
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
      {suggestions.length > 0 && !text && files.length === 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                list.placeCaret(s.length);
                update(s, s.length);
              }}
              className="h-8 rounded-full border border-[var(--card-line)] bg-white px-3 text-[13px] leading-[18px] text-[var(--tx)] shadow-[0_1px_2px_rgb(0_0_0/0.03)] transition-colors duration-[120ms] hover:border-[var(--card-line-h)] hover:bg-[var(--row-h)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {tagged.length > 0 ? (
        <p id={`${COMPOSER_INPUT_ID}-hint`} key="people" className="m-0 mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-3 text-[12px] leading-4 text-[var(--tx)]">
          <AtSign aria-hidden="true" size={12} strokeWidth={2} className="flex-none text-[var(--tx2)]" />
          <span>
            {names(tagged)} won’t see this. Messages here go to the agent.
          </span>
          <button type="button" onClick={() => toTeam(text)} className="font-medium underline decoration-black/20 underline-offset-2 hover:decoration-current">
            Write to {names(tagged)} in Team
          </button>
        </p>
      ) : (
        hint && (
          <p id={`${COMPOSER_INPUT_ID}-hint`} key="agent" className="m-0 mb-2 px-3 text-[12px] leading-4 text-[var(--tx2)]">
            {hint}
          </p>
        )
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
        className={`relative rounded-[24px] border bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04),0_10px_30px_-14px_rgb(0_0_0/0.18)] transition-[border-color,box-shadow] duration-[160ms] ${
          dragging ? "border-[var(--cta)]" : "border-black/10 focus-within:border-black/20"
        }`}
      >
        {list.shown.length > 0 && (
          <SuggestionList
            items={list.shown}
            active={list.active}
            label={list.sigil === "@" ? "Teammates: choose one to write to them in Team" : "Stories"}
            onHover={list.setActive}
            onChoose={list.choose}
          />
        )}

        {files.length > 0 && (
          <div className="px-3 pt-3">
            <AttachedFiles
              files={files}
              onRemove={(id) => {
                setFiles((fs) => fs.filter((a) => a.id !== id));
                inputRef.current?.focus();
              }}
            />
          </div>
        )}

        <div className="flex items-end gap-1.5 p-1.5">
          <button
            type="button"
            aria-label="Attach files"
            title="Attach files, screenshots or recordings"
            onClick={() => pickerRef.current?.click()}
            className="inline-flex size-9 flex-none items-center justify-center rounded-full text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/[0.05] hover:text-[var(--tx)]"
          >
            <Plus aria-hidden="true" size={18} strokeWidth={1.75} />
          </button>
          <label htmlFor={COMPOSER_INPUT_ID} className="sr-only">
            Tell PM about {storyRef(storyId)}
          </label>
          <textarea
            id={COMPOSER_INPUT_ID}
            ref={inputRef}
            value={text}
            rows={1}
            onChange={(e) => update(e.target.value, e.target.selectionStart)}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
            onKeyDown={onKeyDown}
            onPaste={(e: ClipboardEvent<HTMLTextAreaElement>) => {
              if (e.clipboardData.files.length) {
                e.preventDefault();
                addFiles(e.clipboardData.files);
              }
            }}
            placeholder={`Tell PM about ${storyRef(storyId)}`}
            aria-describedby={described ? `${COMPOSER_INPUT_ID}-hint` : undefined}
            className="field-sizing-content block max-h-40 min-h-9 w-full flex-1 resize-none bg-transparent py-2 text-[14px] leading-5 tracking-[-0.15px] text-[var(--tx)] placeholder:text-[var(--tx2)] focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            aria-label={canRebuild && rebuild ? "Send and rebuild" : "Send"}
            title={canRebuild && rebuild ? "Send and rebuild" : "Send (Enter)"}
            className={`inline-flex size-9 flex-none items-center justify-center rounded-full transition-[background-color,color,transform] duration-[160ms] ${
              canSend ? "scale-100 bg-[var(--ink)] text-white hover:bg-black active:scale-95" : "scale-95 bg-black/[0.06] text-black/30"
            }`}
          >
            {canRebuild && rebuild ? <RefreshCw aria-hidden="true" size={16} strokeWidth={2} /> : <ArrowUp aria-hidden="true" size={18} strokeWidth={2} />}
          </button>
        </div>

        {canRebuild && (
          <div className="flex items-center gap-2 px-3 pb-2.5">
            <button
              type="button"
              aria-pressed={rebuild}
              onClick={() => onRebuildChange(!rebuild)}
              className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] leading-4 font-medium transition-colors duration-[120ms] ${
                rebuild ? "border-[#C9DAFB] bg-[#E9F0FE] text-[#1F57C3]" : "border-[var(--card-line)] text-[var(--tx2)] hover:text-[var(--tx)]"
              }`}
            >
              <RefreshCw aria-hidden="true" size={12} strokeWidth={2} />
              Rebuild after sending
            </button>
            <span className="text-[12px] leading-4 text-[var(--tx2)]">
              {rebuild
                ? "Sets the story to Approved: Builder rebuilds with your note, Checker checks it again, then you review."
                : "Off: you get a reply. A note in review never changes the code."}
            </span>
          </div>
        )}

        {dragging && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[24px] bg-white/90 text-[14px] font-medium text-[var(--cta)]"
          >
            Drop files to attach them
          </div>
        )}
      </div>

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
