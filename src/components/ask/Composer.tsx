import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type RefObject } from "react";
import { ArrowUp, FileText, Mic, Paperclip, Sparkles, Square, X } from "lucide-react";
import { formatSize } from "./Message";
import styles from "./ask.module.css";

type Picked = { name: string; size: number };

// Dictation through the browser's speech recognition (Chrome, Edge, Safari). Types are declared here because
// TypeScript's DOM library doesn't ship them.
interface SpeechResults {
  length: number;
  [i: number]: { 0: { transcript: string }; isFinal: boolean };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: SpeechResults }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;
const recognitionCtor = (): RecognitionCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
const noSubscribe = () => () => {};

const PILL =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--card-line)] bg-white px-3 text-[13px] leading-[18px] " +
  "text-[var(--tx)] transition-colors duration-[120ms] hover:bg-[#F6F6F7]";

/**
 * The composer (after the reference): a prompt line, then Attach, voice and Send. Everything here goes to the PM,
 * so there's no way to address another bot: name one in your words ("have Designer…") and the PM takes it as a
 * hint. Send becomes Stop while the PM is answering; Esc stops too.
 */
export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  busy,
  fieldRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string, files: Picked[]) => void;
  onStop: () => void;
  busy: boolean;
  fieldRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [files, setFiles] = useState<Picked[]>([]);
  const [listening, setListening] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const recognition = useRef<Recognition | null>(null);
  const canDictate = useSyncExternalStore(noSubscribe, () => !!recognitionCtor(), () => false);

  // The textarea grows with what you type, up to about six lines.
  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value, fieldRef]);

  useEffect(() => () => recognition.current?.stop(), []);

  const send = () => {
    if (busy || (!value.trim() && files.length === 0)) return;
    recognition.current?.stop();
    onSend(value, files);
    setFiles([]);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && busy) {
      e.preventDefault();
      onStop();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const toggleDictation = () => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    const base = value.trim();
    rec.onresult = (e) => {
      let said = "";
      for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
      onChange(`${base}${base ? " " : ""}${said.trim()}`);
    };
    rec.onend = () => {
      setListening(false);
      recognition.current = null;
      fieldRef.current?.focus();
    };
    rec.onerror = () => setListening(false);
    recognition.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="relative mx-auto max-w-[720px] rounded-[20px] border border-[var(--card-line)] bg-white p-3 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.05)] transition-[border-color,box-shadow] focus-within:border-[var(--ctl)] focus-within:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.08)]"
    >
      {files.length > 0 && (
        <ul className="mb-2.5 flex list-none flex-wrap gap-1.5 px-1">
          {files.map((f) => (
            <li key={f.name} className="inline-flex max-w-[260px] items-center gap-1.5 rounded-[10px] bg-[#F4F4F5] py-1.5 pr-1 pl-2.5 text-[12px] leading-4">
              <FileText aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
              <span className="truncate text-[var(--tx)]">{f.name}</span>
              <span className="flex-none text-[var(--tx2)] tabular-nums">{formatSize(f.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles((fs) => fs.filter((x) => x.name !== f.name))}
                className="inline-flex size-5 flex-none items-center justify-center rounded-full text-[var(--tx2)] hover:bg-black/5 hover:text-[var(--tx)]"
              >
                <X aria-hidden="true" size={12} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-start gap-2 px-1">
        <Sparkles aria-hidden="true" size={16} strokeWidth={1.75} className="mt-[5px] flex-none text-[var(--tx2)]" />
        <label htmlFor="ask-input" className="sr-only">
          Tell PM
        </label>
        <textarea
          id="ask-input"
          ref={fieldRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          placeholder={listening ? "Listening…" : "Tell PM what you need…"}
          className="block max-h-40 min-w-0 flex-1 resize-none bg-transparent text-[15px] leading-6 text-[var(--tx)] outline-none placeholder:text-[var(--tx2)]"
        />
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: f.size }));
            setFiles((fs) => [...fs, ...picked.filter((p) => !fs.some((f) => f.name === p.name))]);
            e.target.value = "";
            fieldRef.current?.focus();
          }}
        />
        <button type="button" onClick={() => fileInput.current?.click()} className={PILL}>
          <Paperclip aria-hidden="true" size={14} strokeWidth={1.75} className="text-[var(--tx2)]" />
          Attach
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={toggleDictation}
          disabled={!canDictate}
          aria-pressed={listening}
          aria-label={!canDictate ? "Voice isn’t supported in this browser" : listening ? "Stop listening" : "Speak your message"}
          title={!canDictate ? "Voice isn’t supported in this browser" : listening ? "Stop listening" : "Speak your message"}
          className={`relative inline-flex size-9 items-center justify-center rounded-full transition-colors duration-[120ms] disabled:cursor-default disabled:opacity-40 ${
            listening ? "bg-danger-tint text-danger-ink" : "text-[var(--tx2)] enabled:hover:bg-[#F4F4F5]"
          }`}
        >
          <Mic aria-hidden="true" size={16} strokeWidth={1.75} />
          {listening && <span aria-hidden="true" className={`absolute top-1.5 right-1.5 size-1.5 rounded-full bg-danger-ink ${styles.dot}`} />}
        </button>
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop"
            title="Stop (Esc)"
            className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--tx)] text-white transition-transform duration-[120ms] active:scale-95"
          >
            <Square aria-hidden="true" size={12} strokeWidth={2.5} className="fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Send"
            disabled={!value.trim() && files.length === 0}
            className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--cta)] text-white transition-[background-color,transform] duration-[120ms] hover:bg-[var(--cta-h)] active:scale-95 disabled:bg-[#E4E4E7]"
          >
            <ArrowUp aria-hidden="true" size={17} strokeWidth={2.25} />
          </button>
        )}
      </div>
    </form>
  );
}
