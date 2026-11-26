import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";

/** One match in a message box's "@" or "#" list. */
export interface Suggestion {
  key: string;
  /** What replaces the typed token: "@Skye", "#hq-34". */
  insert: string;
  label: string;
  meta?: string;
  icon: ReactNode;
  /** Instead of inserting: what choosing it does, given the text with the insert in place (moving a draft to Team). */
  pick?: (value: string) => void;
}

/** "@sk" or "#hq-3" just before the caret. */
const TOKEN = /(?:^|\s)([@#])([\w-]*)$/;

interface SuggestionsOptions {
  text: string;
  caret: number;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  /** The matches for what's typed after "@" or "#" (lower case), best first. */
  find: (sigil: "@" | "#", q: string) => Suggestion[];
  /** Puts the new text in the box; the caret goes after the insert. */
  apply: (value: string, at: number) => void;
}

/**
 * Suggestions as you type "@" or "#" in a message box: up to six matches. ↑/↓ move, Enter or Tab chooses, Esc
 * closes them until the next token, and the caret lands after what was inserted, in the same frame.
 */
export function useSuggestions({ text, caret, inputRef, find, apply }: SuggestionsOptions) {
  const token = text.slice(0, caret).match(TOKEN);
  const tokenKey = token ? `${caret}:${token[0]}` : null;
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [pos, setPos] = useState<{ key: string | null; i: number }>({ key: null, i: 0 });
  const pendingCaret = useRef<number | null>(null);

  // After the text changes from here (a suggestion, a quick reply), put the caret where it belongs before paint,
  // so letters typed straight away land in the right place.
  useLayoutEffect(() => {
    const at = pendingCaret.current;
    if (at === null || !inputRef.current) return;
    pendingCaret.current = null;
    inputRef.current.focus();
    inputRef.current.setSelectionRange(at, at);
  });

  const shown = token && tokenKey !== dismissed ? find(token[1] as "@" | "#", token[2].toLowerCase()).slice(0, 6) : [];
  const active = pos.key === tokenKey && pos.i < shown.length ? pos.i : 0;

  const choose = (s: Suggestion) => {
    if (!token) return;
    const start = caret - token[2].length - 1;
    const value = `${text.slice(0, start)}${s.insert} ${text.slice(caret)}`;
    if (s.pick) {
      s.pick(value);
      return;
    }
    const at = start + s.insert.length + 1;
    pendingCaret.current = at;
    apply(value, at);
  };

  /** The list's keys. Returns true when it used the key, so the box doesn't also send. */
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!shown.length) return false;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setPos({ key: tokenKey, i: (active + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length });
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      choose(shown[active]);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setDismissed(tokenKey);
      return true;
    }
    return false;
  };

  return {
    shown,
    active,
    sigil: token?.[1] as "@" | "#" | undefined,
    setActive: (i: number) => setPos({ key: tokenKey, i }),
    choose,
    onKeyDown,
    /** Text put in from outside (a quick reply): the caret goes to `at` once it's in. */
    placeCaret: (at: number) => {
      pendingCaret.current = at;
    },
  };
}

interface SuggestionListProps {
  items: Suggestion[];
  active: number;
  label: string;
  onHover: (i: number) => void;
  onChoose: (s: Suggestion) => void;
}

/** The list above the box: avatar or ID, the name, and a muted note. A press doesn't take focus from the box. */
export function SuggestionList({ items, active, label, onHover, onChoose }: SuggestionListProps) {
  return (
    <ul
      role="listbox"
      aria-label={label}
      className="absolute bottom-full left-3 z-20 m-0 mb-2 w-80 max-w-[calc(100%-24px)] list-none rounded-[12px] bg-white p-1 text-[var(--tx)] ring-1 ring-black/[0.08]"
    >
      {items.map((s, i) => (
        <li
          key={s.key}
          role="option"
          aria-selected={i === active}
          onMouseDown={(e) => {
            e.preventDefault();
            onChoose(s);
          }}
          onMouseEnter={() => onHover(i)}
          className={`flex h-9 cursor-pointer items-center gap-2 rounded-[8px] px-2.5 text-sm ${i === active ? "bg-[var(--menu-h)]" : ""}`}
        >
          {s.icon}
          {s.meta && !s.icon && <span className="w-11 flex-none text-xs text-[var(--tx2)] tabular-nums">{s.meta}</span>}
          <span className="min-w-0 flex-1 truncate">{s.label}</span>
          {s.meta && s.icon && <span className="flex-none text-xs text-[var(--tx2)]">{s.meta}</span>}
        </li>
      ))}
    </ul>
  );
}
