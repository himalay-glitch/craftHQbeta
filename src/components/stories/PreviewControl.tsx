import type { KeyboardEvent } from "react";
import { ArrowUpRight, LoaderCircle, Play, Square } from "lucide-react";
import type { ActivityItem, Device, PreviewActions } from "@/types/stories";
import { BTN_SECONDARY } from "@/components/dashboard/classes";
import { Tip } from "@/components/dashboard/Tip";

// The preview's controls. They hold no state: the preview machine (off, starting, running) and its device live
// on the activity item in the story page, so they survive the card handing over to the next job.

/** Every button in the activity column is secondary: the chat's decision owns the page's one primary. */
export const SMALL_BTN = `${BTN_SECONDARY} h-7 px-3 text-sm pointer-coarse:h-11`;

/** A round 28 px icon button in the same outline style (44 px on touch). */
const ICON_SMALL_BTN =
  "inline-flex size-7 flex-none items-center justify-center rounded-full border border-[var(--ctl)] bg-white text-[var(--tx)] transition-colors duration-[120ms] " +
  "hover:border-[var(--ctl-h)] hover:bg-[var(--ctl-bg-h)] active:translate-y-px pointer-coarse:size-11";

const OPEN_SOON = "Previews open in a new tab once the build service is connected.";

const DEVICES: { value: Device; label: string }[] = [
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile" },
];

/** Web or Mobile, picked before the preview starts. Arrow keys move between the two. `compact`: 24 px, for a row. */
export function DeviceSwitch({ device, onChange, compact }: { device: Device; onChange: (d: Device) => void; compact?: boolean }) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const group = e.currentTarget;
    onChange(device === "web" ? "mobile" : "web");
    requestAnimationFrame(() => group.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus());
  };
  return (
    // On touch screens each choice is at least 44 px square (DESIGN.md §3.3): the group drops its inset there, so it's
    // 44 px tall like the buttons beside it and a row keeps its height whichever buttons it shows.
    <div role="radiogroup" aria-label="Preview on" onKeyDown={onKeyDown} className={`ml-auto flex rounded-full bg-field p-0.5 pointer-coarse:h-11 pointer-coarse:p-0 ${compact ? "h-6" : "h-7"}`}>
      {DEVICES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={device === value}
          tabIndex={device === value ? 0 : -1}
          onClick={() => onChange(value)}
          className={`flex items-center justify-center rounded-full text-xs pointer-coarse:min-w-11 ${compact ? "px-2" : "px-2.5"} transition-[background-color,color,box-shadow] duration-[120ms] ${device === value ? "bg-white font-medium text-[var(--tx)] ring-1 ring-black/[0.06]" : "text-[var(--tx2)] hover:text-[var(--tx)]"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

interface PreviewButtonsProps {
  item: ActivityItem;
  failed?: boolean;
  preview: PreviewActions;
  onSoon: (message: string) => void;
}

/** The card's preview buttons: Start (or Start again), Cancel while it starts, Open and Stop while it runs. */
export function PreviewButtons({ item, failed, preview, onSoon }: PreviewButtonsProps) {
  const where = item.device ?? "web";
  if (item.run === "on") {
    return (
      <>
        <button type="button" aria-label={`Open preview on ${where}, opens in a new tab`} onClick={() => onSoon(OPEN_SOON)} className={SMALL_BTN}>
          Open preview
          <ArrowUpRight aria-hidden="true" size={14} strokeWidth={2} />
        </button>
        <button type="button" aria-label={`Stop preview on ${where}`} onClick={() => preview.stop(item.id)} className={SMALL_BTN}>
          <Square aria-hidden="true" size={12} strokeWidth={2} />
          Stop preview
        </button>
        <p className="m-0 w-full text-xs text-[var(--tx2)]">It stops by itself after 30 minutes unused.</p>
      </>
    );
  }
  if (item.run === "starting") {
    return (
      <button type="button" aria-label={`Cancel preview on ${where}`} onClick={() => preview.stop(item.id)} className={SMALL_BTN}>
        Cancel
      </button>
    );
  }
  return (
    <button type="button" onClick={() => preview.start(item.id)} className={SMALL_BTN}>
      <Play aria-hidden="true" size={12} strokeWidth={2} />
      {failed ? "Start again" : "Start preview"}
    </button>
  );
}

/** One line for a preview that's running while the card shows something else (the card's footer, or the strip
 *  under the closed phone disclosure), so Stop is always on a sharp surface. `compact` (the card's footer, 255 px)
 *  makes Open an icon with a tooltip, so the words still fit. */
export function PreviewRow({ item, preview, onSoon, compact }: { item: ActivityItem; preview: PreviewActions; onSoon: (message: string) => void; compact?: boolean }) {
  const where = item.device ?? "web";
  if (item.run === "starting") {
    return (
      <div className="flex min-h-7 w-full items-center gap-2 text-sm">
        <LoaderCircle aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none animate-spin text-[var(--tx2)] [animation-duration:0.8s] motion-reduce:animate-none" />
        <span className="min-w-0 flex-1 truncate">Starting the preview on {where}…</span>
        <button type="button" onClick={() => preview.stop(item.id)} className={SMALL_BTN}>
          Cancel
        </button>
      </div>
    );
  }
  const open = (
    <button
      type="button"
      aria-label={`Open preview on ${where}, opens in a new tab`}
      onClick={() => onSoon(OPEN_SOON)}
      className={compact ? ICON_SMALL_BTN : SMALL_BTN}
    >
      {!compact && "Open"}
      <ArrowUpRight aria-hidden="true" size={14} strokeWidth={2} />
    </button>
  );
  return (
    <div className="flex min-h-7 w-full items-center gap-2 text-sm">
      <span aria-hidden="true" className="size-2 flex-none rounded-full bg-[var(--green)]" />
      <span className="min-w-0 flex-1 truncate">
        Preview running<span className="text-[var(--tx2)]"> on {where}</span>
      </span>
      {compact ? <Tip label="Open preview">{open}</Tip> : open}
      <button type="button" aria-label={`Stop preview on ${where}`} onClick={() => preview.stop(item.id)} className={SMALL_BTN}>
        <Square aria-hidden="true" size={12} strokeWidth={2} />
        Stop
      </button>
    </div>
  );
}

/**
 * The preview's controls on one line, for its row in the outputs: Web or Mobile and a play button; Cancel while it
 * starts; Open and Stop while it runs (Stop always shows: the machine costs server time).
 */
export function PreviewInline({ item, preview, onSoon }: { item: ActivityItem; preview: PreviewActions; onSoon: (message: string) => void }) {
  const where = item.device ?? "web";
  if (item.run === "on") {
    return (
      <span className="relative flex flex-none items-center gap-1.5">
        <Tip label="Open preview">
          <button type="button" aria-label={`Open preview on ${where}, opens in a new tab`} onClick={() => onSoon(OPEN_SOON)} className={ICON_SMALL_BTN}>
            <ArrowUpRight aria-hidden="true" size={14} strokeWidth={2} />
          </button>
        </Tip>
        <Tip label="Stop preview · it stops by itself after 30 minutes unused">
          <button type="button" aria-label={`Stop preview on ${where}`} onClick={() => preview.stop(item.id)} className={ICON_SMALL_BTN}>
            <Square aria-hidden="true" size={12} strokeWidth={2} />
          </button>
        </Tip>
      </span>
    );
  }
  if (item.run === "starting") {
    return (
      <span className="relative flex flex-none items-center gap-1.5">
        <LoaderCircle aria-hidden="true" size={14} strokeWidth={1.75} className="animate-spin text-[var(--tx2)] [animation-duration:0.8s] motion-reduce:animate-none" />
        <button
          type="button"
          aria-label={`Cancel preview on ${where}`}
          onClick={() => preview.stop(item.id)}
          className="h-7 rounded-full px-2 text-xs text-[var(--tx2)] hover:bg-black/[0.05] hover:text-[var(--tx)] pointer-coarse:h-11 pointer-coarse:px-3"
        >
          Cancel
        </button>
      </span>
    );
  }
  return (
    <span className="relative flex flex-none items-center gap-1.5">
      <DeviceSwitch compact device={where} onChange={(d) => preview.device(item.id, d)} />
      <Tip label={`Start preview on ${where}`}>
        <button type="button" aria-label={`Start preview on ${where}`} onClick={() => preview.start(item.id)} className={ICON_SMALL_BTN}>
          <Play aria-hidden="true" size={12} strokeWidth={2} className="translate-x-px" />
        </button>
      </Tip>
    </span>
  );
}
