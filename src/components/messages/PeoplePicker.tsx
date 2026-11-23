import { useState } from "react";
import type { Person } from "@/types/dashboard";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";

interface PeoplePickerProps {
  people: Person[];
  onPick: (id: string) => void;
}

/** New message: type to find a teammate, Enter or a click opens your conversation with them. */
export function PeoplePicker({ people, onPick }: PeoplePickerProps) {
  const [q, setQ] = useState("");
  const shown = people.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="mt-3">
      <label htmlFor="message-to" className="sr-only">
        To
      </label>
      <div className="flex h-9 items-center gap-2 rounded-full border border-[var(--ctl)] px-3.5 focus-within:border-[var(--ctl-h)]">
        <span aria-hidden="true" className="text-[14px] leading-5 text-[var(--tx2)]">
          To
        </span>
        <input
          id="message-to"
          data-people-search
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && shown[0]) {
              e.preventDefault();
              onPick(shown[0].id);
            }
          }}
          placeholder="Type a teammate’s name"
          autoComplete="off"
          className="h-full min-w-0 flex-1 text-[14px] leading-5 text-[var(--tx)] focus:outline-none"
        />
      </div>
      {shown.length ? (
        <ul className="-mx-3 mt-2 mb-0 list-none p-0">
          {shown.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p.id)}
                className="flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[14px] leading-5 text-[var(--tx)] transition-colors duration-[120ms] hover:bg-[var(--row-h)] focus-visible:bg-[var(--row-h)]"
              >
                <PersonAvatar initials={p.initials} size={28} />
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 mb-0 px-1 text-[14px] leading-5 text-[var(--tx2)]">No teammate called “{q.trim()}”.</p>
      )}
    </div>
  );
}
