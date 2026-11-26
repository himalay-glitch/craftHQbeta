import styles from "./tokens.module.css";

// Shared class strings for the dashboard and its shell, measured from the Asana reference
// (docs/design/dashboard-plan.md, §4 and §6).

/** 32 px pill in CraftHQ blue: the one main action in a view. */
export const BTN_PRIMARY =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-[var(--cta)] px-3.5 text-[14px] leading-5 font-medium " +
  "whitespace-nowrap text-white transition-colors duration-[120ms] hover:bg-[var(--cta-h)] active:translate-y-px " +
  "disabled:cursor-default disabled:opacity-50 disabled:hover:bg-[var(--cta)] disabled:active:translate-y-0";

/** 32 px outlined pill, like the reference's filters. */
export const BTN_SECONDARY =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-[var(--ctl)] bg-white px-3.5 text-[14px] leading-5 " +
  "font-medium whitespace-nowrap text-[var(--tx)] transition-colors duration-[120ms] hover:border-[var(--ctl-h)] " +
  "hover:bg-[var(--ctl-bg-h)] active:translate-y-px disabled:cursor-default disabled:opacity-50";

/** 32 px round icon button; always paired with an aria-label and a tooltip. */
export const ICON_BTN =
  "inline-flex size-8 flex-none items-center justify-center rounded-full text-[var(--tx2)] transition-colors " +
  "duration-[120ms] hover:bg-black/5 hover:text-[var(--tx)]";

export const MENU_CONTENT = `${styles.tokens} ${styles.menu} z-50 min-w-[220px] rounded-[8px] bg-white py-1 ring-1 ring-black/[0.08]`;

export const MENU_ITEM =
  "mx-1 flex h-9 cursor-pointer items-center gap-2 rounded-[6px] px-3 text-[14px] leading-5 text-[var(--tx)] " +
  "outline-none select-none data-highlighted:bg-[var(--menu-h)]";

export const MENU_SEPARATOR = "my-1 h-px bg-[var(--line)]";

/** Dark tooltip: 12 px, 6 px radius. Radix portals it out of the page, so like the menus it carries `.tokens`:
 *  without them `--ink` is undefined, the fill comes out empty and the white label disappears on a white page. */
export const TOOLTIP = `${styles.tokens} z-50 max-w-[260px] rounded-[6px] bg-[var(--ink)] px-2 py-1 text-[12px] leading-4 text-white select-none`;

/** Grey placeholder block for loading states. */
export const SKELETON = `${styles.pulse} rounded-[6px] bg-[var(--skeleton)]`;
