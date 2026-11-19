import { DropdownMenu, Tooltip } from "radix-ui";
import { Menu } from "lucide-react";
import type { SearchItem, Viewer } from "@/types/dashboard";
import { ICON_BTN, MENU_CONTENT, MENU_ITEM } from "@/components/dashboard/classes";
import { AvatarMenu } from "./AvatarMenu";
import { SearchBox } from "./SearchBox";

// The prototype's links. Only the dashboard is built; the others are shown as agreed and lead nowhere yet.
const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/stories", label: "Stories" },
  { href: "/pages", label: "Feature pages" },
  { href: "/docs", label: "Docs" },
  { href: "/settings", label: "Settings" },
];

interface TopBarProps {
  viewer: Viewer;
  search: SearchItem[];
  /** The current path, from the page, so the right link shows as current. */
  current: string;
}

/**
 * The app's top bar, 48 px on the reference's light grey: the glass wordmark, the main links, search and
 * the account menu. Below 768 px the links move into a menu.
 */
export function TopBar({ viewer, search, current }: TopBarProps) {
  const path = current.replace(/\/$/, "") || "/";
  return (
    <Tooltip.Provider delayDuration={400}>
      <header className="sticky top-0 z-40 h-[var(--bar-h)] bg-[var(--bar)]">
        <div className="mx-auto flex h-full max-w-[1344px] items-center gap-1 px-4 md:px-8">
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger aria-label="Menu" className={`${ICON_BTN} -ml-1.5 md:hidden`}>
              <Menu aria-hidden="true" size={18} strokeWidth={1.5} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="start" sideOffset={6} collisionPadding={8} className={MENU_CONTENT}>
                {NAV.map((item) => (
                  <DropdownMenu.Item key={item.href} asChild className={MENU_ITEM}>
                    <a href={item.href} aria-current={path === item.href ? "page" : undefined} className="aria-[current=page]:font-medium">
                      {item.label}
                    </a>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <a href="/dashboard" className="flex-none rounded-[4px]">
            {/* Black-glass wordmark rendered in Blender (design/blender/crafthq_logo_glass_v001.blend). */}
            <img src="/dashboard/crafthq-logo-glass.webp" width={84} height={24} alt="CraftHQ" className="block h-6 w-auto" />
          </a>

          <nav aria-label="Main" className="ml-6 hidden items-center gap-0.5 md:flex">
            {NAV.map((item) => {
              const isCurrent = path === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`inline-flex h-7 items-center rounded-full px-2.5 text-[14px] leading-5 transition-colors duration-[120ms] ${
                    isCurrent
                      ? "bg-black/5 font-medium text-[var(--tx)]"
                      : "text-[var(--tx2)] hover:bg-black/[0.04] hover:text-[var(--tx)]"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <SearchBox items={search} />
            <AvatarMenu viewer={viewer} />
          </div>
        </div>
      </header>
    </Tooltip.Provider>
  );
}
