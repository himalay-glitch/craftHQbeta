import type { Bot, BotId } from "@/types/ask";

// The demo team. The PM is the one you talk to; it answers from the stories and brings in the others.
// Posters live in public/images/bots/ (the Builder's is the login page's own). Renders: design/renders/bots_v010.
export const TEAM: Record<BotId, Bot> = {
  pm: {
    id: "pm",
    name: "PM",
    role: "Project manager",
    does: "Knows every story. Answers your questions and hands new work to the right bot.",
    now: "Listening",
    colour: "#E9B018",
    tint: "#FDF4D7",
    poster: "/images/bots/pm.webp",
  },
  builder: {
    id: "builder",
    name: "Builder",
    role: "Engineering",
    does: "Writes the change, opens the pull request and keeps it green.",
    now: "Building hq-54",
    colour: "#2B88F1",
    tint: "#E3EEFD",
    poster: "/images/bots/builder.webp",
    video: "/videos/bots/builder-idle",
  },
  designer: {
    id: "designer",
    name: "Designer",
    role: "Design",
    does: "Sketches screens and flows, and offers a few directions to pick from.",
    now: "Designing hq-23",
    colour: "#8B6CF0",
    tint: "#EFEAFE",
    poster: "/images/bots/designer.webp",
  },
  checker: {
    id: "checker",
    name: "Checker",
    role: "Testing",
    does: "Tests every change against what the story asked for, on web and phones.",
    now: "Checking hq-43",
    colour: "#22B573",
    tint: "#E2F6EC",
    poster: "/images/bots/checker.webp",
  },
  fixer: {
    id: "fixer",
    name: "Fixer",
    role: "Fixes failed builds",
    does: "Picks up anything that failed, retries it and tells you what it found.",
    now: "Retrying hq-21",
    colour: "#E8553E",
    tint: "#FDE8E4",
    poster: "/images/bots/fixer.webp",
  },
};

export const TEAM_ORDER: BotId[] = ["pm", "builder", "designer", "checker", "fixer"];
