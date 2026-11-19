"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type RebusBotItem = {
  key: string;
  /** Short role shown in the chip while the bot is working (hover). */
  role: string;
  /** Clip paths without extension; each is published as .webm (VP9) and .mp4 (H.264). */
  idle: string;
  work: string;
  poster: string;
  /** Optional backdrop behind the clip (none: the clips sit on white and blend into the page). */
  bg?: string;
};

const CYCLE_MS = 4200;
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
 * A plush bot set into the headline like a rebus (after muse.ai's hero).
 * With more than one bot the slot cycles through them; hovering plays the active bot's "working" loop.
 * With reduced motion it shows a still poster and does not cycle.
 */
export function RebusBot({ bots }: { bots: RebusBotItem[] }) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [working, setWorking] = useState(false);
  const idleRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const workRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Cycle the team while nobody is hovering.
  useEffect(() => {
    if (reduced || working || bots.length < 2) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setActive((i) => (i + 1) % bots.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [reduced, working, bots.length]);

  // Only the visible bot's idle loop plays; it restarts from its first frame when it pops in.
  useEffect(() => {
    if (reduced) return;
    idleRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === active) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [active, reduced]);

  function startWork() {
    if (reduced) return;
    setWorking(true);
    const video = workRefs.current[active];
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  }

  function stopWork() {
    setWorking(false);
    workRefs.current.forEach((video) => video?.pause());
  }

  return (
    <span className="rebus-slot" data-working={working} onPointerEnter={startWork} onPointerLeave={stopWork}>
      {bots.map((bot, i) => (
        <span key={bot.key} className={`rebus-bot${i === active ? " is-active" : ""}`} style={bot.bg ? { background: bot.bg } : undefined}>
          {reduced ? (
            <Image src={bot.poster} alt="" fill sizes="68px" unoptimized />
          ) : (
            <>
              <video
                ref={(el) => {
                  idleRefs.current[i] = el;
                }}
                className="rebus-idle"
                poster={bot.poster}
                muted
                loop
                playsInline
                autoPlay={i === 0}
                preload={i === 0 ? "auto" : "metadata"}
                disablePictureInPicture
                tabIndex={-1}
              >
                <source src={`${bot.idle}.webm`} type="video/webm" />
                <source src={`${bot.idle}.mp4`} type="video/mp4" />
              </video>
              <video
                ref={(el) => {
                  workRefs.current[i] = el;
                }}
                className="rebus-work"
                muted
                loop
                playsInline
                preload="metadata"
                disablePictureInPicture
                tabIndex={-1}
              >
                <source src={`${bot.work}.webm`} type="video/webm" />
                <source src={`${bot.work}.mp4`} type="video/mp4" />
              </video>
            </>
          )}
        </span>
      ))}
      <span className="rebus-chip">{bots[active].role}</span>
    </span>
  );
}
