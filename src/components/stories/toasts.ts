import { useCallback, useRef, useState } from "react";
import type { ToastMessage } from "@/components/dashboard/Toast";

/**
 * Toasts for the result of your own action, one at a time; the rest wait their turn (DESIGN.md §6.5). The shared
 * Toast shows one message, so the queue lives here. A new toast with an action (Undo) replaces any earlier one
 * with an action, shown or waiting: undoing an older step after a newer one would undo both, so its Undo is stale.
 * Teammates' moves and robot events never come here: they show as a banner or update in place.
 */
export function useToastQueue() {
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const key = useRef(0);

  const show = useCallback((message: string, action?: ToastMessage["action"]) => {
    key.current += 1;
    const toast: ToastMessage = { key: key.current, message, action };
    setQueue((q) => [...(action ? q.filter((t) => !t.action) : q), toast]);
  }, []);

  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);

  /** A teammate changed the story: an Undo from before would undo their change too, so it goes. */
  const dropUndo = useCallback(() => setQueue((q) => q.filter((t) => !t.action)), []);

  return { toast: queue[0] ?? null, show, dismiss, dropUndo };
}
