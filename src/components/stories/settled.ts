import { useSyncExternalStore } from "react";

// False until the first frame after the page has hydrated. Live moves animate only after that, so a reload that
// brings back saved demo changes doesn't reshuffle the board with motion while it paints (DESIGN.md §3.7: nothing
// animates on load).

let settled = false;
const subs = new Set<() => void>();

function subscribe(onChange: () => void) {
  subs.add(onChange);
  if (!settled) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        settled = true;
        subs.forEach((f) => f());
      }),
    );
  }
  return () => subs.delete(onChange);
}

export const useSettled = () => useSyncExternalStore(subscribe, () => settled, () => false);
