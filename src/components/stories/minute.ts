import { useSyncExternalStore } from "react";

// One clock for every live line on the page, ticking every 15 s (elapsed times read in whole minutes, "4m", "1h 5m"),
// so they all roll over together, nothing flickers, and a fresh run never lags by a minute. Read through useSyncExternalStore: Date.now() runs only in the store's
// own timers, never during render. On the server, and until the first tick, it's 0 (no time shown yet).

interface Minute {
  /** Now, at the last tick (epoch ms); 0 before the first one. */
  now: number;
  /** When the page first read the clock: the sample's "minutes ago" count from here. */
  loadedAt: number;
}

const ZERO: Minute = { now: 0, loadedAt: 0 };
let snap: Minute = ZERO;
let timer: number | undefined;
const subs = new Set<() => void>();

function tick() {
  const now = Date.now();
  snap = { now, loadedAt: snap.loadedAt || now };
  subs.forEach((f) => f());
}

function schedule() {
  timer = window.setInterval(tick, 15_000);
}

function subscribe(onTick: () => void) {
  subs.add(onTick);
  if (timer === undefined) {
    tick();
    schedule();
  }
  return () => {
    subs.delete(onTick);
    if (!subs.size && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

export const useMinute = () => useSyncExternalStore(subscribe, () => snap, () => ZERO);

/** A run's elapsed time, the one format everywhere (cards, rows, list, panel): "now", "4m", "1h 5m". */
export function sinceLabel(ms: number) {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
