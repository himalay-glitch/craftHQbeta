import { useEffect, useRef, useState } from "react";
import type { BotId } from "@/types/ask";
import { TEAM } from "./team";

/**
 * A bot's face in a soft circle of its own colour. The posters are composited on white, so they sit on the
 * tint with `mix-blend-mode: multiply`. Until a bot's render exists, a plush-looking blob in its colour stands in.
 */
export function BotAvatar({
  id,
  size = 28,
  bare = false,
  className = "",
}: {
  id: BotId;
  size?: number;
  /** No tinted circle: the bot on its own (welcome cards, the PM hero). */
  bare?: boolean;
  className?: string;
}) {
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
