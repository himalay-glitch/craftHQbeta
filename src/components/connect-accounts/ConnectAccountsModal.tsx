"use client";

import { useCallback, useEffect, useId, useRef, useState, type MouseEvent, type SyntheticEvent } from "react";
import { CircleExclamationPoint, X } from "lucide-react";
import type { Connection } from "@/types/connections";
import { fetchConnections } from "./api";
import { Button, IconButton } from "./Button";
import { ConnectionRow } from "./ConnectionRow";

export type ConnectAccountsModalProps = {
  open: boolean;
  onClose: () => void;
};

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; connections: Connection[] };

const DIALOG =
  "m-auto w-full max-w-xl overflow-y-auto rounded-2xl border-0 bg-card p-0 text-foreground shadow-overlay " +
  // The page behind is blurred as well as dimmed, so attention stays on finishing setup.
  "backdrop:bg-scrim backdrop:backdrop-blur-sm " +
  // Fade and scale in and out (DESIGN.md §3.7), using the dialog's top-layer transitions.
  "opacity-0 scale-98 transition-all transition-discrete duration-200 ease-out " +
  "open:opacity-100 open:scale-100 starting:open:opacity-0 starting:open:scale-98 " +
  "backdrop:opacity-0 backdrop:transition-all backdrop:transition-discrete backdrop:duration-200 " +
  "open:backdrop:opacity-100 starting:open:backdrop:opacity-0 " +
  "motion-reduce:transition-none motion-reduce:backdrop:transition-none " +
  // Phones: a bottom sheet (DESIGN.md §7.9).
  "max-sm:mb-0 max-sm:max-w-none max-sm:rounded-b-none";

/**
 * Asks people to connect their accounts: GitHub first, then Claude (DESIGN.md §6.6, §7.9).
 * Built on the native <dialog>, which gives focus containment, Esc and the top layer for free.
 */
export function ConnectAccountsModal({ open, onClose }: ConnectAccountsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const focusActionRef = useRef(false);
  const busyCountRef = useRef(0);
  const titleId = useId();
  const descriptionId = useId();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(false);

  // Keep the native dialog in step with `open`.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      focusActionRef.current = true;
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Load the connections each time the modal opens, and on Try again.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetchConnections(controller.signal)
      .then((connections) => setLoad({ state: "ready", connections }))
      .catch(() => {
        if (!controller.signal.aborted) setLoad({ state: "error" });
      });
    return () => controller.abort();
  }, [open, attempt]);

  // Show skeletons only if loading takes longer than 300 ms (DESIGN.md §6.8).
  useEffect(() => {
    if (load.state !== "loading") return;
    const timer = window.setTimeout(() => setShowSkeleton(true), 300);
    return () => window.clearTimeout(timer);
  }, [load.state]);

  // Once the rows are in, move focus to the next thing to do.
  useEffect(() => {
    if (load.state !== "ready" || !focusActionRef.current) return;
    focusActionRef.current = false;
    dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [load]);

  const updateConnection = useCallback((updated: Connection) => {
    setLoad((current) =>
      current.state === "ready"
        ? {
            state: "ready",
            connections: current.connections.map((connection) =>
              connection.service === updated.service ? updated : connection,
            ),
          }
        : current,
    );
  }, []);

  const trackBusy = useCallback((busy: boolean) => {
    busyCountRef.current += busy ? 1 : -1;
  }, []);

  function retry() {
    setShowSkeleton(false);
    setLoad({ state: "loading" });
    setAttempt((count) => count + 1);
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    // Esc: let the parent close it, so `open` stays the one source of truth.
    event.preventDefault();
    onClose();
  }

  function handleNativeClose() {
    // The browser can close the dialog by itself (a second Esc, for example). Keep the parent in step.
    if (open) onClose();
  }

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    // A click on the <dialog> itself, rather than on its content, is a click on the scrim.
    if (event.target === event.currentTarget && busyCountRef.current === 0) onClose();
  }

  const connections = load.state === "ready" ? load.connections : [];
  const required = connections.filter((connection) => connection.required);
  const connectedCount = required.filter((connection) => connection.status === "connected").length;
  const allConnected = load.state === "ready" && connectedCount === required.length;
  const next = required.find((connection) => connection.status !== "connected")?.service;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={handleCancel}
      onClose={handleNativeClose}
      onClick={handleClick}
      className={DIALOG}
    >
      <div className="flex flex-col">
        <header className="flex items-start gap-3 px-6 pt-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold">
              Connect your accounts
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
              Connect GitHub first, then Claude. The robots can start once both are connected.
            </p>
          </div>
          <IconButton label="Close" onClick={onClose} className="-mt-1 -mr-2">
            <X size={16} strokeWidth={1.75} aria-hidden />
          </IconButton>
        </header>

        <div className="px-6 py-5">
          {load.state === "ready" ? (
            <ol className="flex list-none flex-col gap-3">
              {connections.map((connection) => (
                <ConnectionRow
                  key={connection.service}
                  connection={connection}
                  isNext={connection.service === next}
                  onConnected={updateConnection}
                  onBusyChange={trackBusy}
                />
              ))}
            </ol>
          ) : load.state === "error" ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-border p-4">
              <p role="alert" className="flex items-center gap-1.5 text-sm text-danger-ink">
                <CircleExclamationPoint size={16} strokeWidth={1.75} aria-hidden className="flex-none" />
                {"Couldn't load your connections."}
              </p>
              <Button onClick={retry}>Try again</Button>
            </div>
          ) : (
            <ol aria-hidden="true" className={`flex list-none flex-col gap-3 ${showSkeleton ? "" : "invisible"}`}>
              <li className="h-24 animate-pulse rounded-xl bg-field motion-reduce:animate-none" />
              <li className="h-24 animate-pulse rounded-xl bg-field motion-reduce:animate-none" />
            </ol>
          )}
        </div>

        <footer className="flex items-center gap-3 px-6 pb-6">
          <p aria-live="polite" className="min-w-0 flex-1 text-sm text-muted-foreground">
            {allConnected
              ? "You're all set. The robots can start work."
              : load.state === "ready"
                ? `${connectedCount} of ${required.length} connected`
                : null}
          </p>
          {allConnected ? (
            <Button variant="primary" data-autofocus onClick={onClose}>
              Go to dashboard
            </Button>
          ) : (
            <Button onClick={onClose}>Do this later</Button>
          )}
        </footer>
      </div>
    </dialog>
  );
}
