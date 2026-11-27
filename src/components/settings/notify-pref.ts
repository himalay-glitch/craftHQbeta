import { useSyncExternalStore } from "react";

// "Notify me when a story comes back to me", as on the live settings: a browser notification, so it belongs to this
// browser (it asks this browser for permission, once), not to the account. Kept in local storage beside the
// browser's own permission.

const KEY = "crafthq:notify-story-back";

/** "allowed-off": the browser allows notifications from CraftHQ, but the setting is off. */
export type StoryBackState = "unsupported" | "blocked" | "off" | "allowed-off" | "on";

const subs = new Set<() => void>();

function read(): StoryBackState {
  if (!("Notification" in window)) return "unsupported";
  const permission = Notification.permission;
  if (permission === "denied") return "blocked";
  let on = false;
  try {
    on = window.localStorage.getItem(KEY) === "1";
  } catch {
    // Blocked storage: off.
  }
  if (permission === "granted") return on ? "on" : "allowed-off";
  return "off";
}

function emit() {
  subs.forEach((f) => f());
}

/** Asks for the browser's permission the first time; stays off if the browser says no. */
export async function turnOnStoryBack() {
  if (!("Notification" in window)) return;
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission === "granted") {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // Blocked storage: it can't be remembered.
    }
  }
  emit();
}

export function turnOffStoryBack() {
  try {
    window.localStorage.setItem(KEY, "0");
  } catch {
    // Blocked storage: it was never on.
  }
  emit();
}

function subscribe(onChange: () => void) {
  subs.add(onChange);
  // The permission can change in the browser's site settings while the page is open: look again on return.
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    subs.delete(onChange);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

export const useStoryBackNotify = () => useSyncExternalStore(subscribe, read, (): StoryBackState => "off");
