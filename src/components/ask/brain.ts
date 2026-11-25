import type { AskData, Block, BotId, StoryRef, Turn } from "@/types/ask";
import { TEAM } from "./team";

// The demo's team: no model behind it yet. What you asked is matched to a scripted answer built from the
// project's own stories. The bot it concerns answers in its own voice: name a bot (or click it) and that bot
// replies; questions in a bot's own area go to it (review → Checker, stuck → Fixer, merged → Builder). The PM
// keeps the overview and the team, and routes new work you didn't give to anyone. Replace with the real agents later.

export const SUGGESTIONS = [
  "What’s happening right now?",
  "What merged this week?",
  "What’s stuck, and why?",
  "Design a settings page",
  "Build check-in reminders",
  "Who’s on the team?",
];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const say = (from: BotId, blocks: Block[], delay = 700, status?: Turn["status"]): Turn => ({ from, delay, blocks, status });
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const FIX = /\bfix\b/i;
const DESIGN = /\b(design|sketch|mock ?up|screens?|layout|ui|wireframe|look)\b/i;
const BUILD = /\b(build|engineer|implement|code|develop|make|add)\b/i;
const CHECK = /\b(test|check|qa|verify)\b/i;
const MERGED = /\b(merged?|shipped?|released?|done|finished|live)\b/i;
const STUCK = /\b(stuck|blocked|fail(ed|ing)?|broken|errors?|retry)\b/i;
const REVIEW = /\b(review|approve|accept)\b/i;
const TEAMQ = /\b(who|team|bots?)\b/i;
const OVERVIEW = /\b(happening|what'?s up|status|progress|today|going on|update|overview|summary)\b/i;

/** The bot a question is for: "@Builder …", "What is Designer doing?", "Ask Builder to fix it". */
function addressee(q: string): BotId | null {
  const m = q.match(/@?\b(pm|builder|designer|checker|fixer)\b/i);
  return m ? (m[1].toLowerCase() as BotId) : null;
}

/** Does the script have a real answer for this, rather than its "here's what I can do" reply? */
export function understands(question: string) {
  const q = question.trim();
  return !!addressee(q) || [FIX, DESIGN, BUILD, CHECK, MERGED, STUCK, REVIEW, TEAMQ, OVERVIEW].some((re) => re.test(q));
}

export function answer(question: string, d: AskData): Turn[] {
  const q = question.trim();
  const to = addressee(q);

  // Spoken to a bot by name: it answers itself.
  if (to && to !== "pm") {
    if (to === "builder" && FIX.test(q)) return fix(d, true);
    if (to === "builder" && BUILD.test(q.replace(/builder/gi, ""))) return build(d, q, true);
    if (to === "designer" && DESIGN.test(q.replace(/designer/gi, ""))) return design(d, q, true);
    if (to === "checker" && (CHECK.test(q.replace(/checker/gi, "")) || REVIEW.test(q))) return CHECK.test(q.replace(/checker/gi, "")) ? check(d) : review(d);
    if (to === "fixer" && (STUCK.test(q) || FIX.test(q.replace(/fixer/gi, "")))) return stuck(d);
    return status(to);
  }

  // Questions in a bot's own area go to that bot; new work goes through the PM.
  if (FIX.test(q)) return fix(d, false);
  if (DESIGN.test(q)) return design(d, q, false);
  if (BUILD.test(q)) return build(d, q, false);
  if (CHECK.test(q)) return check(d);
  if (MERGED.test(q)) return merged(d);
  if (STUCK.test(q)) return stuck(d);
  if (REVIEW.test(q)) return review(d);
  if (TEAMQ.test(q)) return team();
  if (OVERVIEW.test(q) || to === "pm") return to === "pm" && !OVERVIEW.test(q) ? status("pm") : overview(d);
  return [
    say("pm", [
      { kind: "text", text: `I can tell you anything about ${d.project}’s stories, or get new work started. You can also talk to a bot directly with @.` },
      { kind: "suggest", items: SUGGESTIONS.slice(0, 4) },
    ]),
  ];
}

// ---------- The PM: the overview and the team ----------

function overview(d: AskData): Turn[] {
  const urgent = [...d.stuck, ...d.needsYou.filter((s) => s.status === "needs_input")].slice(0, 3);
  return [
    say("pm", [
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

function team(): Turn[] {
  return [
    say("pm", [
      { kind: "text", text: "Here’s the team. Talk to me, or to any of them with @; I bring in whoever new work needs." },
      { kind: "team" },
    ]),
  ];
}

// ---------- Each bot in its own area ----------

/** The Builder on what merged: its own changes that made it through. */
function merged(d: AskData): Turn[] {
  return [
    say(
      "builder",
      [
        { kind: "text", text: `${plural(d.merged.length, "of my changes", "of my changes")} merged this week. Each one passed the Checker and your review first.` },
        { kind: "stories", items: d.merged },
        { kind: "suggest", items: ["What’s happening right now?", "What’s ready to review?"] },
      ],
      700,
    ),
  ];
}

/** The Checker on what's ready for you. */
function review(d: AskData): Turn[] {
  return [
    say("checker", [
      { kind: "text", text: `${plural(d.review.length, "story has", "stories have")} passed my checks and ${d.review.length === 1 ? "is" : "are"} ready for you. Open one, try it, then accept it or ask for changes.` },
      { kind: "stories", items: d.review },
    ]),
  ];
}

/** The Fixer on what's stuck: it lists them, then gets straight to the first. */
function stuck(d: AskData): Turn[] {
  const [first] = d.stuck;
  return [
    say(
      "fixer",
      [
        { kind: "text", text: `${plural(d.stuck.length, "story is", "stories are")} stuck, both on something that failed rather than on a person. I’m taking hq-${first.id} first.` },
        { kind: "stories", items: d.stuck },
      ],
      700,
      { now: `Retrying hq-${first.id}`, working: true },
    ),
    say(
      "fixer",
      [
        { kind: "text", text: `Restarted the preview for hq-${first.id}. It failed because the build ran out of memory, so I gave it more and it’s starting now. I’ll tell you if it fails again.` },
        { kind: "stories", items: [{ ...first, status: "building", detail: "Preview restarting" }] },
      ],
      1600,
      { now: `Restarting hq-${first.id}`, working: true },
    ),
  ];
}

/** The Checker re-running a story: it says it's on it, then posts the results. */
function check(d: AskData): Turn[] {
  const story = d.review[0] ?? { id: 43, title: "Creation flow revision", status: "in_review" as const };
  return [
    say("checker", [{ kind: "text", text: `Running hq-${story.id} again on web and Android, against what the story asked for.` }], 700, {
      now: `Checking hq-${story.id}`,
      working: true,
    }),
    say(
      "checker",
      [
        { kind: "text", text: "Done. Nearly everything passes; one thing needs a fix before you review it." },
        { kind: "checks", story, passed: 23, failed: 1, note: "On Android the event date shows as 11/20 instead of 20 Nov." },
        { kind: "suggest", items: ["Ask Builder to fix it", "What’s ready to review?"] },
      ],
      2200,
      { now: `Checked hq-${story.id} · 1 to fix`, working: false },
    ),
  ];
}

// ---------- New work: straight to the bot you named, or routed by the PM ----------

function design(d: AskData, q: string, direct: boolean): Turn[] {
  const what = topicOf(q, ["design", "sketch", "mock up"]) || "settings page";
  const directions = say(
    "designer",
    [
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
    2400,
    { now: "Sent three directions", working: false },
  );
  const opener = direct
    ? say("designer", [{ kind: "text", text: `On it. Sketching a few directions for the ${what}, using ${d.project}’s existing screens.` }], 700, {
        now: `Sketching the ${what}`,
        working: true,
      })
    : say("pm", [
        { kind: "text", text: `Good idea. I’ve asked Designer to sketch a few directions for the ${what}, using ${d.project}’s existing screens.` },
        { kind: "handoff", to: "designer", task: `Sketch the ${what}` },
      ]);
  return [opener, directions];
}

/** After a design is picked: the Designer hands it on, written up as a story for the Builder. */
export function pickDesign(option: string, label: string, d: AskData): Turn[] {
  const id = d.nextStoryId;
  return [
    say("designer", [
      { kind: "text", text: `${option} it is. I’ve written it up as a story with ${label.toLowerCase()} as the design. Approve the plan and the Builder starts.` },
      { kind: "stories", items: [{ id, title: "Settings page", status: "needs_input", detail: `Design ${option} · plan ready` }] },
      { kind: "suggest", items: ["@Builder build it now", "What’s happening right now?"] },
    ]),
  ];
}

function build(d: AskData, q: string, direct: boolean): Turn[] {
  // "Build it now" after picking a design means the settings page that was just written up.
  const what = topicOf(q, ["build", "add", "make", "implement", "code"]) || (/\b(it|this|that)\b/i.test(q) ? "settings page" : "check-in reminders");
  const story = { id: d.nextStoryId, title: capitalise(what) };
  const steps: Block = { kind: "steps", story, steps: ["Read the story and the screens", "Write the change", "Run the tests", "Open the pull request"] };
  const working = { now: `Building hq-${story.id}`, working: true };
  if (direct) {
    return [
      say(
        "builder",
        [{ kind: "text", text: `On it. I’ve written “${story.title}” up as hq-${story.id} and started. The Checker tests it before it reaches you.` }, steps],
        800,
        working,
      ),
    ];
  }
  return [
    say("pm", [
      { kind: "text", text: `On it. I’ve written “${story.title}” up as hq-${story.id} and handed it to the Builder. The Checker tests it before it reaches you.` },
      { kind: "handoff", to: "builder", task: `Build hq-${story.id}` },
    ]),
    say("builder", [{ kind: "text", text: "Started. Here’s where it is; I’ll post the preview when the Checker has passed it." }, steps], 2000, working),
  ];
}

function fix(d: AskData, direct: boolean): Turn[] {
  const story: StoryRef = d.review[0] ?? { id: 43, title: "Creation flow revision", status: "in_review" };
  const builder = say(
    "builder",
    [
      { kind: "text", text: "Found it: the date used the phone’s short format. Switching it to “20 Nov” everywhere, then the Checker runs it again." },
      { kind: "steps", story, steps: ["Find where the date is formatted", "Use the app’s date format", "Run the tests", "Hand it to the Checker"] },
    ],
    direct ? 800 : 2000,
    { now: `Fixing hq-${story.id}`, working: true },
  );
  if (direct) return [builder];
  return [
    say("pm", [
      { kind: "text", text: `I’ve sent the Android date fix on hq-${story.id} back to the Builder.` },
      { kind: "handoff", to: "builder", task: `Fix the date format on hq-${story.id}` },
    ]),
    builder,
  ];
}

// ---------- A bot on what it's doing, in its own words ----------

function status(id: BotId): Turn[] {
  const lines: Record<BotId, Block[]> = {
    pm: [{ kind: "text", text: "That’s me. I’m here with you, keeping an eye on every story so you don’t have to." }],
    builder: [
      { kind: "text", text: "I’m building hq-54, your calendar of upcoming plans. I started about four minutes ago; the Checker gets it when I’m done." },
      { kind: "stories", items: [{ id: 54, title: "Your calendar: see your upcoming plans", status: "building", detail: "Started 4m ago" }] },
    ],
    checker: [
      { kind: "text", text: "I’m testing hq-43 on web and Android against what the story asked for. Results in a minute or two." },
      { kind: "stories", items: [{ id: 43, title: "Creation flow revision", status: "checking", detail: "Started 1m ago" }] },
    ],
    fixer: [
      { kind: "text", text: "I’m retrying the preview for hq-21. It failed to start this morning because the build ran out of memory, so I’m giving it more." },
      { kind: "stories", items: [{ id: 21, title: "Test story", status: "failed", detail: "Retrying the preview" }] },
    ],
    designer: [
      { kind: "text", text: "I’m sketching hq-23, the onboarding value slider and language switch. Two of the three screens are drawn; you’ll get directions to pick from in a few minutes." },
      { kind: "stories", items: [{ id: 23, title: "Onboarding value slider and language switch", status: "draft", detail: "Sketching · 2 of 3 screens" }] },
      { kind: "suggest", items: ["@Designer sketch a profile page", "What’s happening right now?"] },
    ],
  };
  return [say(id, lines[id])];
}

/** The thing asked for, after the first verb that appears: "Design a settings page" → "settings page". */
function topicOf(q: string, verbs: string[]) {
  const text = q.replace(/@?\b(pm|builder|designer|checker|fixer)\b[,:]?\s*/gi, "");
  for (const verb of verbs) {
    const m = text.match(new RegExp(`\\b${verb}\\s+(?:me\\s+)?(?:(?:an|a|the|some)\\s+)?(.+?)[.?!]*$`, "i"));
    const t = m?.[1]?.trim();
    if (t) return t.length <= 60 && !/^(it|this|that)\b/i.test(t) ? t : "";
  }
  return "";
}

// ---------- A bot's own chat (/ask/builder …): it answers you directly ----------

/** Each bot's quick asks, under its workbench. */
export const BOT_ASKS: Record<Exclude<BotId, "pm">, string[]> = {
  builder: ["What are you building?", "Show me the preview", "Build dark mode", "Fix the Android date bug"],
  designer: ["What are you sketching?", "Show me your sketches", "Design a settings page", "Sketch the onboarding flow"],
  checker: ["What are you testing?", "Check hq-43 again", "What failed this week?", "What’s ready to review?"],
  fixer: ["What are you fixing?", "What’s broken?", "Why did hq-21 fail?", "What did you fix this week?"],
};

const ASKING_STATUS = /\b(what are you|doing|working on|up to|how are you|busy)\b/i;

/**
 * In a bot's own chat, that bot answers. Anything outside its job, it says whose it is, and that bot answers in the
 * same thread. Naming another bot (@Designer …) goes straight to it.
 */
export function answerAs(bot: BotId, question: string, d: AskData): Turn[] {
  if (bot === "pm") return answer(question, d);
  const q = question.trim();
  const other = addressee(q);
  if (other && other !== bot) return answer(q, d);
  if (ASKING_STATUS.test(q)) return status(bot);
  const rest = q.replace(new RegExp(`@?\\b${bot}\\b`, "gi"), "");
  switch (bot) {
    case "builder":
      if (FIX.test(rest)) return fix(d, true);
      if (/\bpreview\b/i.test(rest)) return builderPreview();
      if (BUILD.test(rest)) return build(d, rest, true);
      if (MERGED.test(rest)) return merged(d);
      break;
    case "designer":
      if (/\b(sketches|drawings|drawing board|board)\b/i.test(rest)) return designerSketches();
      if (DESIGN.test(rest)) return design(d, rest, true);
      break;
    case "checker":
      if (CHECK.test(rest)) return check(d);
      if (REVIEW.test(rest)) return review(d);
      if (STUCK.test(rest)) return checkerFailures(d);
      break;
    case "fixer":
      if (/\b(fixed|this week)\b/i.test(rest)) return fixerFixed();
      if (STUCK.test(rest) || FIX.test(rest)) return stuck(d);
      break;
  }
  if (!understands(q)) return botFallback(bot);
  const turns = answer(q, d);
  const first = turns[0]?.from;
  if (first && first !== bot) {
    const owner = first === "pm" ? "PM" : `the ${TEAM[first].name}`;
    return [say(bot, [{ kind: "text", text: `That one’s for ${owner}; I’ve passed it on.` }], 600), ...turns];
  }
  return turns;
}

function botFallback(bot: Exclude<BotId, "pm">): Turn[] {
  const what: Record<typeof bot, string> = {
    builder: "I write the code: ask what I’m building, see a preview, or give me something new to build.",
    designer: "I sketch screens and flows: ask what’s on my board, or give me something to design.",
    checker: "I test every change: ask what I’m checking, what failed, or what’s ready for you.",
    fixer: "I pick up whatever failed: ask what’s broken, or why something failed.",
  };
  return [say(bot, [{ kind: "text", text: what[bot] }, { kind: "suggest", items: BOT_ASKS[bot] }])];
}

function builderPreview(): Turn[] {
  return [
    say("builder", [
      { kind: "text", text: "hq-54’s preview is up from my last good build, about two hours ago. Today’s changes land in it when the tests pass." },
      { kind: "stories", items: [{ id: 54, title: "Your calendar: see your upcoming plans", status: "building", detail: "Preview ready · last build 2h ago" }] },
      { kind: "suggest", items: ["What are you building?", "Build dark mode"] },
    ]),
  ];
}

function designerSketches(): Turn[] {
  return [
    say("designer", [
      { kind: "text", text: `Here’s my board for hq-23, the onboarding value slider and language switch. Pick one and I’ll write it up for the Builder.` },
      {
        kind: "designs",
        options: [
          { id: "A", label: "Slider", layout: "cards" },
          { id: "B", label: "One list", layout: "list" },
          { id: "C", label: "Split view", layout: "split" },
        ],
      },
    ]),
  ];
}

function checkerFailures(d: AskData): Turn[] {
  return [
    say("checker", [
      { kind: "text", text: `${plural(d.stuck.length, "story", "stories")} failed this week, both before reaching my checks: a preview that wouldn’t start, and a full check waiting on an admin. The Fixer has them.` },
      { kind: "stories", items: d.stuck },
      { kind: "suggest", items: ["What’s ready to review?", "@Fixer what are you fixing?"] },
    ]),
  ];
}

function fixerFixed(): Turn[] {
  return [
    say("fixer", [
      { kind: "text", text: "Three fixes this week: two previews that ran out of memory and a flaky sign-in test. Each went back through the Checker." },
      {
        kind: "stories",
        items: [
          { id: 26, title: "Home feed states: loading, empty, error, offline", status: "merged", detail: "Preview restarted · Tuesday" },
          { id: 24, title: "Invite-only gate and waitlist form", status: "merged", detail: "Flaky test fixed · Monday" },
          { id: 25, title: "Phone sign-up and verification code", status: "merged", detail: "Preview restarted · Monday" },
        ],
      },
    ]),
  ];
}
