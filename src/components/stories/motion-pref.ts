import { useSyncExternalStore } from "react";

// "Pause animations" (WCAG 2.2.2): stops the working marks turning, for this viewer, on every page. One-off moves
// still play; reduced motion stops both. Kept in local storage, wrapped in try/catch so a blocked storage just
// means "not paused".

const KEY = "crafthq:pause-animations";
const subs = new Set<() => void>();
let cache: boolean | null = null;

function read() {
  if (cache !== null) return cache;
  try {
    cache = window.localStorage.getItem(KEY) === "1";
  } catch {
    cache = false;
  }
  return cache;
}

export function setPausedMotion(paused: boolean) {
  cache = paused;
  try {
    window.localStorage.setItem(KEY, paused ? "1" : "0");
  } catch {
    // Storage blocked: paused until the page closes.
  }
  subs.forEach((f) => f());
}

function subscribe(onChange: () => void) {
  subs.add(onChange);
  return () => subs.delete(onChange);
}

export const usePausedMotion = () => useSyncExternalStore(subscribe, read, () => false);
