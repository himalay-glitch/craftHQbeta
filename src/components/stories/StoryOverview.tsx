import type { ReactNode } from "react";
import { File as FileIcon, FileImage, FilePlay } from "lucide-react";
import { blocks, byline, Prose, type StoryBrief } from "./StoryDetails";

// The Story tab on the right (Shubham, 26 Nov): what the story is. Why it matters, the start of what was written (the
// whole of it opens in Story details, never a faded cut), the files that came with it, and who wrote it. What's been
// decided sits under the status, in the Status tab.

const SECTION = "m-0 mb-1 text-xs font-medium text-[var(--tx2)]";
const LINK =
  "inline-flex min-h-6 items-center self-start rounded-[4px] text-sm font-medium text-[var(--tx)] underline decoration-black/20 underline-offset-2 transition-colors duration-[120ms] hover:decoration-current pointer-coarse:min-h-9";

interface StoryOverviewProps {
  brief: StoryBrief;
  /** Opens Story details, the whole story in a reading view. */
  onReadAll: () => void;
  /** A file: the chat goes to the message it came with. */
  onSeeFiles: () => void;
  /** Anything to show under the story (the Decisions sit in the Status tab now). */
  decisions?: ReactNode;
}

export function StoryOverview({ brief, onReadAll, onSeeFiles, decisions }: StoryOverviewProps) {
  // The written story: the detail, or a hand-written first message when nothing was kept apart.
  const ask = brief.ask?.every((s) => typeof s === "string") ? (brief.ask as string[]).join("") : undefined;
  const body = brief.detail ?? ask;
  const parts = body ? blocks(body) : [];
  // Its first paragraph here, in full; anything after it opens in Story details.
  const first = parts.find((b) => b.kind === "p");
  const firstText = first?.kind === "p" ? first.lines.join("\n") : undefined;
  const more = parts.length > 1 || Boolean(brief.ask && !ask);
  const words = [brief.why, body].filter(Boolean).join(" ").trim().split(/\s+/).filter(Boolean).length;
  const line = [byline(brief), brief.source, brief.repository && `Repository ${brief.repository}`].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="The story" className="flex flex-col gap-4">
        {brief.why && (
          <div>
            <h3 className={SECTION}>Why it matters</h3>
            <Prose text={brief.why} compact />
          </div>
        )}
        {firstText ? (
          <div className="flex flex-col gap-1.5">
            <h3 className={SECTION}>{brief.why ? "Details" : "The story"}</h3>
            <Prose text={firstText} compact />
            {more && (
              <button type="button" aria-haspopup="dialog" onClick={onReadAll} className={LINK}>
                Read the whole story · {words.toLocaleString("en-US")} words
              </button>
            )}
          </div>
        ) : (
          !brief.why && <p className="m-0 text-sm text-[var(--tx2)]">Only the title was written. The rest is in the chat.</p>
        )}
        {brief.files && brief.files.length > 0 && (
          <div>
            <h3 className={SECTION}>Files · {brief.files.length}</h3>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {brief.files.map((f, i) => {
                const Icon = f.kind === "image" ? FileImage : f.kind === "video" ? FilePlay : FileIcon;
                return (
                  <li key={`${f.name}-${i}`}>
                    <button type="button" onClick={onSeeFiles} title="See it in the chat" className="flex w-full min-w-0 items-center gap-2 rounded-md py-0.5 text-left text-sm text-[var(--tx)] hover:underline">
                      <Icon aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
                      <span className="truncate">{f.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {line && <p className="m-0 text-xs text-pretty text-[var(--tx2)]">{line}</p>}
      </section>
      {decisions && <div className="border-t border-[var(--line)] pt-4">{decisions}</div>}
    </div>
  );
}
