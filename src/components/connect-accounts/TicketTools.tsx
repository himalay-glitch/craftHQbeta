import { useEffect, useId, useRef, useState } from "react";
import { connectTool, TOOLS, useConnectedTools, type TicketTool } from "@/components/stories/imports";
import { ToolLogo } from "@/components/stories/ImportFrom";
import { CardState, cardClasses, FACE_STATIC, FaceText, faceButton } from "./Card";

/**
 * The tools a story can be imported from (Jira, Linear, GitHub Issues…): the same list and the same connections as
 * New story → Import, so a tool connected here shows as connected there, and the other way round. Optional: the robots
 * work without them. Front end only, like the import: connecting is simulated and nothing leaves the browser.
 */
export function TicketTools() {
  const connected = useConnectedTools();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-baseline gap-1.5">
        <h3 id={headingId} className="text-sm font-medium">
          Import tickets from
        </h3>
        <span className="text-xs text-muted-foreground">Optional</span>
      </div>
      <ul className="mt-2 grid list-none grid-cols-1 gap-2 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.id} tool={tool} connected={connected.includes(tool.id)} />
        ))}
      </ul>
    </section>
  );
}

function ToolCard({ tool, connected }: { tool: TicketTool; connected: boolean }) {
  const [connecting, setConnecting] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const faceRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // One click connects (Shubham, 26 Nov: "I have to connect two times"). Demo: there's no real sign-in yet, so it
  // connects after a moment, like the import.
  function connect() {
    if (connecting) return;
    setConnecting(true);
    timer.current = window.setTimeout(() => {
      connectTool(tool.id);
      setConnecting(false);
      // The button that had the focus is gone: the card's line says it's connected.
      requestAnimationFrame(() => faceRef.current?.focus());
    }, 1200);
  }

  const face = (
    <>
      <ToolLogo tool={tool} />
      <FaceText name={tool.name} sub={connected ? tool.place : tool.maker} />
      <CardState status={connected ? "connected" : connecting ? "busy" : "connect"} />
    </>
  );

  return (
    <li className={cardClasses(false)}>
      {connected ? (
        <div ref={faceRef} tabIndex={-1} className={FACE_STATIC}>
          {face}
        </div>
      ) : (
        // Stays a button while it connects (aria-disabled, not disabled), so the focus stays put.
        <button type="button" aria-disabled={connecting || undefined} onClick={connect} className={faceButton(false)}>
          {face}
        </button>
      )}
    </li>
  );
}
