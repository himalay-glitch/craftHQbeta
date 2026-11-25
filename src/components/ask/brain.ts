import type { AskData, Block, BotId, StoryRef, Turn } from "@/types/ask";

// The demo's team: no model behind it yet. What you asked is matched to a scripted answer built from the
// project's own stories. You only ever talk to the PM. It answers what it can itself, hands new work to the bot
// whose area it is (design → Designer, build or fix → Builder, test → Checker, stuck → Fixer), and comes back with
// what that bot made. The other bots never speak: their work shows as handoff and activity lines, and as results
// credited "by <bot>". Naming a bot ("@Designer …", "ask Builder to fix it") is a hint to the PM about who should
// do it, not a conversation with that bot. Replace with the real agents later.

export const SUGGESTIONS = [
  "What’s happening right now?",
  "What merged this week?",
  "What’s stuck, and why?",
  "Design a settings page",
  "Build check-in reminders",
  "Who’s on the team?",
];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A message from the PM. `wait` is the bot working while you wait for it. */
const pm = (blocks: Block[], delay = 700, more: Pick<Turn, "wait" | "status"> = {}): Turn => ({ from: "pm", delay, blocks, ...more });

const FIX = /\bfix\b/i;
const DESIGN = /\b(design|sketch|mock ?up|screens?|layout|ui|wireframe|look)\b/i;
const BUILD = /\b(build|engineer|implement|code|develop|make|add)\b/i;
const CHECK = /\b(test|check|qa|verify)\b/i;
const MERGED = /\b(merged?|shipped?|released?|done|finished|live)\b/i;
const STUCK = /\b(stuck|blocked|fail(ed|ing)?|broken|errors?|retry)\b/i;
const REVIEW = /\b(review|approve|accept)\b/i;
const TEAMQ = /\b(who|team|bots?)\b/i;
const OVERVIEW = /\b(happening|what'?s up|status|progress|today|going on|update|overview|summary)\b/i;

/** The bot a request names: "@Builder …", "What is Designer doing?", "Ask Builder to fix it". */
function named(q: string): BotId | null {
  const m = q.match(/@?\b(pm|builder|designer|checker|fixer)\b/i);
  return m ? (m[1].toLowerCase() as BotId) : null;
}

/** Does the script have a real answer for this, rather than its "here's what I can do" reply? */
export function understands(question: string) {
  const q = question.trim();
  return !!named(q) || [FIX, DESIGN, BUILD, CHECK, MERGED, STUCK, REVIEW, TEAMQ, OVERVIEW].some((re) => re.test(q));
}

export function answer(question: string, d: AskData): Turn[] {
  const q = question.trim();
  const who = named(q);
  const rest = q.replace(/@?\b(pm|builder|designer|checker|fixer)\b/gi, "");

  // A bot named with work in its own area: the PM hands it that work.
  if (who === "builder" && FIX.test(rest)) return fix(d);
  if (who === "builder" && BUILD.test(rest)) return build(d, q);
  if (who === "designer" && DESIGN.test(rest)) return design(d, q);
  if (who === "checker" && CHECK.test(rest)) return check(d);
  if (who === "checker" && REVIEW.test(rest)) return review(d);
  if (who === "fixer" && (STUCK.test(rest) || FIX.test(rest))) return stuck(d);
  // A bot named with anything else: the PM says what that bot is doing.
  if (who && who !== "pm" && !DESIGN.test(rest) && !BUILD.test(rest)) return status(who);

  if (FIX.test(q)) return fix(d);
  if (DESIGN.test(q)) return design(d, q);
  if (BUILD.test(q)) return build(d, q);
  if (CHECK.test(q)) return check(d);
  if (MERGED.test(q)) return merged(d);
  if (STUCK.test(q)) return stuck(d);
  if (REVIEW.test(q)) return review(d);
  if (TEAMQ.test(q)) return team();
  if (OVERVIEW.test(q)) return overview(d);
  if (who === "pm") return status("pm");
  return [
    pm([
      { kind: "text", text: `I can tell you anything about ${d.project}’s stories, or get new work started. Tell me what you need and I’ll hand it to the right bot.` },
      { kind: "suggest", items: SUGGESTIONS.slice(0, 4) },
    ]),
  ];
}

// ---------- What the PM answers itself ----------

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

function team(): Turn[] {
  return [
    pm([
      { kind: "text", text: "Here’s the team. You talk to me; I hand each job to the right one and bring back what they make." },
      { kind: "team" },
    ]),
  ];
}

function merged(d: AskData): Turn[] {
  return [
    pm([
      { kind: "text", text: `${plural(d.merged.length, "change")} merged this week. Builder made each one, and each passed the Checker and your review first.` },
      { kind: "stories", items: d.merged },
      { kind: "suggest", items: ["What’s happening right now?", "What’s ready to review?"] },
    ]),
  ];
}

function review(d: AskData): Turn[] {
  return [
    pm([
      {
        kind: "text",
        text: `${plural(d.review.length, "story has", "stories have")} passed the Checker and ${d.review.length === 1 ? "is" : "are"} ready for you. Open one, try it, then accept it or ask for changes.`,
      },
      { kind: "stories", items: d.review },
    ]),
  ];
}

/** What a bot is on, told by the PM. */
function status(id: BotId): Turn[] {
  const lines: Record<BotId, Block[]> = {
    pm: [{ kind: "text", text: "That’s me. I’m here with you, keeping an eye on every story and handing out the work, so you don’t have to." }],
    builder: [
      { kind: "text", text: "Builder is building hq-54, your calendar of upcoming plans. It started about four minutes ago; the Checker gets it when it’s done." },
      { kind: "stories", items: [{ id: 54, title: "Your calendar: see your upcoming plans", status: "building", detail: "Started 4m ago" }] },
    ],
    checker: [
      { kind: "text", text: "Checker is testing hq-43 on web and Android, against what the story asked for. I’ll bring you the results in a minute or two." },
      { kind: "stories", items: [{ id: 43, title: "Creation flow revision", status: "checking", detail: "Started 1m ago" }] },
    ],
    fixer: [
      { kind: "text", text: "Fixer is retrying the preview for hq-21. It failed to start this morning because the build ran out of memory, so Fixer is giving it more." },
      { kind: "stories", items: [{ id: 21, title: "Test story", status: "failed", detail: "Retrying the preview" }] },
    ],
    designer: [
      { kind: "text", text: "Designer is sketching hq-23, the onboarding value slider and language switch. Two of the three screens are drawn; I’ll bring you the directions when they’re ready." },
      { kind: "stories", items: [{ id: 23, title: "Onboarding value slider and language switch", status: "draft", detail: "Sketching · 2 of 3 screens" }] },
      { kind: "suggest", items: ["Have Designer sketch a profile page", "What’s happening right now?"] },
    ],
  };
  return [pm(lines[id])];
}

// ---------- Work the PM hands out, then brings back ----------

function stuck(d: AskData): Turn[] {
  const [first] = d.stuck;
  return [
    pm(
      [
        { kind: "text", text: `${plural(d.stuck.length, "story is", "stories are")} stuck, both on something that failed rather than on a person. I’ve asked Fixer to take hq-${first.id} first.` },
        { kind: "stories", items: d.stuck },
        { kind: "handoff", to: "fixer", task: `Get hq-${first.id} running again`, story: first.id },
      ],
      700,
      { status: { bot: "fixer", now: `Retrying hq-${first.id}`, working: true } },
    ),
    pm(
      [
        { kind: "text", text: `Fixer found it: hq-${first.id}’s build ran out of memory. It gave the build more, and the preview is starting now. I’ll tell you if it fails again.` },
        {
          kind: "activity",
          by: "fixer",
          lines: [
            { text: `read the hq-${first.id} build log`, tone: "done" },
            { text: "found the build ran out of memory", tone: "warn" },
            { text: "restarted the preview with more memory", tone: "work" },
          ],
        },
        { kind: "stories", items: [{ ...first, status: "building", detail: "Preview restarting" }] },
      ],
      1600,
      { wait: "fixer", status: { bot: "fixer", now: `Restarting hq-${first.id}`, working: true } },
    ),
  ];
}

function check(d: AskData): Turn[] {
  const story = d.review[0] ?? { id: 43, title: "Creation flow revision", status: "in_review" as const };
  return [
    pm(
      [
        { kind: "text", text: `I’ve asked Checker to run hq-${story.id} again on web and Android, against what the story asked for.` },
        { kind: "handoff", to: "checker", task: `Check hq-${story.id} again`, story: story.id },
      ],
      700,
      { status: { bot: "checker", now: `Checking hq-${story.id}`, working: true } },
    ),
    pm(
      [
        { kind: "text", text: "Checker is done. Nearly everything passes; one thing needs a fix before you review it." },
        {
          kind: "activity",
          by: "checker",
          lines: [
            { text: "signed in as the two sample users", tone: "done" },
            { text: "ran 24 checks on web and Android", tone: "done" },
            { text: "the event date shows as 11/20 on Android", tone: "warn" },
          ],
        },
        { kind: "checks", by: "checker", story, passed: 23, failed: 1, note: "On Android the event date shows as 11/20 instead of 20 Nov." },
        {
          kind: "approval",
          title: `Send hq-${story.id} back to Builder?`,
          body: "Builder switches the date to “20 Nov” everywhere, then Checker runs it again before it reaches you.",
          yes: { label: "Send it back", ask: `Have Builder fix the date on hq-${story.id}` },
          no: "Not now",
        },
      ],
      2200,
      { wait: "checker", status: { bot: "checker", now: `Checked hq-${story.id} · 1 to fix`, working: false } },
    ),
  ];
}

function design(d: AskData, q: string): Turn[] {
  const what = topicOf(q, ["design", "sketch", "mock up"]) || "settings page";
  return [
    pm(
      [
        { kind: "text", text: `Good idea. I’ve asked Designer to sketch a few directions for the ${what}, using ${d.project}’s existing screens.` },
        { kind: "handoff", to: "designer", task: `Sketch the ${what}` },
      ],
      700,
      { status: { bot: "designer", now: `Sketching the ${what}`, working: true } },
    ),
    pm(
      [
        { kind: "text", text: `Designer has three directions for the ${what}. A keeps everything in one list, B groups it into cards, C splits sections from details. Pick one and I’ll get it written up.` },
        {
          kind: "activity",
          by: "designer",
          lines: [
            { text: `looked through ${d.project}’s existing screens`, tone: "done" },
            { text: "drew three directions", tone: "done" },
          ],
        },
        {
          kind: "designs",
          by: "designer",
          options: [
            { id: "A", label: "One list", layout: "list" },
            { id: "B", label: "Cards", layout: "cards" },
            { id: "C", label: "Split view", layout: "split" },
          ],
        },
      ],
      2400,
      { wait: "designer", status: { bot: "designer", now: "Sent three directions", working: false } },
    ),
  ];
}

/** After you pick a design: the PM has it written up and asks before Builder starts. */
export function pickDesign(option: string, label: string, d: AskData): Turn[] {
  const id = d.nextStoryId;
  return [
    pm([
      { kind: "text", text: `${option} it is. I’ve written it up as hq-${id}, with ${label.toLowerCase()} as the design.` },
      { kind: "stories", items: [{ id, title: "Settings page", status: "needs_input", detail: `Design ${option} · plan ready` }] },
      {
        kind: "approval",
        title: `Start building hq-${id}?`,
        body: "Builder writes the change, Checker tests it, then it comes to you for review.",
        by: "designer",
        yes: { label: "Start building", ask: "Build it now" },
        no: "Not yet",
      },
    ]),
  ];
}

function build(d: AskData, q: string): Turn[] {
  // "Build it now" after picking a design means the settings page that was just written up.
  const what = topicOf(q, ["build", "add", "make", "implement", "code"]) || (/\b(it|this|that)\b/i.test(q) ? "settings page" : "check-in reminders");
  const story = { id: d.nextStoryId, title: capitalise(what) };
  return [
    pm(
      [
        { kind: "text", text: `On it. I’ve written “${story.title}” up as hq-${story.id} and handed it to Builder. Checker tests it before it reaches you.` },
        { kind: "handoff", to: "builder", task: `Build hq-${story.id}` },
      ],
      700,
      { status: { bot: "builder", now: `Building hq-${story.id}`, working: true } },
    ),
    pm(
      [
        { kind: "text", text: "Builder has started. Here’s where it is; I’ll bring you the preview once Checker has passed it." },
        { kind: "steps", by: "builder", story, steps: ["Read the story and the screens", "Write the change", "Run the tests", "Open the pull request"] },
      ],
      2000,
      { wait: "builder" },
    ),
  ];
}

function fix(d: AskData): Turn[] {
  const story: StoryRef = d.review[0] ?? { id: 43, title: "Creation flow revision", status: "in_review" };
  return [
    pm(
      [
        { kind: "text", text: `I’ve sent the Android date fix on hq-${story.id} back to Builder.` },
        { kind: "handoff", to: "builder", task: `Fix the date on hq-${story.id}`, story: story.id },
      ],
      700,
      { status: { bot: "builder", now: `Fixing hq-${story.id}`, working: true } },
    ),
    pm(
      [
        { kind: "text", text: "Builder found it: the date used the phone’s short format. It’s switching to “20 Nov” everywhere, then Checker runs it again." },
        { kind: "steps", by: "builder", story, steps: ["Find where the date is formatted", "Use the app’s date format", "Run the tests", "Hand it to the Checker"] },
      ],
      2000,
      { wait: "builder" },
    ),
  ];
}

/** The thing asked for, after the first verb that appears: "Design a settings page" → "settings page". */
function topicOf(q: string, verbs: string[]) {
  const text = q.replace(/^(have|ask|get)\s+/i, "").replace(/@?\b(pm|builder|designer|checker|fixer)\b[,:]?\s*(to\s+)?/gi, "");
  for (const verb of verbs) {
    const m = text.match(new RegExp(`\\b${verb}\\s+(?:me\\s+)?(?:(?:an|a|the|some)\\s+)?(.+?)[.?!]*$`, "i"));
    const t = m?.[1]?.trim();
    if (t) return t.length <= 60 && !/^(it|this|that)\b/i.test(t) ? t : "";
  }
  return "";
}
