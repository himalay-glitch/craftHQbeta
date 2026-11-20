import { useSyncExternalStore } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

/**
 * The agent: our orange plush Builder, the same render and loops as the login page.
 * "still" is the picture; "idle" and "work" play its loops (muted, inline). With reduced motion it's always
 * the picture. The loops are shot on white, so use them on white.
 */
export function Mascot({ size, state = "still", className = "" }: { size: number; state?: "still" | "idle" | "work"; className?: string }) {
  const reduced = usePrefersReducedMotion();
  if (state === "still" || reduced) {
    return (
      <img
        src="/images/bots/builder.webp"
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        className={`flex-none object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <video
      key={state}
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      poster="/images/bots/builder.webp"
      width={size}
      height={size}
      className={`flex-none object-contain ${className}`}
      style={{ width: size, height: size }}
    >
      <source src={`/videos/bots/builder-${state}.webm`} type="video/webm" />
      <source src={`/videos/bots/builder-${state}.mp4`} type="video/mp4" />
    </video>
  );
}
