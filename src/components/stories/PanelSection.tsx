import { useId, useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Collapse } from "./Collapse";

// One section of the story page's right-hand side: Status, Decisions, Pages, Preview, Code, Files, History. From 1024 px
// each is a white box of its own on the page's wash, with its name on top and a fold icon in the corner (Shubham, 27 Nov:
// "the status as a first white box, then Decisions, then pages … for all the sections there will be a collapsible
// icon"). Below 1024 px the same sections sit inside the tabs (the tablet's corner card, the phone's fold) as plain
// parts, always open, since a tab already shows one thing at a time.

/** What someone opened or folded, kept in this browser, so it stays that way on every story. */
const KEY = "crafthq:story-sections";
type Choices = Record<string, boolean>;
const NONE: Choices = {};
let choices: Choices | null = null;
const listeners = new Set<() => void>();

/** Only Status starts open; the rest start folded, a title row each, and open when you want them (Shubham, 27 Nov: "by
 *  default show them all collapsed, only the status show open"). */
const openByDefault = (id: string) => id === "status";
const isOpen = (c: Choices, id: string) => c[id] ?? openByDefault(id);

function read(): Choices {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return NONE;
    return Object.fromEntries(Object.entries(saved).filter((e): e is [string, boolean] => typeof e[1] === "boolean"));
  } catch {
    return NONE; // storage blocked or not JSON: the defaults
  }
}
const snapshot = () => (choices ??= read());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
function save(next: Choices) {
  choices = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: it holds until the page is left, nothing else.
  }
  listeners.forEach((fn) => fn());
}
const toggle = (id: string) => save({ ...snapshot(), [id]: !isOpen(snapshot(), id) });

/** Opens a folded section, for something that leads into it ("Read more in the plan" leads to Pages; a preview asked
 *  for in the chat starts in Preview). */
export function openSection(id: string) {
  if (!isOpen(snapshot(), id)) save({ ...snapshot(), [id]: true });
}

interface PanelSectionProps {
  /** "status", "pages": names its box (`story-box-pages`) and its fold. */
  id: string;
  title: string;
  /** After the name: "· 2". */
  count?: number;
  /** In the title row, always there: Decisions' "1 open". */
  extra?: ReactNode;
  /** In the title row only while it's folded: what it would say, in a few words, so folding hides nothing important. */
  summary?: ReactNode;
  /** From 1024 px: a white box that folds. Otherwise a plain part inside a tab, always open. */
  boxed?: boolean;
  /** In a tab that already says the name (Status): the name stays for screen readers only. */
  titleHidden?: boolean;
  children: ReactNode;
}

const TITLE = "m-0 flex min-w-0 items-center gap-1.5 text-xs font-medium text-[var(--tx2)]";

export function PanelSection({ id, title, count, extra, summary, boxed = false, titleHidden = false, children }: PanelSectionProps) {
  const bodyId = useId();
  // The defaults until the browser says otherwise, so the server's page and the first paint agree.
  const open = isOpen(useSyncExternalStore(subscribe, snapshot, () => NONE), id);
  const name = (
    <>
      {title}
      {count !== undefined && <span className="tabular-nums">· {count}</span>}
    </>
  );

  if (!boxed) {
    return (
      <section aria-label={title} className="flex flex-col">
        {titleHidden ? (
          <h3 className="sr-only">{title}</h3>
        ) : (
          <div className="flex h-6 items-center justify-between gap-2">
            <h3 className={TITLE}>{name}</h3>
            {extra}
          </div>
        )}
        {children}
      </section>
    );
  }

  return (
    <section id={`story-box-${id}`} aria-label={title} className="flex flex-none flex-col rounded-[24px] bg-white p-4 ring-1 ring-black/[0.06]">
      {/* The whole title row folds and opens it, the arrow included: the name is the button, stretched over the row
          (`after:`, above the arrow: a turned icon would otherwise sit on top of it and swallow the click), so a badge in
          the row stays a button of its own, above that. */}
      <div className="group/head relative flex h-6 items-center gap-2 pointer-coarse:h-11">
        <h3 className={TITLE}>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => toggle(id)}
            className="flex items-center gap-1.5 rounded-[4px] outline-none transition-colors duration-[120ms] group-hover/head:text-[var(--tx)] after:absolute after:-inset-x-2 after:-inset-y-1 after:z-[1] after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-[var(--cta)]"
          >
            {name}
          </button>
        </h3>
        <span className="min-w-0 flex-1 truncate text-right text-xs text-[var(--tx2)]">{!open && summary}</span>
        {extra && <span className="relative z-10 flex flex-none items-center">{extra}</span>}
        <ChevronDown
          aria-hidden="true"
          size={16}
          strokeWidth={1.75}
          className={`pointer-events-none flex-none text-[var(--tx2)] transition-[transform,color] duration-[120ms] group-hover/head:text-[var(--tx)] motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </div>
      {/* A size container, so a preview's line lays out by the box's own width. It grows open and folds shut
          (Collapse) rather than appearing at once. */}
      <Collapse open={open} id={bodyId} className="@container">
        <div className="flex flex-col">{children}</div>
      </Collapse>
    </section>
  );
}
