import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import { CircleCheck, CircleSlash, Ellipsis, Eye, PencilLine, Play, RotateCcw, RotateCw, type LucideIcon } from "lucide-react";
import type { StoryStatus } from "@/types/dashboard";
import { ICON_BTN } from "@/components/dashboard/classes";
import { Tip } from "@/components/dashboard/Tip";
import chat from "./chat.module.css";
import { STATUS_LABEL, type MoveOption, type StatusMove } from "./stage";

/**
 * The status at the top of the chat, as words: "● In progress · Builder is making the change". Read-only: the
 * status is changed from the page's ⋯ menu, and the everyday next step (approve, accept) is the chat's decision.
 */
export function StatusLine({ status, detail, dot }: { status: StoryStatus; detail?: string; dot: string }) {
  const name = STATUS_LABEL[status];
  const shown = detail ? `${name} · ${detail}` : name;
  return (
    <p className="m-0 flex min-w-0 items-center gap-2">
      <span aria-hidden="true" className={`size-2 flex-none rounded-full ${dot}`} />
      <span key={shown} title={shown} className={`truncate text-[14px] leading-5 ${chat.labelIn}`}>
        <span className="sr-only">Status: </span>
        <span className="font-medium text-[var(--tx)]">{name}</span>
        {detail && <span className="text-[var(--tx2)]"> · {detail}</span>}
      </span>
    </p>
  );
}

const ICON: Record<MoveOption["icon"], LucideIcon> = {
  plan: PencilLine,
  build: Play,
  rebuild: RotateCw,
  reopen: RotateCcw,
  done: CircleCheck,
  cancel: CircleSlash,
};

// DESIGN.md §7.6: a card with a hairline ring and a soft shadow, 4 px inside; one-line 32 px items with a muted
// 16 px icon; groups split by a hairline with 4 px of space; the destructive item last, in danger ink. It's portalled
// out of the page, so it uses DESIGN.md's global tokens (foreground, muted), not the page's scoped ones.
const CONTENT = `${chat.menu} z-50 max-h-[60vh] min-w-[180px] max-w-[320px] overflow-y-auto rounded-xl bg-card p-1 shadow-popover outline-none`;
const ITEM =
  "flex h-8 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm whitespace-nowrap outline-none select-none " +
  "data-highlighted:bg-hover data-disabled:cursor-default data-disabled:opacity-40";
const SEPARATOR = "-mx-1 my-1 h-px bg-border";
const NOTE = "max-w-[280px] px-2 pt-1.5 pb-1 text-xs";

interface StatusMenuProps {
  moves: MoveOption[];
  /** While a robot holds a build: one quiet line says why, and the moves stay in view but can't be chosen.
   *  Cancel story still can (it asks first), so a build can always be stopped. */
  locked?: string;
  /** Returns why a move was refused (a teammate changed the story first), or nothing when it was applied. */
  onMove: (move: StatusMove) => string | void;
  /** Catches the page up with the teammate's change, from a refusal. */
  onCatchUp?: () => void;
  /** "hq-21", for the button's accessible name. */
  storyLabel: string;
}

/** The ⋯ button's id: focus comes back to it when a confirm opened from the menu closes. */
export const MORE_BUTTON_ID = "story-more-button";

/**
 * The story's ⋯ (More) menu in the page's top row (DESIGN.md §4.5, §7.6): the status moves that make sense from
 * here, each a verb and its object. Choosing one does it at once with Undo in a toast, or asks first when it
 * would throw away a running build (§6.11).
 */
export function StatusMenu({ moves, locked, onMove, onCatchUp, storyLabel }: StatusMenuProps) {
  // A move that was refused stays in the open menu with its reason, instead of the moves (they'd act on old state).
  const [refusal, setRefusal] = useState<string | null>(null);
  const choose = (move: StatusMove) => (e: Event) => {
    const why = onMove(move);
    if (why) {
      e.preventDefault();
      setRefusal(why);
    }
  };
  const kept = moves.filter((m) => m.move !== "cancelled");
  const cancel = moves.find((m) => m.move === "cancelled");

  return (
    <DropdownMenu.Root modal={false} onOpenChange={(open) => !open && setRefusal(null)}>
      <Tip label="More">
        <DropdownMenu.Trigger id={MORE_BUTTON_ID} aria-label={`More actions for ${storyLabel}`} className={`${ICON_BTN} data-[state=open]:bg-black/5 data-[state=open]:text-foreground`}>
          <Ellipsis aria-hidden="true" size={16} strokeWidth={1.75} />
        </DropdownMenu.Trigger>
      </Tip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} collisionPadding={8} className={CONTENT}>
          {refusal ? (
            <>
              <p role="alert" className={`${NOTE} text-danger-ink`}>
                {refusal}
              </p>
              {onCatchUp && (
                <DropdownMenu.Item onSelect={onCatchUp} className={`${ITEM} text-foreground`}>
                  <Eye aria-hidden="true" size={16} strokeWidth={1.75} className="flex-none text-muted-foreground" />
                  See the change
                </DropdownMenu.Item>
              )}
            </>
          ) : (
            <>
              {locked && <DropdownMenu.Label className={`${NOTE} text-muted-foreground`}>{locked}</DropdownMenu.Label>}
              {kept.map((m) => (
                <MoveItem key={m.move} option={m} disabled={Boolean(locked)} onSelect={choose(m.move)} />
              ))}
              {cancel && (
                <>
                  {kept.length > 0 && <DropdownMenu.Separator className={SEPARATOR} />}
                  <MoveItem option={cancel} onSelect={choose("cancelled")} danger />
                </>
              )}
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MoveItem({ option, onSelect, danger, disabled }: { option: MoveOption; onSelect: (e: Event) => void; danger?: boolean; disabled?: boolean }) {
  const Icon = ICON[option.icon];
  return (
    <DropdownMenu.Item disabled={disabled} onSelect={onSelect} className={`${ITEM} ${danger ? "text-danger-ink" : "text-foreground"}`}>
      <Icon aria-hidden="true" size={16} strokeWidth={1.75} className={`flex-none ${danger ? "" : "text-muted-foreground"}`} />
      {option.label}
    </DropdownMenu.Item>
  );
}
