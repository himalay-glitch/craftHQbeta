import { File as FileIcon, FileImage, FilePlay, FileText, X } from "lucide-react";
import { fileSize } from "./stage";

export interface Attachment {
  id: number;
  file: File;
  /** An object URL for images, so people can see which screenshot they attached. */
  preview?: string;
}

function iconFor(type: string) {
  if (type.startsWith("image/")) return FileImage;
  if (type.startsWith("video/")) return FilePlay;
  if (type.startsWith("text/") || type === "application/pdf") return FileText;
  return FileIcon;
}

/** The files attached to a new story: a chip each, with a preview for images and a Remove button. */
export function AttachedFiles({ files, onRemove }: { files: Attachment[]; onRemove: (id: number) => void }) {
  if (files.length === 0) return null;
  return (
    <ul aria-label="Attached files" className="m-0 flex list-none flex-wrap gap-2 p-0">
      {files.map(({ id, file, preview }) => {
        const Icon = iconFor(file.type);
        return (
          <li
            key={id}
            className="flex h-11 max-w-[280px] items-center gap-2 rounded-[8px] border border-[var(--card-line)] bg-white py-1 pr-1 pl-1.5"
          >
            {preview ? (
              <img src={preview} alt="" width={32} height={32} className="size-8 flex-none rounded-[4px] object-cover" />
            ) : (
              <span className="flex size-8 flex-none items-center justify-center rounded-[4px] bg-[var(--av-bg)] text-[var(--tx2)]">
                <Icon aria-hidden="true" size={16} strokeWidth={1.5} />
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-[13px] leading-4 text-[var(--tx)]" title={file.name}>
                {file.name}
              </span>
              <span className="block text-[12px] leading-4 text-[var(--tx2)]">{fileSize(file.size)}</span>
            </span>
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
