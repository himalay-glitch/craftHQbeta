import type { SVGProps } from "react";

/** Circle with an exclamation mark, for inline error messages. */
export function AlertCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.25h.01" />
    </svg>
  );
}

/**
 * CraftHQ mark: a cratered stone-metal planet inside an open "C" orbit with a satellite and a star.
 * Rendered in Blender (design/blender/crafthq_logo_cosmic_v001.blend → design/renders/logo_cosmic_v001.png).
 * The web file is 3x for a 28px-tall display; it is decorative next to the "CraftHQ" wordmark.
 */
export function CraftHQLogo({ height = 28, className }: { height?: number; className?: string }) {
  return (
    <img
      src="/brand/crafthq-mark.webp"
      alt=""
      aria-hidden="true"
      width={Math.round((height * 125) / 84)}
      height={height}
      loading="eager"
      className={className}
    />
  );
}
