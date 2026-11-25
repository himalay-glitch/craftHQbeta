import type { ReactNode } from "react";
import { Tooltip } from "radix-ui";
import { TOOLTIP } from "./classes";

/**
 * A dark tooltip on Radix (DESIGN.md §15, decision 4): it opens after a short hover delay, at once on
 * keyboard focus, and is announced as the trigger's description. Never the only place information lives.
 * Needs a Tooltip.Provider above it (the dashboard and the top bar each have one).
 */
export function Tip({ label, children, side = "top" }: { label: ReactNode; children: ReactNode; side?: "top" | "bottom" }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side={side} sideOffset={6} collisionPadding={8} className={TOOLTIP}>
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
