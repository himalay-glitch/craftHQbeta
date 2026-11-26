import { CircleCheck, ListFilter } from "lucide-react";
import { BTN_SECONDARY } from "./classes";

type QueueMessageProps =
  | { kind: "clear"; mine: boolean }
  | { kind: "filtered"; onClear: () => void }
  | { kind: "error"; onRetry: () => void };

/** What the table area shows when there's nothing to list: nothing waiting, no matches, or a load error. */
export function QueueMessage(props: QueueMessageProps) {
  return (
    <div className="flex flex-col items-center rounded-[12px] border border-[var(--card-line)] bg-white px-4 py-16 text-center">
      {props.kind === "clear" && (
        <>
          <CircleCheck aria-hidden="true" size={20} strokeWidth={1.5} className="text-[var(--green)]" />
          <p className="mt-3 text-[15px] leading-[22px] font-medium">Nothing waiting{props.mine ? " on you" : ""}.</p>
        </>
      )}
      {props.kind === "filtered" && (
        <>
          <ListFilter aria-hidden="true" size={20} strokeWidth={1.5} className="text-[var(--tx2)]" />
          <p className="mt-3 text-[15px] leading-[22px] font-medium">No stories match this filter</p>
          <button type="button" onClick={props.onClear} className={`${BTN_SECONDARY} mt-4`}>
            Show everything
          </button>
        </>
      )}
      {props.kind === "error" && (
        <>
          <p className="text-[15px] leading-[22px] font-medium">Couldn&rsquo;t load your stories</p>
          <p className="mt-1 text-[15px] leading-[22px] text-[var(--tx2)]">Check your connection and try again.</p>
          <button type="button" onClick={props.onRetry} className={`${BTN_SECONDARY} mt-4`}>
            Try again
          </button>
        </>
      )}
    </div>
  );
}
