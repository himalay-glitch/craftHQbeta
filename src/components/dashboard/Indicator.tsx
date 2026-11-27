import type { LucideIcon } from "lucide-react";
import styles from "./tokens.module.css";

// A status indicator: a white icon in a solid circle, in the status pills' tones and icons (DESIGN.md §7.12).
// Agents at work are green and turn (green reads as running); waiting is grey; a person's turn is amber; stuck is
// red, with a soft ring pulsing out. At 0 it goes grey and still, so colour only shows where there's something to
// look at. Every fill keeps the icon above 3:1 (WCAG's bar for graphics).
export const TONE = {
  active: "bg-[#16A34A] text-white",
  neutral: "bg-[#8E8F94] text-white",
  attention: "bg-[#D97706] text-white",
  negative: "bg-[#DC2626] text-white",
} as const;
export type Tone = keyof typeof TONE;

/** The same tones as plain dots, for the deck's filter chips and progress. */
export const DOT: Record<Tone, string> = {
  active: "bg-[#16A34A]",
  neutral: "bg-[#8E8F94]",
  attention: "bg-[#D97706]",
  negative: "bg-[#DC2626]",
};

const SIZES = { 20: { box: "size-5", icon: 12 }, 24: { box: "size-6", icon: 14 }, 28: { box: "size-7", icon: 16 } } as const;

export function Indicator({
  icon: Icon,
  tone,
  on = true,
  spin,
  ring,
  size = 24,
}: {
  icon: LucideIcon;
  tone: Tone;
  on?: boolean;
  /** Agents at work: the icon turns (still with reduced motion). */
  spin?: boolean;
  /** Stuck: the soft red ring pulses out. */
  ring?: boolean;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${s.box} flex-none items-center justify-center rounded-full ${TONE[on ? tone : "neutral"]} ${on && ring ? styles.alertIcon : ""}`}
    >
      <Icon size={s.icon} strokeWidth={2.25} className={on && spin ? "motion-safe:animate-spin" : ""} />
    </span>
  );
}
