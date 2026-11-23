import { BotAvatar } from "./BotAvatar";
import { TEAM, TEAM_ORDER } from "./team";

/** The Bots tab (demo): each bot's profile, what it's for and what it's on right now. */
export function BotsPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-[1100px] px-8 pt-6 pb-16">
      <h1 className="text-[21px] leading-7 font-medium text-[var(--tx)]">Bots</h1>
      <p className="mt-1 text-[14px] leading-5 text-[var(--tx2)]">You talk to the PM. It brings in whoever the work needs.</p>
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TEAM_ORDER.map((id) => {
          const bot = TEAM[id];
          const working = !/^(free|listening)$/i.test(bot.now);
          return (
            <li key={id} className="overflow-hidden rounded-[16px] border border-[var(--card-line)] bg-white">
              <div className="flex h-44 items-center justify-center" style={{ background: bot.tint }}>
                <BotAvatar id={id} size={148} className="bg-transparent!" />
              </div>
              <div className="px-4 pt-3.5 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[16px] leading-6 font-medium text-[var(--tx)]">{bot.name}</h2>
                  <span className="inline-flex items-center gap-1.5 text-[12px] leading-4 text-[var(--tx2)]">
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full"
                      style={{ background: working ? bot.colour : "var(--ctl)" }}
                    />
                    {bot.now}
                  </span>
                </div>
                <p className="text-[13px] leading-[18px] text-[var(--tx2)]">{bot.role}</p>
                <p className="mt-2.5 text-[14px] leading-5 text-pretty text-[var(--tx)]">{bot.does}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
