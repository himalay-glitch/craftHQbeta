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
  /** The project this is, after the logo and a faint rule. */
  project?: string;
}

/**
 * The app's top bar, 48 px on the reference's light grey and the full width of the window, as in Asana:
 * the CHQ mark and the project's name on the left, search in the middle, the account menu on the right. The main links
 * live in the sidebar; below 1024 px, where there's no sidebar, they're in a menu here.
 */
export function TopBar({ viewer, search, current, project }: TopBarProps) {
  const path = currentPath(current);
  return (
    <Tooltip.Provider delayDuration={400}>
      <header className="sticky top-0 z-40 h-[var(--bar-h)] bg-[var(--bar)]">
        <div className="flex h-full items-center gap-2 px-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
          <div className="flex min-w-0 items-center gap-1">
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
              {/* The CHQ mark: black glass with a red glass slash on the Q (design/blender/crafthq_logo_chq_v001.blend),
                  shrunk ahead of time for each screen density so its edges stay crisp. */}
              <img
                src="/dashboard/crafthq-chq-48.webp"
                srcSet="/dashboard/crafthq-chq-24.webp 1x, /dashboard/crafthq-chq-48.webp 2x, /dashboard/crafthq-chq-72.webp 3x"
                width={68}
                height={24}
                alt="CraftHQ"
                className="block h-6 w-auto"
              />
            </a>
            {project && (
              <>
                <span aria-hidden="true" className="mx-2.5 h-4 w-px flex-none bg-black/[0.12]" />
                <span className="min-w-0 truncate text-[14px] leading-5 font-medium text-[var(--tx)]">{project}</span>
              </>
            )}
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
