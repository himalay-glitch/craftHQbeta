import type { Bot, BotId } from "@/types/ask";

// The demo team. The PM is the one you talk to; it answers from the stories and brings in the others.
// Faces: public/images/bots/team/<id>-{128,256,384}.webp, from the plush renders in design/renders/bots_v011
// (design/blender/crafthq_team_v002.blend); the Developer is the original furry blue one from the login page
// (design/renders/bots_v009). Colours are the renders' measured coats.
export const TEAM: Record<BotId, Bot> = {
  pm: {
    id: "pm",
    name: "PM",
    role: "Project manager",
    does: "Knows every story. Answers your questions and hands new work to the right agent.",
    now: "Listening",
    colour: "#F1BA3A",
    tint: "#FDF3D6",
    poster: "/images/bots/team/pm",
    video: "/videos/bots/pm-idle", // a gentle breathe and one sweet blink (2 s loop), in the welcome hero
  },
  developer: {
    id: "developer",
    name: "Developer",
    role: "Engineering",
    does: "Writes the change, opens the pull request and keeps it green.",
    now: "Building hq-54",
    colour: "#2B88F1",
    tint: "#E3EEFD",
    poster: "/images/bots/team/developer",
  },
  designer: {
    id: "designer",
    name: "Designer",
    role: "Design",
    does: "Sketches screens and flows, and offers a few directions to pick from.",
    now: "Designing hq-23",
    colour: "#8952EA",
    tint: "#EFE8FD",
    poster: "/images/bots/team/designer",
  },
  tester: {
    id: "tester",
    name: "Tester",
    role: "Testing",
    does: "Tests every change against what the story asked for, on web and phones.",
    now: "Checking hq-43",
    colour: "#2FC565",
    tint: "#E1F7E8",
    poster: "/images/bots/team/tester",
  },
  debugger: {
    id: "debugger",
    name: "Debugger",
    role: "Fixes failed builds",
    does: "Picks up anything that failed, retries it and tells you what it found.",
    now: "Retrying hq-21",
    colour: "#E93F3E",
    tint: "#FDE6E6",
    poster: "/images/bots/team/debugger",
  },
};

export const TEAM_ORDER: BotId[] = ["pm", "developer", "designer", "tester", "debugger"];
