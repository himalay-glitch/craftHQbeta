import { CraftHQLogo } from "@/components/icons";
import { LoginForm } from "@/components/LoginForm";
import { RebusBot, type RebusBotItem } from "@/components/RebusBot";

// The Builder bot (coral plush, yellow safety helmet, round glasses), rendered in Blender
// (design/blender/crafthq_bots_v001.blend). Idle loop; its "working" loop plays on hover.
const team: RebusBotItem[] = [
  {
    key: "builder",
    role: "Builder · builds it",
    idle: "/videos/bots/builder-idle",
    work: "/videos/bots/builder-work",
    poster: "/images/bots/builder.webp",
  },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 flex-none items-center justify-between px-5 sm:px-8">
        <span className="flex items-center gap-2">
          <CraftHQLogo height={36} />
          <span className="text-[16px] font-semibold tracking-[-0.02em]">CraftHQ</span>
        </span>
        <span className="text-[13px] text-muted-foreground">by BetaCraft</span>
      </header>

      {/* One vertical rhythm on an 8px scale: headline → 16 → subtitle → 32 → form */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 pb-16">
        <div className="flex w-full max-w-[640px] flex-col items-center text-center">
          {/* Screen readers get the plain sentence; the visual line swaps the word "robot" for the bot. */}
          <h1 className="sr-only">Your robot build team, shipping 10× faster.</h1>
          <p aria-hidden="true" className="hero-title">
            <span className="block">
              Your <RebusBot bots={team} /> build team,
            </span>
            <span className="block">shipping 10× faster</span>
          </p>

          <p className="mt-4 text-[16px] leading-6 text-muted-foreground">Sign in to your build team</p>

          <div className="mt-8 w-full max-w-[400px]">
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
