import type { AskData, Block, BotId, StoryRef, Turn } from "@/types/ask";
import { currentId } from "./team";

// The demo's team: no model behind it yet. What you asked is matched to a scripted answer built from the
// project's own stories. You only ever talk to the PM. It answers what it can itself, hands new work to the bot
// whose area it is (design → Designer, build or fix → Developer, test → Tester, stuck → Debugger), and comes back with
// what that bot made. The other bots never speak: their work shows as handoff and activity lines, and as results
// credited "by <bot>". Naming a bot ("@Designer …", "ask Developer to fix it") is a hint to the PM about who should
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

/** The bot a request names: "@Developer …", "What is Designer doing?", "Ask Developer to fix it". */
function named(q: string): BotId | null {
  const m = q.match(/@?\b(pm|developer|designer|tester|debugger|builder|checker|fixer)\b/i);
  // "@Builder" (a first name) still reaches the Developer.
  return m ? currentId(m[1].toLowerCase() as Parameters<typeof currentId>[0]) : null;
}

/** Does the script have a real answer for this, rather than its "here's what I can do" reply? */
export function understands(question: string) {
  const q = question.trim();
  return !!named(q) || [FIX, DESIGN, BUILD, CHECK, MERGED, STUCK, REVIEW, TEAMQ, OVERVIEW].some((re) => re.test(q));
}

export function answer(question: string, d: AskData): Turn[] {
  const q = question.trim();
  const who = named(q);
  const rest = q.replace(/@?\b(pm|developer|designer|tester|debugger|builder|checker|fixer)\b/gi, "");

  // A bot named with work in its own area: the PM hands it that work.
  if (who === "developer" && FIX.test(rest)) return fix(d);
  if (who === "developer" && BUILD.test(rest)) return build(d, q);
  if (who === "designer" && DESIGN.test(rest)) return design(d, q);
  if (who === "tester" && CHECK.test(rest)) return check(d);
  if (who === "tester" && REVIEW.test(rest)) return review(d);
  if (who === "debugger" && (STUCK.test(rest) || FIX.test(rest))) return stuck(d);
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
      { kind: "text", text: `${plural(d.merged.length, "change")} merged this week. Developer made each one, and each passed the Tester and your review first.` },
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
        text: `${plural(d.review.length, "story has", "stories have")} passed the Tester and ${d.review.length === 1 ? "is" : "are"} ready for you. Open one, try it, then accept it or ask for changes.`,
      },
      { kind: "stories", items: d.review },
    ]),
  ];
}

/** What a bot is on, told by the PM. */
function status(id: BotId): Turn[] {
  const lines: Record<BotId, Block[]> = {
    pm: [{ kind: "text", text: "That’s me. I’m here with you, keeping an eye on every story and handing out the work, so you don’t have to." }],
    developer: [
      { kind: "text", text: "Developer is building hq-54, your calendar of upcoming plans. It started about four minutes ago; the Tester gets it when it’s done." },
      { kind: "stories", items: [{ id: 54, title: "Your calendar: see your upcoming plans", status: "building", detail: "Started 4m ago" }] },
    ],
    tester: [
      { kind: "text", text: "Tester is testing hq-43 on web and Android, against what the story asked for. I’ll bring you the results in a minute or two." },
      { kind: "stories", items: [{ id: 43, title: "Creation flow revision", status: "checking", detail: "Started 1m ago" }] },
    ],
    debugger: [
      { kind: "text", text: "Debugger is retrying the preview for hq-21. It failed to start this morning because the build ran out of memory, so Debugger is giving it more." },
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
        { kind: "text", text: `${plural(d.stuck.length, "story is", "stories are")} stuck, both on something that failed rather than on a person. I’ve asked Debugger to take hq-${first.id} first.` },
        { kind: "stories", items: d.stuck },
        { kind: "handoff", to: "debugger", task: `Get hq-${first.id} running again`, story: first.id },
      ],
      700,
      { status: { bot: "debugger", now: `Retrying hq-${first.id}`, working: true } },
    ),
    pm(
      [
        { kind: "text", text: `Debugger found it: hq-${first.id}’s build ran out of memory. It gave the build more, and the preview is starting now. I’ll tell you if it fails again.` },
        {
          kind: "activity",
          by: "debugger",
          lines: [
            { text: `read the hq-${first.id} build log`, tone: "done" },
            { text: "found the build ran out of memory", tone: "warn" },
            { text: "restarted the preview with more memory", tone: "work" },
          ],
        },
        { kind: "stories", items: [{ ...first, status: "building", detail: "Preview restarting" }] },
      ],
      1600,
      { wait: "debugger", status: { bot: "debugger", now: `Restarting hq-${first.id}`, working: true } },
    ),
  ];
}

function check(d: AskData): Turn[] {
  const story = d.review[0] ?? { id: 43, title: "Creation flow revision", status: "in_review" as const };
  return [
    pm(
      [
        { kind: "text", text: `I’ve asked Tester to run hq-${story.id} again on web and Android, against what the story asked for.` },
        { kind: "handoff", to: "tester", task: `Check hq-${story.id} again`, story: story.id },
      ],
      700,
      { status: { bot: "tester", now: `Checking hq-${story.id}`, working: true } },
    ),
    pm(
      [
        { kind: "text", text: "Tester is done. Nearly everything passes; one thing needs a fix before you review it." },
        {
          kind: "activity",
          by: "tester",
          lines: [
            { text: "signed in as the two sample users", tone: "done" },
            { text: "ran 24 checks on web and Android", tone: "done" },
            { text: "the event date shows as 11/20 on Android", tone: "warn" },
          ],
        },
        { kind: "checks", by: "tester", story, passed: 23, failed: 1, note: "On Android the event date shows as 11/20 instead of 20 Nov." },
        {
          kind: "approval",
          title: `Send hq-${story.id} back to Developer?`,
          body: "Developer switches the date to “20 Nov” everywhere, then Tester runs it again before it reaches you.",
          yes: { label: "Send it back", ask: `Have Developer fix the date on hq-${story.id}` },
          no: "Not now",
        },
      ],
      2200,
      { wait: "tester", status: { bot: "tester", now: `Checked hq-${story.id} · 1 to fix`, working: false } },
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

/** After you pick a design: the PM has it written up and asks before Developer starts. */
export function pickDesign(option: string, label: string, d: AskData): Turn[] {
  const id = d.nextStoryId;
  return [
    pm([
      { kind: "text", text: `${option} it is. I’ve written it up as hq-${id}, with ${label.toLowerCase()} as the design.` },
      { kind: "stories", items: [{ id, title: "Settings page", status: "needs_input", detail: `Design ${option} · plan ready` }] },
      {
        kind: "approval",
        title: `Start building hq-${id}?`,
        body: "Developer writes the change, Tester tests it, then it comes to you for review.",
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
        { kind: "text", text: `On it. I’ve written “${story.title}” up as hq-${story.id} and handed it to Developer. Tester tests it before it reaches you.` },
        { kind: "handoff", to: "developer", task: `Build hq-${story.id}` },
      ],
      700,
      { status: { bot: "developer", now: `Building hq-${story.id}`, working: true } },
    ),
    pm(
      [
        { kind: "text", text: "Developer has started. Here’s where it is; I’ll bring you the preview once Tester has passed it." },
        { kind: "steps", by: "developer", story, steps: ["Read the story and the screens", "Write the change", "Run the tests", "Open the pull request"] },
      ],
      2000,
      { wait: "developer" },
    ),
  ];
}

function fix(d: AskData): Turn[] {
  const story: StoryRef = d.review[0] ?? { id: 43, title: "Creation flow revision", status: "in_review" };
  return [
    pm(
      [
        { kind: "text", text: `I’ve sent the Android date fix on hq-${story.id} back to Developer.` },
        { kind: "handoff", to: "developer", task: `Fix the date on hq-${story.id}`, story: story.id },
      ],
      700,
      { status: { bot: "developer", now: `Fixing hq-${story.id}`, working: true } },
    ),
    pm(
      [
        { kind: "text", text: "Developer found it: the date used the phone’s short format. It’s switching to “20 Nov” everywhere, then Tester runs it again." },
        { kind: "steps", by: "developer", story, steps: ["Find where the date is formatted", "Use the app’s date format", "Run the tests", "Hand it to the Tester"] },
      ],
      2000,
      { wait: "developer" },
    ),
  ];
}

/** The thing asked for, after the first verb that appears: "Design a settings page" → "settings page". */
function topicOf(q: string, verbs: string[]) {
  const text = q.replace(/^(have|ask|get)\s+/i, "").replace(/@?\b(pm|developer|designer|tester|debugger|builder|checker|fixer)\b[,:]?\s*(to\s+)?/gi, "");
  for (const verb of verbs) {
    const m = text.match(new RegExp(`\\b${verb}\\s+(?:me\\s+)?(?:(?:an|a|the|some)\\s+)?(.+?)[.?!]*$`, "i"));
    const t = m?.[1]?.trim();
    if (t) return t.length <= 60 && !/^(it|this|that)\b/i.test(t) ? t : "";
  }
  return "";
}

// ---------- A bot's page (/ask/developer …): its workbench, with the PM answering ----------
// himalay's bot pages meet Shubham's rule here: you only talk to the PM (25 Nov). On a bot's page, a question that
// doesn't name another bot is about that bot: the PM says what it's doing, explains its job, or hands it the work.

/** Each bot's quick asks, under its workbench. */
export const BOT_ASKS: Record<Exclude<BotId, "pm">, string[]> = {
  developer: ["What are you building?", "Show me the preview", "Build dark mode", "Fix the Android date bug"],
  designer: ["What are you sketching?", "Show me your sketches", "Design a settings page", "Sketch the onboarding flow"],
  tester: ["What are you testing?", "Check hq-43 again", "What failed this week?", "What’s ready to review?"],
  debugger: ["What are you fixing?", "What’s broken?", "Why did hq-21 fail?", "What did you fix this week?"],
};

/** First-time quick asks, for a bot with nothing on yet (?state=new). */
export const BOT_FIRST_ASKS: Record<Exclude<BotId, "pm">, string[]> = {
  developer: ["What can you do?", "Build check-in reminders", "How do you work with the Tester?"],
  designer: ["What can you do?", "Design a settings page", "Sketch an onboarding flow"],
  tester: ["What can you do?", "What do you check?", "How do I review a story?"],
  debugger: ["What can you do?", "What do you do when a build fails?", "How do I know something’s stuck?"],
};

const ASKING_STATUS = /\b(what are you|doing|working on|up to|busy)\b/i;
const INTRO = /\b(what can you do|who are you|how do you|what do you (check|do)|how do i)\b/i;

/** The PM on a bot's job, for "What can you do?" on its page. */
const JOB: Record<Exclude<BotId, "pm">, string> = {
  developer:
    "Developer writes the code. Tell me what you need and I hand it over: Developer makes the change, runs the tests and opens a pull request. Tester tests it on web and phones before it reaches you, and Debugger steps in if a build fails.",
  designer:
    "Designer sketches screens and flows. Tell me what you need and I’ll bring you a few directions to pick from; the one you pick becomes a story for Developer.",
  tester:
    "Tester tests every change against what the story asked for, on web, Android and iOS. When everything passes, I bring it to you: open it, try it, then accept it or ask for changes.",
  debugger:
    "Debugger picks up anything that fails: a preview that won’t start, a check that breaks, a stuck build. It retries, fixes what it can, and I tell you what it found.",
};

/**
 * Who answers on a bot's page: always the PM (Shubham, 25 Nov). A question that doesn't name another bot is about
 * this one, so "What are you building?" on Developer's page gets the PM's word on what Developer is building, and "Build
 * dark mode" goes to Developer through the PM.
 */
export function answerAs(bot: BotId, question: string, d: AskData, fresh = false): Turn[] {
  const q = question.trim();
  if (bot === "pm" || named(q)) return answer(q, d);
  const name = bot.charAt(0).toUpperCase() + bot.slice(1);
  if (INTRO.test(q)) return [pm([{ kind: "text", text: JOB[bot] }, { kind: "suggest", items: BOT_FIRST_ASKS[bot].filter((a) => !INTRO.test(a)) }])];
  if (fresh && ASKING_STATUS.test(q)) {
    return [pm([{ kind: "text", text: `${name} has nothing on yet. Tell me what you need and I’ll hand it over.` }, { kind: "suggest", items: BOT_FIRST_ASKS[bot] }])];
  }
  return answer(`@${name} ${q}`, d);
}
