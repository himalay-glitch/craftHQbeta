import { useEffect, useState, type SyntheticEvent } from "react";
import { ChevronDown } from "lucide-react";
import type { Person } from "@/types/dashboard";
import { BTN_PRIMARY, BTN_SECONDARY } from "./classes";
import { SidePanel } from "./SidePanel";

interface NewStoryPanelProps {
  people: Person[];
  viewerId: string;
  isWide: boolean;
  onClose: () => void;
  onCreate: (story: { title: string; why: string; detail: string; ownerId: string }) => void;
}

const LABEL = "block text-[13px] leading-[18px] font-medium text-[var(--tx)]";
const HINT = "mt-0.5 block text-[12px] leading-4 text-[var(--tx2)]";
const FIELD =
  "mt-1.5 block w-full rounded-[8px] border border-[var(--ctl)] bg-white px-3 text-[15px] leading-[22px] text-[var(--tx)] " +
  "transition-[border-color,box-shadow] duration-[120ms] hover:border-[var(--ctl-h)] focus:border-[var(--cta)] " +
  "focus:shadow-[0_0_0_3px_rgb(47_111_237/0.16)] focus:outline-none";

/** The prototype's New story form: title, why, detail, owner and files. Only the title is required. */
export function NewStoryPanel({ people, viewerId, isWide, onClose, onCreate }: NewStoryPanelProps) {
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [detail, setDetail] = useState("");
  const [ownerId, setOwnerId] = useState(viewerId);
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    document.getElementById("new-story-name")?.focus();
  }, []);

  const submit = (e?: SyntheticEvent) => {
    e?.preventDefault();
    if (title.trim()) onCreate({ title: title.trim(), why: why.trim(), detail: detail.trim(), ownerId });
  };

  return (
    <SidePanel
      title="New story"
      titleId="new-story-title"
      isWide={isWide}
      onClose={onClose}
      footer={
        <span className="flex items-center justify-between gap-3">
          <span className="text-[12px] leading-4 text-[var(--tx2)]">⌘/Ctrl + Enter to add</span>
          <span className="flex items-center gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" form="new-story-form" className={BTN_PRIMARY} disabled={!title.trim()}>
              Add story
            </button>
          </span>
        </span>
      }
    >
      <form
        id="new-story-form"
        onSubmit={submit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        className="mt-5 flex flex-col gap-5"
      >
        <div>
          <label htmlFor="new-story-name" className={LABEL}>
            Title
          </label>
          <input
            id="new-story-name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What should be built?"
            autoComplete="off"
            className={`${FIELD} h-10`}
          />
        </div>
        <div>
          <label htmlFor="new-story-why" className={LABEL}>
            Why <span className="font-normal text-[var(--tx2)]">(optional)</span>
          </label>
          <span className={HINT}>One line, shown under the title in the list.</span>
          <input
            id="new-story-why"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="The one-line why"
            autoComplete="off"
            className={`${FIELD} h-10`}
          />
        </div>
        <div>
          <label htmlFor="new-story-detail" className={LABEL}>
            Detail <span className="font-normal text-[var(--tx2)]">(optional)</span>
          </label>
          <span className={HINT}>Rules, edge cases, links. The agent drafts the spec from this.</span>
          <textarea
            id="new-story-detail"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={5}
            placeholder="Anything the agent should know"
            className={`${FIELD} min-h-32 resize-y py-2`}
          />
        </div>
        <div>
          <label htmlFor="new-story-owner" className={LABEL}>
            Owner
          </label>
          <span className="relative block">
            <select
              id="new-story-owner"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className={`${FIELD} h-10 cursor-pointer appearance-none pr-9`}
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === viewerId ? `Me (${p.name})` : p.name}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              size={16}
              strokeWidth={1.5}
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[var(--tx2)]"
            />
          </span>
        </div>
        <div>
          <span className={LABEL}>
            Files <span className="font-normal text-[var(--tx2)]">(optional)</span>
          </span>
          <label
            htmlFor="new-story-files"
            className="mt-1.5 block cursor-pointer rounded-[8px] border border-dashed border-[var(--ctl)] px-4 py-5 text-center text-[14px] leading-5 text-[var(--tx2)] transition-colors duration-[120ms] hover:border-[var(--ctl-h)] hover:bg-[var(--ctl-bg-h)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--cta)]"
          >
            <span className="font-medium text-[var(--tx)]">Drop screens here</span> or click to choose
            <span className="mt-0.5 block text-[12px] leading-4">
              {files.length ? files.join(", ") : "Screenshots, designs, debug files"}
            </span>
            <input
              id="new-story-files"
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).map((f) => f.name))}
            />
          </label>
        </div>
      </form>
    </SidePanel>
  );
}
