import { SKELETON } from "./classes";

const PANEL = "rounded-[16px] border border-[var(--card-line)] bg-white p-4";

/** The side column's two panels in their final shape: Working now, then Shipped this week. */
function Side() {
  return (
    <div className="flex flex-col gap-4">
      <div className={PANEL}>
        <span className={`${SKELETON} block h-[18px] w-28`} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span className={`${SKELETON} block h-[86px] rounded-[12px]`} />
          <span className={`${SKELETON} block h-[86px] rounded-[12px]`} />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="mt-3 flex items-center gap-3">
            <span className={`${SKELETON} size-[30px] rounded-full`} />
            <span className="flex-1">
              <span className={`${SKELETON} block h-3 w-20`} />
              <span className={`${SKELETON} mt-1.5 block h-2.5 w-32`} />
            </span>
          </div>
        ))}
      </div>
      <div className={PANEL}>
        <span className={`${SKELETON} block h-[18px] w-36`} />
        {Array.from({ length: 3 }, (_, i) => (
          <span key={i} className={`${SKELETON} mt-3 block h-3`} style={{ width: `${78 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Loading: the deck and the side column in their final shape, so nothing jumps when data arrives. */
export function DashboardSkeleton({ part = "all" }: { part?: "all" | "side" }) {
  if (part === "side") {
    return (
      <div aria-hidden="true">
        <Side />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <span className={`${SKELETON} block h-6 w-32`} />
        <div className="mt-3 flex gap-1.5">
          {[56, 84, 96, 70].map((w) => (
            <span key={w} className={`${SKELETON} h-7 rounded-full`} style={{ width: w }} />
          ))}
        </div>
        <div className="relative mt-4 pb-6">
          <div className="absolute inset-x-0 top-0 bottom-6 translate-y-6 scale-[0.93] rounded-[20px] border border-[var(--card-line)] bg-[#FBFBFB]" />
          <div className="absolute inset-x-0 top-0 bottom-6 translate-y-3 scale-[0.965] rounded-[20px] border border-[var(--card-line)] bg-[#FBFBFB]" />
          <div className="relative rounded-[20px] border border-[var(--card-line)] bg-white p-6">
            <span className={`${SKELETON} block h-5 w-48 rounded-full`} />
            <span className={`${SKELETON} mt-4 block h-6 w-3/4`} />
            <span className={`${SKELETON} mt-4 block h-[92px] rounded-[14px]`} />
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} className={`${SKELETON} mt-2 block h-[58px] rounded-[12px]`} />
            ))}
          </div>
        </div>
      </div>
      <Side />
    </div>
  );
}
