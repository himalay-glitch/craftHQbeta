import { useState, type ReactNode } from "react";
import { Check, CircleAlert, RotateCw } from "lucide-react";
import { BTN_SECONDARY, SKELETON } from "@/components/dashboard/classes";
import { ConnectAccountsModal } from "@/components/connect-accounts";
import type { Connection } from "@/types/connections";
import type { ProjectSettings } from "@/types/settings";
import { useConnections } from "./connections";
import { youIn, type SectionProps } from "./ProjectSections";
import { StateChip } from "./ServiceRow";
import { Group, Notice, PageHeader, Pill, When, usePageNow } from "./ui";

// Project settings › Claude: the live page's parts, in its order and its words, and only those (Shubham, 27 Nov:
// "just build what I gave to you"). Under "You, in this project": the summary (who you're connected as, as of when,
// the plan, whose subscription the work runs on), then Your Claude account, Credential in effect, Plan and
// Organisation, then "Connect your Claude account" with My workspace. The look is DESIGN.md's; the live copy's two
// dashes are a full stop and a colon.
//
// The one thing here that the screenshot doesn't show is the Connect Claude button, for when you aren't connected:
// the page says it "lets you connect your account from the browser", and without it that state would be a dead end.
//
// What's real: the connection, from the connections API (the Connect accounts modal's; one for every project for
// now). Sample until the API reports them: the plan, the organisation, the credential and the workspace.

/** What the tool says is in effect for the connected account, until the API reports it. */
const IN_EFFECT = { plan: "max", host: "claude.ai" };

/** Claude's own button (DESIGN.md §3.1): its orange, white text and no logo, only while connecting is the next step. */
const BTN_CLAUDE =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-brand-claude px-3.5 text-sm font-medium whitespace-nowrap " +
  "text-white transition-colors duration-[120ms] hover:bg-brand-claude-hover active:translate-y-px";

const TAG = "inline-flex h-5 flex-none items-center rounded-md bg-field px-1.5 font-mono text-xs whitespace-nowrap text-[var(--tx)]";

export function ClaudeSection({ project }: SectionProps) {
  const { loading, failed, get, reload, retry } = useConnections();
  const [modal, setModal] = useState(false);
  const now = usePageNow();
  const claude = get("claude");
  const status = claude?.status ?? "not_connected";
  const settled = !loading && !failed;
  const asleep = project.workspace.state === "asleep";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader scope={youIn(project)} title="Claude">
        Your work runs on your own Claude account, on the unmodified tool, signed in by you. CraftHQ never asks for, stores or
        passes on that login. This page reports what the tool says is in effect right now, and lets you connect your account
        from the browser.
      </PageHeader>

      <Summary claude={claude} loading={loading} failed={failed} onRetry={retry} project={project} asleep={asleep} now={now} />

      {settled && (
        <Group>
          <dl className="m-0 flex flex-col">
            <Reported
              term="Your Claude account"
              // Not connected, the summary above already says what that means.
              hint={status === "connected" ? "Your turns run on your own Claude subscription." : undefined}
            >
              <StateChip status={status} />
            </Reported>
            {status === "connected" && (
              <>
                <Reported
                  term="Credential in effect"
                  hint="What a turn started right now would authenticate with: read from the tool itself, in the same environment a turn gets."
                >
                  <Pill tone="positive" icon={Check}>
                    Your subscription
                  </Pill>
                  <span className={TAG}>{IN_EFFECT.host}</span>
                </Reported>
                <Reported term="Plan">
                  <span className="font-mono">{IN_EFFECT.plan}</span>
                </Reported>
                <Reported term="Organisation">
                  <span className="font-mono">{claude?.account}'s Organization</span>
                </Reported>
              </>
            )}
          </dl>
        </Group>
      )}

      <Group
        title="Connect your Claude account"
        description={`Claude signs in on your workspace for ${project.name}. Each project has its own workspace, so connect once per project.`}
      >
        <p className="m-0 text-sm font-medium text-[var(--tx)]">My workspace</p>
        <p className="m-0 mt-0.5 text-sm text-pretty text-[var(--tx)]">
          {asleep ? "Your workspace is asleep: it had nothing to do for a while. It wakes by itself when a story of yours needs it." : "Your workspace is awake."}
        </p>
        {settled && status !== "connected" && (
          <button type="button" onClick={() => setModal(true)} className={`${BTN_CLAUDE} mt-4`}>
            {status === "needs_attention" ? "Reconnect Claude" : "Connect Claude"}
          </button>
        )}
      </Group>

      <ConnectAccountsModal
        open={modal}
        onClose={() => {
          setModal(false);
          reload();
        }}
      />
    </div>
  );
}

/** The live page's green summary, in its order: who, as of when, the plan, whose subscription the work runs on. */
function Summary({
  claude,
  loading,
  failed,
  onRetry,
  project,
  asleep,
  now,
}: {
  claude: Connection | undefined;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  project: ProjectSettings;
  asleep: boolean;
  now: number;
}) {
  if (loading) return <div aria-busy="true" aria-label="Loading your Claude account" className={`${SKELETON} h-28 rounded-lg`} />;
  if (failed) {
    return (
      <Notice tone="attention" icon={CircleAlert}>
        <p className="m-0">Your Claude account didn't load. Check your connection and try again.</p>
        <button type="button" onClick={onRetry} className={`${BTN_SECONDARY} mt-3`}>
          <RotateCw aria-hidden="true" size={14} strokeWidth={2} />
          Try again
        </button>
      </Notice>
    );
  }
  const status = claude?.status ?? "not_connected";
  if (status === "connected") {
    return (
      <Notice tone="positive" icon={Check} live>
        <p className="m-0 font-medium">
          Connected as <span className="font-mono">{claude?.account}</span>
        </p>
        {/* The live page prints the full date and time; here it's DESIGN.md §9.2's short one, with the full one in its tooltip. */}
        <p className="m-0 mt-0.5 text-xs text-[var(--tx2)]">
          As of <When at={project.workspace.reported} now={now} />, from your workspace{asleep && " (not connected right now)"}
        </p>
        <p className="m-0 mt-2 font-medium">Claude subscription · Max plan</p>
        <p className="m-0 mt-0.5">Your work runs on this account's subscription. Nothing is shared with anyone else on this machine.</p>
      </Notice>
    );
  }
  return (
    <Notice tone="attention" icon={CircleAlert} live>
      <p className="m-0 font-medium">{status === "needs_attention" ? (claude?.reason ?? "Access expired") : "Not connected"}</p>
      <p className="m-0 mt-0.5">Until this is connected, your stories have nobody to work on them.</p>
    </Notice>
  );
}

/** One of the live page's cards, as a row: what it is, with its line under it, and its value on the right. */
function Reported({ term, hint, children }: { term: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-[var(--line)] py-3 first:pt-0 last:border-b-0 last:pb-0">
      <dt className="min-w-0 flex-1 basis-64">
        <span className="block text-sm font-medium text-[var(--tx)]">{term}</span>
        {hint && <span className="mt-0.5 block text-xs text-pretty text-[var(--tx2)]">{hint}</span>}
      </dt>
      <dd className="m-0 flex flex-wrap items-center gap-2 text-sm text-[var(--tx)]">{children}</dd>
    </div>
  );
}
