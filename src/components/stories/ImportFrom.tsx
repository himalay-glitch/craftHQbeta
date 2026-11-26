import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Paperclip, Search } from "lucide-react";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/dashboard/classes";
import { connectTool, TOOLS, useConnectedTools, type Ticket, type TicketTool } from "./imports";

type Step = { kind: "tools" } | { kind: "connect"; tool: TicketTool } | { kind: "tickets"; tool: TicketTool } | { kind: "ticket"; tool: TicketTool; ticket: Ticket };

interface ImportFromProps {
  /** "Use this ticket": the New story form fills in from it, to edit before creating. */
  onUse: (tool: TicketTool, ticket: Ticket) => void;
  /** A ticket that's already a story here: open that story instead of making a second one. */
  onOpenStory: (id: number) => void;
  /** Something is typed in the form already: using a ticket replaces it, so say so first. */
  replaces: boolean;
}

const BACK =
  "-ml-2 inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/5 hover:text-[var(--tx)]";
const ROW =
  "flex w-full items-center gap-3 rounded-[12px] border border-[var(--card-line)] bg-white px-3 py-2.5 text-left transition-colors duration-[120ms] hover:bg-[var(--row-h)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cta)]";

/**
 * Import a story from where the team already writes tickets (Shubham, 26 Nov: Jira, and any tool with stories or
 * tickets). Pick the tool, connect it once, find the ticket, read it, then "Use this ticket": the New story form fills in
 * from it (title, why, the description with its acceptance criteria, the attachments' names) and the story keeps a link
 * back ("From Jira · WEP-142"). Nothing is created until Create story, so it can be edited first.
 */
export function ImportFrom({ onUse, onOpenStory, replaces }: ImportFromProps) {
  const connected = useConnectedTools();
  const [step, setStep] = useState<Step>({ kind: "tools" });
  const [q, setQ] = useState("");
  const [connecting, setConnecting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<number | undefined>(undefined);

  // Each step starts at its heading, for screen readers and the keyboard.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const open = (tool: TicketTool) => {
    setQ("");
    setStep(connected.includes(tool.id) ? { kind: "tickets", tool } : { kind: "connect", tool });
  };

  if (step.kind === "connect") {
    const { tool } = step;
    return (
      <div>
        <button type="button" onClick={() => setStep({ kind: "tools" })} className={BACK}>
          <ArrowLeft aria-hidden="true" size={12} strokeWidth={2} />
          All tools
        </button>
        <div className="mt-2 flex items-center gap-3">
          <ToolLogo tool={tool} size={24} />
          <h3 ref={headingRef} tabIndex={-1} className="m-0 text-base font-semibold text-[var(--tx)] outline-none">
            Connect {tool.name}
          </h3>
        </div>
        <p className="m-0 mt-1 text-sm text-pretty text-[var(--tx2)]">
          CraftHQ reads {tool.reads}. It never changes your tickets.
        </p>
        <p className="m-0 mt-2 text-xs text-pretty text-[var(--tx2)]">
          You sign in with {tool.maker} and choose what to share. You can disconnect it any time in Settings.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={connecting}
            onClick={() => {
              setConnecting(true);
              // Demo: no real sign-in yet; it connects after a moment.
              timer.current = window.setTimeout(() => {
                connectTool(tool.id);
                setConnecting(false);
                setStep({ kind: "tickets", tool });
              }, 1200);
            }}
            className={BTN_PRIMARY}
          >
            {connecting ? "Connecting…" : `Connect ${tool.name}`}
          </button>
          <button type="button" onClick={() => setStep({ kind: "tools" })} className={BTN_SECONDARY}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step.kind === "tickets") {
    const { tool } = step;
    const term = q.trim().toLowerCase();
    const found = tool.tickets.filter((t) => !term || t.key.toLowerCase().includes(term) || t.title.toLowerCase().includes(term));
    return (
      <div>
        <button type="button" onClick={() => setStep({ kind: "tools" })} className={BACK}>
          <ArrowLeft aria-hidden="true" size={12} strokeWidth={2} />
          All tools
        </button>
        <div className="mt-2 flex items-center gap-3">
          <ToolLogo tool={tool} />
          <div className="min-w-0 flex-1">
            <h3 ref={headingRef} tabIndex={-1} className="m-0 text-base font-semibold text-[var(--tx)] outline-none">
              {tool.name}
            </h3>
            <p className="m-0 truncate text-xs text-[var(--tx2)]">{tool.place}</p>
          </div>
        </div>
        <label className="relative mt-3 block">
          <span className="sr-only">Search {tool.name} by key or title</span>
          <Search aria-hidden="true" size={16} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--tx2)]" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by key or title"
            autoComplete="off"
            className="block h-9 w-full rounded-[8px] border border-[var(--ctl)] bg-white pr-3 pl-9 text-sm text-[var(--tx)] outline-none placeholder:text-[var(--tx2)] focus:border-[var(--cta)] pointer-coarse:text-base"
          />
        </label>
        {found.length ? (
          <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
            {found.map((t) => (
              <li key={t.key}>
                {t.linkedStory ? (
                  // Already a story: one link to it, never a second story from the same ticket.
                  <div className={`${ROW} hover:bg-white`}>
                    <TicketLine t={t} />
                    <button
                      type="button"
                      onClick={() => onOpenStory(t.linkedStory!)}
                      className="flex-none rounded-[4px] text-xs font-medium text-[var(--tx)] underline decoration-black/20 underline-offset-2 hover:decoration-current"
                    >
                      Already hq-{t.linkedStory}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setStep({ kind: "ticket", tool, ticket: t })} className={ROW}>
                    <TicketLine t={t} />
                    <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 mt-4 text-sm text-[var(--tx2)]">No ticket matches “{q}”. Try its key, like {tool.tickets[0]?.key}.</p>
        )}
      </div>
    );
  }

  if (step.kind === "ticket") {
    const { tool, ticket: t } = step;
    return (
      <div>
        <button type="button" onClick={() => setStep({ kind: "tickets", tool })} className={BACK}>
          <ArrowLeft aria-hidden="true" size={12} strokeWidth={2} />
          {tool.name}
        </button>
        <p className="m-0 mt-3 flex items-center gap-2 text-xs text-[var(--tx2)]">
          <img src={tool.logo} alt={tool.name} width={20} height={20} className="size-5 flex-none" />
          <span>
            <span className="font-mono">{t.key}</span> · {t.kind} · {t.status} · {t.updated}
          </span>
        </p>
        <h3 ref={headingRef} tabIndex={-1} className="m-0 mt-1 text-base font-semibold text-pretty text-[var(--tx)] outline-none">
          {t.title}
        </h3>
        {t.why && <p className="m-0 mt-1 text-sm text-pretty text-[var(--tx2)]">{t.why}</p>}
        <p className="m-0 mt-3 text-sm text-pretty whitespace-pre-wrap text-[var(--tx)]">{t.description}</p>
        {t.criteria && t.criteria.length > 0 && (
          <>
            <p className="m-0 mt-4 text-xs font-medium text-[var(--tx2)]">Acceptance criteria</p>
            <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
              {t.criteria.map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm text-pretty text-[var(--tx)]">
                  <span className="flex h-5 flex-none items-center">
                    <Check aria-hidden="true" size={12} strokeWidth={2} className="text-[var(--tx2)]" />
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </>
        )}
        {(t.attachments?.length || t.labels?.length) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {t.attachments?.map((a) => (
              <span key={a} className="inline-flex h-6 items-center gap-1 rounded-md bg-field px-2 text-xs text-[var(--tx)]">
                <Paperclip aria-hidden="true" size={12} strokeWidth={2} className="text-[var(--tx2)]" />
                {a}
              </span>
            ))}
            {t.labels?.map((l) => (
              <span key={l} className="inline-flex h-6 items-center rounded-full bg-field px-2 text-xs text-[var(--tx2)]">
                {l}
              </span>
            ))}
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button type="button" onClick={() => onUse(tool, t)} className={BTN_PRIMARY}>
            Use this ticket
          </button>
          <span className="text-xs text-pretty text-[var(--tx2)]">
            {replaces ? "It replaces what’s typed in the form. " : ""}You can edit it before creating the story.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 ref={headingRef} tabIndex={-1} className="m-0 text-sm font-medium text-[var(--tx)] outline-none">
        Where is the ticket?
      </h3>
      <ul className="m-0 mt-2 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
        {TOOLS.map((tool) => {
          const on = connected.includes(tool.id);
          return (
            <li key={tool.id}>
              <button type="button" onClick={() => open(tool)} className={ROW}>
                <ToolLogo tool={tool} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--tx)]">{tool.name}</span>
                  <span className="block truncate text-xs text-[var(--tx2)]">{on ? tool.place : tool.maker}</span>
                </span>
                {on ? (
                  <span className="inline-flex flex-none items-center gap-1.5 text-xs font-medium text-success-ink">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
                    Connected
                  </span>
                ) : (
                  <span className="flex-none text-xs font-medium text-primary-strong">Connect</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A tool's official mark on a small white tile (DESIGN.md §3.6: the real logo, 20–24 px, unmodified). */
export function ToolLogo({ tool, size = 20 }: { tool: Pick<TicketTool, "logo" | "name">; size?: 20 | 24 }) {
  return (
    <span aria-hidden="true" className={`flex flex-none items-center justify-center rounded-[8px] bg-white ring-1 ring-black/[0.08] ${size === 24 ? "size-10" : "size-8"}`}>
      <img src={tool.logo} alt="" width={size} height={size} className={size === 24 ? "size-6" : "size-5"} />
    </span>
  );
}

/** A ticket in the list: its key, kind and status, then its title. */
function TicketLine({ t }: { t: Ticket }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-xs text-[var(--tx2)]">
        <span className="font-mono">{t.key}</span> · {t.kind} · {t.status} · {t.updated}
      </span>
      <span className="mt-0.5 block truncate text-sm text-[var(--tx)]">{t.title}</span>
    </span>
  );
}
