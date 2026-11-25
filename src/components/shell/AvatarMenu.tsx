import { DropdownMenu } from "radix-ui";
import { LogOut, Settings } from "lucide-react";
import type { Viewer } from "@/types/dashboard";
import { MENU_CONTENT, MENU_ITEM, MENU_SEPARATOR } from "@/components/dashboard/classes";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";

/** Account menu, as in the prototype: who you are, the workspace's state, Settings and Sign out. */
export function AvatarMenu({ viewer }: { viewer: Viewer }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={`Account: ${viewer.name}`}
        className="inline-flex size-8 flex-none items-center justify-center rounded-full transition-colors duration-[120ms] hover:bg-black/5 data-[state=open]:bg-black/5"
      >
        <PersonAvatar initials={viewer.initials} size={28} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} collisionPadding={8} className={`${MENU_CONTENT} w-[280px]`}>
          <DropdownMenu.Label className="px-4 py-2">
            <span className="block text-[14px] leading-5 font-medium text-[var(--tx)]">{viewer.name}</span>
            <span className="block truncate text-[13px] leading-[18px] text-[var(--tx2)]">{viewer.email}</span>
          </DropdownMenu.Label>
          <p className="mx-2 mb-1 flex gap-2 rounded-[6px] bg-[var(--ctl-bg-h)] px-2 py-1.5 text-[12px] leading-4 text-[var(--tx2)]">
            <span aria-hidden="true" className="mt-1 size-1.5 flex-none rounded-full bg-[var(--tx2)]" />
            {viewer.workspace}
          </p>
          <DropdownMenu.Separator className={MENU_SEPARATOR} />
          <DropdownMenu.Item asChild className={MENU_ITEM}>
            <a href="/settings">
              <Settings aria-hidden="true" size={16} strokeWidth={1.5} className="text-[var(--tx2)]" />
              Settings
            </a>
          </DropdownMenu.Item>
          {/* No sign-out endpoint exists yet, so this returns to the sign-in page. */}
          <DropdownMenu.Item className={MENU_ITEM} onSelect={() => window.location.assign("/login")}>
            <LogOut aria-hidden="true" size={16} strokeWidth={1.5} className="text-[var(--tx2)]" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
