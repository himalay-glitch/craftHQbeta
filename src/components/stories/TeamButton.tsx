import type { ReactNode } from "react";
import { Users } from "lucide-react";
import type { Person } from "@/types/dashboard";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { Tip } from "@/components/dashboard/Tip";
import { names } from "./RichText";

interface TeamButtonProps {
  /** The people in the story's Team conversation, besides the viewer, in the order they joined it. */
  people: Person[];
  /** Messages to the viewer in it that they haven't read. */
  unread: number;
  onOpen: () => void;
}

/**
 * Team, in the story page's top row (DESIGN.md §4.5: a facepile of members on the right): the story's people
 * chat. It opens in Messages, so it's the same conversation teammates see wherever they are in CraftHQ. People
 * only: the robots read the story's chat, never this. Up to four faces, then "+N" (§7.13), and a count of what
 * you haven't read.
 */
export function TeamButton({ people, unread, onOpen }: TeamButtonProps) {
  const faces = people.slice(0, 4);
  const more = people.length - faces.length;
  const who = names(people.map((p) => p.name));
  return (
    <Tip label={people.length ? `Talk about this story with ${who}` : "Talk about this story with your team"}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Team${people.length ? ` with ${who}` : ""}${unread ? `, ${unread} unread` : ""}`}
        className={`inline-flex h-8 flex-none items-center gap-1.5 rounded-full border border-[var(--ctl)] bg-white pr-3 text-[13px] leading-[18px] font-medium text-[var(--tx)] transition-colors duration-[120ms] hover:border-[var(--ctl-h)] hover:bg-[var(--ctl-bg-h)] active:translate-y-px ${
          faces.length ? "pl-1" : "pl-2.5"
        }`}
      >
        {faces.length ? (
          <span aria-hidden="true" className="flex items-center">
            {faces.map((p, i) => (
              <span key={p.id} className={`flex rounded-full ring-2 ring-white ${i ? "-ml-1" : ""}`}>
                <PersonAvatar initials={p.initials} size={20} />
              </span>
            ))}
            {more > 0 && (
              <span className="-ml-1 inline-flex size-5 items-center justify-center rounded-full bg-[#EEEEEC] text-[9px] font-semibold text-[var(--tx)] ring-2 ring-white">
                +{more}
              </span>
            )}
          </span>
        ) : (
          <Users aria-hidden="true" size={16} strokeWidth={1.75} className="text-[var(--tx2)]" />
        )}
        Team
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ink)] px-1 text-[10px] leading-none font-semibold text-white tabular-nums"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </Tip>
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
