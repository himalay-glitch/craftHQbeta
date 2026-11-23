import { useId, type ReactNode } from "react";
import { ChevronRight, File as FileIcon, FileImage, FilePlay } from "lucide-react";
import type { NeedKind } from "@/types/dashboard";
import type { ActivityItem, FileRef, PreviewActions, StoryFacts } from "@/types/stories";
import { NowArea, Outputs } from "./StoryActivity";

interface StoryRailProps {
  /** Desktop: headed "Activity". On phones it sits in a disclosure that already says so. */
  withHeader?: boolean;
  activity: ActivityItem[];
  /** What the viewer has to decide now, if anything. */
  yours?: NeedKind;
  /** The chat's decision already offers Restart for a stuck story. */
  restartInChat: boolean;
  /** Bumped by Undo, so the restored card appears without motion. */
  epoch: number;
  preview: PreviewActions;
  facts: StoryFacts;
  /** Who owns it, and the way to change that (an OwnerPicker). */
  owner: ReactNode;
  updated?: string;
  files: FileRef[];
  /** Buttons whose service isn't connected yet say so in a toast. */
  onSoon: (message: string) => void;
}

/**
 * Beside the conversation, kept calm. On desktop it sits on the grey canvas with no box, so the white chat sheet
 * is the only bright surface. On top, one small card with what's running now; under it, the outputs to check, in
 * groups. When something finishes it goes down from one to the other. The story's details fold away at the foot.
 */
export function StoryRail({ withHeader, activity, yours, restartInChat, epoch, preview, facts, owner, updated, files, onSoon }: StoryRailProps) {
  const headingId = useId();
  const activityProps = { items: activity, yours, restartInChat, epoch, preview, onSoon };

  return (
    <section aria-labelledby={withHeader ? headingId : undefined} aria-label={withHeader ? undefined : "Activity"} className="flex min-h-full flex-col pt-1 pb-3 md:pt-0 md:pb-0">
      {/* Desktop: as tall as the chat sheet's header row beside it, so the two tops line up. */}
      {withHeader && (
        <h2 id={headingId} className="m-0 flex h-14 flex-none items-center text-sm font-medium text-[var(--tx)]">
          Activity
        </h2>
      )}
      {/* One group under the other, like a sidebar: what's running now, then the outputs it finished into. */}
      <NowArea {...activityProps} />
      <div className="mt-6">
        <Outputs {...activityProps} />
      </div>

      {/* The story's details sit at the foot of the column, under a hairline. */}
      <div className="mt-auto pt-6">
      <details className="group border-t border-[var(--line)] pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] leading-4 font-medium text-[var(--tx2)] hover:text-[var(--tx)] [&::-webkit-details-marker]:hidden">
          <ChevronRight aria-hidden="true" size={14} strokeWidth={1.75} className="transition-transform duration-[120ms] group-open:rotate-90" />
          Story details{files.length > 0 && ` · ${files.length} ${files.length === 1 ? "file" : "files"}`}
        </summary>
        <dl className="m-0 mt-3 grid grid-cols-[96px_minmax(0,1fr)] gap-y-2.5 text-[14px] leading-5">
          <dt className="text-[var(--tx2)]">Owner</dt>
          <dd className="m-0 flex min-w-0 items-center">{owner}</dd>
          <dt className="text-[var(--tx2)]">From</dt>
          <dd className="m-0">{facts.source}</dd>
          <dt className="text-[var(--tx2)]">Repository</dt>
          <dd className="m-0 truncate">{facts.repository}</dd>
          <dt className="text-[var(--tx2)]">Created</dt>
          <dd className="m-0">{facts.created}</dd>
          {updated && (
            <>
              <dt className="text-[var(--tx2)]">Updated</dt>
              <dd className="m-0">{updated}</dd>
            </>
          )}
        </dl>
        {files.length > 0 && (
          <ul className="m-0 mt-4 grid list-none grid-cols-2 gap-2 p-0">
            {files.map((f, i) => {
              const Icon = f.kind === "image" ? FileImage : f.kind === "video" ? FilePlay : FileIcon;
              return (
                <li key={`${f.name}-${i}`} className="overflow-hidden rounded-[8px] border border-[var(--card-line)]">
                  {f.preview ? (
                    <img src={f.preview} alt="" width={140} height={80} className="block h-20 w-full object-cover" />
                  ) : (
                    <span className="flex h-20 items-center justify-center bg-[var(--ctl-bg-on)] text-[var(--tx2)]">
                      <Icon aria-hidden="true" size={20} strokeWidth={1.5} />
                    </span>
                  )}
                  <span className="block truncate px-2 py-1.5 text-[12px] leading-4">{f.name}</span>
                </li>
              );
            })}
          </ul>
        )}
      </details>
      </div>
    </section>
  );
}
