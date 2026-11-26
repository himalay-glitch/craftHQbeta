import { useState } from "react";
import { File as FileIcon, FileImage, FilePlay } from "lucide-react";
import type { FileRef } from "@/types/stories";
import { RAISED } from "./StoryActivity";

// Files in the Work tab (Shubham, 26 Nov: the old story page's Files, kept small): what was attached in the chat after
// the story was written, one line each; a file opens the message it came with.

const ROW =
  "group relative flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors duration-[120ms] hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cta)] pointer-coarse:min-h-11";
const TILE = `flex size-8 flex-none items-center justify-center rounded-[10px] ${RAISED}`;
const SHOWN = 3;

export interface ChatFile {
  key: string;
  /** The message it was attached to. */
  entryId: string;
  file: FileRef;
}

export function FilesSection({ files, onOpen }: { files: ChatFile[]; onOpen: (entryId: string) => void }) {
  const [all, setAll] = useState(false);
  if (files.length === 0) return null;
  const shown = all ? files : files.slice(0, SHOWN);
  return (
    <div role="group" aria-label="Files">
      <h3 className="m-0 flex h-6 items-center gap-1.5 text-xs font-medium text-[var(--tx2)]">
        Files
        {files.length > 1 && <span className="tabular-nums">· {files.length}</span>}
      </h3>
      <div className="-mx-2 mt-0.5 flex flex-col">
        {shown.map(({ key, entryId, file }) => {
          const Icon = file.kind === "image" ? FileImage : file.kind === "video" ? FilePlay : FileIcon;
          return (
            <button key={key} type="button" onClick={() => onOpen(entryId)} title={`${file.name} · see it in the chat`} className={ROW}>
              {file.preview ? (
                <img src={file.preview} alt="" width={32} height={32} className="size-8 flex-none rounded-[10px] object-cover" />
              ) : (
                <span aria-hidden="true" className={TILE}>
                  <Icon size={16} strokeWidth={1.75} />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--tx)]">{file.name}</span>
            </button>
          );
        })}
      </div>
      {files.length > SHOWN && (
        <button
          type="button"
          onClick={() => setAll((a) => !a)}
          className="mt-1 inline-flex min-h-6 items-center rounded-[4px] text-xs font-medium text-[var(--tx2)] underline decoration-black/20 underline-offset-2 hover:text-[var(--tx)] pointer-coarse:min-h-9"
        >
          {all ? "Show fewer" : `Show all ${files.length}`}
        </button>
      )}
    </div>
  );
}
