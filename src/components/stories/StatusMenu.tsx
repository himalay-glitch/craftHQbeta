import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import {
  Circle,
  CircleCheck,
  CircleDashed,
  CircleExclamationPoint,
  CircleSlash,
  CircleX,
  Ellipsis,
  Eye,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestCreate,
  LoaderCircle,
  PencilLine,
  Play,
  RotateCcw,
  RotateCw,
  type LucideIcon,
} from "lucide-react";
import type { StoryStatus } from "@/types/dashboard";
import { ICON_BTN } from "@/components/dashboard/classes";
import { Tip } from "@/components/dashboard/Tip";
import chat from "./chat.module.css";
import { STATUS_LABEL, type MoveOption, type StatusMove } from "./stage";

/** DESIGN.md §3.1's tones, read from the status dot the page already works out. */
type Tone = "positive" | "attention" | "negative" | "neutral" | "active";
const toneOf = (dot: string): Tone =>
  dot.includes("16a34a") ? "positive" : dot.includes("d97706") ? "attention" : dot.includes("b91c1c") ? "negative" : dot.includes("--tx)") ? "active" : "neutral";
const TONE_PILL: Record<Tone, string> = {
  positive: "bg-success-tint text-success-ink",
  attention: "bg-warning-tint text-warning-ink",
  negative: "bg-danger-tint text-danger-ink",
  neutral: "bg-field text-[var(--tx)]",
  active: "bg-field text-[var(--tx)]",
};
/** One icon per state (DESIGN.md §3.6): each status has its own shape, so it reads without the colour. */
function StatusIcon({ tone, status }: { tone: Tone; status: StoryStatus }) {
  const props = { "aria-hidden": true, size: 12, strokeWidth: 2, className: `flex-none ${tone === "neutral" || tone === "active" ? "text-[var(--tx2)]" : ""}` } as const;
  if (tone === "negative") return <CircleX {...props} />;
  if (tone === "attention") return <CircleExclamationPoint {...props} />;
  if (tone === "positive") return <GitMerge {...props} />;
  if (tone === "active") return <LoaderCircle {...props} />;
  if (status === "pull_request") return <GitPullRequest {...props} />;
  if (status === "cancelled") return <CircleSlash {...props} />;
  if (status === "done") return <CircleCheck {...props} />;
  if (status === "new" || status === "planning") return <CircleDashed {...props} />;
  return <Circle {...props} />;
}

/**
 * The status, once, beside the story's title (Shubham, 25 Nov: simpler). DESIGN.md §7.12's pill: the tone's icon
 * (12 px) and the label in caption medium, on the tone's tint, 20 px tall. What's under way, or whose turn it is, is
 * its tooltip and part of its spoken name. Read-only: it changes from the ⋯ menu.
 */
export function StatusBadge({ status, detail, dot }: { status: StoryStatus; detail?: string; dot: string }) {
  const name = STATUS_LABEL[status];
  // Queued and waiting to be picked up say the same thing: no tooltip repeating the name.
  if (detail === name) detail = undefined;
  const tone = toneOf(dot);
  const pill = (
    <span key={name} className={`inline-flex h-5 flex-none items-center gap-1 rounded-full px-2 text-xs font-medium ${TONE_PILL[tone]} ${chat.labelIn}`}>
      <StatusIcon tone={tone} status={status} />
      <span className="sr-only">Status: </span>
      {name}
      {detail && <span className="sr-only">, {detail}</span>}
    </span>
  );
  return detail ? <Tip label={detail}>{pill}</Tip> : pill;
}

const ICON: Record<MoveOption["icon"], LucideIcon> = {
  plan: PencilLine,
  build: Play,
  rebuild: RotateCw,
  reopen: RotateCcw,
  pr: GitPullRequestCreate,
  close: GitPullRequestClosed,
  done: CircleCheck,
  cancel: CircleSlash,
};

// DESIGN.md §7.6: a card with a hairline ring (no shadow, Shubham 26 Nov), 4 px inside; one-line 32 px items with a muted
// 16 px icon; groups split by a hairline with 4 px of space; the destructive item last, in danger ink. It's portalled
// out of the page, so it uses DESIGN.md's global tokens (foreground, muted), not the page's scoped ones.
const CONTENT = `${chat.menu} z-50 max-h-[60vh] min-w-[180px] max-w-[320px] overflow-y-auto rounded-xl bg-card p-1 ring-1 ring-black/[0.08] outline-none`;
const ITEM =
  "flex h-8 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm whitespace-nowrap outline-none select-none " +
  "data-highlighted:bg-hover data-disabled:cursor-default data-disabled:opacity-40";
const SEPARATOR = "-mx-1 my-1 h-px bg-border";
const NOTE = "max-w-[280px] px-2 pt-1.5 pb-1 text-xs";

/** A plain action at the top of ⋯: going to the previous or next story, copying the link. */
export interface MenuLink {
  label: string;
  icon: LucideIcon;
  /** Muted, on the right: the story it goes to ("hq-42"). */
  hint?: string;
  disabled?: boolean;
  onSelect: () => void;
}

interface StatusMenuProps {
  /** Previous story, Next story and Copy link, which used to be buttons in the top row (Shubham, 25 Nov: simpler). */
  links?: MenuLink[];
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
export function StatusMenu({ links = [], moves, locked, onMove, onCatchUp, storyLabel }: StatusMenuProps) {
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
              {links.map(({ label, icon: Icon, hint, disabled, onSelect }) => (
                <DropdownMenu.Item key={label} disabled={disabled} onSelect={onSelect} className={`${ITEM} text-foreground`}>
                  <Icon aria-hidden="true" size={16} strokeWidth={1.75} className="flex-none text-muted-foreground" />
                  {label}
                  {hint && <span className="ml-auto pl-4 text-xs text-muted-foreground tabular-nums">{hint}</span>}
                </DropdownMenu.Item>
              ))}
              {links.length > 0 && (moves.length > 0 || locked) && <DropdownMenu.Separator className={SEPARATOR} />}
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
