import { SKELETON } from "./classes";

/** A KPI tile: its label, its number, its line, then the names. */
function Tile({ names, grow }: { names: number; grow: string }) {
  return (
    <div className={`flex flex-col rounded-[12px] border border-[var(--card-line)] bg-white p-4 ${grow}`}>
      <span className={`${SKELETON} h-5 w-28`} />
      <span className={`${SKELETON} mt-3 h-9 w-12`} />
      <span className={`${SKELETON} mt-1 h-[18px] w-32`} />
      <span className="flex flex-col gap-2 pt-5">
        {Array.from({ length: names }, (_, j) => (
          <span key={j} className={`${SKELETON} h-3`} style={{ width: `${80 - j * 14}%` }} />
        ))}
      </span>
    </div>
  );
}

/** Loading: the three columns in their final shape, so nothing jumps when data arrives. */
export function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="mt-6 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_480px_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_528px_minmax(0,1fr)]">
      <div className="rounded-[20px] border border-black/[0.05] bg-black/[0.025] p-3 sm:p-4 lg:order-2 lg:p-5">
        <span className="flex h-8 items-center justify-between pl-1">
          <span className={`${SKELETON} block h-5 w-28`} />
          <span className={`${SKELETON} block h-5 w-24`} />
        </span>
        <div className="relative mt-4 px-4 sm:px-6">
          <div className="absolute inset-x-4 inset-y-0 sm:inset-x-6">
            <div className="absolute inset-0 -translate-x-[22px] -rotate-[3.5deg] scale-[0.94] rounded-[24px] border border-black/[0.06] bg-white" />
            <div className="absolute inset-0 translate-x-[22px] rotate-[3.5deg] scale-[0.94] rounded-[24px] border border-black/[0.06] bg-white" />
          </div>
          <div className="relative rounded-[24px] border border-black/[0.06] bg-white p-5 sm:p-6">
            <span className="flex items-center justify-between">
              <span className={`${SKELETON} block h-5 w-20 rounded-full`} />
              <span className={`${SKELETON} -my-1.5 -mr-1.5 block size-8 rounded-full`} />
            </span>
            <span className={`${SKELETON} mt-4 block h-6 w-11/12`} />
            <span className={`${SKELETON} mt-2 block h-6 w-2/3`} />
            <span className={`${SKELETON} mt-3 block h-4 w-1/2`} />
            <span className="mt-5 block overflow-hidden rounded-[16px] border border-[var(--card-line)]">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="block border-[var(--line)] px-4 py-4 [&:not(:first-child)]:border-t">
                  <span className={`${SKELETON} block h-4`} style={{ width: `${60 - i * 8}%` }} />
                </span>
              ))}
            </span>
            <span className="mt-4 flex justify-end">
              <span className={`${SKELETON} block h-10 w-28 rounded-full`} />
            </span>
          </div>
        </div>
      </div>
      {[0, 1].map((col) => (
        <div key={col} className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:flex-col lg:gap-6 ${col === 0 ? "lg:order-1" : "lg:order-3"}`}>
          <Tile names={3} grow="lg:flex-[3]" />
          <Tile names={col === 0 ? 2 : 1} grow="lg:flex-[2]" />
        </div>
      ))}
    </div>
  );
}
