import { useState, type MouseEvent, type ReactNode } from "react";
import { HoverCard } from "radix-ui";
import { AtSign, Lock, Users } from "lucide-react";
import type { Person } from "@/types/dashboard";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import tokens from "@/components/dashboard/tokens.module.css";
import { names } from "./RichText";

interface TeamButtonProps {
  /** Everyone on the story: its owner, who wrote it, the people in its Team conversation, and the viewer. */
  people: Person[];
  /** The viewer, named "you" in the tooltip and left out of the spoken name. */
  viewerId: string;
  /** Messages to the viewer in it that they haven't read. */
  unread: number;
  /** A teammate on the story right now: a green dot on their face, and the note in the tooltip. */
  present?: { id: string; note: string };
  /** Team is open inside the story: the faces read as pressed. */
  open?: boolean;
  onOpen: () => void;
  /** How each person is on the story ("Owner · here now"), for their card. */
  about: (person: Person) => string;
  /** Their card's two ways to talk: in the story's Team ("@Esha ", drafted), or one to one. */
  onMention: (person: Person) => void;
  onMessage: (person: Person) => void;
}

// A row in a person's card: 32 px, like a menu item (DESIGN.md §7.6).
const ROW =
  "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] leading-[18px] text-[var(--tx)] transition-colors duration-[120ms] hover:bg-[#F4F4F5] focus-visible:outline-2 focus-visible:outline-[var(--cta)]";

/**
 * One person's card, on hover over their face (Shubham, 25 Nov: "talk with a particular member", no threads): who
 * they are and how they're on the story, then Mention in Team (story talk, everyone sees it) or Message privately
 * (one to one). A shortcut for the pointer: the same is always there by typing @ in Team, or in Messages.
 */
function PersonCard({ person, about, onMention, onMessage, children }: { person: Person; about: string; onMention: () => void; onMessage: () => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // The card is portalled, but React still bubbles its clicks to the faces' button: keep them here. Choosing closes
  // it, so it doesn't sit over what opened (and doesn't keep Esc for itself).
  const act = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    fn();
  };
  const first = person.name.split(" ")[0];
  return (
    <HoverCard.Root open={open} onOpenChange={setOpen} openDelay={250} closeDelay={150}>
      <HoverCard.Trigger asChild>{children}</HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={8}
          onClick={(e) => e.stopPropagation()}
          className={`${tokens.tokens} z-50 w-[236px] rounded-[16px] bg-white p-1.5 shadow-[0_0_0_1px_rgb(17_17_18/0.06),0_8px_24px_rgb(17_17_18/0.1)]`}
        >
          <div className="flex items-center gap-2.5 px-2 pt-1.5 pb-2">
            <PersonAvatar initials={person.initials} size={28} />
            <div className="min-w-0">
              <p className="m-0 truncate text-[14px] leading-5 font-medium text-[var(--tx)]">{person.name}</p>
              {about && <p className="m-0 truncate text-[12px] leading-4 text-[var(--tx2)]">{about}</p>}
            </div>
          </div>
          <button type="button" onClick={act(onMention)} className={ROW}>
            <AtSign aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
            Mention in Team
          </button>
          <button type="button" onClick={act(onMessage)} className={ROW}>
            <Lock aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
            Message {first} privately
          </button>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

/**
 * Who's on the story, in the story page's top row, as their faces (Shubham, 25 Nov: the people, not a "Team" label;
 * DESIGN.md §4.5 puts a facepile of members on the right). Up to four, overlapping 4 px with a 2 px white ring, then
 * "+N" (§7.13). Clicking them opens the story's Team chat: the Team tab beside the chat (StoryTeam), the same conversation
 * teammates see in Messages wherever they are; people only, the robots never read it. What you haven't read there is
 * a small count on the faces. Hovering a face opens that person's card (PersonCard). The words are in its name.
 */
export function TeamButton({ people, viewerId, present, unread, open = false, onOpen, about, onMention, onMessage }: TeamButtonProps) {
  const faces = people.slice(0, 4);
  const more = people.length - faces.length;
  const others = people.filter((p) => p.id !== viewerId).map((p) => p.name);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={open}
      data-team-button
      aria-label={`Team chat${others.length ? ` with ${names(others)}` : ""}${unread ? `, ${unread} unread` : ""}${present ? `. ${present.note}` : ""}`}
      className={`relative inline-flex h-8 flex-none items-center rounded-full px-1 transition-colors duration-[120ms] hover:bg-black/[0.05] active:translate-y-px ${
        open ? "bg-pressed" : ""
      }`}
    >
      {faces.length ? (
        <span aria-hidden="true" className="flex items-center">
          {faces.map((p, i) => {
            const face = (
              <span key={p.id} className={`relative flex rounded-full ring-2 ring-white ${i ? "-ml-1" : ""}`}>
                <PersonAvatar initials={p.initials} size={24} />
                {present?.id === p.id && <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-[var(--green)] ring-2 ring-white" />}
              </span>
            );
            // Your own face has no card: there's no one to talk to.
            return p.id === viewerId ? (
              face
            ) : (
              <PersonCard key={p.id} person={p} about={about(p)} onMention={() => onMention(p)} onMessage={() => onMessage(p)}>
                {face}
              </PersonCard>
            );
          })}
          {more > 0 && (
            <span
              title={names(people.slice(4).map((p) => p.name))}
              className="-ml-1 inline-flex size-6 items-center justify-center rounded-full bg-[#EEEEEC] text-[10px] font-semibold text-[var(--tx)] tabular-nums ring-2 ring-white"
            >
              +{more}
            </span>
          )}
        </span>
      ) : (
        <Users aria-hidden="true" size={16} strokeWidth={1.75} className="mx-1 text-[var(--tx2)]" />
      )}
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--cta)] px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2 ring-white"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

interface TeamChipProps {
  /** Whose face goes first: the person it waits on, or who's waiting. */
  person?: Person;
  icon?: ReactNode;
  text: string;
  /** It waits on the viewer: attention ink (DESIGN.md §3.1). */
  onYou?: boolean;
  onClick: () => void;
}

/** In the status row: a request still waiting ("Waiting on Esha", "Deepak is waiting on you"), or a nudge. Opens Team. */
export function TeamChip({ person, icon, text, onYou, onClick }: TeamChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 max-w-full min-w-0 flex-none items-center gap-1.5 rounded-full px-2 text-[12px] leading-4 font-medium transition-colors duration-[120ms] hover:bg-black/5 ${
        onYou ? "text-warning-ink" : "text-[var(--tx2)] hover:text-[var(--tx)]"
      }`}
    >
      {person ? <PersonAvatar initials={person.initials} size={20} /> : icon}
      <span className="truncate">{text}</span>
    </button>
  );
}
