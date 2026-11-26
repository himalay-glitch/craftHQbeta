import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Grid2x2Plus, PanelLeft } from "lucide-react";
import { ConnectAccountsModal } from "@/components/connect-accounts";
import { BotAvatar } from "@/components/ask/BotAvatar";
import { TEAM, TEAM_ORDER } from "@/components/ask/team";
import { TOOLTIP } from "@/components/dashboard/classes";
import type { BotId } from "@/types/ask";
import { NAV, currentPath, type NavItem } from "./nav";

// DESIGN.md §4.3: a 56 px rail of icons with their names on hover; `[` or the PanelLeft button opens it to the
// labelled sidebar, and the choice is remembered. The width lives on <html data-sidebar>, set before paint by
// AppLayout's inline script, so the page never jumps on load; every width-dependent style keys off that attribute.
const SIDEBAR_KEY = "crafthq.sidebar";
const EVENT = "crafthq:sidebar";

const isExpanded = () => document.documentElement.dataset.sidebar === "expanded";
function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function setExpanded(next: boolean) {
  if (next) document.documentElement.dataset.sidebar = "expanded";
  else delete document.documentElement.dataset.sidebar;
  try {
    localStorage.setItem(SIDEBAR_KEY, next ? "expanded" : "rail");
  } catch {
    // Private windows can refuse storage; the sidebar still toggles for this page.
  }
  window.dispatchEvent(new Event(EVENT));
}

// 32 px items (DESIGN.md §3.3). As a rail: a 40 px wide target with the 16 px icon centred. Opened: the icon, an
// 8 px gap and the 14/20 label. Hover is a 4% black fill; the current page a 6% fill and a dark icon.
const ITEM =
  "peer group flex h-8 items-center justify-center rounded-[6px] text-[14px] leading-5 text-[var(--tx)] transition-colors " +
  "duration-[120ms] [html[data-sidebar=expanded]_&]:justify-start [html[data-sidebar=expanded]_&]:gap-2 " +
  "[html[data-sidebar=expanded]_&]:px-2";
const LABEL = "hidden truncate [html[data-sidebar=expanded]_&]:block";

// The rail's names: the dark tooltip, 12 px to the right of the icon, shown at once on hover or keyboard focus.
// Plain CSS rather than a Radix tooltip, so it works from the first paint, before any script, with no delay;
// the link's own aria-label carries the name for screen readers, so this copy is hidden from them.
const NAME =
  `${TOOLTIP} pointer-events-none absolute top-1/2 left-full ml-3 -translate-y-1/2 whitespace-nowrap opacity-0 ` +
  "transition-opacity duration-100 peer-hover:opacity-100 peer-focus-visible:opacity-100 motion-reduce:transition-none " +
  "[html[data-sidebar=expanded]_&]:hidden";

function RailName({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className={NAME}>
      {children}
    </span>
  );
}

function Item({ item, current }: { item: NavItem; current: boolean }) {
  const Icon = item.icon;
  return (
    <li className="relative">
      <a
        href={item.href}
        aria-label={item.label}
        aria-current={current ? "page" : undefined}
        className={`${ITEM} ${current ? "bg-black/[0.06] font-medium" : "hover:bg-black/[0.04]"}`}
      >
        <Icon
          aria-hidden="true"
          size={16}
          strokeWidth={1.75}
          className={`flex-none ${current ? "text-[var(--tx)]" : "text-[var(--tx2)] group-hover:text-[var(--tx)]"}`}
        />
        <span aria-hidden="true" className={LABEL}>
          {item.label}
        </span>
      </a>
      <RailName>{item.label}</RailName>
    </li>
  );
}

/**
 * A bot under the links: its face (24 px), a green dot while it's working, its name and what it's on in the hover
 * label. It opens that bot's page (/ask/builder …): its workbench and what it's doing. You still talk to the PM there.
 */
function BotItem({ id, current }: { id: BotId; current: boolean }) {
  const bot = TEAM[id];
  const working = !/^(free|listening|talking)/i.test(bot.now);
  return (
    <li className="relative">
      <a
        href={id === "pm" ? "/ask" : `/ask/${id}`}
        aria-label={`${bot.name}, ${bot.now}`}
        aria-current={current ? "page" : undefined}
        className={`${ITEM} ${current ? "bg-black/[0.06] font-medium" : "hover:bg-black/[0.04]"}`}
      >
        <span className="relative flex-none">
          <BotAvatar id={id} size={24} />
          {working && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-[#22A06B] ring-2 ring-[var(--bar)] motion-safe:animate-pulse"
            />
          )}
        </span>
        <span aria-hidden="true" className={LABEL}>
          {bot.name}
        </span>
      </a>
      <RailName>
        {bot.name} <span className="opacity-70">· {bot.now}</span>
      </RailName>
    </li>
  );
}

/**
 * The main links under the top bar, on its grey, from 1024 px (narrower screens keep the top bar's menu), then
 * the bots. A 56 px rail by default; 176 px with labels when opened. Connectors, Settings and the toggle sit at the
 * bottom. Connectors opens the connect-accounts modal: the services CraftHQ works through (GitHub, Claude), which
 * are connected, and a way to connect the rest. It lives in this island because islands don't share state.
 */
export function Sidebar({ current }: { current: string }) {
  const path = currentPath(current);
  // The server can't see the saved choice, so it renders the rail; the attribute already has the right width.
  const expanded = useSyncExternalStore(subscribe, isExpanded, () => false);
  const [connectors, setConnectors] = useState(false);

  // `[` toggles it from anywhere, except while typing or with a modifier held (DESIGN.md §8.1).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")) return;
      e.preventDefault();
      setExpanded(!isExpanded());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const list = (foot: boolean) =>
    NAV.filter((item) => !!item.foot === foot).map((item) => (
      <Item key={item.href} item={item} current={path === item.href} />
    ));

  // z-20 is the sidebar's layer (DESIGN.md §3.5), so the names float over the page beside it.
  return (
    <nav
      aria-label="Main"
      className="sticky top-[var(--bar-h)] z-20 hidden h-[calc(100dvh-var(--bar-h))] w-[var(--sidebar-w)] flex-none flex-col justify-between self-start bg-[var(--bar)] px-2 py-3 transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none lg:flex"
    >
      <div className="flex min-h-0 flex-col">
        <ul className="flex list-none flex-col gap-0.5">{list(false)}</ul>
        {/* The bots: a short rule in the rail; a "Bots" label when the sidebar is open. */}
        <div aria-hidden="true" className="mx-auto my-3 h-px w-6 bg-black/10 [html[data-sidebar=expanded]_&]:hidden" />
        <p
          aria-hidden="true"
          className="hidden px-2 pt-4 pb-1 text-[12px] leading-4 text-[var(--tx2)] [html[data-sidebar=expanded]_&]:block"
        >
          Bots
        </p>
        <ul aria-label="Bots" className="flex list-none flex-col gap-0.5">
          {TEAM_ORDER.map((id) => (
            <BotItem key={id} id={id} current={id !== "pm" && path === `/ask/${id}`} />
          ))}
        </ul>
      </div>
      <ul className="flex list-none flex-col gap-0.5">
        <li className="relative">
          <button
            type="button"
            aria-label="Connectors"
            aria-haspopup="dialog"
            onClick={() => setConnectors(true)}
            className={`${ITEM} w-full hover:bg-black/[0.04]`}
          >
            <Grid2x2Plus aria-hidden="true" size={16} strokeWidth={1.75} className="flex-none text-[var(--tx2)] group-hover:text-[var(--tx)]" />
            <span aria-hidden="true" className={LABEL}>
              Connectors
            </span>
          </button>
          <RailName>Connectors</RailName>
        </li>
        {list(true)}
        <li className="relative">
          <button
            type="button"
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className={`${ITEM} w-full text-[var(--tx2)] hover:bg-black/[0.04] hover:text-[var(--tx)]`}
          >
            <PanelLeft aria-hidden="true" size={16} strokeWidth={1.75} className="flex-none" />
            <span aria-hidden="true" className={LABEL}>
              Collapse
            </span>
          </button>
          <RailName>
            Expand sidebar <kbd className="ml-1 font-sans opacity-70">[</kbd>
          </RailName>
        </li>
      </ul>
      <ConnectAccountsModal open={connectors} onClose={() => setConnectors(false)} />
    </nav>
  );
}
