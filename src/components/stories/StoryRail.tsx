import type { ReactNode } from "react";
import { Check, CircleAlert, CircleCheck, CircleDashed, File as FileIcon, FileImage, FilePlay, LoaderCircle } from "lucide-react";
import type { StoryStatus } from "@/types/dashboard";
import type { Author, FileRef, StoryFacts } from "@/types/stories";
import { BTN_SECONDARY } from "@/components/dashboard/classes";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { COLUMNS } from "./stage";

interface StoryRailProps {
  status: StoryStatus;
  /** Whose turn it is, in words: "Your turn", "Waiting on rtdp", "With the agent". */
  turn: string;
  facts: StoryFacts;
  owner?: Author;
  updated?: string;
  files: FileRef[];
  /** Buttons whose service isn't connected yet say so in a toast. */
  onSoon: (message: string) => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-[var(--line)] py-5 first:pt-1 last:border-b-0">
      <h2 className="m-0 text-[12px] leading-4 font-medium text-[var(--tx2)]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const SMALL_BTN = `${BTN_SECONDARY} h-7 px-3 text-[13px]`;

/** The story's facts beside the conversation: where it is, the preview, the proof, details and every file. */
export function StoryRail({ status, turn, facts, owner, updated, files, onSoon }: StoryRailProps) {
  const current = status === "cancelled" ? -1 : COLUMNS.findIndex((c) => c.statuses.includes(status));
  const finished = status === "done";

  return (
    <div>
      <Section title="Where it is">
        {status === "cancelled" && <p className="m-0 mb-3 text-[14px] leading-5 text-[var(--tx2)]">Cancelled. Nothing more will happen.</p>}
        <ol className="m-0 flex list-none flex-col p-0">
          {COLUMNS.map((col, i) => {
            const done = i < current || (finished && i === current);
            const now = i === current && !finished;
            return (
              <li key={col.key} className="relative flex gap-3 pb-3 last:pb-0">
                {/* The line joining the steps. */}
                {i < COLUMNS.length - 1 && (
                  <span aria-hidden="true" className={`absolute top-5 bottom-0 left-[9px] w-px ${done ? "bg-[var(--green)]" : "bg-[var(--line)]"}`} />
                )}
                <span className="relative flex size-5 flex-none items-center justify-center rounded-full bg-white">
                  {done ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-[var(--green)] text-white">
                      <Check aria-hidden="true" size={12} strokeWidth={2.5} />
                    </span>
                  ) : now ? (
                    <span className="size-5 rounded-full border-[5px] border-[var(--cta)] bg-white" />
                  ) : (
                    <span className="size-3.5 rounded-full border-[1.5px] border-[var(--ctl)]" />
                  )}
                </span>
                <div className="min-w-0 pt-px">
                  <p className={`m-0 text-[14px] leading-5 ${now ? "font-semibold text-[var(--tx)]" : done ? "text-[var(--tx)]" : "text-[var(--tx2)]"}`}>
                    {col.label}
                    <span className="sr-only">{done ? ", done" : now ? ", now" : ""}</span>
                  </p>
                  {now && <p className="m-0 mt-0.5 text-[13px] leading-[18px] text-[var(--tx2)]">{turn}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section title="Preview">
        <p className="m-0 flex items-center gap-2 text-[14px] leading-5">
          {facts.preview.state === "ready" ? (
            <CircleCheck aria-hidden="true" size={16} strokeWidth={1.75} className="text-[var(--green)]" />
          ) : facts.preview.state === "failed" ? (
            <CircleAlert aria-hidden="true" size={16} strokeWidth={1.75} className="text-[var(--red)]" />
          ) : (
            <CircleDashed aria-hidden="true" size={16} strokeWidth={1.75} className="text-[var(--tx2)]" />
          )}
          {facts.preview.line}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={facts.preview.state === "not-built"}
            onClick={() => onSoon("Previews open in a new tab once the build service is connected.")}
            className={SMALL_BTN}
          >
            {facts.preview.state === "failed" ? "Start again" : "Open web"}
          </button>
          <button
            type="button"
            disabled={facts.preview.state !== "ready"}
            onClick={() => onSoon("Android previews open once the build service is connected.")}
            className={SMALL_BTN}
          >
            Android
          </button>
        </div>
      </Section>

      <Section title="Proof">
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[14px] leading-5">
          <li className="flex items-center gap-2">
            {facts.checks.state === "passed" ? (
              <CircleCheck aria-hidden="true" size={16} strokeWidth={1.75} className="text-[var(--green)]" />
            ) : facts.checks.state === "running" ? (
              <LoaderCircle aria-hidden="true" size={16} strokeWidth={1.75} className="animate-spin text-[var(--green)] motion-reduce:animate-none" />
            ) : (
              <CircleDashed aria-hidden="true" size={16} strokeWidth={1.75} className="text-[var(--tx2)]" />
            )}
            {facts.checks.line}
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>
              Plan <span className="text-[var(--tx2)]">· {facts.plan}</span>
            </span>
            {facts.plan === "Written" && (
              <button type="button" onClick={() => onSoon("The plan opens here once it comes from the CraftHQ API.")} className="text-[13px] font-medium text-[var(--cta)] hover:underline">
                Open
              </button>
            )}
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>
              Pull request <span className="text-[var(--tx2)]">· {facts.pullRequest.line}</span>
            </span>
          </li>
        </ul>
        {status === "in_review" && facts.pullRequest.state === "none" && (
          <button type="button" onClick={() => onSoon("Pull requests open on GitHub once GitHub is connected.")} className={`${SMALL_BTN} mt-3`}>
            Create pull request
          </button>
        )}
      </Section>

      <Section title="Details">
        <dl className="m-0 grid grid-cols-[96px_minmax(0,1fr)] gap-y-2.5 text-[14px] leading-5">
          <dt className="text-[var(--tx2)]">Owner</dt>
          <dd className="m-0 flex min-w-0 items-center gap-2">
            {owner?.kind === "person" ? (
              <>
                <PersonAvatar initials={owner.initials} />
                <span className="truncate">{owner.name}</span>
              </>
            ) : (
              <span className="text-[var(--tx2)]">No owner</span>
            )}
          </dd>
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
      </Section>

      <Section title={files.length ? `Files · ${files.length}` : "Files"}>
        {files.length === 0 ? (
          <p className="m-0 text-[14px] leading-5 text-[var(--tx2)]">Files shared in the conversation show here.</p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
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
      </Section>
    </div>
  );
}
