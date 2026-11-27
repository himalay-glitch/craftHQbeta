import { useState, type ReactNode, type SubmitEvent } from "react";
import { Check, CircleSlash, Clock, Copy, KeyRound } from "lucide-react";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/dashboard/classes";
import { ToolLogo } from "@/components/stories/ImportFrom";
import { connectTool, TOOLS, useConnectedTools } from "@/components/stories/imports";
import type { AccessToken } from "@/types/settings";
import { turnOffStoryBack, turnOnStoryBack, useStoryBackNotify, type StoryBackState } from "./notify-pref";
import { updateSettings, useSettings } from "./store";
import {
  ConfirmDialog,
  FIELD,
  Field,
  Group,
  LINK,
  MetaLine,
  PageHeader,
  Pill,
  SwitchRow,
  When,
  addDays,
  daysBetween,
  formatDate,
  todayYmd,
  useBrowserValue,
  usePageNow,
  type Notify,
  type Scope,
} from "./ui";

// Your settings: the same in every project. The sections and their words follow the live CraftHQ settings (Shubham,
// 26 Nov: "all the parts are important"); the tokens follow its docs (docs/CRAFTHQ_DOCS_SPEC.md §12). GitHub has its
// own file, GitHubSettings.tsx.

const YOU: Scope = { kind: "you" };

/* ── Profile ─────────────────────────────────────────────────────────────────────────────────────────────────── */

const STORY_BACK_STATUS: Record<StoryBackState, string> = {
  off: "Off. Turning it on asks this browser for permission once.",
  "allowed-off": "Off.",
  on: "On in this browser. A notification appears when a story comes back to you.",
  blocked: "Blocked by this browser. Allow notifications for this site in the browser's settings, then come back to turn it on.",
  unsupported: "This browser can't show notifications.",
};

export function ProfileSection({ notify }: { notify: Notify }) {
  const { profile } = useSettings();
  const [name, setName] = useState(profile.name);
  const [savedName, setSavedName] = useState(profile.name);
  const [error, setError] = useState("");
  const storyBack = useStoryBackNotify();

  // The stored name arrives right after hydration, and changes on Save: start from it when it does.
  if (profile.name !== savedName) {
    setSavedName(profile.name);
    setName(profile.name);
  }

  // One field, so Save sits beside it, as on the live settings.
  const save = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next = name.trim();
    if (!next) {
      setError("Enter your name. It's how your stories are labelled on the board.");
      return;
    }
    setError("");
    setName(next);
    updateSettings((s) => ({ ...s, profile: { ...s.profile, name: next } }));
    notify("Name saved");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader scope={YOU} title="Profile">
        Your name is how your stories are labelled on the board and how your commits are signed when your loop does work for
        you. Signed in as <span className="font-mono text-[var(--tx)]">{profile.email}</span>.
      </PageHeader>
      <form onSubmit={save} noValidate>
        <Field
          label="Name"
          htmlFor="profile-name"
          error={error}
          hint="A running loop session keeps the name it started with; it picks a change up the next time it starts."
        >
          <div className="flex gap-2">
            <input
              id="profile-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error && e.target.value.trim()) setError("");
              }}
              autoComplete="name"
              aria-invalid={!!error}
              aria-describedby={error ? "profile-name-error" : "profile-name-hint"}
              className={`${FIELD} min-w-0 flex-1`}
            />
            <button type="submit" className={BTN_PRIMARY}>
              Save
            </button>
          </div>
        </Field>
      </form>
      <Group title="Notifications">
        <SwitchRow
          id="notify-story-back"
          checked={storyBack === "on"}
          disabled={storyBack === "unsupported" || storyBack === "blocked"}
          onChange={(on) => void (on ? turnOnStoryBack() : turnOffStoryBack())}
          label="Notify me when a story comes back to me"
          description={STORY_BACK_STATUS[storyBack]}
          live
        />
      </Group>
    </div>
  );
}

/* ── Issue tracker ───────────────────────────────────────────────────────────────────────────────────────────── */

// The same tools and the same connections as New story → Import and the Connectors modal (stories/imports.ts), so a
// tool connected here is connected there. Front end only, like the import: connecting is simulated.
export function TrackerSection() {
  const connected = useConnectedTools();
  const [connecting, setConnecting] = useState<string | null>(null);

  const connect = (id: string) => {
    if (connecting) return;
    setConnecting(id);
    window.setTimeout(() => {
      connectTool(id);
      setConnecting(null);
    }, 700);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader scope={YOU} title="Issue tracker">
        The tools you already write tickets in. Once one is connected, New story › Import finds its tickets, and the story
        links back to the ticket it came from.
      </PageHeader>
      <Group>
        <ul className="m-0 flex list-none flex-col p-0">
          {TOOLS.map((tool) => {
            const on = connected.includes(tool.id);
            const busy = connecting === tool.id;
            return (
              <li key={tool.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--line)] py-3 first:pt-0 last:border-b-0">
                <ToolLogo tool={tool} size={24} />
                <span className="min-w-0 flex-1 basis-48">
                  <span className="block text-sm font-medium text-[var(--tx)]">{tool.name}</span>
                  <span className="block truncate text-xs text-[var(--tx2)]">{on ? tool.place : `${tool.maker} · reads ${tool.reads}`}</span>
                </span>
                {on ? (
                  <span className="inline-flex h-5 items-center gap-1 rounded-full bg-success-tint px-2 text-xs font-medium text-success-ink">
                    <Check aria-hidden="true" size={12} strokeWidth={2} />
                    Connected
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-disabled={busy || undefined}
                    onClick={() => connect(tool.id)}
                    aria-label={busy ? `Connecting ${tool.name}` : `Connect ${tool.name}`}
                    className={`${BTN_SECONDARY} ${busy ? "cursor-progress" : ""}`}
                  >
                    {busy ? "Connecting…" : "Connect"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Group>
    </div>
  );
}

/* ── CraftHQ tokens ──────────────────────────────────────────────────────────────────────────────────────────── */

// The live page's parts (Shubham's screenshot, 27 Nov): what a token is, the line for people new to the CLI, a name
// and Create token, then every token with its prefix, when it was made and last used, how long it lasts, its state
// and Revoke. Revoked tokens stay listed. The times are DESIGN.md §9.2's short ones, with the live page's full date
// and time in the tooltip.

const TOKEN_DAYS = 90;
/** From this many days before it expires, the line says so in the attention colour. */
const SOON_DAYS = 14;
const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * The CLI's file, when this instance offers one: the live page then ends the "New to the CLI?" line with "Download the
 * CLI (crafthq-cli-0.6.3.tgz)". The docs say the link shows "when the instance offers it"; this one doesn't yet, so
 * there's no link to a file that isn't there. Set it to show the link.
 */
const CLI_DOWNLOAD = null as { file: string; href: string } | null;

/** A sample value until the API issues real tokens. Bytes of 248 and up are skipped (248 = 4 × 62), so every one of the
 *  62 characters is equally likely. */
function newTokenValue() {
  let out = "chq_";
  const bytes = new Uint8Array(64);
  while (out.length < 36) {
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b < 248 && out.length < 36) out += BASE62[b % 62];
    }
  }
  return out;
}

type TokenState = "active" | "expired" | "revoked";

const tokenState = (t: AccessToken, today: string): TokenState => (t.revoked ? "revoked" : t.expires && t.expires < today ? "expired" : "active");

function TokenPill({ state }: { state: TokenState }) {
  if (state === "active") {
    return (
      <Pill tone="positive" icon={Check}>
        Active
      </Pill>
    );
  }
  return (
    <Pill tone="neutral" icon={state === "expired" ? Clock : CircleSlash}>
      {state === "expired" ? "Expired" : "Revoked"}
    </Pill>
  );
}

/** "chq_7Fk2Qa1e… · created 2 Oct · last used yesterday · expires 31 Dec". Mid-line, so lower case. */
function TokenMeta({ token, today, now }: { token: AccessToken; today: string; now: number }) {
  const left = token.expires ? daysBetween(today, token.expires) : 0;
  const otherYear = !!token.expires && token.expires.slice(0, 4) !== today.slice(0, 4);
  const parts: ReactNode[] = [
    <span className="font-mono">{token.prefix}…</span>,
    <>
      created <When at={token.created} now={now} />
    </>,
    token.lastUsed ? (
      <>
        last used <When at={token.lastUsed} now={now} />
      </>
    ) : (
      "not used yet"
    ),
    token.revoked ? (
      <>
        revoked <When at={token.revoked} now={now} />
      </>
    ) : !token.expires ? (
      "lasts until you revoke it"
    ) : left < 0 ? (
      `expired ${formatDate(token.expires, otherYear)}`
    ) : left <= SOON_DAYS ? (
      <span className="font-medium text-warning-ink">{left === 0 ? "expires today" : left === 1 ? "expires tomorrow" : `expires in ${left} days`}</span>
    ) : (
      `expires ${formatDate(token.expires, otherYear)}`
    ),
  ];
  return <MetaLine parts={parts} />;
}

export function TokensSection({ notify }: { notify: Notify }) {
  const { tokens } = useSettings();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ name: string; value: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<AccessToken | null>(null);
  // "Today" and "now" from the browser: the server's date (and time zone) may differ, so it renders the sample's day.
  const today = useBrowserValue(todayYmd, "2026-11-27");
  const now = usePageNow();

  // The ones that work first, each group newest first.
  const listed = [...tokens].sort(
    (a, b) => Number(tokenState(a, today) !== "active") - Number(tokenState(b, today) !== "active") || b.created.localeCompare(a.created),
  );

  const create = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError("Name what it's for, like laptop CLI.");
    const same = tokens.find((t) => tokenState(t, today) === "active" && t.name.toLowerCase() === n.toLowerCase());
    if (same) return setError(`You already have an active token called ${same.name}. Pick another name, or revoke that one first.`);
    const value = newTokenValue();
    const token: AccessToken = {
      id: `tok-${Date.now()}`,
      name: n,
      prefix: value.slice(0, 12),
      created: new Date().toISOString(),
      expires: addDays(today, TOKEN_DAYS),
      lastUsed: null,
      revoked: null,
    };
    updateSettings((s) => ({ ...s, tokens: [token, ...s.tokens] }));
    setCreated({ name: n, value });
    setCopied(false);
    setName("");
    setError("");
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.value);
      setCopied(true);
    } catch {
      // Clipboard refused: the value is selectable in its field.
      setCopied(false);
    }
  };

  // It stays in the list as Revoked, as on the live page, so you can see what was cut off and when.
  const revoke = () => {
    if (!revoking) return;
    const at = new Date().toISOString();
    updateSettings((s) => ({ ...s, tokens: s.tokens.map((t) => (t.id === revoking.id ? { ...t, revoked: at } : t)) }));
    notify(`${revoking.name} revoked`);
    setRevoking(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader scope={YOU} title="CraftHQ tokens">
        A personal access token signs the <span className="font-mono text-[var(--tx)]">crafthq</span> CLI and its Claude Code
        plugin in as <span className="font-semibold text-[var(--tx)]">you</span>: it can see and do exactly what you can here,
        nothing more. A token lasts 90 days, or until you revoke it; it is shown once, at creation, so copy it then. Only its
        name and prefix stay visible here.
      </PageHeader>
      <Group
        title="New token"
        description={
          <>
            New to the CLI?{" "}
            <a href="/docs/claude-code" className={LINK}>
              Use CraftHQ from Claude Code
            </a>{" "}
            walks through the whole setup.
            {CLI_DOWNLOAD && (
              <>
                {" "}
                <a href={CLI_DOWNLOAD.href} download className={LINK}>
                  Download the CLI ({CLI_DOWNLOAD.file})
                </a>
                .
              </>
            )}
          </>
        }
      >
        <form onSubmit={create} noValidate>
          <Field label="Token name" htmlFor="token-name" error={error} hint="What it's for, like loop or laptop CLI, so you know which one to revoke.">
            <div className="flex flex-wrap gap-2">
              <input
                id="token-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                placeholder="laptop CLI"
                autoComplete="off"
                aria-invalid={!!error}
                aria-describedby={error ? "token-name-error" : "token-name-hint"}
                className={`${FIELD} max-w-xs min-w-0 flex-1`}
              />
              <button type="submit" className={BTN_PRIMARY}>
                Create token
              </button>
            </div>
          </Field>
        </form>
        {created && (
          <div className="mt-4 rounded-xl bg-success-tint p-4">
            <p className="m-0 text-sm font-medium text-[var(--tx)]">Copy the token for {created.name} now. It won't be shown again.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                aria-label={`Token for ${created.name}`}
                value={created.value}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className={`${FIELD} min-w-0 flex-1 bg-white font-mono text-xs hover:bg-white`}
              />
              <button type="button" onClick={copy} className={BTN_SECONDARY}>
                {copied ? <Check aria-hidden="true" size={14} strokeWidth={2} /> : <Copy aria-hidden="true" size={14} strokeWidth={2} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" onClick={() => setCreated(null)} className={BTN_SECONDARY}>
                Done
              </button>
            </div>
            <p className="m-0 mt-3 text-xs text-[var(--tx2)]">
              Next, run <code className="font-mono">crafthq login</code> where you'll use it.
            </p>
          </div>
        )}
      </Group>
      <Group title="Your tokens">
        {listed.length === 0 ? (
          <p className="m-0 text-sm text-[var(--tx2)]">No tokens yet. Make one for each place you use the CLI.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {listed.map((t) => {
              const state = tokenState(t, today);
              return (
                <li key={t.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-[var(--line)] py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-field">
                    <KeyRound aria-hidden="true" size={16} strokeWidth={1.75} className="text-[var(--tx2)]" />
                  </span>
                  <span className="min-w-0 flex-1 basis-56">
                    <span className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium ${state === "active" ? "text-[var(--tx)]" : "text-[var(--tx2)]"}`}>
                      {t.name}
                      <TokenPill state={state} />
                    </span>
                    <TokenMeta token={t} today={today} now={now} />
                  </span>
                  {state === "active" && (
                    <button type="button" onClick={() => setRevoking(t)} aria-label={`Revoke ${t.name}, ${t.prefix}`} className={BTN_SECONDARY}>
                      Revoke
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Group>
      <ConfirmDialog
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={revoke}
        title={`Revoke ${revoking?.name ?? "this token"}?`}
        consequence="Whatever signs in with it stops working at once: the CLI on that computer, or a running loop. To use it there again, make a new token and run crafthq login."
        confirmLabel="Revoke"
      />
    </div>
  );
}
