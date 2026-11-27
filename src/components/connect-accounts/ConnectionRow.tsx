import { useEffect, useId, useRef, useState, type ReactNode, type SubmitEvent } from "react";
import { CircleExclamationPoint, LoaderCircle } from "lucide-react";
import { CONNECTIONS_CHANNEL, type Connection, type ConnectionBroadcast } from "@/types/connections";
import { ToolLogo } from "@/components/stories/ImportFrom";
import {
  ConnectionError,
  connectService,
  fetchConnections,
  previewWindowSignIn,
  startSignIn,
  type ConnectInput,
} from "./api";
import { Button } from "./Button";
import { BODY, CardState, cardClasses, FACE_STATIC, FaceText, faceButton, type CardStatus } from "./Card";
import { NEW_GITHUB_TOKEN_URL, SERVICE_COPY } from "./services";

/**
 * idle: nothing in progress · connecting: the provider's sign-in window is open (GitHub) ·
 * code / checking: pasting and sending a sign-in code (Claude) ·
 * token / saving: pasting and sending a developer token (GitHub's alternative).
 */
type Phase = "idle" | "connecting" | "code" | "checking" | "token" | "saving";

type ConnectionRowProps = {
  connection: Connection;
  /** The next connection to make: its card gets the focus when the modal opens and after each connection. */
  isNext: boolean;
  onConnected: (connection: Connection) => void;
  /** Tells the modal when a request starts and ends, so a scrim click doesn't close it midway. */
  onBusyChange: (busy: boolean) => void;
};

const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

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
  /** Opened by hand. A card is also open while it's partway through connecting, or showing an error. */
  const [open, setOpen] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const windowRef = useRef<Window | null>(null);
  const fieldId = useId();
  const errorId = useId();
  const bodyId = useId();

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
    setOpen(false);
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
    // From the GitHub step too: the token replaces the window, so close it.
    windowRef.current?.close();
    windowRef.current = null;
    setError(null);
    setPhase("token");
  }

  const inFlow = phase !== "idle";
  const busy = phase === "connecting" || phase === "checking" || phase === "saving";
  /**
   * One click connects (Shubham, 26 Nov: "I have to connect two times"): the card itself opens GitHub's window, or
   * Claude's page in a new tab. Not when GitHub has no repositories yet: there's nothing to approve, so the card opens
   * to say what to do instead.
   */
  const direct = !connected && !inFlow && !noRepositories && (usesWindow || usesCode);
  /** Open across both columns for the step after the click (approve in the window, paste the code), or an error. */
  const expanded = !connected && (inFlow || error !== null || (noRepositories && open));

  // The state on the right of the card (DESIGN.md §6.6 states, said the way the import's cards say them).
  let status: CardStatus;
  if (busy) status = "busy";
  else if (connected) status = "connected";
  else if (direct) status = "connect";
  else if (connection.status === "needs_attention") status = "attention";
  else status = "none";
  const label = connection.status === "needs_attention" ? "Reconnect" : error ? "Try again" : "Connect";

  const who =
    connection.via === "token" ? `Developer token •••• ${connection.tokenLast4 ?? ""}` : (connection.account ?? copy.name);

  // The card's line under the name: what it's for in a few words, or, once something has happened, the detail that
  // matters now (the account, or why it needs attention).
  let sub: string;
  if (connected) sub = connection.repositories ? `${who} · ${repositoryCount(connection.repositories)}` : who;
  else if (noRepositories) sub = "No repositories yet";
  else if (connection.status === "needs_attention") sub = connection.reason ?? `${copy.name} needs attention`;
  else sub = copy.short;

  const tokenLink = canUseToken ? (
    <button type="button" onClick={openTokenForm} className={TEXT_BUTTON}>
      {noRepositories ? "Use a developer token" : "Use a developer token instead"}
    </button>
  ) : null;

  let body: ReactNode = null;
  if (phase === "connecting") {
    body = (
      <>
        <p className="text-sm text-pretty text-muted-foreground">{`Approve CraftHQ in the ${copy.name} window that opened.`}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button variant="ghost" onClick={cancel} autoFocus>
            Cancel
          </Button>
          {signInUrl ? (
            <p className="text-sm text-muted-foreground">
              {"No window? "}
              <a href={signInUrl} target="_blank" rel="noopener" className="text-primary-strong underline">
                {`Open ${copy.name}`}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          ) : null}
          {tokenLink}
        </div>
      </>
    );
  } else if (usesCode && (phase === "code" || phase === "checking")) {
    body = (
      <form onSubmit={submitCode} noValidate className="flex flex-col gap-1.5">
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
    body = (
      <form onSubmit={submitToken} noValidate className="flex flex-col gap-1.5">
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
  } else if (noRepositories) {
    body = (
      <>
        <p className="text-sm text-pretty text-muted-foreground">
          No repositories yet. Ask an owner of your GitHub organization to install the CraftHQ app, or use a developer
          token.
        </p>
        {error ? <ErrorLine message={error} className="mt-2" /> : null}
        <div className="mt-2">{tokenLink}</div>
      </>
    );
  } else if (error) {
    // It didn't connect: what happened, and the card's "Try again" is the way back (never a dead end).
    body = (
      <>
        <ErrorLine message={error} />
        {tokenLink ? <div className="mt-2">{tokenLink}</div> : null}
      </>
    );
  }

  const face = (
    <>
      <ToolLogo tool={{ logo: copy.logo ?? "", name: copy.name }} />
      {/* Mark the exception, not the rule: every connection is required unless it says so. */}
      <FaceText name={copy.name} sub={sub} tag={connection.required ? undefined : "Optional"} />
      <CardState
        status={status}
        label={label}
        external
        busyLabel={phase === "connecting" ? "Connecting…" : "Checking…"}
      />
    </>
  );

  // The card's top line: the way to connect when one click does it, a toggle for what to do when it can't, else a
  // plain line (connected, or partway through: the steps below have the buttons).
  let top: ReactNode;
  if (direct && usesWindow) {
    top = (
      <button type="button" data-autofocus={isNext || undefined} onClick={openSignInWindow} className={faceButton(expanded)}>
        {face}
        <span className="sr-only">{` (opens a ${copy.name} window)`}</span>
      </button>
    );
  } else if (direct && signInUrl) {
    top = (
      <a
        href={signInUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-autofocus={isNext || undefined}
        onClick={() => {
          setError(null);
          setPhase("code");
        }}
        className={faceButton(expanded)}
      >
        {face}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  } else if (noRepositories && !inFlow) {
    top = (
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? bodyId : undefined}
        onClick={() => setOpen(!open)}
        className={faceButton(expanded)}
      >
        {face}
      </button>
    );
  } else {
    // Also Claude for the moment before its sign-in page's address arrives: it can't open anything yet.
    top = <div className={FACE_STATIC}>{face}</div>;
  }

  return (
    <li className={cardClasses(expanded)}>
      {top}
      {expanded && body ? (
        <div id={bodyId} className={BODY}>
          {body}
        </div>
      ) : null}
    </li>
  );
}
