import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Hourglass } from "lucide-react";
import type { Person } from "@/types/dashboard";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { names, parseText } from "@/components/stories/RichText";
import { SuggestionList, useSuggestions, type Suggestion } from "@/components/stories/Suggestions";

const draftKey = (key: string) => `crafthq:message-draft:${key}`;
function readDraft(key: string) {
  try {
    return window.localStorage.getItem(draftKey(key)) ?? "";
  } catch {
    return "";
  }
}
/** Keeps a conversation's unsent text; Messages also uses it to open a conversation with a draft already in. */
export function saveDraft(key: string, text: string) {
  try {
    if (text) window.localStorage.setItem(draftKey(key), text);
    else window.localStorage.removeItem(draftKey(key));
  } catch {
    // Storage blocked: the draft lives until the panel closes.
  }
}

interface MessageComposerProps {
  /** The conversation, so each one keeps its own unsent draft. Remount with a new `key` to switch. */
  conversationKey: string;
  /** "Message Deepak", "Message the team about hq-35". */
  label: string;
  /** Teammates "@" can bring in (a story's Team conversation). Without it, "@" is plain text. */
  people?: Person[];
  /** Who's in the conversation besides you. With nobody yet, someone has to be tagged before it can be sent. */
  recipients: string[];
  /** Offer "Wait for a reply" once someone is tagged (a story's Team conversation). */
  canAsk?: boolean;
  /** `tagged`: the people tagged in it, by ID. `ask`: wait for a reply from them. */
  onSend: (message: { text: string; tagged: string[]; ask: boolean }) => void;
}

/**
 * The reply box at the foot of a conversation: Enter sends, Shift+Enter starts a new line, and "#34" links a
 * story. On a story's Team conversation "@" brings a teammate in (they're told in Messages), and "Wait for a reply"
 * makes it a request: the story shows it's waiting on them until one of them replies. The draft is kept per
 * conversation until it's sent.
 */
export function MessageComposer({ conversationKey, label, people, recipients, canAsk, onSend }: MessageComposerProps) {
  // Only rendered while the panel is open in the browser, so local storage can be read straight away.
  const [text, setText] = useState(() => readDraft(conversationKey));
  const [caret, setCaret] = useState(text.length);
  const [ask, setAsk] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = `message-composer-${conversationKey}`;

  // A draft that was there when the box opened (kept, or moved here from a story's chat): carry on at its end.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const update = (value: string, at: number) => {
    setText(value);
    setCaret(at);
    saveDraft(conversationKey, value);
  };

  const list = useSuggestions({
    text,
    caret,
    inputRef: ref,
    apply: update,
    find: (sigil, q): Suggestion[] =>
      sigil === "@" && people
        ? people
            .filter((p) => p.name.toLowerCase().includes(q))
            .map((p) => ({
              key: p.id,
              insert: `@${p.name.split(" ")[0]}`,
              label: p.name,
              meta: recipients.includes(p.id) ? "In this chat" : undefined,
              icon: <PersonAvatar initials={p.initials} />,
            }))
        : [],
  });

  // Who's tagged, worked out as you type: they're told, and they're who a request waits on.
  const tagged = people
    ? [
        ...new Set(
          parseText(text, people, []).flatMap((seg) => (typeof seg !== "string" && seg.type === "person" ? (people.find((p) => p.name === seg.name)?.id ?? []) : [])),
        ),
      ]
    : [];
  const taggedFirst = tagged.map((t) => people?.find((p) => p.id === t)?.name.split(" ")[0] ?? t);
  const nobody = recipients.length === 0 && tagged.length === 0;
  const asking = Boolean(canAsk) && ask && tagged.length > 0;
  const canSend = Boolean(text.trim()) && !nobody;

  const send = () => {
    if (!canSend) return;
    onSend({ text: text.trim(), tagged, ask: asking });
    update("", 0);
    setAsk(false);
    ref.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (list.onKeyDown(e)) return;
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const one = tagged.length === 1;

  return (
    <div className="relative">
      {nobody && (
        <p id={`${id}-hint`} className="m-0 mb-2 px-1 text-[12px] leading-4 text-[var(--tx2)]">
          Tag someone with @ so they’re told.
        </p>
      )}
      <div className="relative rounded-[20px] border border-black/10 bg-white transition-colors duration-[160ms] focus-within:border-black/20">
        {list.shown.length > 0 && <SuggestionList items={list.shown} active={list.active} label="Teammates" onHover={list.setActive} onChoose={list.choose} />}
        <div className="flex items-end gap-1.5 p-1 pl-3.5">
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
          <textarea
            id={id}
            ref={ref}
            data-message-composer
            value={text}
            rows={1}
            onChange={(e) => update(e.target.value, e.target.selectionStart)}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
            onKeyDown={onKeyDown}
            placeholder={label}
            aria-describedby={nobody ? `${id}-hint` : undefined}
            className="field-sizing-content block max-h-32 min-h-8 w-full flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-5 tracking-[-0.15px] text-[var(--tx)] placeholder:text-[var(--tx2)] focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            aria-label={asking ? `Send and wait for ${names(taggedFirst)}` : "Send"}
            title="Send (Enter)"
            className={`inline-flex size-8 flex-none items-center justify-center rounded-full transition-[background-color,color,transform] duration-[160ms] ${
              canSend ? "scale-100 bg-[var(--ink)] text-white hover:bg-black active:scale-95" : "scale-95 bg-black/[0.06] text-black/30"
            }`}
          >
            <ArrowUp aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </div>
        {canAsk && tagged.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pb-2.5">
            <button
              type="button"
              aria-pressed={ask}
              onClick={() => setAsk(!ask)}
              className={`inline-flex h-7 flex-none items-center gap-1.5 rounded-full border px-2.5 text-[12px] leading-4 font-medium transition-colors duration-[120ms] ${
                ask ? "border-[#C9DAFB] bg-[#E9F0FE] text-[#1F57C3]" : "border-[var(--card-line)] text-[var(--tx2)] hover:text-[var(--tx)]"
              }`}
            >
              <Hourglass aria-hidden="true" size={12} strokeWidth={2} />
              Wait for a reply
            </button>
            <span className="min-w-0 text-[12px] leading-4 text-[var(--tx2)]">
              {ask
                ? `The story shows “Waiting on ${names(taggedFirst)}” until ${one ? taggedFirst[0] : "one of them"} replies.`
                : `Off: ${names(taggedFirst)} ${one ? "is" : "are"} told in Messages.`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
