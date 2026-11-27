import { ArrowUpRight, LoaderCircle } from "lucide-react";

// Connectors as cards (Shubham, 26 Nov: "show the connectors like this", New story → Import's "Where is the ticket?"
// grid): the mark on a white tile, the name with one muted line under it, and the state on the right, "● Connected" or
// "Connect". One click on a card that isn't connected starts connecting it (Shubham, 26 Nov: "I have to connect two
// times"). When there's a step after the click (approve in GitHub's window, paste Claude's code), the card opens in
// place across both columns for it, and closes again once it's connected.

/** The card. Open, it spans both columns from 640 px, so its sign-in steps have room. */
export const cardClasses = (open: boolean) => `rounded-xl border border-border bg-card ${open ? "sm:col-span-2" : ""}`;

const FACE = "flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left";

/** The card's top line as a button or link: one click connects (or, when it can't, opens the card to say why). */
export const faceButton = (open: boolean) =>
  `${FACE} cursor-pointer transition-colors duration-150 hover:bg-hover focus-visible:outline-2 ` +
  `focus-visible:outline-offset-2 focus-visible:outline-primary ${open ? "rounded-t-[11px]" : "rounded-[11px]"}`;

/** The top line when there's nothing to open: connected, or partway through connecting. */
export const FACE_STATIC = `${FACE} outline-none`;

/** What's under the top line when the card is open, lined up with the name from 640 px. */
export const BODY = "px-3 pb-3 sm:pl-14";

/** The name, with an optional muted tag, and one line under it. */
export function FaceText({ name, sub, tag }: { name: string; sub: string; tag?: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium text-foreground">
        {name}
        {tag ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">{tag}</span> : null}
      </span>
      {/* One line, like the import's cards; the whole of it on hover ("@crafthq-demo · 3 repositories"). */}
      <span title={sub} className="block truncate text-xs text-muted-foreground">
        {sub}
      </span>
    </span>
  );
}

/**
 * connected · attention (needs something the card can't do) · busy (a request is out) · connect (one click connects) ·
 * none (partway through: the steps below say it all).
 */
export type CardStatus = "connected" | "attention" | "busy" | "connect" | "none";

interface CardStateProps {
  status: CardStatus;
  /** For "connect": "Connect", "Reconnect" or "Try again". */
  label?: string;
  /** For "connect": the click opens a page outside CraftHQ, so it carries ↗ (DESIGN.md §6.6). */
  external?: boolean;
  busyLabel?: string;
}

/** The state on the right of a card, announced politely when it changes. */
export function CardState({ status, label = "Connect", external = false, busyLabel = "Connecting…" }: CardStateProps) {
  return (
    <span aria-live="polite" className="flex flex-none items-center text-xs font-medium">
      {status === "connected" ? (
        <span className="inline-flex items-center gap-1.5 text-success-ink">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
          Connected
        </span>
      ) : status === "attention" ? (
        <span className="inline-flex items-center gap-1.5 text-warning-ink">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
          Needs attention
        </span>
      ) : status === "busy" ? (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <LoaderCircle size={12} strokeWidth={2} aria-hidden className="animate-spin motion-reduce:animate-none" />
          {busyLabel}
        </span>
      ) : status === "connect" ? (
        <span className="inline-flex items-center gap-0.5 text-primary-strong">
          {label}
          {external ? <ArrowUpRight size={12} strokeWidth={2} aria-hidden /> : null}
        </span>
      ) : null}
    </span>
  );
}
