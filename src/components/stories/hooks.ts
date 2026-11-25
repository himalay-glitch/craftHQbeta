import { useSyncExternalStore } from "react";
import { URL_EVENT } from "@/components/dashboard/format";
import type { StoriesView } from "@/types/stories";

// Browser state read without effects: the server render uses the fallback, then React switches.
// The same approach as the dashboard island, which keeps its own copies of these.

const subscribeNever = () => () => {};

/** `/stories?state=empty` shows the first-use state for review. */
export function useEmptyOverride() {
  return useSyncExternalStore(
    subscribeNever,
    () => new URLSearchParams(window.location.search).get("state") === "empty",
    () => false,
  );
}

/** `/stories?demo=live` shows the board's demo controls (simulated robots), since there's no back end yet. */
export function useLiveDemo() {
  return useSyncExternalStore(
    subscribeNever,
    () => new URLSearchParams(window.location.search).get("demo") === "live",
    () => false,
  );
}

function subscribeUrl(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(URL_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(URL_EVENT, onChange);
  };
}

const readView = (): StoriesView => (new URLSearchParams(window.location.search).get("view") === "list" ? "list" : "board");

/** Board (the default) or List, from `?view=list`, so a link shows the same view (DESIGN.md §4.8). */
export const useView = () => useSyncExternalStore(subscribeUrl, readView, () => "board" as StoriesView);

export function setView(view: StoriesView) {
  const url = new URL(window.location.href);
  if (view === "board") url.searchParams.delete("view");
  else url.searchParams.set("view", view);
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(URL_EVENT));
}

const WIDE = "(min-width: 1024px)";

/** 1024 px and wider: the story panel floats over the list instead of covering it. */
export function useIsWide() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(WIDE);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
}

const PHONE = "(max-width: 767.98px)";

/** Under 768 px: the story's Team opens as a full screen (wider, it's a tab beside the chat). */
export function useIsPhone() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(PHONE);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}
