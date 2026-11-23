import { NAV, currentPath, type NavItem } from "./nav";

// Asana's sidebar: 32 px items inset 8 px, a 16 px grey icon and an 8 px gap, 14/20 dark labels.
// Hover is a 4% black fill; the current page is a 6% fill with a medium label and a dark icon.
function Item({ item, current }: { item: NavItem; current: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <a
        href={item.href}
        aria-current={current ? "page" : undefined}
        className={`group flex h-8 items-center gap-2 rounded-[6px] px-2 text-[14px] leading-5 text-[var(--tx)] transition-colors duration-[120ms] ${
          current ? "bg-black/[0.06] font-medium" : "hover:bg-black/[0.04]"
        }`}
      >
        <Icon
          aria-hidden="true"
          size={16}
          strokeWidth={1.75}
          className={`flex-none ${current ? "text-[var(--tx)]" : "text-[var(--tx2)] group-hover:text-[var(--tx)]"}`}
        />
        <span className="truncate">{item.label}</span>
      </a>
    </li>
  );
}

/**
 * The main links in a slim 176 px column under the top bar, on its grey, from 1024 px (narrower screens keep
 * the top bar's menu). Settings sits at the bottom. The layout renders it without a client directive, so
 * it's plain HTML and ships no script.
 */
export function Sidebar({ current }: { current: string }) {
  const path = currentPath(current);
  const list = (foot: boolean) => (
    <ul className="flex flex-col gap-0.5">
      {NAV.filter((item) => !!item.foot === foot).map((item) => (
        <Item key={item.href} item={item} current={path === item.href} />
      ))}
    </ul>
  );
  return (
    <nav
      aria-label="Main"
      className="sticky top-[var(--bar-h)] hidden h-[calc(100dvh-var(--bar-h))] w-[var(--sidebar-w)] flex-none flex-col justify-between self-start bg-[var(--bar)] px-2 py-3 lg:flex"
    >
      {list(false)}
      {list(true)}
    </nav>
  );
}
