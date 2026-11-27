import { useEffect, useRef, useState, type ReactNode, type SubmitEvent } from "react";
import { ArrowUpRight, Building2, Check, CircleAlert, CircleDashed, KeyRound, LoaderCircle, RotateCw, X } from "lucide-react";
import { BTN_SECONDARY, SKELETON } from "@/components/dashboard/classes";
import { ConnectAccountsModal } from "@/components/connect-accounts";
import { ConnectionError, connectService, startSignIn } from "@/components/connect-accounts/api";
import { NEW_GITHUB_TOKEN_URL, SERVICE_COPY } from "@/components/connect-accounts/services";
import { CraftHQLogo } from "@/components/icons";
import type { Connection } from "@/types/connections";
import type { GitHubCap, GitHubLevel, GitHubTokenCheck, ProjectSettings } from "@/types/settings";
import { disconnectService, useConnections } from "./connections";
import { ServiceLogo, StateChip } from "./ServiceRow";
import { ME, levelLabel, updateSettings, useSettings } from "./store";
import {
  ConfirmDialog,
  FIELD,
  Field,
  Group,
  InfoNote,
  LINK,
  PageHeader,
  Pill,
  RadioList,
  Row,
  SkeletonRow,
  Tile,
  formatDate,
  type Notify,
  type Scope,
} from "./ui";

// Your settings › GitHub, part for part as the live CraftHQ settings have it (Shubham, 27 Nov: "all is important"):
// who you are on GitHub, your access methods, a cap on your own access, and where your access is used. The look is
// DESIGN.md's (sentence case, no serif, blue only for action, GitHub's black button only for the next step).
//
// What's real: your GitHub account and your developer token are the connections API's GitHub connection, the same one
// the Connect accounts modal shows, and saving a token there replaces the account's access, as the live note says.
// "Link GitHub" opens the crafthq-ai app's own authorize page, as the modal does. What's sample (this browser's
// storage, until the API has them): the link itself, your cap, each project's level and the token check's results.

const YOU: Scope = { kind: "you" };

/** The connections API's own test (connections/_mock-store.ts): ghp_… (classic) or github_pat_… (fine-grained). */
const GITHUB_TOKEN = /^(ghp_|github_pat_)[A-Za-z0-9_]{20,}$/;

/** GitHub's official white mark, for its black button (DESIGN.md §3.1). */
const WHITE_MARK = SERVICE_COPY.github.brandButton?.mark;

/** GitHub's own button: black, its white mark, a pill like every brand button (DESIGN.md §3.1, §3.5). */
const BTN_GITHUB =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-inverse px-3.5 text-sm font-medium whitespace-nowrap " +
  "text-on-inverse transition-colors duration-[120ms] hover:bg-inverse/85 active:translate-y-px";

/** How often to look whether GitHub's window has closed, as the Connect accounts modal does. */
const WINDOW_CHECK_MS = 800;

/** Until the API knows: the connections mock's account, and a number for it. */
const SAMPLE_LINK = { login: "crafthq-demo", id: 184203117 };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The repositories you can reach in a project: read or write in its Repositories. */
const reachable = (p: ProjectSettings) => p.repositories.filter((r) => (r.access[ME] ?? "none") !== "none").map((r) => r.name);

export function GitHubSection({ notify, projectId }: { notify: Notify; projectId: string }) {
  const { loading, failed, get, reload, retry, update } = useConnections();
  const { projects } = useSettings();
  const github = get("github");
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState<"disconnect" | "remove" | null>(null);

  // Saving checks the token with GitHub (the API), then each repository you work on. Sample: there's nothing to check
  // a repository against yet, so each one passes.
  const onTokenSaved = (connection: Connection, last4: string) => {
    const repositories = [...new Set(projects.flatMap(reachable))];
    update(connection);
    updateSettings((s) => ({ ...s, githubTokenCheck: { last4, checks: repositories.map((repository) => ({ repository, push: true, pullRequest: true })) } }));
    notify("Developer token checked and saved");
  };

  // Your account and your token are one stored access in the API, so both go through its Disconnect.
  const disconnect = () => {
    const what = confirm;
    setConfirm(null);
    disconnectService("github")
      .then(() => {
        updateSettings((s) => ({ ...s, githubTokenCheck: null }));
        reload();
        notify(what === "remove" ? "Developer token removed" : "GitHub account disconnected");
      })
      .catch((e: unknown) => notify(e instanceof Error ? e.message : "That didn't work. Try again."));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader scope={YOU} title="GitHub">
        Who you are on GitHub, and how CraftHQ reaches the repositories you work on, in every project. Each developer adds
        their own access, so your work is pushed with your access only and the history shows who did what. What CraftHQ
        may do in one project is that project's level, in{" "}
        <a href={`/settings?tab=github-access&project=${encodeURIComponent(projectId)}`} className={LINK}>
          Project settings › GitHub access
        </a>
        .
      </PageHeader>

      <Group
        title="Who you are on GitHub"
        description="What this is for: attribution on the pull requests CraftHQ opens for your work. Repository access is separate, below."
      >
        <IdentityRow notify={notify} nextStep={github?.status === "connected"} account={github?.account} />
      </Group>

      <Group title="Your access methods">
        <ul className="m-0 flex list-none flex-col p-0">
          <AppRow />
          <AccountRow
            github={github}
            loading={loading}
            failed={failed}
            onRetry={retry}
            onOpen={() => setModal(true)}
            onDisconnect={() => setConfirm("disconnect")}
          />
          <TokenRow github={github} loading={loading} onSaved={onTokenSaved} onRemove={() => setConfirm("remove")} />
        </ul>
      </Group>

      <Group
        title="Cap my own access"
        description="A project admin sets what CraftHQ may do on GitHub for each project. You can hold your own access lower; your work then runs at the lower of the two."
      >
        <CapChoice notify={notify} />
      </Group>

      <Group title="Where it is used" description="The projects that use your GitHub access, and the level your work runs at in each.">
        <WhereUsed github={github} loading={loading} />
      </Group>

      <ConfirmDialog
        open={confirm === "disconnect"}
        onClose={() => setConfirm(null)}
        onConfirm={disconnect}
        title="Disconnect your GitHub account?"
        consequence="CraftHQ stops pushing your work and opening pull requests with your account, until you connect it again or save a developer token."
        confirmLabel="Disconnect"
      />
      <ConfirmDialog
        open={confirm === "remove"}
        onClose={() => setConfirm(null)}
        onConfirm={disconnect}
        title="Remove your developer token?"
        consequence="CraftHQ stops reaching GitHub with it, until you save a new token or connect your GitHub account."
        confirmLabel="Remove"
      />
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

/* ── Rows ────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * GitHub's button: black with GitHub's white mark while it's the next step (DESIGN.md §3.1), secondary otherwise.
 * `external` adds ↗, for a button that opens GitHub's own page.
 */
function GitHubButton({ brand, external, onClick, children }: { brand: boolean; external?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={brand ? BTN_GITHUB : BTN_SECONDARY}>
      {brand && WHITE_MARK && <img src={WHITE_MARK} alt="" width={16} height={16} className="size-4" />}
      {children}
      {external && (
        <>
          <ArrowUpRight aria-hidden="true" size={14} strokeWidth={2} />
          <span className="sr-only">(opens GitHub in a new window)</span>
        </>
      )}
    </button>
  );
}

/* ── Who you are on GitHub ───────────────────────────────────────────────────────────────────────────────────── */

const LINK_PURPOSE =
  "Authorize the crafthq-ai app on GitHub so CraftHQ knows who you are there. This link alone gives CraftHQ no access to your repositories.";

/**
 * The live page's "GitHub account" and "Re-link with GitHub" cards, as one row: its state (Linked, Not verified, Not
 * linked), the account, and Re-link with GitHub while it isn't verified. Black only once your access is connected,
 * so there's one next step on the page at a time.
 */
function IdentityRow({ notify, nextStep, account }: { notify: Notify; nextStep: boolean; account?: string }) {
  const { githubLink: link } = useSettings();
  const [waiting, setWaiting] = useState(false);
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [unlinking, setUnlinking] = useState(false);
  const windowRef = useRef<Window | null>(null);
  const login = link?.login ?? account?.replace(/^@/, "") ?? SAMPLE_LINK.login;

  // While GitHub's window is open. GitHub sends its answer to the live app, which this page can't hear, so the window
  // closing counts as approved: the Connect accounts modal's rule in local runs.
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => {
      const opened = windowRef.current;
      if (!opened || !opened.closed) return;
      windowRef.current = null;
      setWaiting(false);
      setBlockedUrl(null);
      updateSettings((s) => ({ ...s, githubLink: { login, id: s.githubLink?.id ?? SAMPLE_LINK.id, verified: true } }));
      notify(`GitHub account linked as @${login}`);
    }, WINDOW_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [waiting, login, notify]);

  const open = () => {
    setError("");
    setBlockedUrl(null);
    // Open the window during the click: one opened after waiting for the server is blocked as a popup.
    const opened = window.open("", "crafthq-github-link", "popup=yes,width=560,height=720");
    windowRef.current = opened;
    setWaiting(true);
    startSignIn("github")
      .then((url) => {
        if (opened && !opened.closed) opened.location.href = url;
        else setBlockedUrl(url);
      })
      .catch((caught: unknown) => {
        opened?.close();
        windowRef.current = null;
        setWaiting(false);
        setError(caught instanceof ConnectionError ? caught.message : "Couldn't reach GitHub. Try again.");
      });
  };

  // The browser blocked the window: this click is allowed to open it.
  const openBlocked = () => {
    if (blockedUrl) windowRef.current = window.open(blockedUrl, "crafthq-github-link", "popup=yes,width=560,height=720");
  };

  const cancel = () => {
    windowRef.current?.close();
    windowRef.current = null;
    setWaiting(false);
    setBlockedUrl(null);
  };

  const unlink = () => {
    setUnlinking(false);
    updateSettings((s) => ({ ...s, githubLink: null }));
    notify("GitHub account unlinked");
  };

  const pill = waiting ? (
    <Pill tone="neutral" icon={LoaderCircle} spin>
      Linking
    </Pill>
  ) : !link ? (
    <Pill tone="neutral" icon={CircleDashed}>
      Not linked
    </Pill>
  ) : link.verified ? (
    <Pill tone="positive" icon={Check}>
      Linked
    </Pill>
  ) : (
    <Pill tone="attention" icon={CircleAlert}>
      Not verified
    </Pill>
  );

  const line = waiting ? (
    <span aria-live="polite">
      Approve CraftHQ in the GitHub window that opened.
      {blockedUrl && (
        <>
          {" "}
          No window?{" "}
          <button type="button" onClick={openBlocked} className={LINK}>
            Open GitHub
          </button>
        </>
      )}
    </span>
  ) : link ? (
    <>
      <span className="block">
        Linked to <span className="font-mono text-[var(--tx)]">@{link.login}</span> (id <span className="font-mono">{link.id}</span>)
      </span>
      <span className="block">{link.verified ? "This link alone gives CraftHQ no access to your repositories." : LINK_PURPOSE}</span>
    </>
  ) : (
    LINK_PURPOSE
  );

  const actions = waiting ? (
    <button type="button" onClick={cancel} className={BTN_SECONDARY}>
      Cancel
    </button>
  ) : (
    <>
      {!link?.verified && (
        <GitHubButton brand={nextStep} external onClick={open}>
          {link ? "Re-link with GitHub" : "Link GitHub"}
        </GitHubButton>
      )}
      {link && (
        <button type="button" onClick={() => setUnlinking(true)} className={BTN_SECONDARY}>
          Unlink
        </button>
      )}
    </>
  );

  return (
    <>
      <ul className="m-0 flex list-none flex-col p-0">
        <Row tile={<ServiceLogo service="github" />} name="GitHub account" pill={pill} line={line} actions={actions}>
          {error && (
            <p role="alert" className="m-0 text-xs text-danger-ink">
              {error}
            </p>
          )}
        </Row>
      </ul>
      <ConfirmDialog
        open={unlinking}
        onClose={() => setUnlinking(false)}
        onConfirm={unlink}
        title="Unlink your GitHub account?"
        consequence="Pull requests CraftHQ opens for your work stop being attributed to you. Your repository access below doesn't change."
        confirmLabel="Unlink"
      />
    </>
  );
}

/* ── Your access methods ─────────────────────────────────────────────────────────────────────────────────────── */

function AppRow() {
  return (
    <Row
      tile={
        <Tile>
          <CraftHQLogo height={16} />
        </Tile>
      }
      name="CraftHQ App"
      pill={
        <Pill tone="neutral" icon={Building2}>
          Org-managed
        </Pill>
      }
      line="Used where your org installed it. Nothing to set up here: an org owner chooses its repositories on GitHub."
    />
  );
}

/** Your GitHub account as the connections API has it. Connecting happens in the Connect accounts modal. */
function AccountRow({
  github,
  loading,
  failed,
  onRetry,
  onOpen,
  onDisconnect,
}: {
  github: Connection | undefined;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  onOpen: () => void;
  onDisconnect: () => void;
}) {
  if (loading) return <SkeletonRow label="Loading your GitHub account" />;
  const tile = <ServiceLogo service="github" />;
  if (failed) {
    return (
      <Row
        tile={tile}
        name="Your GitHub account"
        line="Didn't load. Check your connection and try again."
        actions={
          <button type="button" onClick={onRetry} className={BTN_SECONDARY}>
            <RotateCw aria-hidden="true" size={14} strokeWidth={2} />
            Try again
          </button>
        }
      />
    );
  }

  const status = github?.status ?? "not_connected";
  // A developer token is the access stored now: it replaced the account's (one at a time, in the API).
  if (status !== "not_connected" && github?.via === "token") {
    return (
      <Row
        tile={tile}
        name="Your GitHub account"
        pill={
          <Pill tone="neutral" icon={CircleDashed}>
            Not in use
          </Pill>
        }
        line="Your developer token replaced it. Remove the token below to connect your account again."
      />
    );
  }
  if (status === "connected") {
    return (
      <Row
        tile={tile}
        name="Your GitHub account"
        pill={<StateChip status="connected" />}
        line={
          <>
            Connected as <span className="font-mono text-[var(--tx)]">{github?.account}</span>
            {github?.connectedAt && `\u00a0· since ${formatDate(github.connectedAt)}`}
            {github?.repositories !== undefined && `\u00a0· ${plural(github.repositories, "repository", "repositories")}`}
          </>
        }
        actions={
          <button type="button" onClick={onDisconnect} className={BTN_SECONDARY}>
            Disconnect
          </button>
        }
      />
    );
  }
  if (status === "needs_attention") {
    return (
      <Row
        tile={tile}
        name="Your GitHub account"
        pill={<StateChip status="needs_attention" />}
        line={`${github?.reason ?? "Access expired"}. Reconnect so CraftHQ can reach your repositories again.`}
        actions={
          <GitHubButton brand onClick={onOpen}>
            Reconnect GitHub
          </GitHubButton>
        }
      />
    );
  }
  return (
    <Row
      tile={tile}
      name="Your GitHub account"
      pill={<StateChip status="not_connected" />}
      line="CraftHQ pushes your work and opens pull requests with it, in the repositories you can reach."
      actions={
        <GitHubButton brand onClick={onOpen}>
          Connect GitHub
        </GitHubButton>
      }
    />
  );
}

/**
 * The developer token (DESIGN.md §6.6, keys): the live page's three steps and its field until one is saved; then only
 * its last four characters, what the check found, Replace token and Remove. The note about what it can reach stays.
 */
function TokenRow({
  github,
  loading,
  onSaved,
  onRemove,
}: {
  github: Connection | undefined;
  loading: boolean;
  onSaved: (connection: Connection, last4: string) => void;
  onRemove: () => void;
}) {
  const { githubTokenCheck } = useSettings();
  const [replacing, setReplacing] = useState(false);
  if (loading) return <SkeletonRow label="Loading your developer token" />;

  const connected = !!github && github.status !== "not_connected";
  const saved = connected && github.via === "token" ? github : undefined;
  const check = saved && githubTokenCheck?.last4 === saved.tokenLast4 ? githubTokenCheck : null;
  const storedNow = !connected ? null : saved ? "your current token" : "your GitHub account";

  return (
    <Row
      tile={
        <Tile>
          <KeyRound aria-hidden="true" size={18} strokeWidth={1.75} className="text-[var(--tx)]" />
        </Tile>
      }
      name="Developer token"
      pill={saved ? <StateChip status="connected" /> : undefined}
      line={
        saved ? (
          <>
            <span className="font-mono text-[var(--tx)]">•••• {saved.tokenLast4}</span>
            {saved.connectedAt && `\u00a0· saved ${formatDate(saved.connectedAt)}`}
            {saved.repositories !== undefined && `\u00a0· reaches ${plural(saved.repositories, "repository", "repositories")}`}
          </>
        ) : (
          "Works like your laptop: every repository you can reach, with no org approval. Meant for development environments."
        )
      }
      actions={
        saved && !replacing ? (
          <>
            <button type="button" onClick={() => setReplacing(true)} className={BTN_SECONDARY}>
              Replace token
            </button>
            <button type="button" onClick={onRemove} className={BTN_SECONDARY}>
              Remove
            </button>
          </>
        ) : undefined
      }
    >
      {saved && !replacing ? (
        check && <CheckList check={check} />
      ) : (
        <TokenForm
          storedNow={storedNow}
          onCancel={replacing ? () => setReplacing(false) : undefined}
          onSaved={(connection, last4) => {
            setReplacing(false);
            onSaved(connection, last4);
          }}
        />
      )}
      <InfoNote>
        <span className="font-semibold">About the developer token.</span> This token can reach every repository your GitHub
        account can. CraftHQ only uses it for repositories you add to a project, and only for what each project's access
        level allows. Set an expiry.
      </InfoNote>
    </Row>
  );
}

function TokenForm({
  storedNow,
  onSaved,
  onCancel,
}: {
  /** What saving replaces: "your GitHub account", "your current token", or null when nothing is stored. */
  storedNow: string | null;
  onSaved: (connection: Connection, last4: string) => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const save = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (checking) return;
    const token = value.trim();
    if (!token) return setError("Paste a token from GitHub. It starts with ghp_ or github_pat_.");
    if (!GITHUB_TOKEN.test(token)) return setError("That doesn't look like a GitHub token. It starts with ghp_ or github_pat_.");
    setError("");
    setChecking(true);
    connectService("github", { token })
      .then((connection) => {
        setValue("");
        setChecking(false);
        onSaved(connection, token.slice(-4));
      })
      .catch((caught: unknown) => {
        setChecking(false);
        setError(caught instanceof ConnectionError ? caught.message : "GitHub didn't answer. Try again.");
      });
  };

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4">
      <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-sm text-[var(--tx)] marker:text-[var(--tx2)]">
        <li>
          <a href={NEW_GITHUB_TOKEN_URL} target="_blank" rel="noreferrer" className={`${LINK} inline-flex items-center gap-0.5`}>
            Create a token on GitHub
            <ArrowUpRight aria-hidden="true" size={12} strokeWidth={2} />
            <span className="sr-only">(opens a new tab)</span>
          </a>{" "}
          (classic, scope <code className="font-mono text-xs">repo</code>).
        </li>
        <li>Set an expiry of 90 days or less.</li>
        <li>Paste it here. CraftHQ shows only its last four characters afterwards.</li>
      </ol>
      <Field
        label="Token"
        htmlFor="github-token"
        error={error}
        hint={storedNow ? `Saving replaces the GitHub access you have stored now: ${storedNow}.` : "CraftHQ checks it with GitHub when you save it."}
      >
        <div className="flex flex-wrap gap-2">
          <input
            id="github-token"
            type="password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError("");
            }}
            placeholder="ghp_… or github_pat_…"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? "github-token-error" : "github-token-hint"}
            className={`${FIELD} min-w-0 flex-1 basis-64 font-mono`}
          />
          {/* Stays a button while it checks (aria-disabled, not disabled), so the focus stays put. */}
          <button
            type="submit"
            aria-disabled={checking || undefined}
            aria-busy={checking || undefined}
            className={`${BTN_SECONDARY} ${checking ? "cursor-progress" : ""}`}
          >
            {checking && <LoaderCircle aria-hidden="true" size={16} strokeWidth={1.75} className="animate-spin motion-reduce:animate-none" />}
            {checking ? "Checking…" : "Save token"}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className={BTN_SECONDARY}>
              Cancel
            </button>
          )}
        </div>
      </Field>
    </form>
  );
}

function CheckList({ check }: { check: GitHubTokenCheck }) {
  return (
    <div>
      <p className="m-0 text-xs font-medium text-[var(--tx2)]">What the check found</p>
      {check.checks.length === 0 ? (
        <p className="m-0 mt-1 text-xs text-[var(--tx2)]">None of your projects has a repository you can reach yet.</p>
      ) : (
        <ul className="m-0 mt-1 flex list-none flex-col p-0">
          {check.checks.map((c) => (
            <li key={c.repository} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--line)] py-2 last:border-b-0">
              <span className="min-w-0 flex-1 basis-48 truncate font-mono text-xs text-[var(--tx)]">{c.repository}</span>
              <CheckResult ok={c.push} yes="Can push a branch" no="Can't push a branch" />
              <CheckResult ok={c.pullRequest} yes="Can open a pull request" no="Can't open a pull request" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckResult({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${ok ? "text-success-ink" : "text-danger-ink"}`}>
      {ok ? <Check aria-hidden="true" size={12} strokeWidth={2} /> : <X aria-hidden="true" size={12} strokeWidth={2} />}
      {ok ? yes : no}
    </span>
  );
}

/* ── Cap my own access ───────────────────────────────────────────────────────────────────────────────────────── */

// One choice that applies straight away, so radios and a toast with Undo (DESIGN.md §7.5, §6.11), no Save.
function CapChoice({ notify }: { notify: Notify }) {
  const { githubCap } = useSettings();
  const choose = (next: GitHubCap) => {
    if (next === githubCap) return;
    const before = githubCap;
    updateSettings((s) => ({ ...s, githubCap: next }));
    notify(next ? `Your access is capped at Level ${next}` : "Cap removed. Each project's own level applies.", {
      label: "Undo",
      run: () => updateSettings((s) => ({ ...s, githubCap: before })),
    });
  };
  return (
    <RadioList<GitHubCap>
      name="github-cap"
      label="Cap my own access"
      value={githubCap}
      onChange={choose}
      options={[
        { value: 0, label: "No cap", description: "Each project's own level applies." },
        { value: 1, label: `At most ${levelLabel(1)}`, description: "Lower than a project's level wins, on every project." },
        { value: 2, label: `At most ${levelLabel(2)}`, description: "Lower than a project's level wins, on every project." },
      ]}
    />
  );
}

/* ── Where it is used ────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The projects your access is used in: those with a repository you can reach, once your account or a token is
 * connected. Each shows the level your work runs at there: the project's, or your cap when that's lower.
 */
function WhereUsed({ github, loading }: { github: Connection | undefined; loading: boolean }) {
  const { projects, githubCap } = useSettings();
  if (loading) return <span aria-busy="true" aria-label="Loading where it's used" className={`${SKELETON} block h-4 w-72 max-w-full`} />;

  const active = !!github && github.status !== "not_connected";
  const used = active ? projects.map((p) => ({ p, repos: reachable(p) })).filter((u) => u.repos.length > 0) : [];
  if (used.length === 0) {
    return (
      <p className="m-0 text-sm text-pretty text-[var(--tx2)]">
        Not used by any project yet.{" "}
        {active
          ? "It will be once a project you're in adds a repository you can reach."
          : "It will be once you connect your GitHub account or save a developer token."}
      </p>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {used.map(({ p, repos }) => {
        const applied: GitHubLevel = githubCap && githubCap < p.githubLevel ? githubCap : p.githubLevel;
        return (
          <li key={p.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 border-b border-[var(--line)] py-3 first:pt-0 last:border-b-0 last:pb-0">
            <span className="flex h-5 flex-none items-center">
              <span aria-hidden="true" style={{ background: p.colour }} className="size-2 rounded-full" />
            </span>
            <span className="min-w-0 flex-1 basis-48">
              <a
                href={`/settings?tab=github-access&project=${encodeURIComponent(p.id)}`}
                className="text-sm font-medium text-[var(--tx)] underline decoration-transparent underline-offset-2 hover:decoration-current"
              >
                {p.name}
              </a>
              <span className="block font-mono text-xs text-pretty text-[var(--tx2)]">{repos.join(", ")}</span>
            </span>
            <span className="text-sm text-[var(--tx)] max-sm:basis-full max-sm:pl-5 sm:text-right">
              {levelLabel(applied)}
              {applied < p.githubLevel && (
                <span className="block text-xs text-[var(--tx2)]">
                  Held lower by your cap. {p.name} allows Level {p.githubLevel}.
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
