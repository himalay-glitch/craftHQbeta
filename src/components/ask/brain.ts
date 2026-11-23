import type { AskData, Block, Turn } from "@/types/ask";

// The demo's PM: no model behind it yet. It matches what you asked to a scripted answer built from the
// project's own stories, and brings in a teammate for new work. Replace with the real agent later.

export const SUGGESTIONS = [
  "What’s happening right now?",
  "What merged this week?",
  "What’s stuck, and why?",
  "Design a settings page",
  "Build check-in reminders",
  "Who’s on the team?",
];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const pm = (blocks: Block[], delay = 650): Turn => ({ from: "pm", delay, blocks });

/** The words a topic is recognised by, most specific first. */
const TOPICS: [RegExp, (d: AskData, q: string) => Turn[]][] = [
  [/\bfix\b/i, fix],
  [/\b(design|mock ?up|screens?|layout|ui|wireframe|look)\b/i, design],
  [/\b(build|engineer|implement|code|develop|make|add)\b/i, build],
  [/\b(test|check|qa|verify)\b/i, check],
  [/\b(merged?|shipped?|released?|done|finished|live)\b/i, merged],
  [/\b(stuck|blocked|fail(ed|ing)?|broken|errors?)\b/i, stuck],
  [/\b(review|approve|accept)\b/i, review],
  [/\b(who|team|bots?)\b/i, team],
  [/\b(happening|what'?s up|status|progress|today|going on|update|overview|summary)\b/i, overview],
];

export function answer(question: string, d: AskData): Turn[] {
  const q = question.trim();
  for (const [re, fn] of TOPICS) if (re.test(q)) return fn(d, q);
  return [
    pm([
      {
        kind: "text",
        text: `I can tell you anything about ${d.project}’s stories, or get new work started. Try one of these:`,
      },
      { kind: "suggest", items: SUGGESTIONS.slice(0, 4) },
    ]),
  ];
}

function overview(d: AskData): Turn[] {
  const urgent = [...d.stuck, ...d.needsYou.filter((s) => s.status === "needs_input")].slice(0, 3);
  return [
    pm([
      {
        kind: "text",
        text:
          `Here’s ${d.project} right now. ${plural(d.running.length, "story is", "stories are")} being built or checked, ` +
          `${plural(d.needsYou.length, "is", "are")} waiting on you, and ${plural(d.stuck.length, "is", "are")} stuck. ` +
          `${plural(d.merged.length, "change")} merged this week.`,
      },
      {
        kind: "stats",
        items: [
          { label: "Waiting on you", value: d.needsYou.length },
          { label: "Running", value: d.running.length },
          { label: "Stuck", value: d.stuck.length },
          { label: "Merged", value: d.merged.length },
        ],
      },
      { kind: "text", text: "The ones that need you first:" },
      { kind: "stories", items: urgent },
      { kind: "suggest", items: ["What’s stuck, and why?", "What’s ready to review?", "What merged this week?"] },
    ]),
  ];
}

function merged(d: AskData): Turn[] {
  return [
    pm([
      { kind: "text", text: `${plural(d.merged.length, "change")} merged this week. Each one passed the Checker and your review.` },
      { kind: "stories", items: d.merged },
      { kind: "suggest", items: ["What’s happening right now?", "What’s ready to review?"] },
    ]),
  ];
}

function stuck(d: AskData): Turn[] {
  const [first] = d.stuck;
  return [
    pm([
      {
        kind: "text",
        text: `${plural(d.stuck.length, "story is", "stories are")} stuck, both on something that failed rather than on a person. I’ve asked Fixer to take the first one.`,
      },
      { kind: "stories", items: d.stuck },
      { kind: "handoff", to: "fixer", task: `Retry the preview for hq-${first.id}` },
    ]),
    {
      from: "fixer",
      delay: 1800,
      blocks: [
        {
          kind: "text",
          text: `Restarted the preview for hq-${first.id}. It failed because the build ran out of memory, so I gave it more and it’s starting now. I’ll tell you if it fails again.`,
        },
        { kind: "stories", items: [{ ...first, status: "building", detail: "Preview restarting" }] },
      ],
    },
  ];
}

function review(d: AskData): Turn[] {
  return [
    pm([
      { kind: "text", text: `${plural(d.review.length, "story is", "stories are")} ready for you to review. The Checker has passed each one; open it, try it, then accept or ask for changes.` },
      { kind: "stories", items: d.review },
    ]),
  ];
}

function team(): Turn[] {
  return [
    pm([
      { kind: "text", text: "Here’s the team. You talk to me; I bring in whoever the work needs." },
      { kind: "team" },
    ]),
  ];
}

function design(d: AskData, q: string): Turn[] {
  const what = topicOf(q, "design") || "settings page";
  return [
    pm([
      { kind: "text", text: `Good idea. I’ve asked Designer to sketch a few directions for the ${what}, using ${d.project}’s existing screens.` },
      { kind: "handoff", to: "designer", task: `Sketch the ${what}` },
    ]),
    {
      from: "designer",
      delay: 2600,
      blocks: [
        { kind: "text", text: `Three directions for the ${what}. A keeps everything in one list, B groups it into cards, C splits sections from details.` },
        {
          kind: "designs",
          options: [
            { id: "A", label: "One list", layout: "list" },
            { id: "B", label: "Cards", layout: "cards" },
            { id: "C", label: "Split view", layout: "split" },
          ],
        },
      ],
    },
  ];
}

/** After a design is picked: the PM turns it into a story for the Builder. */
export function pickDesign(option: string, label: string, d: AskData): Turn[] {
  const id = d.nextStoryId;
  return [
    pm([
      { kind: "text", text: `${option} it is. I’ve written it up as a story, with ${label.toLowerCase()} as the design. Approve the plan and the Builder starts.` },
      { kind: "stories", items: [{ id, title: "Settings page", status: "needs_input", detail: `Design ${option} · plan ready` }] },
      { kind: "suggest", items: ["Build it now", "What’s happening right now?"] },
    ]),
  ];
}

function build(d: AskData, q: string): Turn[] {
  // "Build it now" after picking a design means the settings page that was just written up.
  const what = topicOf(q, "build") || (/\b(it|this|that)\b/i.test(q) ? "settings page" : "check-in reminders");
  const story = { id: d.nextStoryId, title: capitalise(what) };
  return [
    pm([
      { kind: "text", text: `On it. I’ve written “${story.title}” up as hq-${story.id} and handed it to the Builder. The Checker tests it before it reaches you.` },
      { kind: "handoff", to: "builder", task: `Build hq-${story.id}` },
    ]),
    {
      from: "builder",
      delay: 2200,
      blocks: [
        { kind: "text", text: "Started. Here’s where it is; I’ll post the preview when the Checker has passed it." },
        { kind: "steps", story, steps: ["Read the story and the screens", "Write the change", "Run the tests", "Open the pull request"] },
      ],
    },
  ];
}

function check(d: AskData): Turn[] {
  const story = d.review[0] ?? { id: 43, title: "Creation flow revision", status: "in_review" as const };
  return [
    pm([
      { kind: "text", text: `I’ve asked the Checker to run hq-${story.id} again on web and Android.` },
      { kind: "handoff", to: "checker", task: `Check hq-${story.id}` },
    ]),
    {
      from: "checker",
      delay: 2400,
      blocks: [
        { kind: "text", text: `Done. Nearly everything passes; one thing needs a fix before you review it.` },
        { kind: "checks", story, passed: 23, failed: 1, note: "On Android the event date shows as 11/20 instead of 20 Nov." },
        { kind: "suggest", items: ["Ask Builder to fix it", "What’s ready to review?"] },
      ],
    },
  ];
}

function fix(d: AskData): Turn[] {
  const story = d.review[0] ?? { id: 43, title: "Creation flow revision", status: "in_review" as const };
  return [
    pm([
      { kind: "text", text: `I’ve sent the Android date fix on hq-${story.id} back to the Builder. The Checker runs it again once it’s in.` },
      { kind: "handoff", to: "builder", task: `Fix the date format on hq-${story.id}` },
    ]),
    {
      from: "builder",
      delay: 2000,
      blocks: [
        { kind: "text", text: "Found it: the date used the phone’s short format. Switching it to “20 Nov” everywhere." },
        { kind: "steps", story, steps: ["Find where the date is formatted", "Use the app’s date format", "Run the tests", "Hand it to the Checker"] },
      ],
    },
  ];
}

/** The thing asked for, after the verb: "Design a settings page" → "settings page". Words a verb, not a thing. */
function topicOf(q: string, verb: string) {
  const m = q.match(new RegExp(`\\b${verb}\\s+(?:me\\s+)?(?:a|an|the|some)?\\s*(.+?)[.?!]*$`, "i"));
  const t = m?.[1]?.trim();
  return t && t.length <= 60 && !/^(it|this|that)\b/i.test(t) ? t : "";
}
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
