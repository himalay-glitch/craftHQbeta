import { useSyncExternalStore } from "react";

// Ticket tools a story can be imported from (Shubham, 26 Nov: "import from Jira, any platform that supports stories or
// tickets"), each with its real mark (the brand's own single-colour logo, from Simple Icons 16.37.0; GitHub's official
// Invertocat), with sample tickets until CraftHQ connects to them for real. Front end only: connecting is simulated and
// nothing leaves the browser. One shape for every tool, so adding one is a new entry here.

export interface Ticket {
  /** The ticket's own key in its tool: "WEP-142", "#214". */
  key: string;
  title: string;
  kind: "Story" | "Bug" | "Task" | "Issue" | "Card";
  /** Its status there, in the tool's words: "To do", "In progress". */
  status: string;
  /** One line on why it matters; becomes the story's "Why does it matter?". */
  why?: string;
  description: string;
  /** Acceptance criteria, when the ticket has them. */
  criteria?: string[];
  /** File names attached to the ticket; they come along as the story's files (names only, for now). */
  attachments?: string[];
  labels?: string[];
  /** When it last changed there. */
  updated: string;
  /** Already a story here: imported before, or linked by hand. */
  linkedStory?: number;
}

export interface TicketTool {
  id: string;
  name: string;
  /** The tool's official mark, in its brand colour (public/connect-accounts/): DESIGN.md §3.6, never redrawn. */
  logo: string;
  /** Who makes it, for the list: "Atlassian". */
  maker: string;
  /** Where its tickets live, once connected: "wepop.atlassian.net · WePop (WEP)". */
  place: string;
  /** What CraftHQ reads, said before connecting. */
  reads: string;
  tickets: Ticket[];
}

const generic = (prefix: string, kind: Ticket["kind"]): Ticket[] => [
  {
    key: `${prefix}1203`,
    title: "Let hosts pin a message to the top of the event chat",
    kind,
    status: "To do",
    why: "Important updates get lost under a busy chat.",
    description: "Hosts want one message, like the meeting point, to stay at the top of the event's chat for everyone.",
    criteria: ["Only the host can pin or unpin", "One pinned message at a time", "Guests see it above the chat, with “Pinned by the host”"],
    updated: "3d ago",
  },
  {
    key: `${prefix}1188`,
    title: "Show the event's weather on the day",
    kind,
    status: "Backlog",
    description: "On the event day, show the forecast for the event's place and time on the event page.",
    updated: "1w ago",
  },
];

export const TOOLS: TicketTool[] = [
  {
    id: "jira",
    name: "Jira",
    logo: "/connect-accounts/jira.svg",
    maker: "Atlassian",
    place: "wepop.atlassian.net · WePop (WEP)",
    reads: "issues in the projects you pick: titles, descriptions, acceptance criteria and attachments",
    tickets: [
      {
        key: "WEP-142",
        title: "Sign in with a one-time code",
        kind: "Story",
        status: "To do",
        why: "Returning users forget their password and get locked out.",
        description: "As a returning user, I want to sign in with a code texted to my phone, so I don’t need to remember a password.",
        criteria: [
          "“Text me a code” sits under the password field on the sign-in screen",
          "The code is 6 digits and expires after 10 minutes",
          "Three wrong codes pause code sign-in for 15 minutes",
          "Works in English and Korean",
        ],
        attachments: ["otp-sign-in.png", "otp-wrong-code.png"],
        labels: ["auth", "mobile"],
        updated: "2d ago",
      },
      {
        key: "WEP-160",
        title: "App closes when opening an expired invite link",
        kind: "Bug",
        status: "To do",
        why: "Guests tapping an old invite see the app close with no message.",
        description:
          "Steps: open an invite link for an event that has ended. Expected: a page saying the event has ended, with a way to find similar events. Actual: the app closes.",
        attachments: ["crash-log.txt"],
        labels: ["bug", "invites"],
        updated: "5h ago",
      },
      {
        key: "WEP-151",
        title: "Remember this phone on code sign-in",
        kind: "Story",
        status: "To do",
        why: "On their own phone, people shouldn’t need a code every time.",
        description: "After a code sign-in, offer “Remember this phone”. For 30 days, that phone signs in without a code.",
        criteria: ["The switch is off by default", "Signing out on that phone forgets it", "Settings lists remembered phones, with Remove"],
        labels: ["auth"],
        updated: "1d ago",
      },
      {
        key: "WEP-138",
        title: "Event page: show who’s going",
        kind: "Story",
        status: "In progress",
        description: "Show up to five faces of guests who are going, then “+12 going”, on the event page.",
        updated: "4d ago",
      },
      {
        key: "WEP-127",
        title: "Dark mode for the calendar",
        kind: "Story",
        status: "Backlog",
        description: "The calendar follows the phone’s dark mode.",
        updated: "1w ago",
        linkedStory: 58,
      },
    ],
  },
  {
    id: "linear",
    name: "Linear",
    logo: "/connect-accounts/linear.svg",
    maker: "Linear",
    place: "WePop team",
    reads: "issues in the teams you pick: titles, descriptions, sub-issues and attachments",
    tickets: [
      {
        key: "WEP-88",
        title: "Language switch on the first onboarding screen",
        kind: "Issue",
        status: "Todo",
        why: "People pick their language only after signing up, in Settings.",
        description: "Add a language button beside Skip on every onboarding card: English, 한국어, हिन्दी.",
        updated: "2d ago",
      },
      {
        key: "WEP-97",
        title: "Search ignores Korean names",
        kind: "Issue",
        status: "Backlog",
        description: "Searching for 박민지 finds nothing, though she’s a member.",
        labels: ["bug"],
        updated: "6d ago",
      },
    ],
  },
  {
    id: "github",
    name: "GitHub Issues",
    logo: "/connect-accounts/GitHub_Invertocat_Black.svg",
    maker: "GitHub",
    place: "betacraft/we-pop",
    reads: "open issues in the repository: titles, descriptions, labels and attachments",
    tickets: [
      {
        key: "#214",
        title: "Share sheet missing on Android",
        kind: "Issue",
        status: "Open",
        description: "On Android, Share on the event page does nothing. iOS opens the share sheet.",
        labels: ["android", "bug"],
        updated: "1d ago",
      },
      {
        key: "#209",
        title: "Pull to refresh on the home feed",
        kind: "Issue",
        status: "Open",
        description: "Pulling down on the home feed should load new events.",
        updated: "3d ago",
      },
    ],
  },
  { id: "asana", name: "Asana", logo: "/connect-accounts/asana.svg", maker: "Asana", place: "WePop product", reads: "tasks in the projects you pick: names, descriptions and attachments", tickets: generic("T-", "Task") },
  { id: "clickup", name: "ClickUp", logo: "/connect-accounts/clickup.svg", maker: "ClickUp", place: "WePop space", reads: "tasks: names, descriptions, checklists and attachments", tickets: generic("CU-", "Task") },
  { id: "trello", name: "Trello", logo: "/connect-accounts/trello.svg", maker: "Atlassian", place: "WePop board", reads: "cards on the boards you pick: titles, descriptions, checklists and attachments", tickets: generic("card ", "Card") },
  { id: "shortcut", name: "Shortcut", logo: "/connect-accounts/shortcut.svg", maker: "Shortcut", place: "WePop workspace", reads: "stories: titles, descriptions, tasks and attachments", tickets: generic("sc-", "Story") },
  // Azure Boards comes back once Microsoft's official mark is supplied: it isn't released for use like this one.
];

// ---- Which tools this browser has connected (Jira already, for the demo) ----

const KEY = "crafthq:ticket-tools";
const DEFAULT: readonly string[] = ["jira"];
const listeners = new Set<() => void>();
let cache: { raw: string | null; ids: readonly string[] } | null = null;

function read(): readonly string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Blocked storage: the defaults, until the page closes.
  }
  if (cache && cache.raw === raw) return cache.ids;
  let ids: readonly string[] = DEFAULT;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) ids = parsed.filter((x): x is string => typeof x === "string");
  } catch {
    // Unreadable: the defaults.
  }
  cache = { raw, ids };
  return ids;
}

export function connectTool(id: string) {
  const ids = [...new Set([...read(), id])];
  const raw = JSON.stringify(ids);
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    // Kept for this page only.
  }
  cache = { raw, ids };
  listeners.forEach((fn) => fn());
}

export const useConnectedTools = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    read,
    () => DEFAULT,
  );

/** The story's "Anything else": the ticket's description, then its acceptance criteria. */
export function detailOf(t: Ticket) {
  const criteria = t.criteria?.length ? `\n\nAcceptance criteria:\n${t.criteria.map((c) => `- ${c}`).join("\n")}` : "";
  return `${t.description}${criteria}`;
}
