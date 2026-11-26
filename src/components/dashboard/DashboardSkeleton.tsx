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
    <div aria-hidden="true" className="mt-6 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_480px_minmax(0,1fr)] lg:gap-6">
      <div className="lg:order-2">
        <span className={`${SKELETON} block h-6 w-28`} />
        <div className="relative mt-4 pb-8">
          <div className="absolute inset-x-0 top-0 bottom-8 translate-y-8 scale-[0.91] rounded-[24px] border border-black/[0.06] bg-white" />
          <div className="absolute inset-x-0 top-0 bottom-8 translate-y-4 scale-[0.955] rounded-[24px] border border-black/[0.06] bg-white" />
          <div className="relative rounded-[24px] border border-black/[0.06] bg-white p-6">
            <span className={`${SKELETON} block h-5 w-20 rounded-full`} />
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
