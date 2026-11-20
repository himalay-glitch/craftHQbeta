import { Fragment } from "react";
import { DropdownMenu } from "radix-ui";
import { ChevronDown, CircleCheck, CircleSlash, Lock, PencilLine, Play, type LucideIcon } from "lucide-react";
import type { StoryStatus } from "@/types/dashboard";
import { MENU_CONTENT, MENU_SEPARATOR } from "@/components/dashboard/classes";
import chat from "./chat.module.css";
import { MOVE_GROUP, STATUS_LABEL, type MoveOption, type StatusMove } from "./stage";

interface StatusMenuProps {
  status: StoryStatus;
  /** What's under way, after the status: "Waiting to start", "Building", "Verifying", "Stopped". */
  detail?: string;
  /** The dot's colour class. */
  dot: string;
  /** The agent is at work: the dot blinks. */
  working: boolean;
  /** Set while the agent holds a job: the menu still opens, says why, and offers nothing. */
  locked?: string;
  moves: MoveOption[];
  onMove: (move: StatusMove) => void;
  /** "hq-21", for the button's accessible name. */
  storyLabel: string;
}

const ICON: Record<StatusMove, LucideIcon> = { planning: PencilLine, approved: Play, done: CircleCheck, cancelled: CircleSlash };

const ITEM =
  "mx-1 flex cursor-pointer items-start gap-2.5 rounded-[6px] px-3 py-2 outline-none select-none data-highlighted:bg-[var(--menu-h)]";

/**
 * The story's status, and the way to change it (statuses guide §7). The button shows the status and what's
 * under way ("Approved · Waiting to start"), so an instruction that's waiting reads differently from work
 * that's running. The menu offers only the moves that make sense from here, grouped by what they do, and
 * says what each one does. While the agent holds a build, it opens, says why, and offers nothing.
 */
export function StatusMenu({ status, detail, dot, working, locked, moves, onMove, storyLabel }: StatusMenuProps) {
  const name = STATUS_LABEL[status];
  const shown = detail ? `${name} · ${detail}` : name;
  // Cancelled goes last, after its own divider; the rest group by what they do.
  const kept = moves.filter((m) => m.move !== "cancelled");
  const cancel = moves.find((m) => m.move === "cancelled");
  const groups = [...new Set(kept.map((m) => MOVE_GROUP[m.move]))];

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={`Status of ${storyLabel}: ${shown}${working ? ", working" : ""}. Change status`}
        className="-mx-1 inline-flex min-w-0 items-center gap-1.5 rounded-[6px] px-1 py-0.5 transition-colors duration-[120ms] hover:bg-[var(--ctl-bg-h)] data-[state=open]:bg-[var(--ctl-bg-h)]"
      >
        <span aria-hidden="true" className={`size-2 flex-none rounded-full ${dot} ${working ? chat.blink : ""}`} />
        <span key={shown} className={`truncate text-[14px] leading-5 ${chat.labelIn}`}>
          <span className="font-medium text-[var(--tx)]">{name}</span>
          {detail && <span className="text-[var(--tx2)]"> · {detail}</span>}
        </span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} collisionPadding={8} className={`${MENU_CONTENT} w-[320px]`}>
          <DropdownMenu.Label className="px-4 pt-1.5 pb-1 text-[12px] leading-4 text-[var(--tx2)]">
            Status · <span className="font-medium text-[var(--tx)]">{shown}</span>
          </DropdownMenu.Label>
          {locked ? (
            // Nothing to choose: one disabled line that says why, never chosen.
            <DropdownMenu.Item disabled className="mx-1 flex items-start gap-2.5 rounded-[6px] px-3 py-2 outline-none">
              <Lock aria-hidden="true" size={16} strokeWidth={1.75} className="mt-0.5 flex-none text-[var(--tx2)]" />
              <span className="text-[13px] leading-[18px] text-[var(--tx)]">{locked}</span>
            </DropdownMenu.Item>
          ) : (
            <>
              {groups.map((group, i) => (
                <Fragment key={group}>
                  {i > 0 && <DropdownMenu.Separator className={MENU_SEPARATOR} />}
                  <DropdownMenu.Group>
                    <DropdownMenu.Label className="px-4 pt-1.5 pb-0.5 text-[12px] leading-4 text-[var(--tx2)]">{group}</DropdownMenu.Label>
                    {kept
                      .filter((m) => MOVE_GROUP[m.move] === group)
                      .map((m) => (
                        <MoveItem key={m.move} option={m} onSelect={() => onMove(m.move)} />
                      ))}
                  </DropdownMenu.Group>
                </Fragment>
              ))}
              {cancel && (
                <>
                  <DropdownMenu.Separator className={MENU_SEPARATOR} />
                  <MoveItem option={cancel} onSelect={() => onMove("cancelled")} danger />
                </>
              )}
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MoveItem({ option, onSelect, danger }: { option: MoveOption; onSelect: () => void; danger?: boolean }) {
  const Icon = ICON[option.move];
  return (
    <DropdownMenu.Item onSelect={onSelect} className={ITEM}>
      <Icon aria-hidden="true" size={16} strokeWidth={1.75} className={`mt-0.5 flex-none ${danger ? "text-[var(--red)]" : "text-[var(--tx2)]"}`} />
      <span className="min-w-0">
        <span className={`block text-[14px] leading-5 ${danger ? "text-[var(--red)]" : "text-[var(--tx)]"}`}>{option.label}</span>
        <span className="block text-[12px] leading-4 text-[var(--tx2)]">{option.hint}</span>
      </span>
    </DropdownMenu.Item>
  );
}
