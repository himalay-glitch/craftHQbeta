"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, CircleCheck, CircleExclamationPoint, LoaderCircle } from "lucide-react";
import type { Connection } from "@/types/connections";
import { ConnectionError, connectService, startSignIn } from "./api";
import { Button, buttonClasses } from "./Button";
import { SERVICE_COPY } from "./services";

/**
 * idle: nothing in progress · connecting: waiting for an OAuth service (GitHub) ·
 * code: waiting for the person to paste a code (Claude) · checking: sending that code.
 */
type Phase = "idle" | "connecting" | "code" | "checking";

type ConnectionRowProps = {
  connection: Connection;
  /** The next connection to make gets the primary button (DESIGN.md §6.6). */
  isNext: boolean;
  onConnected: (connection: Connection) => void;
  /** Tells the modal when a request starts and ends, so a scrim click doesn't close it midway. */
  onBusyChange: (busy: boolean) => void;
};

const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

function Spinner() {
  return <LoaderCircle {...ICON} className="flex-none animate-spin motion-reduce:animate-none" />;
}

function ErrorLine({ id, message, className = "" }: { id?: string; message: string; className?: string }) {
  return (
    <p id={id} role="alert" className={`flex items-start gap-1.5 text-sm text-danger-ink ${className}`}>
      <CircleExclamationPoint {...ICON} className="mt-0.5 flex-none" />
      <span>{message}</span>
    </p>
  );
}

export function ConnectionRow({ connection, isNext, onConnected, onBusyChange }: ConnectionRowProps) {
  const copy = SERVICE_COPY[connection.service];
  const usesCode = connection.method === "code";
  const connected = connection.status === "connected";

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [signInUrl, setSignInUrl] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const inputId = useId();
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

  async function connect(phaseWhileRunning: Phase, phaseAfterFailure: Phase, withCode?: string) {
    const controller = new AbortController();
    controllerRef.current = controller;
    setPhase(phaseWhileRunning);
    setError(null);
    onBusyChange(true);
    try {
      const updated = await connectService(connection.service, withCode, controller.signal);
      setPhase("idle");
      setCode("");
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
    setPhase("idle");
    setError(null);
    setCode("");
  }

  function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError(`Paste the code from ${copy.name}'s sign-in page.`);
      return;
    }
    void connect("checking", "code", trimmed);
  }

  let status: ReactNode;
  if (phase === "connecting") {
    status = (
      <>
        <Spinner />
        <span>{`Waiting for ${copy.name}…`}</span>
      </>
    );
  } else if (phase === "checking") {
    status = (
      <>
        <Spinner />
        <span>Checking the code…</span>
      </>
    );
  } else if (connected) {
    status = (
      <>
        <CircleCheck {...ICON} className="flex-none text-success" />
        <span>{connection.account ? `Connected as ${connection.account}` : "Connected"}</span>
      </>
    );
  } else if (connection.status === "needs_attention") {
    status = (
      <>
        <CircleExclamationPoint {...ICON} className="flex-none text-warning" />
        <span className="text-warning-ink">{connection.reason ?? "Needs attention"}</span>
      </>
    );
  } else if (phase === "code") {
    status = <span className="text-muted-foreground">Waiting for your code</span>;
  } else {
    status = <span className="text-muted-foreground">{connection.required ? "Not connected · Required" : "Not connected"}</span>;
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
  } else if (!connected && phase === "idle" && !usesCode) {
    action = (
      <Button variant={variant} data-autofocus={isNext || undefined} onClick={() => void connect("connecting", "idle")}>
        {`${verb} ${copy.name}`}
      </Button>
    );
  } else if (!connected && phase === "idle" && usesCode) {
    action = signInUrl ? (
      <a
        href={signInUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-autofocus={isNext || undefined}
        className={buttonClasses(variant)}
        onClick={() => {
          setError(null);
          setPhase("code");
        }}
      >
        {`Sign in with ${copy.name}`}
        <ArrowUpRight {...ICON} />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    ) : (
      <Button variant={variant} disabled>
        {`Sign in with ${copy.name}`}
      </Button>
    );
  }

  const showCodeForm = usesCode && !connected && (phase === "code" || phase === "checking");

  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-6 flex-none items-center justify-center rounded-md bg-field text-xs font-semibold"
        >
          {copy.initial}
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-sm font-semibold">{copy.name}</p>
          <p className="text-sm text-muted-foreground">{copy.purpose}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm" aria-live="polite">
            {status}
          </p>
        </div>
        {action}
      </div>

      {showCodeForm ? (
        <form onSubmit={submitCode} noValidate className="mt-4 flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-sm font-medium">
            {`Code from ${copy.name}'s sign-in page`}
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={inputId}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              readOnly={phase === "checking"}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={
                "h-8 min-w-0 flex-1 basis-48 rounded-lg border-0 bg-field px-3 font-mono text-sm text-foreground " +
                "transition duration-150 hover:bg-field-hover focus:bg-card focus:shadow-focus focus:outline-none " +
                "pointer-coarse:h-11 pointer-coarse:text-base"
              }
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
                Open the sign-in page again
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          ) : null}
        </form>
      ) : error ? (
        <ErrorLine message={error} className="mt-3" />
      ) : null}
    </li>
  );
}
