import { useState } from "react";
import { Popover } from "radix-ui";
import { Bell } from "lucide-react";
import { BotAvatar } from "@/components/ask/BotAvatar";
import { TEAM } from "@/components/ask/team";
import { ICON_BTN } from "@/components/dashboard/classes";
import { storyRef } from "@/components/dashboard/format";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { Tip } from "@/components/dashboard/Tip";
import tokens from "@/components/dashboard/tokens.module.css";
import { markAllRead, markRead, NOTICES, useRead, type Notice } from "./data";

const fromName = (n: Notice) => (n.from.kind === "bot" ? TEAM[n.from.id].name : n.from.name);

/**
 * One notification (DESIGN.md §6.5): the face of who it's from, the summary with the story's title in medium, the
 * story and the time, and, when it waits on you, its one action. Unread: a 6 px dot and the title in medium.
 * The whole row opens the story; the action opens it too, named for what you'll do there.
 */
function Row({ n, unread, onOpen }: { n: Notice; unread: boolean; onOpen: () => void }) {
  const href = `/stories/${storyRef(n.storyId)}`;
  const [before, title, after] = n.text;
  return (
    <li className="relative flex items-start gap-3 rounded-[14px] px-3 py-2.5 transition-colors duration-[120ms] hover:bg-[#F4F4F5]">
      <span aria-hidden="true" className={`mt-[11px] size-1.5 flex-none rounded-full ${unread ? "bg-[var(--tx)]" : ""}`} />
      <span className="mt-0.5 flex flex-none">
        {n.from.kind === "bot" ? <BotAvatar id={n.from.id} size={28} /> : <PersonAvatar initials={n.from.initials} size={28} />}
      </span>
      <span className="min-w-0 flex-1">
        <a
          href={href}
          onClick={onOpen}
          className="block text-[13px] leading-[18px] text-pretty text-[var(--tx)] outline-none after:absolute after:inset-0 after:rounded-[14px] focus-visible:after:outline-2 focus-visible:after:outline-[var(--cta)]"
        >
          {before}
          <span className={unread ? "font-medium" : undefined}>{title}</span>
          {after}
          {unread && <span className="sr-only"> (unread)</span>}
        </a>
        <span className="mt-0.5 block text-[12px] leading-4 text-[var(--tx2)]">
          <span className="tabular-nums">{storyRef(n.storyId)}</span> · {fromName(n)} · {n.when}
        </span>
      </span>
      {n.action && (
        <a
          href={href}
          onClick={onOpen}
          aria-label={`${n.action}: ${title}`}
          className="relative z-10 mt-0.5 inline-flex h-7 flex-none items-center rounded-full bg-white px-3 text-[12px] leading-4 font-medium text-[var(--tx)] ring-1 ring-black/[0.08] transition-colors duration-[120ms] hover:bg-[#F4F4F5]"
        >
          {n.action}
        </a>
      )}
    </li>
  );
}

/**
 * Notifications, in the top bar on every signed-in page (Shubham, 26 Nov: they matter more than chat there). The bell
 * counts what you haven't read; it opens a card under it: what needs you first (blocked until you act, each with
 * its action), then updates on your stories. Opening one marks it read. It's a card, not a side panel, so it's
 * a quick look: Esc or a click outside closes it, and the page underneath stays as it was.
 */
export function Notifications() {
  const [open, setOpen] = useState(false);
  const read = useRead();
  const unread = NOTICES.filter((n) => !read.has(n.id)).length;
  const needsYou = NOTICES.filter((n) => n.action);
  const updates = NOTICES.filter((n) => !n.action);
  const section = (label: string, items: Notice[]) =>
    items.length > 0 && (
      <section aria-label={label} className="pt-1">
        <h3 className="m-0 px-3 pt-2 pb-1 text-[12px] leading-4 font-medium text-[var(--tx2)]">
          {label} <span className="font-normal tabular-nums">· {items.length}</span>
        </h3>
        <ul className="m-0 list-none p-0">
          {items.map((n) => (
            <Row key={n.id} n={n} unread={!read.has(n.id)} onOpen={() => markRead(n.id)} />
          ))}
        </ul>
      </section>
    );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tip label="Notifications" side="bottom">
        <Popover.Trigger
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className={`${ICON_BTN} relative ${open ? "bg-black/5 text-[var(--tx)]" : ""}`}
        >
          <Bell aria-hidden="true" size={18} strokeWidth={1.5} />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ink)] px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2 ring-white"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={8}
          aria-label="Notifications"
          className={`${tokens.tokens} z-50 flex max-h-[min(600px,calc(100dvh-var(--bar-h)-24px))] w-[min(420px,calc(100vw-16px))] flex-col overflow-hidden rounded-[20px] bg-white ring-1 ring-black/[0.08] outline-none`}
        >
          <div className="flex h-12 flex-none items-center gap-2 pr-3 pl-5">
            <h2 className="m-0 flex-1 text-[15px] leading-5 font-semibold text-[var(--tx)]">Notifications</h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="h-7 rounded-full px-2.5 text-[12px] leading-4 font-medium text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/5 hover:text-[var(--tx)]"
              >
                Mark all as read
              </button>
            )}
          </div>
          {/* `relative` keeps the rows' screen-reader text inside the scroll area. */}
          <div className="relative min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {NOTICES.length ? (
              <>
                {section("Needs you", needsYou)}
                {section("Updates", updates)}
              </>
            ) : (
              <p className="m-0 px-3 py-10 text-center text-[13px] text-[var(--tx2)]">You’re all caught up.</p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
