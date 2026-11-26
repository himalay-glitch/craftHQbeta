import { useId } from "react";
import type { NeedKind } from "@/types/dashboard";
import type { ActivityItem, PreviewActions } from "@/types/stories";
import { NowArea, Outputs } from "./StoryActivity";
import type { ColumnKey } from "./stage";

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
  /** Buttons whose service isn't connected yet say so in a toast. */
  onSoon: (message: string) => void;
  /** The story's column: what that stage needs comes first in the outputs. */
  stage?: ColumnKey;
}

/**
 * Beside the conversation, kept calm. On desktop it sits on the grey canvas with no box, so the white chat sheet
 * is the only bright surface. On top, one small card with what's running now; under it, the outputs to check, in
 * groups. When something finishes it goes down from one to the other. No story details at the foot: Shubham took
 * them out (23 Nov); the owner is changed on the board, and attached files show in the chat.
 */
export function StoryRail({ withHeader, activity, yours, restartInChat, epoch, preview, onSoon, stage }: StoryRailProps) {
  const headingId = useId();
  const activityProps = { items: activity, yours, restartInChat, epoch, preview, onSoon, stage };

  return (
    <section aria-labelledby={withHeader ? headingId : undefined} aria-label={withHeader ? undefined : "Work"} className="flex flex-col gap-6 pt-1 pb-3 md:pt-0 md:pb-0">
      {/* Desktop: as tall as the chat sheet's header row beside it, so the two tops line up. */}
      {withHeader && (
        <h2 id={headingId} className="m-0 flex h-14 flex-none items-center text-sm font-medium text-[var(--tx)]">
          Activity
        </h2>
      )}
      {/* One group under the other, like a sidebar: what's running now, then the outputs it finished into. */}
      <NowArea {...activityProps} />
      <Outputs {...activityProps} />
    </section>
  );
}
