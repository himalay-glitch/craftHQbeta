import { File as FileIcon, FileImage, FilePlay, FileText, PencilLine, X } from "lucide-react";
import { fileSize } from "./stage";
import chat from "./chat.module.css";

export interface Attachment {
  id: number;
  file: File;
  /** An object URL for images, so people can see which screenshot they attached. */
  preview?: string;
  /** Long text pasted into a message box, kept as a card instead of filling the box (as in Claude): its words and
   *  how many lines, so the card can say so and put it back as text. */
  pasted?: { text: string; lines: number };
}

function iconFor(type: string) {
  if (type.startsWith("image/")) return FileImage;
  if (type.startsWith("video/")) return FilePlay;
  if (type.startsWith("text/") || type === "application/pdf") return FileText;
  return FileIcon;
}

/** The files attached to a new story or a message: a chip each, with a preview for images and a Remove button. A
 *  pasted text says how many lines it has and, given `onEdit`, can go back into the box as text. */
export function AttachedFiles({ files, onRemove, onEdit }: { files: Attachment[]; onRemove: (id: number) => void; onEdit?: (id: number) => void }) {
  if (files.length === 0) return null;
  return (
    <ul aria-label="Attached files" className="m-0 flex list-none flex-wrap gap-2 p-0">
      {files.map(({ id, file, preview, pasted }) => {
        const Icon = iconFor(file.type);
        return (
          <li
            key={id}
            className={`flex h-11 max-w-[280px] items-center gap-2 rounded-[8px] border border-[var(--card-line)] bg-white py-1 pr-1 pl-1.5 ${chat.appear}`}
          >
            {preview ? (
              <img src={preview} alt="" width={32} height={32} className="size-8 flex-none rounded-[4px] object-cover" />
            ) : (
              <span className="flex size-8 flex-none items-center justify-center rounded-[4px] bg-[var(--av-bg)] text-[var(--tx2)]">
                <Icon aria-hidden="true" size={16} strokeWidth={1.75} />
              </span>
            )}
            <span className="min-w-0">
              {/* A pasted text is named by its first line, so you can tell which paste it is. */}
              <span className="block truncate text-xs font-medium text-[var(--tx)]" title={pasted ? undefined : file.name}>
                {pasted ? (pasted.text.split(/\r?\n/).find((l) => l.trim())?.trim() ?? "Pasted text") : file.name}
              </span>
              <span className="block text-xs text-[var(--tx2)] tabular-nums">
                {pasted ? `Pasted text · ${pasted.lines.toLocaleString()} lines · ${fileSize(file.size)}` : fileSize(file.size)}
              </span>
            </span>
            {pasted && onEdit && (
              <button
                type="button"
                aria-label="Edit as text"
                title="Edit as text"
                onClick={() => onEdit(id)}
                className="inline-flex size-7 flex-none items-center justify-center rounded-full text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/5 hover:text-[var(--tx)]"
              >
                <PencilLine aria-hidden="true" size={14} strokeWidth={1.75} />
              </button>
            )}
            <button
              type="button"
              aria-label={`Remove ${file.name}`}
              onClick={() => onRemove(id)}
              className="inline-flex size-7 flex-none items-center justify-center rounded-full text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/5 hover:text-[var(--tx)]"
            >
              <X aria-hidden="true" size={14} strokeWidth={1.75} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
