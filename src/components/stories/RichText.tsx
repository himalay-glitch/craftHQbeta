import { Fragment } from "react";
import { CircleDot } from "lucide-react";
import type { Person } from "@/types/dashboard";
import type { Segment } from "@/types/stories";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { storyRef } from "@/components/dashboard/format";
import { AgentAvatar } from "./AgentAvatar";

const CHIP_BASE = "mx-0.5 inline-flex max-w-[280px] items-center gap-1.5 rounded-[6px] py-px pr-1.5 pl-0.5 align-middle text-[14px] leading-5";

/** Message text with chips for people, the agent and other stories. Line breaks are kept. */
export function RichText({
  segments,
  stories,
  tone = "light",
}: {
  segments: Segment[];
  stories: { id: number; title: string }[];
  /** "dark" inside the viewer's own (dark) bubbles. */
  tone?: "light" | "dark";
}) {
  const CHIP = `${CHIP_BASE} ${tone === "dark" ? "bg-white/15 text-white" : "bg-black/[0.06]"}`;
  return (
    <>
      {segments.map((seg, i) => {
        if (typeof seg === "string") return <Fragment key={i}>{seg}</Fragment>;
        if (seg.type === "agent") {
          return (
            <span key={i} className={CHIP}>
              <AgentAvatar size={20} />
              Agent
            </span>
          );
        }
        if (seg.type === "person") {
          return (
            <span key={i} className={CHIP}>
              <PersonAvatar initials={seg.initials} />
              {seg.name}
            </span>
          );
        }
        const title = seg.title ?? stories.find((s) => s.id === seg.id)?.title;
        return (
          <a key={i} href={`/stories/${storyRef(seg.id)}`} className={`${CHIP} pl-1.5 hover:underline`}>
            <CircleDot aria-hidden="true" size={14} strokeWidth={1.75} className={`flex-none ${tone === "dark" ? "text-white/70" : "text-[var(--tx2)]"}`} />
            <span className="truncate">
              {storyRef(seg.id)}
              {title && ` ${title}`}
            </span>
          </a>
        );
      })}
    </>
  );
}

/** Turns typed text into segments: "@Skye" or "@agent" becomes a chip, and so does "#hq-33" (or "#33"). */
export function parseText(text: string, people: Person[], stories: { id: number; title: string }[]): Segment[] {
  const out: Segment[] = [];
  for (const part of text.split(/(@[A-Za-z][\w-]*|#(?:hq-)?\d+)/g)) {
    if (!part) continue;
    if (part.startsWith("@")) {
      const word = part.slice(1).toLowerCase();
      if (word === "agent") {
        out.push({ type: "agent" });
        continue;
      }
      const p = people.find((x) => x.name.split(" ")[0].toLowerCase() === word || x.name.toLowerCase().replace(/\s+/g, "") === word);
      if (p) {
        out.push({ type: "person", name: p.name, initials: p.initials });
        continue;
      }
    }
    if (part.startsWith("#")) {
      const id = Number(part.replace(/^#(?:hq-)?/, ""));
      if (stories.some((s) => s.id === id)) {
        out.push({ type: "story", id });
        continue;
      }
    }
    const last = out[out.length - 1];
    if (typeof last === "string") out[out.length - 1] = last + part;
    else out.push(part);
  }
  return out;
}
