import { useEffect, useId, useRef, useState, type ReactNode, type SubmitEvent } from "react";
import { ArrowUpRight, Circle, CircleCheck, CircleExclamationPoint, LoaderCircle } from "lucide-react";
import { CONNECTIONS_CHANNEL, type Connection, type ConnectionBroadcast } from "@/types/connections";
import {
  ConnectionError,
  connectService,
  fetchConnections,
  previewWindowSignIn,
  startSignIn,
  type ConnectInput,
} from "./api";
import { Button, buttonClasses } from "./Button";
import { NEW_GITHUB_TOKEN_URL, SERVICE_COPY } from "./services";

/**
 * idle: nothing in progress · connecting: the provider's sign-in window is open (GitHub) ·
 * code / checking: pasting and sending a sign-in code (Claude) ·
 * token / saving: pasting and sending a developer token (GitHub's alternative).
 */
type Phase = "idle" | "connecting" | "code" | "checking" | "token" | "saving";

type ConnectionRowProps = {
  connection: Connection;
  /** The next connection to make gets the primary button (DESIGN.md §6.6). */
  isNext: boolean;
  onConnected: (connection: Connection) => void;
  /** Tells the modal when a request starts and ends, so a scrim click doesn't close it midway. */
  onBusyChange: (busy: boolean) => void;
};

const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;
/** Icons inside status pills: 12 px with a heavier stroke (DESIGN.md §3.6). */
const PILL_ICON = { size: 12, strokeWidth: 2, "aria-hidden": true } as const;

/** How often to check, while a sign-in window is open, whether the provider has finished. */
const SIGN_IN_POLL_MS = 2000;
/** Local runs only: how often to check whether the provider's window has closed. */
const WINDOW_CHECK_MS = 800;

const FIELD =
  "h-8 min-w-0 flex-1 basis-48 rounded-lg border-0 bg-field px-3 font-mono text-sm text-foreground " +
  "placeholder:font-sans placeholder:text-muted-foreground transition duration-150 hover:bg-field-hover " +
  "focus:bg-card focus:shadow-focus focus:outline-none pointer-coarse:h-11 pointer-coarse:text-base";

const TEXT_BUTTON =
  "inline-flex cursor-pointer items-center border-0 bg-transparent font-sans text-sm font-medium text-primary-strong hover:underline";

/** Status pill tones (DESIGN.md §7.12): a tint background with the tone's ink. */
const PILL_TONE = {
  neutral: "bg-field text-muted-foreground",
  positive: "bg-success-tint text-success-ink",
  attention: "bg-warning-tint text-warning-ink",
} as const;

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <LoaderCircle
      size={size}
      strokeWidth={size < 16 ? 2 : 1.75}
      aria-hidden
      className="flex-none animate-spin motion-reduce:animate-none"
    />
  );
}

function ErrorLine({ id, message, className = "" }: { id?: string; message: string; className?: string }) {
  return (
    <p id={id} role="alert" className={`flex items-start gap-1.5 text-sm text-danger-ink ${className}`}>
      <CircleExclamationPoint {...ICON} className="mt-0.5 flex-none" />
      <span className="text-pretty">{message}</span>
    </p>
  );
}

function repositoryCount(count: number) {
  return count === 1 ? "1 repository" : `${count} repositories`;
}

export function ConnectionRow({ connection, isNext, onConnected, onBusyChange }: ConnectionRowProps) {
  const copy = SERVICE_COPY[connection.service];
  const usesCode = connection.method === "code";
  const usesWindow = connection.method === "oauth";
  const connected = connection.status === "connected";
  /** Signed in to GitHub, but the CraftHQ app isn't installed anywhere CraftHQ can reach. */
  const noRepositories = connection.status === "needs_attention" && connection.repositories === 0;
  const canUseToken = connection.acceptsToken === true && !connected;

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [signInUrl, setSignInUrl] = useState<string | null>(null);
  const [logoMissing, setLogoMissing] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const windowRef = useRef<Window | null>(null);
  const fieldId = useId();
  const errorId = useId();

  // A service that connects with a code needs its sign-in page's address before the link can open it.
  useEffect(() => {
    if (!usesCode || connected) return;
    const controller = new AbortController();
    startSignIn(connection.service, controller.signal)
      .then(setSignInUrl)
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(caught instanceof ConnectionError ? caught.message : `Couldn't reach ${copy.name}. Try again.`);
      });
    return () => controller.abort();
  }, [usesCode, connected, connection.service, copy.name]);

  // While the provider's sign-in window is open, wait for it to finish: the callback page reports over
  // CONNECTIONS_CHANNEL, and the server is polled in case that message never arrives. Closing the window
  // doesn't count as failing: the provider's last page may be the live app's, and Cancel is always there.
  useEffect(() => {
    if (phase !== "connecting") return;
    const service = connection.service;
    let settled = false;
    onBusyChange(true);

    async function latest() {
      try {
        return (await fetchConnections()).find((item) => item.service === service) ?? null;
      } catch {
        return null;
      }
    }

    function settle(result: { connection?: Connection; error?: string }) {
      if (settled) return;
      settled = true;
      windowRef.current?.close();
      windowRef.current = null;
      setPhase("idle");
      if (result.connection) onConnected(result.connection);
      if (result.error) setError(result.error);
    }

    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CONNECTIONS_CHANNEL);
    if (channel) {
      channel.onmessage = (event: MessageEvent<ConnectionBroadcast>) => {
        const message = event.data;
        if (!message || message.service !== service) return;
        if (message.outcome === "connected") {
          void latest().then((found) =>
            settle(found ? { connection: found } : { error: `Couldn't confirm ${copy.name}. Try again.` }),
          );
        } else if (message.outcome === "failed") {
          settle({ error: message.message ?? `${copy.name} didn't finish connecting. Try again.` });
        } else {
          settle({});
        }
      };
    }

    const poll = window.setInterval(() => {
      void latest().then((found) => {
        if (found && found.status !== "not_connected") settle({ connection: found });
      });
    }, SIGN_IN_POLL_MS);

    // Local runs only: the provider sends its answer to the live app, so this page never hears it.
    // Count the window closing (or moving on to the live app, which this page can't see into) as approved.
    let watch: number | undefined;
    if (import.meta.env.DEV) {
      watch = window.setInterval(() => {
        if (!windowRef.current?.closed) return;
        window.clearInterval(watch);
        void previewWindowSignIn(service, "connected")
          .then((found) => settle({ connection: found }))
          .catch(() => settle({ error: `${copy.name} didn't finish connecting. Try again.` }));
      }, WINDOW_CHECK_MS);
    }

    return () => {
      channel?.close();
      window.clearInterval(poll);
      if (watch !== undefined) window.clearInterval(watch);
      onBusyChange(false);
    };
  }, [phase, connection.service, copy.name, onBusyChange, onConnected]);

  function openSignInWindow() {
    setError(null);
    setSignInUrl(null);
    // Open the window during the click: one opened after waiting for the server gets blocked as a popup.
    windowRef.current = window.open("", `crafthq-${connection.service}`, "popup=yes,width=560,height=720");
    setPhase("connecting");
    startSignIn(connection.service)
      .then((url) => {
        setSignInUrl(url);
        const opened = windowRef.current;
        if (opened && !opened.closed) opened.location.href = url;
      })
      .catch((caught: unknown) => {
        windowRef.current?.close();
        windowRef.current = null;
        setPhase("idle");
        setError(caught instanceof ConnectionError ? caught.message : `Couldn't reach ${copy.name}. Try again.`);
      });
  }

  async function connect(phaseWhileRunning: Phase, phaseAfterFailure: Phase, input: ConnectInput = {}) {
    const controller = new AbortController();
    controllerRef.current = controller;
    setPhase(phaseWhileRunning);
    setError(null);
    onBusyChange(true);
    try {
      const updated = await connectService(connection.service, input, controller.signal);
      setPhase("idle");
      setCode("");
      setToken("");
      onConnected(updated);
    } catch (caught) {
      // Cancel has already reset the row.
      if (controller.signal.aborted) return;
      setPhase(phaseAfterFailure);
      setError(caught instanceof ConnectionError ? caught.message : `${copy.name} didn't finish connecting. Try again.`);
    } finally {
      onBusyChange(false);
      controllerRef.current = null;
    }
  }

  function cancel() {
    controllerRef.current?.abort();
    windowRef.current?.close();
    windowRef.current = null;
    setPhase("idle");
    setError(null);
    setCode("");
    setToken("");
  }

  function submitCode(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError(`Paste the code ${copy.name} showed you.`);
      return;
    }
    void connect("checking", "code", { code: trimmed });
  }

  function submitToken(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setError("Paste your developer token.");
      return;
    }
    void connect("saving", "token", { token: trimmed });
  }

  function openTokenForm() {
    setError(null);
    setPhase("token");
  }

  // The state, as a pill beside the name (DESIGN.md §7.12): an icon, a label and a tone, so it never
  // reads as part of the description underneath.
  let pill: { tone: keyof typeof PILL_TONE; icon: ReactNode; label: string };
  if (phase === "connecting" || phase === "checking" || phase === "saving") {
    pill = { tone: "neutral", icon: <Spinner size={12} />, label: phase === "connecting" ? "Connecting" : "Checking" };
  } else if (connected) {
    pill = { tone: "positive", icon: <CircleCheck {...PILL_ICON} />, label: "Connected" };
  } else if (connection.status === "needs_attention") {
    pill = { tone: "attention", icon: <CircleExclamationPoint {...PILL_ICON} />, label: "Needs attention" };
  } else {
    pill = { tone: "neutral", icon: <Circle {...PILL_ICON} />, label: "Not connected" };
  }

  // The line under the name: what the connection is for, or, once something has happened, the detail
  // that matters now.
  let detail: string;
  if (phase === "connecting") {
    detail = `Approve CraftHQ in the ${copy.name} window that opened.`;
  } else if (connected) {
    const who =
      connection.via === "token"
        ? `Developer token •••• ${connection.tokenLast4 ?? ""}`
        : (connection.account ?? copy.name);
    detail = connection.repositories ? `${who} · ${repositoryCount(connection.repositories)}` : who;
  } else if (noRepositories) {
    detail = "No repositories yet. Ask an owner of your GitHub organization to install the CraftHQ app, or use a developer token.";
  } else if (connection.status === "needs_attention") {
    detail = connection.reason ?? `${copy.name} needs attention.`;
  } else {
    detail = copy.purpose;
  }

  const variant = isNext ? "primary" : "secondary";
  const verb = connection.status === "needs_attention" ? "Reconnect" : "Connect";
  let action: ReactNode = null;
  if (phase === "connecting") {
    action = (
      <Button variant="ghost" onClick={cancel}>
        Cancel
      </Button>
    );
  } else if (!connected && phase === "idle" && usesWindow && !noRepositories) {
    // The next step's button wears the provider's own colours (GitHub's black, with its white mark).
    const branded = isNext ? copy.brandButton : undefined;
    const mark = branded ? branded.mark : copy.logo;
    action = (
      <Button variant={branded ? branded.variant : variant} data-autofocus={isNext || undefined} onClick={openSignInWindow}>
        {mark ? <img src={mark} alt="" width={16} height={16} className="size-4 flex-none" /> : null}
        {`${verb} ${copy.name}`}
        <ArrowUpRight {...ICON} />
        <span className="sr-only">{` (opens a ${copy.name} window)`}</span>
      </Button>
    );
  } else if (!connected && phase === "idle" && usesCode) {
    // The next step's button wears the provider's own colours (Claude's orange).
    const codeVariant = isNext && copy.brandButton ? copy.brandButton.variant : variant;
    action = signInUrl ? (
      <a
        href={signInUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-autofocus={isNext || undefined}
        className={buttonClasses(codeVariant)}
        onClick={() => {
          setError(null);
          setPhase("code");
        }}
      >
        {`Connect ${copy.name}`}
        <ArrowUpRight {...ICON} />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    ) : (
      <Button variant={codeVariant} disabled>
        {`Connect ${copy.name}`}
      </Button>
    );
  }

  let below: ReactNode = null;
  if (phase === "connecting") {
    below = signInUrl ? (
      <p className="mt-2 text-sm text-muted-foreground">
        {"No window? "}
        <a href={signInUrl} target="_blank" rel="noopener" className="text-primary-strong underline">
          {`Open ${copy.name}`}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    ) : null;
  } else if (usesCode && !connected && (phase === "code" || phase === "checking")) {
    below = (
      <form onSubmit={submitCode} noValidate className="mt-4 flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium">
          {`Code from ${copy.name}`}
        </label>
        <p className="text-sm text-pretty text-muted-foreground">
          {`${copy.name} opened in a new tab. Sign in there, then paste the code it shows.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            id={fieldId}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            readOnly={phase === "checking"}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={FIELD}
          />
          <Button type="submit" variant="primary" disabled={phase === "checking"}>
            {phase === "checking" ? <Spinner /> : null}
            Connect
          </Button>
          <Button variant="ghost" onClick={cancel}>
            Cancel
          </Button>
        </div>
        {error ? <ErrorLine id={errorId} message={error} /> : null}
        {signInUrl ? (
          <p className="text-sm text-muted-foreground">
            {"Didn't get a code? "}
            <a href={signInUrl} target="_blank" rel="noopener noreferrer" className="text-primary-strong underline">
              {`Open ${copy.name} again`}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        ) : null}
      </form>
    );
  } else if (canUseToken && (phase === "token" || phase === "saving")) {
    below = (
      <form onSubmit={submitToken} noValidate className="mt-4 flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium">
          Developer token
        </label>
        <p className="text-sm text-pretty text-muted-foreground">
          {"It reaches every repository you can, so use it only in development environments. "}
          <a href={NEW_GITHUB_TOKEN_URL} target="_blank" rel="noopener noreferrer" className="text-primary-strong underline">
            Create a classic token on GitHub
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          {" with the "}
          <code className="rounded-sm bg-field px-1 font-mono text-xs">repo</code>
          {" scope and an expiry of 90 days or less, then paste it here."}
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            id={fieldId}
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            readOnly={phase === "saving"}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="ghp_… or github_pat_…"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={FIELD}
          />
          <Button type="submit" variant="primary" disabled={phase === "saving"}>
            {phase === "saving" ? <Spinner /> : null}
            Save token
          </Button>
          <Button variant="ghost" onClick={cancel}>
            Cancel
          </Button>
        </div>
        {error ? <ErrorLine id={errorId} message={error} /> : null}
        <p className="text-xs text-muted-foreground">CraftHQ shows only its last four characters after you save it.</p>
      </form>
    );
  } else {
    below = (
      <>
        {error ? <ErrorLine message={error} className="mt-2" /> : null}
        {canUseToken && phase === "idle" ? (
          <button type="button" onClick={openTokenForm} className={`mt-2 ${TEXT_BUTTON}`}>
            {noRepositories ? "Use a developer token" : "Use a developer token instead"}
          </button>
        ) : null}
      </>
    );
  }

  return (
    <li className="rounded-xl border border-border p-4">
      {/* Top line: logo, name and state on the left; the action on the right. */}
      <div className="flex flex-wrap items-center gap-3">
        {copy.logo && !logoMissing ? (
          <img
            src={copy.logo}
            alt=""
            width={24}
            height={24}
            className="size-6 flex-none"
            onError={() => setLogoMissing(true)}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-6 flex-none items-center justify-center rounded-md bg-field text-xs font-semibold"
          >
            {copy.initial}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-semibold">{copy.name}</h3>
          {/* Mark the exception, not the rule: every connection is required unless it says so. */}
          {connection.required ? null : <span className="text-xs text-muted-foreground">Optional</span>}
          <span
            aria-live="polite"
            className={`inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium ${PILL_TONE[pill.tone]}`}
          >
            {pill.icon}
            {pill.label}
          </span>
        </div>
        {action}
      </div>

      {/* Everything else lines up with the name, and runs the full width of the row. */}
      <div className="pl-9">
        <p className="mt-1 text-sm text-pretty text-muted-foreground">{detail}</p>
        {below}
      </div>
    </li>
  );
}
