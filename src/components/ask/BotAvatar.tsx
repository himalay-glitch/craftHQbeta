import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { BotId } from "@/types/ask";
import { TEAM, currentId, type FormerBotId } from "./team";

/**
 * A bot's face in a soft circle of its own colour. The posters are composited on white, so they sit on the
 * tint with `mix-blend-mode: multiply`. Until a bot's render exists, a plush-looking blob in its colour stands in.
 */
const REDUCED = "(prefers-reduced-motion: reduce)";
const ONE_X = "(max-resolution: 1.49dppx)";
const useReducedMotion = () =>
  useSyncExternalStore(
    (on) => {
      const mq = window.matchMedia(REDUCED);
      mq.addEventListener("change", on);
      return () => mq.removeEventListener("change", on);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );

export function BotAvatar({
  id,
  size = 28,
  bare = false,
  animate = false,
  className = "",
}: {
  /** An agent's id; its first id (builder, checker, fixer) still works. */
  id: BotId | FormerBotId;
  size?: number;
  /** No tinted circle: the bot on its own (welcome cards, the PM hero). */
  bare?: boolean;
  /** Play the bot's idle loop if it has one (the welcome hero); its still otherwise, and with reduced motion. */
  animate?: boolean;
  className?: string;
}) {
  const bot = TEAM[currentId(id)];
  const reduced = useReducedMotion();
  // The loop is composited on white like the stills, so it melts into what's behind it the same way (multiply).
  // Each screen gets a clip about twice its size (288 px, or 144 px on 1x screens), so it stays crisp.
  if (animate && bot.video && !reduced) {
    return (
      <span aria-hidden="true" className={`relative inline-flex flex-none items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <video
          className="size-[104%] max-w-none object-contain mix-blend-multiply"
          poster={`${bot.poster}-384.webp`}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          tabIndex={-1}
        >
          <source src={`${bot.video}-1x.webm`} type="video/webm" media={ONE_X} />
          <source src={`${bot.video}-1x.mp4`} type="video/mp4" media={ONE_X} />
          <source src={`${bot.video}.webm`} type="video/webm" />
          <source src={`${bot.video}.mp4`} type="video/mp4" />
        </video>
      </span>
    );
  }
  return <Still id={bot.id} size={size} bare={bare} className={className} />;
}

function Still({ id, size, bare, className }: { id: BotId; size: number; bare: boolean; className: string }) {
  const bot = TEAM[id];
  const [missing, setMissing] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // An image that failed before hydration never fires onError in React, so check once after mount too.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setMissing(true);
  }, []);
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex flex-none items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size, background: bare ? "transparent" : bot.tint }}
    >
      {missing ? (
        <span
          className="rounded-full"
          style={{
            width: size * 0.62,
            height: size * 0.56,
            background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${bot.colour} 70%, white), ${bot.colour} 70%)`,
            boxShadow: `inset 0 -${Math.max(1, size / 14)}px ${size / 8}px color-mix(in oklab, ${bot.colour} 70%, black)`,
          }}
        />
      ) : (
        // Pre-shrunk copies (128/256/384 px) so the browser never shrinks far: crisp from 22 px avatars to the hero.
        <img
          ref={img}
          src={`${bot.poster}-256.webp`}
          srcSet={`${bot.poster}-128.webp 128w, ${bot.poster}-256.webp 256w, ${bot.poster}-384.webp 384w`}
          sizes={`${Math.round(size * 1.04)}px`}
          width={size * 2}
          height={size * 2}
          alt=""
          onError={() => setMissing(true)}
          className="size-[104%] max-w-none object-contain mix-blend-multiply"
          draggable={false}
        />
      )}
    </span>
  );
}
