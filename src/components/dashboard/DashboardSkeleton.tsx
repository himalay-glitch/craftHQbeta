import { SKELETON } from "./classes";

/** Loading: the team, the deck and the week's line in their final shape, so nothing jumps when data arrives. */
export function DashboardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mt-8 flex items-center justify-between">
        <span className={`${SKELETON} block h-4 w-20`} />
        <span className={`${SKELETON} block h-4 w-40`} />
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col items-center pt-3 pb-2.5">
            <span className={`${SKELETON} size-16 rounded-full`} />
            <span className={`${SKELETON} mt-2 block h-3.5 w-16`} />
            <span className={`${SKELETON} mt-1.5 block h-3 w-20`} />
          </div>
        ))}
      </div>
      <div className="relative mt-8 pt-8 pb-8">
        <div className="absolute inset-x-0 top-8 bottom-8 translate-y-8 scale-[0.91] rounded-[24px] border border-black/[0.06] bg-white" />
        <div className="absolute inset-x-0 top-8 bottom-8 translate-y-4 scale-[0.955] rounded-[24px] border border-black/[0.06] bg-white" />
        <div className="relative rounded-[24px] border border-black/[0.06] bg-white p-7">
          <span className={`${SKELETON} block h-4 w-32`} />
          <span className={`${SKELETON} mt-5 block h-6 w-11/12`} />
          <span className={`${SKELETON} mt-2 block h-6 w-2/3`} />
          <span className={`${SKELETON} mt-4 block h-4 w-1/2`} />
          <div className="mt-6 flex gap-2">
            <span className={`${SKELETON} h-10 w-32 rounded-full`} />
            <span className={`${SKELETON} h-10 w-36 rounded-full`} />
          </div>
          <span className={`${SKELETON} mt-6 block h-11 rounded-[14px]`} />
        </div>
      </div>
    </div>
  );
}
