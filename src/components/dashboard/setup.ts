import { useCallback, useEffect, useState } from "react";
import type { ConnectionService, ConnectionsResponse } from "@/types/connections";

/** The required services that aren't connected yet, in the order people connect them. */
async function fetchMissing(signal?: AbortSignal): Promise<ConnectionService[]> {
  const res = await fetch("/api/connections", { cache: "no-store", signal });
  if (!res.ok) throw new Error(`GET /api/connections answered ${res.status}`);
  const { connections } = (await res.json()) as ConnectionsResponse;
  return connections.filter((c) => c.required && c.status !== "connected").map((c) => c.service);
}

/** `?connect` in the address: open the connect step even after it was closed once (for demos). */
const forced = () => new URLSearchParams(window.location.search).has("connect");

/** Set once the person has closed the connect step (done, Skip or Esc) in this browser. */
const SEEN_KEY = "crafthq:connect-prompt-seen";

/** Set by the login form on a successful sign-in, for the dashboard it goes to next (this tab only). */
const SIGNED_IN_KEY = "crafthq:just-signed-in";

/** The login form calls this right before it goes to the dashboard, so the connect step opens there. */
export function noteSignIn() {
  try {
    window.sessionStorage.setItem(SIGNED_IN_KEY, "1");
  } catch {
    // Storage blocked: the step opens only on a first visit, nothing else.
  }
}

function justSignedIn() {
  try {
    return window.sessionStorage.getItem(SIGNED_IN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Used once: a reload, or coming back to the dashboard later, isn't a sign-in. */
function clearSignIn() {
  try {
    window.sessionStorage.removeItem(SIGNED_IN_KEY);
  } catch {
    // Storage blocked: nothing was saved.
  }
}

/** Open the connect step by itself: right after a sign-in, on a first visit, or with `?connect`. */
const shouldOpen = () => justSignedIn() || !seen() || forced();

function seen() {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage blocked: it may open again next visit, nothing else.
  }
}

/**
 * The connect-accounts step between sign-in and the dashboard. Right after each sign-in, while GitHub or Claude isn't
 * connected, the modal opens over the dashboard (Shubham, 26 Nov: "we want the after-login pop-up, for Claude and
 * GitHub"); also on a first visit. Coming back to the dashboard otherwise (the nav, a reload) doesn't open it again
 * (Shubham, 26 Nov: the banner at the top already says what isn't connected): once it's closed, the banner and its
 * "Connect accounts" button take over. `?connect` in the address opens it anyway, for demos. Closing it checks again,
 * so the banner knows what's still missing.
 */
export function useConnectionSetup() {
  const [missing, setMissing] = useState<ConnectionService[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchMissing(controller.signal).then(
      (names) => {
        setMissing(names);
        if (names.length > 0 && shouldOpen()) setOpen(true);
        clearSignIn();
      },
      () => {
        if (controller.signal.aborted) return;
        // The modal shows its own load error with Try again, so open it rather than guess.
        if (shouldOpen()) setOpen(true);
        clearSignIn();
      },
    );
    return () => controller.abort();
  }, []);

  const close = useCallback(() => {
    markSeen();
    setOpen(false);
    fetchMissing().then(setMissing, () => {});
  }, []);

  const reopen = useCallback(() => setOpen(true), []);

  return { open, missing, close, reopen };
}
