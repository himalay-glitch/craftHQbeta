import { SKELETON } from "./classes";

const CARD = "flex flex-col rounded-[12px] border border-[var(--card-line)] bg-white px-4 py-3";

function Side({ rows }: { rows: [number, number] }) {
  return (
    <div className="flex flex-col gap-4">
      {rows.map((n, i) => (
        <div key={i} className={CARD} style={{ flex: n }}>
          <span className={`${SKELETON} h-[18px] w-28`} />
          <span className={`${SKELETON} mt-3 h-9 w-24`} />
          {Array.from({ length: n }, (_, j) => (
            <span key={j} className={`${SKELETON} mt-3 h-3`} style={{ width: `${86 - j * 9}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Loading: the three columns in their final shape, so nothing jumps when data arrives. */
export function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="mt-6 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_480px_minmax(0,1fr)] lg:gap-6">
      <div className="lg:order-2">
        <span className={`${SKELETON} block h-6 w-40`} />
        <div className="relative mt-4 pb-8">
          <div className="absolute inset-x-0 top-0 bottom-8 translate-y-8 scale-[0.91] rounded-[24px] border border-black/[0.06] bg-white" />
          <div className="absolute inset-x-0 top-0 bottom-8 translate-y-4 scale-[0.955] rounded-[24px] border border-black/[0.06] bg-white" />
          <div className="relative rounded-[24px] border border-black/[0.06] bg-white p-6">
            <span className={`${SKELETON} block h-5 w-20 rounded-full`} />
            <span className={`${SKELETON} mt-4 block h-6 w-11/12`} />
            <span className={`${SKELETON} mt-2 block h-6 w-2/3`} />
            <span className={`${SKELETON} mt-4 block h-4 w-1/2`} />
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} className={`${SKELETON} mt-2 block h-[62px] rounded-[14px]`} />
            ))}
          </div>
        </div>
      </div>
      <div className="lg:order-1">
        <Side rows={[5, 3]} />
      </div>
      <div className="lg:order-3">
        <Side rows={[6, 2]} />
      </div>
    </div>
  );
}
