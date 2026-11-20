import { DropdownMenu } from "radix-ui";
import { Check, UserRound, UserRoundX } from "lucide-react";
import type { Person } from "@/types/dashboard";
import { MENU_CONTENT, MENU_ITEM, MENU_SEPARATOR } from "@/components/dashboard/classes";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";

interface OwnerPickerProps {
  /** The owner's initials; none shows the dotted "no owner" circle. */
  owner?: string;
  people: Person[];
  viewerInitials: string;
  onChange: (initials: string | null) => void;
  /** "hq-58", so a screen reader knows which story the button is for. */
  storyLabel: string;
  size?: 20 | 24;
  /** Show the owner's name next to the avatar (the story page's Details). */
  withName?: boolean;
}

const RING = "rounded-full outline-offset-2 transition-shadow duration-[120ms] hover:shadow-[0_0_0_2px_var(--ctl-h)] data-[state=open]:shadow-[0_0_0_2px_var(--cta)]";

/**
 * Who owns a story, and the way to change it: the avatar (or the dotted circle when nobody does) is a button
 * that opens the team. You first, then teammates, then "No owner".
 */
export function OwnerPicker({ owner, people, viewerInitials, onChange, storyLabel, size = 24, withName }: OwnerPickerProps) {
  const ordered = [...people].sort((a, b) => Number(b.initials === viewerInitials) - Number(a.initials === viewerInitials));
  const current = people.find((p) => p.initials === owner);
  const name = current ? (current.initials === viewerInitials ? `${current.name} (you)` : current.name) : undefined;
  const dim = size === 20 ? "size-5" : "size-6";

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={owner ? `Owner of ${storyLabel}: ${name ?? owner}. Change owner` : `Add an owner to ${storyLabel}`}
        className={`group inline-flex max-w-full items-center gap-2 ${withName ? "-mx-1 rounded-[6px] px-1 py-0.5 hover:bg-[var(--ctl-bg-h)] data-[state=open]:bg-[var(--ctl-bg-h)]" : RING}`}
      >
        {owner ? (
          <PersonAvatar initials={owner} size={size} />
        ) : (
          <span
            aria-hidden="true"
            className={`flex ${dim} flex-none items-center justify-center rounded-full border border-dashed border-[var(--ctl-h)] text-[var(--tx2)] transition-colors duration-[120ms] group-hover:border-solid group-hover:border-[var(--tx2)] group-hover:text-[var(--tx)] group-data-[state=open]:border-solid group-data-[state=open]:border-[var(--cta)] group-data-[state=open]:text-[var(--cta)]`}
          >
            <UserRound size={size === 20 ? 11 : 12} strokeWidth={1.75} />
          </span>
        )}
        {withName && (
          <span className={`truncate text-[14px] leading-5 ${owner ? "text-[var(--tx)]" : "text-[var(--tx2)]"}`}>{name ?? owner ?? "Add an owner"}</span>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} collisionPadding={8} className={MENU_CONTENT}>
          <DropdownMenu.Label className="px-4 pt-1.5 pb-1 text-[12px] leading-4 text-[var(--tx2)]">Owner</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={owner ?? ""} onValueChange={(v) => onChange(v || null)}>
            {ordered.map((p) => (
              <DropdownMenu.RadioItem key={p.id} value={p.initials} className={MENU_ITEM}>
                <PersonAvatar initials={p.initials} />
                <span className="min-w-0 flex-1 truncate">
                  {p.name}
                  {p.initials === viewerInitials && <span className="text-[var(--tx2)]"> (you)</span>}
                </span>
                <span className="flex size-4 items-center justify-center">
                  <DropdownMenu.ItemIndicator>
                    <Check aria-hidden="true" size={16} strokeWidth={1.75} />
                  </DropdownMenu.ItemIndicator>
                </span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          {owner && (
            <>
              <DropdownMenu.Separator className={MENU_SEPARATOR} />
              <DropdownMenu.Item className={`${MENU_ITEM} text-[var(--tx2)]`} onSelect={() => onChange(null)}>
                <UserRoundX aria-hidden="true" size={16} strokeWidth={1.75} />
                No owner
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
