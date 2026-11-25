import { DropdownMenu, Tooltip } from "radix-ui";
import { Menu } from "lucide-react";
import type { SearchItem, Viewer } from "@/types/dashboard";
import { ICON_BTN, MENU_CONTENT, MENU_ITEM } from "@/components/dashboard/classes";
import { AvatarMenu } from "./AvatarMenu";
import { NAV, currentPath } from "./nav";
import { SearchBox } from "./SearchBox";

interface TopBarProps {
  viewer: Viewer;
  search: SearchItem[];
  /** The current path, from the page, so the right link shows as current. */
  current: string;
}

/**
 * The app's top bar, 48 px on the reference's light grey and the full width of the window, as in Asana:
 * the glass wordmark on the left, search in the middle, the account menu on the right. The main links
 * live in the sidebar; below 1024 px, where there's no sidebar, they're in a menu here.
 */
export function TopBar({ viewer, search, current }: TopBarProps) {
  const path = currentPath(current);
  return (
    <Tooltip.Provider delayDuration={400}>
      <header className="sticky top-0 z-40 h-[var(--bar-h)] bg-[var(--bar)]">
        <div className="flex h-full items-center gap-2 px-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
          <div className="flex items-center gap-1">
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger aria-label="Menu" className={`${ICON_BTN} -ml-1.5 lg:hidden`}>
                <Menu aria-hidden="true" size={18} strokeWidth={1.5} />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="start" sideOffset={6} collisionPadding={8} className={MENU_CONTENT}>
                  {NAV.map(({ href, label, icon: Icon }) => (
                    <DropdownMenu.Item key={href} asChild className={MENU_ITEM}>
                      <a href={href} aria-current={path === href ? "page" : undefined} className="aria-[current=page]:font-medium">
                        <Icon aria-hidden="true" size={16} strokeWidth={1.75} className="text-[var(--tx2)]" />
                        {label}
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
          </div>

          <div className="ml-auto lg:ml-0">
            <SearchBox items={search} />
          </div>

          <div className="flex justify-end">
            <AvatarMenu viewer={viewer} />
          </div>
        </div>
      </header>
    </Tooltip.Provider>
  );
}
