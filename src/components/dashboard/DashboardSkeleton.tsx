import styles from "./tokens.module.css";
import { SKELETON } from "./classes";

const CARD = "flex flex-col rounded-[12px] border border-[var(--card-line)] bg-white px-4 py-3";

/** Loading: the cards, the pills and six rows in their final shape, so nothing jumps when data arrives. */
export function DashboardSkeleton({ part = "all" }: { part?: "all" | "cards" }) {
  return (
    <div aria-hidden="true">
      <div className={`${styles.cards} mt-4`}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={CARD}>
            <span className={`${SKELETON} h-[18px] w-24`} />
            <span className={`${SKELETON} mt-3 h-9 w-14`} />
            <span className={`${SKELETON} mt-3 h-[18px] w-32`} />
          </div>
        ))}
      </div>
      {part === "all" && (
        <>
          <div className="mt-5 flex gap-2">
            <span className={`${SKELETON} h-[30px] w-[104px] rounded-full`} />
            <span className={`${SKELETON} h-[30px] w-[88px] rounded-full`} />
          </div>
          <div className="mt-4 overflow-clip rounded-[12px] border border-[var(--card-line)]">
            <div className="flex h-9 items-center border-b border-[var(--line)] pl-4">
              <span className={`${SKELETON} block h-[10px] w-16`} />
            </div>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex h-[46px] items-center gap-6 border-b border-[var(--line)] px-4 last:border-b-0">
                <span className={`${SKELETON} h-3 w-10`} />
                <span className={`${SKELETON} h-3`} style={{ width: `${32 - (i % 3) * 6}%` }} />
                <span className={`${SKELETON} ml-auto h-[22px] w-24 rounded-full`} />
                <span className={`${SKELETON} h-3 w-8`} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
