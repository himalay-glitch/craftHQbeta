import type { ButtonHTMLAttributes } from "react";

/*
 * Buttons for the connect-accounts modal, following DESIGN.md §7.1 and §7.2. They live in this
 * area until decision 5 in DESIGN.md §15 settles where shared components go.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex flex-none cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 " +
  "font-sans text-sm font-medium whitespace-nowrap transition-colors duration-100 select-none " +
  "not-disabled:active:translate-y-px disabled:cursor-default disabled:opacity-50 pointer-coarse:h-11";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white not-disabled:hover:bg-primary-strong",
  secondary: "bg-field text-foreground not-disabled:hover:bg-field-hover",
  ghost: "bg-transparent text-muted-foreground not-disabled:hover:bg-hover not-disabled:hover:text-foreground",
};

/** sm is 28 px, for toolbars and rows; md is 32 px, the default (DESIGN.md §3.3). */
const SIZES: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5",
  md: "h-8 px-3",
};

/** Classes for a button, or for a link that should look like one. */
export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className = "") {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant = "secondary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button {...props} type={type} className={buttonClasses(variant, size, className)} />;
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string };

/** A square, icon-only ghost button. `label` names it for screen readers and the tooltip. */
export function IconButton({ label, className = "", type = "button", ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      title={label}
      className={
        "inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent " +
        "text-muted-foreground transition-colors duration-100 hover:bg-hover hover:text-foreground pointer-coarse:size-11 " +
        className
      }
    />
  );
}
