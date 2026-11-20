import { useLayoutEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUp, Plus, RefreshCw } from "lucide-react";
import type { Person } from "@/types/dashboard";
import type { FileRef, Segment } from "@/types/stories";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { storyRef } from "@/components/dashboard/format";
import { AgentAvatar } from "./AgentAvatar";
import { AttachedFiles, type Attachment } from "./AttachedFiles";
import { parseText } from "./RichText";

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
  onSend: (message: { text: Segment[]; files: FileRef[]; rebuild: boolean }) => void;
}

type Suggestion = { key: string; insert: string; label: string; meta?: string; icon: ReactNode };

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
 * The message box: a rounded field with + to attach (or paste, or drop anything on it) and a send button
 * that wakes up as you type. "@" brings in a teammate or the agent, "#" links another story. In review,
 * "Rebuild after sending" turns a note into a change request. The draft is kept per story.
 */
export function StoryComposer({ storyId, people, stories, canRebuild, rebuild, onRebuildChange, suggestions = [], onSend }: StoryComposerProps) {
  // The story page renders only in the browser (client:only), so local storage can be read straight away.
  const [text, setText] = useState(() => readDraft(storyId));
  const [files, setFiles] = useState<Attachment[]>([]);
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const nextFileId = useRef(0);
  const pendingCaret = useRef<number | null>(null);

  // After a suggestion is chosen, put the caret after it in the same frame as the new text, so letters
  // typed straight away land in the right place.
  useLayoutEffect(() => {
    const at = pendingCaret.current;
    if (at === null || !inputRef.current) return;
    pendingCaret.current = null;
    inputRef.current.focus();
    inputRef.current.setSelectionRange(at, at);
  });

  // "@sk" or "#hq-3" just before the caret opens suggestions.
  const token = text.slice(0, caret).match(/(?:^|\s)([@#])([\w-]*)$/);
  const tokenKey = token ? `${caret}:${token[0]}` : null;
  const q = token?.[2].toLowerCase() ?? "";
  const mentions: Suggestion[] = !token
    ? []
    : token[1] === "@"
      ? [
          { key: "agent", insert: "@agent", label: "Agent", meta: "Ask or tell the agent", icon: <AgentAvatar size={20} /> },
          ...people.map((p) => ({ key: p.id, insert: `@${p.name.split(" ")[0]}`, label: p.name, icon: <PersonAvatar initials={p.initials} /> })),
        ].filter((s) => s.label.toLowerCase().includes(q) || s.insert.toLowerCase().includes(`@${q}`))
      : stories
          .filter((s) => s.id !== storyId && (storyRef(s.id).includes(q) || String(s.id).startsWith(q.replace(/^hq-/, "")) || s.title.toLowerCase().includes(q)))
          .map((s) => ({ key: String(s.id), insert: `#${storyRef(s.id)}`, label: s.title, meta: storyRef(s.id), icon: null }));
  const shown = tokenKey !== dismissed ? mentions.slice(0, 6) : [];
  const canSend = Boolean(text.trim() || files.length);

  const update = (value: string, at: number) => {
    setText(value);
    setCaret(at);
    setActive(0);
    writeDraft(storyId, value);
  };

  const choose = (s: Suggestion) => {
    if (!token) return;
    const start = caret - token[2].length - 1;
    const value = `${text.slice(0, start)}${s.insert} ${text.slice(caret)}`;
    const at = start + s.insert.length + 1;
    pendingCaret.current = at;
    update(value, at);
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
      files: files.map((a) => ({ name: a.file.name, kind: kindOf(a.file), preview: a.preview })),
      rebuild: canRebuild && rebuild,
    });
    update("", 0);
    setFiles([]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (shown.length) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        choose(shown[active]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissed(tokenKey);
        return;
      }
    }
    // Enter sends, Shift+Enter is a new line (as in any chat app). ⌘/Ctrl+Enter also sends.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  return (
    <div className="relative">
      {suggestions.length > 0 && !text && files.length === 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                pendingCaret.current = s.length;
                update(s, s.length);
              }}
              className="h-8 rounded-full border border-[var(--card-line)] bg-white px-3 text-[13px] leading-[18px] text-[var(--tx)] shadow-[0_1px_2px_rgb(0_0_0/0.03)] transition-colors duration-[120ms] hover:border-[var(--card-line-h)] hover:bg-[var(--row-h)]"
            >
              {s}
            </button>
          ))}
        </div>
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
        {shown.length > 0 && (
          <ul
            role="listbox"
            aria-label={token?.[1] === "@" ? "People and the agent" : "Stories"}
            className="absolute bottom-full left-3 z-20 m-0 mb-2 w-80 list-none rounded-[12px] bg-white p-1 shadow-[var(--shadow-menu)]"
          >
            {shown.map((s, i) => (
              <li
                key={s.key}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex h-9 cursor-pointer items-center gap-2 rounded-[8px] px-2.5 text-[14px] leading-5 ${i === active ? "bg-[var(--menu-h)]" : ""}`}
              >
                {s.icon}
                {s.meta && !s.icon && <span className="w-11 flex-none text-[12px] text-[var(--tx2)] tabular-nums">{s.meta}</span>}
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                {s.meta && s.icon && <span className="truncate text-[12px] text-[var(--tx2)]">{s.meta}</span>}
              </li>
            ))}
          </ul>
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
            Message the agent
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
            placeholder="Message the agent, or @ a teammate"
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
              {rebuild ? "The agent changes the code with your note, then you review again." : "Off: the agent only replies."}
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
