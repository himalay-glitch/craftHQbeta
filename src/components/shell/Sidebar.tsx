import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { PanelLeft } from "lucide-react";
import { Tooltip } from "radix-ui";
import { TOOLTIP } from "@/components/dashboard/classes";
import styles from "@/components/dashboard/tokens.module.css";
import { NAV, currentPath, type NavItem } from "./nav";

// DESIGN.md §4.3: a 56 px rail of icons with tooltips; `[` or the PanelLeft button opens it to the labelled
// sidebar, and the choice is remembered. The width lives on <html data-sidebar>, set before paint by AppLayout's
// inline script, so the page never jumps on load; every width-dependent style keys off that attribute.
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

/** A tooltip to the right of a rail icon (Radix, DESIGN.md §15 decision 4). Only shown while it's a rail. */
function RailTip({ label, show, children }: { label: ReactNode; show: boolean; children: ReactNode }) {
  if (!show) return children;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="right" sideOffset={8} collisionPadding={8} className={`${styles.tokens} ${TOOLTIP}`}>
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// 32 px items (DESIGN.md §3.3). As a rail: a 40 px square-ish target with the 16 px icon centred. Opened: the
// icon, an 8 px gap and the 14/20 label. Hover is a 4% black fill; the current page a 6% fill and a dark icon.
const ITEM =
  "group flex h-8 items-center justify-center rounded-[6px] text-[14px] leading-5 text-[var(--tx)] transition-colors " +
  "duration-[120ms] [html[data-sidebar=expanded]_&]:justify-start [html[data-sidebar=expanded]_&]:gap-2 " +
  "[html[data-sidebar=expanded]_&]:px-2";
const LABEL = "hidden truncate [html[data-sidebar=expanded]_&]:block";

function Item({ item, current, rail }: { item: NavItem; current: boolean; rail: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <RailTip label={item.label} show={rail}>
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
      </RailTip>
    </li>
  );
}

/**
 * The main links under the top bar, on its grey, from 1024 px (narrower screens keep the top bar's menu).
 * A 56 px rail by default; 176 px with labels when opened. Settings and the toggle sit at the bottom.
 */
export function Sidebar({ current }: { current: string }) {
  const path = currentPath(current);
  // The server can't see the saved choice, so it renders the rail; the attribute already has the right width.
  const expanded = useSyncExternalStore(subscribe, isExpanded, () => false);
  const rail = !expanded;

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
      <Item key={item.href} item={item} current={path === item.href} rail={rail} />
    ));
  const toggleLabel = expanded ? "Collapse sidebar" : "Expand sidebar";

  return (
    <Tooltip.Provider delayDuration={300} skipDelayDuration={200}>
      <nav
        aria-label="Main"
        className="sticky top-[var(--bar-h)] hidden h-[calc(100dvh-var(--bar-h))] w-[var(--sidebar-w)] flex-none flex-col justify-between self-start overflow-hidden bg-[var(--bar)] px-2 py-3 transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none lg:flex"
      >
        <ul className="flex flex-col gap-0.5">{list(false)}</ul>
        <ul className="flex flex-col gap-0.5">
          {list(true)}
          <li>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  aria-label={toggleLabel}
                  aria-expanded={expanded}
                  onClick={() => setExpanded(!expanded)}
                  className={`${ITEM} w-full text-[var(--tx2)] hover:bg-black/[0.04] hover:text-[var(--tx)]`}
                >
                  <PanelLeft aria-hidden="true" size={16} strokeWidth={1.75} className="flex-none" />
                  <span aria-hidden="true" className={LABEL}>
                    Collapse
                  </span>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content side="right" sideOffset={8} collisionPadding={8} className={`${styles.tokens} ${TOOLTIP}`}>
                  {toggleLabel} <kbd className="ml-1 font-sans opacity-70">[</kbd>
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </li>
        </ul>
      </nav>
    </Tooltip.Provider>
  );
}
