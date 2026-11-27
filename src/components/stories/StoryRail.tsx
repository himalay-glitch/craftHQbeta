import type { NeedKind, StoryStatus } from "@/types/dashboard";
import type { ActivityItem, PreviewActions } from "@/types/stories";
import chat from "./chat.module.css";
import { Outputs } from "./StoryActivity";
import { FilesSection, type ChatFile } from "./StoryMore";

interface StoryRailProps {
  activity: ActivityItem[];
  /** Where the story is: an empty part says whether its thing can still come, and when. */
  status: StoryStatus;
  /** What the viewer has to decide now, if anything. */
  yours?: NeedKind;
  /** The chat's decision already offers Restart for a stuck story. */
  restartInChat: boolean;
  preview: PreviewActions;
  /** Buttons whose service isn't connected yet say so in a toast. */
  onSoon: (message: string) => void;
  /** Attached in the chat after the story was written (the story's own files open from Story details). */
  files: ChatFile[];
  /** A file opens the message it came with. */
  onOpenFile: (entryId: string) => void;
  /** From 1024 px: each part a white box of its own that folds. Otherwise the parts of the Output tab. */
  boxed?: boolean;
}

/**
 * The Output (Shubham, 27 Nov: not "Work", and section-wise): what the story made, a part each in one fixed order:
 * Pages (the specification and engineering pages), Preview, Code, then Files. What's under way shows in its own part.
 * Pages, Preview and Code are always there, empty or not (Shubham, 27 Nov: "a section that's already defined", so
 * nobody guesses what will come); Files shows once something was attached. From 1024 px each part is a white box of its
 * own with a fold icon (Shubham, 27 Nov); inside the Output tab below that, a hairline parts each from the next.
 */
export function StoryRail({ activity, status, yours, restartInChat, preview, onSoon, files, onOpenFile, boxed = false }: StoryRailProps) {
  const activityProps = { items: activity, yours, restartInChat, preview, onSoon };

  if (boxed) {
    return (
      // `tray` brings faded lines back on hover or focus. Each box is its own size container (PanelSection).
      <div id="story-box-output" role="group" aria-label="Output" data-tour="output" className={`${chat.tray} flex flex-none flex-col gap-3`}>
        <Outputs {...activityProps} status={status} boxed />
        <FilesSection files={files} onOpen={onOpenFile} boxed />
      </div>
    );
  }
  return (
    // A size container, so a preview's line lays out by the width it's given (the card, or the phone's fold), and
    // the `tray` that brings faded lines back on hover or focus.
    <section
      aria-label="Output"
      className={`${chat.tray} @container flex flex-col pt-1 pb-3 md:pt-0 md:pb-0 [&>*+*]:mt-4 [&>*+*]:border-t [&>*+*]:border-[var(--line)] [&>*+*]:pt-4`}
    >
      <Outputs {...activityProps} status={status} />
      <FilesSection files={files} onOpen={onOpenFile} />
    </section>
  );
}
