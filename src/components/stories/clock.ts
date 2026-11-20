import { useSyncExternalStore } from "react";

// A one-second ticker for "Working now · 8s", read through useSyncExternalStore. It runs only while something
// on the page is subscribed, so Date.now() never runs during render.

let now = 0;
let timer: number | undefined;
const subs = new Set<() => void>();

function subscribe(onTick: () => void) {
  subs.add(onTick);
  now = Date.now();
  if (timer === undefined) {
    timer = window.setInterval(() => {
      now = Date.now();
      subs.forEach((f) => f());
    }, 1000);
  }
  return () => {
    subs.delete(onTick);
    if (!subs.size) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

const idle = () => () => {};

/** The current time, ticking each second while `active`; 0 until the first read. */
export function useNow(active: boolean) {
  return useSyncExternalStore(active ? subscribe : idle, () => now, () => 0);
}

/** "8s", "1m 12s", "2h 5m". */
export function elapsed(ms: number) {
  const s = Math.max(1, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
