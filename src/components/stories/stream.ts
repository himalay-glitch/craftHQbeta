import type { AgentReport, Segment } from "@/types/stories";

// The robot's replies write themselves into the story chat word by word, as Ask PM's do (Shubham, 27 Nov: no
// "Builder is writing a reply" line first, the words come straight away). Ask PM's pace (ask/Message.tsx), about 30
// words a second, quick, but you can see it arrive; one word every 32 ms rather than two every 64, so with each word
// fading in (StoryThread's RevealText) the text flows instead of stepping. Words split on single spaces, as Ask PM's
// do, so line breaks stay where they are.

/** One word at a time. */
export const STEP = 1;
export const STEP_MS = 32;

type Reply = { text?: Segment[]; report?: AgentReport };

const count = (s: string) => s.split(" ").length;

/** The first `n` words of a piece of text. */
export const firstWords = (s: string, n: number) => s.split(" ").slice(0, Math.max(0, n)).join(" ");

/** The first `n` words of a message's text. A chip (a person, the agent, a story) is one word. */
export function firstSegments(segments: Segment[], n: number): Segment[] {
  const out: Segment[] = [];
  let left = n;
  for (const seg of segments) {
    if (left <= 0) break;
    if (typeof seg === "string") {
      out.push(firstWords(seg, left));
      left -= count(seg);
    } else {
      out.push(seg);
      left -= 1;
    }
  }
  return out;
}

/**
 * Where each part of a reply starts, in words, in the order they write in: its text (from 0), then the report's
 * outcome, what it means, its steps (one word: the list shows whole once the words before it are out) and what's next
 * ("Next →" is a word). `total`: every word. Its files and its run's summary show after that.
 */
export function replyPlan(m: Reply) {
  const r = m.report;
  const outcome = (m.text ?? []).reduce((n, s) => n + (typeof s === "string" ? count(s) : 1), 0);
  const means = outcome + (r ? count(r.outcome) : 0);
  const details = means + (r?.means ? count(r.means) : 0);
  const next = details + (r?.details?.length ? 1 : 0);
  const total = next + (r?.next ? 1 + count(r.next) : 0);
  return { starts: { outcome, means, details, next }, total };
}

/** How long a reply takes to write in, so what follows it waits until it's out. */
export const writeMs = (m: Reply) => Math.ceil(replyPlan(m).total / STEP) * STEP_MS;
