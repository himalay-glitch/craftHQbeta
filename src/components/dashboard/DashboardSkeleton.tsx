import styles from "./tokens.module.css";
import { SKELETON } from "./classes";

const CARD = "flex flex-col rounded-[12px] border border-[var(--card-line)] bg-white px-4 py-3";

/** Loading: the five stats and the deck in their final shape, so nothing jumps when data arrives. */
export function DashboardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className={`${styles.cards} mt-6`}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={CARD}>
            <span className={`${SKELETON} h-[18px] w-24`} />
            <span className={`${SKELETON} mt-3 h-9 w-14`} />
            <span className={`${SKELETON} mt-3 h-[18px] w-32`} />
          </div>
        ))}
      </div>
      <div className="relative mx-auto mt-10 w-full max-w-[760px] pb-8">
        <div className="absolute inset-x-0 top-0 bottom-8 translate-y-8 scale-[0.91] rounded-[24px] border border-black/[0.06] bg-white" />
        <div className="absolute inset-x-0 top-0 bottom-8 translate-y-4 scale-[0.955] rounded-[24px] border border-black/[0.06] bg-white" />
        <div className="relative rounded-[24px] border border-black/[0.06] bg-white p-7">
          <span className={`${SKELETON} block h-5 w-36 rounded-full`} />
          <span className={`${SKELETON} mt-4 block h-6 w-11/12`} />
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
