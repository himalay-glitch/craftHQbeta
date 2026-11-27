import { Fragment, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { Switch } from "radix-ui";
import { Check, ChevronDown, Info, Lock, User, X, type LucideIcon } from "lucide-react";
import { BTN_SECONDARY, ICON_BTN, SKELETON } from "@/components/dashboard/classes";

// The settings page's building blocks, from DESIGN.md: forms (§6.14), fields (§7.3), selects (§7.4), switches (§7.5)
// and confirms (§6.11). Type follows the §3.2 roles only: 20 for the page title, 14 for body, 12 for help and meta.
// The live settings' parts (scope pill, title, description) are kept; its look (serif, all caps, red) isn't, because
// DESIGN.md §3.2 has no serif and no all caps in the app, and blue is the only action colour.

/** A filled field (DESIGN.md §7.3): no border, white with the focus ring while typing. 32 px; 16 px text on touch. */
export const FIELD =
  "block h-8 w-full rounded-lg bg-field px-3 text-sm text-[var(--tx)] pointer-coarse:h-10 pointer-coarse:text-base " +
  "transition-[background-color,box-shadow] duration-[120ms] hover:bg-field-hover focus:bg-white focus:shadow-focus " +
  "focus:outline-none disabled:cursor-default disabled:text-faint disabled:hover:bg-field";

/** Read-only (§7.3): no fill, so it reads as a value, and the text can still be selected and copied. Not `read-only:`
 *  on FIELD: that CSS state also matches every <select>, which would lose its fill. */
export const FIELD_READ = "block h-8 w-full bg-transparent text-sm text-[var(--tx)] focus:outline-none pointer-coarse:text-base";

export const BTN_DANGER =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-danger px-3.5 text-sm font-medium whitespace-nowrap " +
  "text-white transition-colors duration-[120ms] hover:bg-danger-hover active:translate-y-px disabled:cursor-default " +
  "disabled:opacity-50 disabled:hover:bg-danger disabled:active:translate-y-0";

/** A link inside text (DESIGN.md §7.1). */
export const LINK = "font-medium text-primary-strong underline decoration-current/30 underline-offset-2 hover:decoration-current";

/** "Josh Patel" → "JP"; one word → its first letter. */
export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

/** Shows the bottom toast: the result of the person's own action, with Undo where it can be undone. */
export type Notify = (message: string, action?: { label: string; run: () => void }) => void;

/**
 * Who a setting changes, in the live settings' three scopes: you in every project, everyone in this project, or you
 * in this project (your role). The project's colour is its 8 px dot (DESIGN.md §3.1).
 */
export type Scope = { kind: "you" } | { kind: "project" | "you-in-project"; name: string; colour: string };

const SCOPE_LABELS: Record<Scope["kind"], string> = {
  you: "You, everywhere",
  project: "This project",
  "you-in-project": "You, in this project",
};

/**
 * The live settings' pill above a title or a group, in its words, drawn as a neutral chip: the words carry the meaning,
 * the person mark says "you" and the dot says which project. Screen readers also hear the project's name.
 */
export function ScopePill({ scope }: { scope: Scope }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-field px-2.5 text-xs font-medium text-[var(--tx)]">
      {scope.kind === "project" ? (
        <span aria-hidden="true" style={{ background: scope.colour }} className="size-2 rounded-full" />
      ) : (
        <User aria-hidden="true" size={12} strokeWidth={2} className="text-[var(--tx2)]" />
      )}
      {SCOPE_LABELS[scope.kind]}
      {scope.kind !== "you" && <span className="sr-only">: {scope.name}</span>}
    </span>
  );
}

/**
 * The section's header, as on the live settings: the scope pill, the title, then what the section is for. The title is
 * the page's h1 (each section has its own URL), and the quiet "Saved" mark sits beside it for changes that apply at once.
 */
export function PageHeader({ scope, title, children, saved }: { scope: Scope; title: string; children: ReactNode; saved?: boolean }) {
  return (
    <header>
      <ScopePill scope={scope} />
      <div className="mt-3 flex items-start gap-3">
        {/* Focused when the section opens from the menu (SettingsScreen), so no outline on it. */}
        <h1 id="settings-title" tabIndex={-1} className="m-0 min-w-0 flex-1 text-xl font-semibold tracking-title text-[var(--tx)] outline-none">
          {title}
        </h1>
        <SavedNote show={!!saved} />
      </div>
      <div className="m-0 mt-1 max-w-prose text-sm text-pretty text-[var(--tx2)]">{children}</div>
    </header>
  );
}

/** "Saved", for changes that apply straight away. Polite, and gone after 2 s. */
export function SavedNote({ show }: { show: boolean }) {
  return (
    <span role="status" aria-live="polite" className="flex h-6 flex-none items-center gap-1 text-xs text-[var(--tx2)]">
      {show && (
        <>
          <Check aria-hidden="true" size={14} strokeWidth={2} className="text-success-ink" />
          Saved
        </>
      )}
    </span>
  );
}

/** `flash()` after a change that saved at once; `saved` stays true for 2 s. */
export function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const flash = useCallback(() => {
    setSaved(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaved(false), 2000);
  }, []);
  return { saved, flash };
}

/**
 * A group of related fields under a 14 px semibold heading, with a hairline above it; 24 px between groups. `scope`
 * puts the pill above the heading, for a group whose scope differs from the one before it (your role, in General).
 */
export function Group({ scope, title, description, children }: { scope?: Scope; title?: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--line)] pt-6">
      {scope && (
        <div className="mb-3">
          <ScopePill scope={scope} />
        </div>
      )}
      {title && <h2 className="m-0 text-sm font-semibold text-[var(--tx)]">{title}</h2>}
      {description && <p className="m-0 mt-1 text-sm text-pretty text-[var(--tx2)]">{description}</p>}
      <div className={title || description ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

/** Label above, help below; an error replaces the help. Optional fields say so; required ones don't. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--tx)]">
        {label} {optional && <span className="font-normal text-[var(--tx2)]">(optional)</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${htmlFor}-error`} className="m-0 mt-1.5 text-xs text-danger-ink">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="m-0 mt-1.5 text-xs text-pretty text-[var(--tx2)]">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** A native select drawn as a field, with ChevronDown (DESIGN.md §7.4: up to about seven options). */
export function SelectField({
  id,
  value,
  onChange,
  disabled,
  describedBy,
  children,
  className = "",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  describedBy?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`relative block ${className}`}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} cursor-pointer appearance-none pr-9 disabled:cursor-default`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={16}
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[var(--tx2)]"
      />
    </span>
  );
}

/**
 * A setting that takes effect straight away (DESIGN.md §7.5): a 32 × 18 switch with the label to its right, and the
 * whole label clickable. The description says what changes.
 */
export function SwitchRow({
  id,
  checked,
  onChange,
  label,
  description,
  disabled,
  live,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  /** The description is a status that changes (On, Blocked…): announce it when it does. */
  live?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 py-2">
      <span className="flex h-5 flex-none items-center">
        <Switch.Root
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
          aria-describedby={description ? `${id}-desc` : undefined}
          className="relative inline-flex h-[18px] w-8 flex-none cursor-pointer items-center rounded-full bg-faint p-0.5 transition-colors duration-[120ms] data-[state=checked]:bg-primary disabled:cursor-default disabled:opacity-50"
        >
          <Switch.Thumb className="block size-3.5 rounded-full bg-white transition-transform duration-[120ms] data-[state=checked]:translate-x-3.5 motion-reduce:transition-none" />
        </Switch.Root>
      </span>
      <span className="min-w-0 flex-1">
        <label htmlFor={id} className={`block text-sm text-[var(--tx)] ${disabled ? "" : "cursor-pointer"}`}>
          {label}
        </label>
        {description && (
          <span id={`${id}-desc`} aria-live={live ? "polite" : undefined} className="block text-xs text-pretty text-[var(--tx2)]">
            {description}
          </span>
        )}
      </span>
    </div>
  );
}

export type Tone = "positive" | "attention" | "negative" | "neutral";

/** DESIGN.md §3.1's status tones: the tint behind, and the ink for text and marks. */
const TONE_TINT: Record<Tone, string> = {
  positive: "bg-success-tint",
  attention: "bg-warning-tint",
  negative: "bg-danger-tint",
  neutral: "bg-field",
};
const TONE_INK: Record<Tone, string> = {
  positive: "text-success-ink",
  attention: "text-warning-ink",
  negative: "text-danger-ink",
  neutral: "text-[var(--tx2)]",
};

const PILL_TONES: Record<Tone, string> = {
  positive: `${TONE_TINT.positive} ${TONE_INK.positive}`,
  attention: `${TONE_TINT.attention} ${TONE_INK.attention}`,
  negative: `${TONE_TINT.negative} ${TONE_INK.negative}`,
  neutral: `${TONE_TINT.neutral} text-[var(--tx)]`,
};

/**
 * A status pill (DESIGN.md §7.12): the tone's 12 px icon and a label, on the tone's tint and in its ink, 20 px tall.
 * Positive is connected or ready; attention needs a person; negative failed; neutral is information. Never colour
 * without the icon.
 */
export function Pill({ tone, icon: Icon, spin, children }: { tone: Tone; icon: LucideIcon; spin?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex h-5 flex-none items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap ${PILL_TONES[tone]}`}>
      <Icon
        aria-hidden="true"
        size={12}
        strokeWidth={2}
        className={`${tone === "neutral" ? "text-[var(--tx2)]" : ""} ${spin ? "animate-spin motion-reduce:animate-none" : ""}`}
      />
      {children}
    </span>
  );
}

// DESIGN.md §7.5's radio: a 16 px circle with a 1.5 px faint outline; chosen, it's blue with a white 6 px dot. The
// browser's own input, so arrows move between options and the global focus outline shows.
export const RADIO =
  "m-0 size-4 flex-none cursor-pointer appearance-none rounded-full bg-white ring-[1.5px] ring-faint ring-inset " +
  "transition-colors duration-[120ms] checked:bg-primary checked:ring-0 " +
  "checked:[background-image:radial-gradient(circle,white_3px,transparent_3.5px)] disabled:cursor-default disabled:opacity-50";

/**
 * Radios for one choice that applies straight away (like a switch, DESIGN.md §7.5): the label to the right of each,
 * a muted line under it, and the whole option clickable. `label` names the group for screen readers.
 */
export function RadioList<T extends string | number>({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: T;
  options: { value: T; label: string; description?: string }[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col">
      {options.map((o, i) => (
        <label key={String(o.value)} className="flex cursor-pointer items-start gap-2 py-2 first:pt-0 last:pb-0">
          <span className="flex h-5 flex-none items-center">
            <input
              type="radio"
              name={name}
              value={String(o.value)}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              aria-labelledby={`${id}-${i}`}
              aria-describedby={o.description ? `${id}-${i}-desc` : undefined}
              className={RADIO}
            />
          </span>
          <span className="min-w-0 flex-1">
            <span id={`${id}-${i}`} className="block text-sm text-[var(--tx)]">
              {o.label}
            </span>
            {o.description && (
              <span id={`${id}-${i}-desc`} className="block text-xs text-pretty text-[var(--tx2)]">
                {o.description}
              </span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

/**
 * A segmented control (DESIGN.md §7.11) for two to four choices: a bg-field track with 2 px of padding, and the chosen
 * segment white with a hairline, as the app's other segments are (no shadow). Radios underneath, so the arrow keys
 * move the choice. `labelledBy` is the id of the text that names it.
 */
export function Segmented<T extends string | number>({
  name,
  labelledBy,
  value,
  options,
  onChange,
}: {
  name: string;
  labelledBy: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="inline-flex flex-none rounded-lg bg-field p-0.5">
      {options.map((o) => (
        <label key={String(o)} className="relative flex cursor-pointer">
          <input type="radio" name={name} value={String(o)} checked={o === value} onChange={() => onChange(o)} className="peer sr-only" />
          <span className="flex h-7 min-w-9 items-center justify-center rounded-md px-2.5 text-sm font-medium tabular-nums text-[var(--tx2)] transition-colors duration-[120ms] peer-checked:bg-white peer-checked:text-[var(--tx)] peer-checked:ring-1 peer-checked:ring-black/[0.08] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] hover:text-[var(--tx)]">
            {o}
          </span>
        </label>
      ))}
    </div>
  );
}

/**
 * An inline alert (DESIGN.md §7.15): the tone's tint and icon, the message in foreground 14 px, 12 px of padding.
 * `live` announces a message that changes while the page is open (a setup finishing).
 */
export function Notice({ tone, icon: Icon, spin, live, children }: { tone: Tone; icon: LucideIcon; spin?: boolean; live?: boolean; children: ReactNode }) {
  return (
    <div role={live ? "status" : undefined} className={`flex items-start gap-2 rounded-lg p-3 text-sm text-pretty text-[var(--tx)] ${TONE_TINT[tone]}`}>
      <span className="flex h-5 flex-none items-center">
        <Icon aria-hidden="true" size={16} strokeWidth={1.75} className={`${TONE_INK[tone]} ${spin ? "animate-spin motion-reduce:animate-none" : ""}`} />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** The neutral one: information, so the Info icon and no colour. */
export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <Notice tone="neutral" icon={Info}>
      {children}
    </Notice>
  );
}

/**
 * A line of meta under a name: its parts joined by middle dots. Each dot stays with the part before it (a no-break
 * space) and each part stays whole, so a line never starts with a dot or breaks inside "18 h ago". Empty parts are left out.
 */
export function MetaLine({ parts, className = "" }: { parts: ReactNode[]; className?: string }) {
  const shown = parts.filter((part) => part !== null && part !== undefined && part !== false && part !== "");
  return (
    <span className={`block text-xs text-pretty text-[var(--tx2)] ${className}`}>
      {shown.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && "\u00a0· "}
          <span className="whitespace-nowrap">{part}</span>
        </Fragment>
      ))}
    </span>
  );
}

/* ── Rows for connections and the like (GitHub, Claude) ──────────────────────────────────────────────────────── */

/** A 40 px white tile for a row's mark. */
export function Tile({ children }: { children: ReactNode }) {
  return <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-white ring-1 ring-black/[0.08]">{children}</span>;
}

/**
 * One connection-like row (DESIGN.md §6.6): the mark, the name (14 semibold) with its pill, one muted line, and the
 * actions on the right. Anything else (the token's steps and field) sits under the text, lined up with it. Top-aligned,
 * so the name stays level with its mark when the line runs to three; the 32 px buttons sit 4 px down, centred on the
 * 40 px mark.
 */
export function Row({ tile, name, pill, line, actions, children }: { tile: ReactNode; name: string; pill?: ReactNode; line: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <li className="border-b border-[var(--line)] py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-3">
        {tile}
        <div className="min-w-0 flex-1 basis-56">
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-[var(--tx)]">
            {name}
            {pill}
          </p>
          <div className="mt-0.5 text-xs text-pretty text-[var(--tx2)]">{line}</div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:mt-1">{actions}</div>}
      </div>
      {children && <div className="mt-4 flex flex-col gap-4 sm:pl-[52px]">{children}</div>}
    </li>
  );
}

/** A row while the connections API answers: shaped like the row (DESIGN.md §6.8). */
export function SkeletonRow({ label }: { label: string }) {
  return (
    <li aria-busy="true" aria-label={label} className="flex items-center gap-3 border-b border-[var(--line)] py-4 first:pt-0 last:border-b-0 last:pb-0">
      <span className={`${SKELETON} size-10 flex-none rounded-xl`} />
      <span className="flex flex-1 flex-col gap-1.5">
        <span className={`${SKELETON} h-3.5 w-28`} />
        <span className={`${SKELETON} h-3 w-72 max-w-full`} />
      </span>
    </li>
  );
}

/** For members: what they can't change here, and who can. */
export function ReadOnlyNote({ project, admins }: { project: string; admins: string[] }) {
  return (
    <p className="m-0 flex items-start gap-2 rounded-xl bg-field px-3 py-2.5 text-sm text-[var(--tx)]">
      <span className="flex h-5 flex-none items-center">
        <Lock aria-hidden="true" size={14} strokeWidth={2} className="text-[var(--tx2)]" />
      </span>
      <span>
        You're a member of {project}, so these settings are read-only for you. {admins.length === 1 ? "Its admin" : "Its admins"},{" "}
        <span className="font-medium">{admins.join(" and ")}</span>, can change them.
      </span>
    </p>
  );
}

// A confirm (DESIGN.md §7.9, §6.11): a native <dialog>, 384 px, a bottom sheet on phones. The title names the action
// and the object, one sentence gives the consequence, and the safe button comes first and has the focus. For the
// permanent and large ones (deleting a project), the person types the name to enable the button.
const DIALOG =
  "m-auto w-full max-w-sm flex-col overflow-hidden rounded-2xl border-0 bg-white p-0 text-[var(--tx)] ring-1 ring-black/[0.08] open:flex backdrop:bg-scrim " +
  "opacity-0 scale-98 transition-all transition-discrete duration-200 ease-out " +
  "open:opacity-100 open:scale-100 starting:open:opacity-0 starting:open:scale-98 " +
  "backdrop:opacity-0 backdrop:transition-all backdrop:transition-discrete backdrop:duration-200 " +
  "open:backdrop:opacity-100 starting:open:backdrop:opacity-0 " +
  "motion-reduce:transition-none motion-reduce:backdrop:transition-none " +
  "max-sm:mb-0 max-sm:max-w-none max-sm:rounded-b-none";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  consequence,
  confirmLabel,
  typeToConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  consequence: string;
  /** The same verb as the title: "Remove", "Revoke", "Delete project". */
  confirmLabel: string;
  /** When set, the button stays off until this is typed exactly. */
  typeToConfirm?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const safeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const typedId = useId();
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setTyped("");
      dialog.showModal();
      safeRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const onScrimClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) onClose();
  };
  const ready = !typeToConfirm || typed.trim() === typeToConfirm;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClose={() => open && onClose()}
      onClick={onScrimClick}
      className={DIALOG}
    >
      <header className="flex items-start gap-3 px-6 pt-6">
        <h2 id={titleId} className="m-0 min-w-0 flex-1 text-base font-semibold">
          {title}
        </h2>
        <button type="button" aria-label="Close" onClick={onClose} className={`${ICON_BTN} -mt-1 -mr-2`}>
          <X aria-hidden="true" size={16} strokeWidth={1.75} />
        </button>
      </header>
      <p id={bodyId} className="m-0 px-6 pt-2 text-sm text-pretty text-[var(--tx2)]">
        {consequence}
      </p>
      {typeToConfirm && (
        <div className="px-6 pt-4">
          <label htmlFor={typedId} className="block text-sm font-medium">
            Type <span className="font-semibold">{typeToConfirm}</span> to confirm
          </label>
          <input
            id={typedId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className={`${FIELD} mt-1.5`}
          />
        </div>
      )}
      <footer className="flex justify-end gap-2 px-6 pt-6 pb-6">
        <button ref={safeRef} type="button" onClick={onClose} className={BTN_SECONDARY}>
          Cancel
        </button>
        <button type="button" disabled={!ready} onClick={onConfirm} className={BTN_DANGER}>
          {confirmLabel}
        </button>
      </footer>
    </dialog>
  );
}

const never = () => () => {};

/** A value only the browser knows (today's date, this computer's time zone): `server` while rendering on the server
 *  and hydrating, then the browser's. It doesn't change while the page is open. */
export const useBrowserValue = <T extends string | null>(browser: () => T, server: T) => useSyncExternalStore(never, browser, () => server);

// Dates are kept as YYYY-MM-DD and formatted by hand, so the server and the browser print the same thing whatever
// their time zones (no hydration mismatch), as the app's own "26 Nov" style.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(ymd: string, withYear = false) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

let openedAt = 0;
const pageNow = () => String((openedAt ||= Date.now()));

/** When the page opened, in the browser; 0 on the server and while hydrating. For "2 h ago": it doesn't tick here. */
export const usePageNow = () => Number(useBrowserValue(pageNow, "0"));

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * A time as DESIGN.md §9.2 writes it, for the middle of a line: "just now", "5 min ago" and "2 h ago" for the last
 * day, then "yesterday", the weekday for the past week ("Mon"), then the date ("2 Oct", with the year when it isn't
 * this one). `now` is 0 on the server and while hydrating: then the date alone, read off the string, so both print
 * the same thing.
 */
export function whenLabel(iso: string, now: number) {
  if (!now) return formatDate(iso.slice(0, 10));
  const at = new Date(iso);
  const mins = Math.floor((now - at.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)} h ago`;
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const daysBack = Math.ceil((midnight.getTime() - at.getTime()) / 86_400_000);
  if (daysBack <= 1) return "yesterday";
  if (daysBack < 7) return WEEKDAYS[at.getDay()];
  return `${at.getDate()} ${MONTHS[at.getMonth()]}${at.getFullYear() === midnight.getFullYear() ? "" : ` ${at.getFullYear()}`}`;
}

/** The full date and time for a tooltip, in the browser's own zone: "26 Nov 2026, 5:17 pm IST". */
export function fullDateTime(iso: string) {
  // Saved with the date only (before 27 Nov): there's no time to show.
  if (iso.length <= 10) return formatDate(iso, true);
  // The date in the page's own order ("26 Nov 2026"); the time and its zone as the browser writes them.
  const at = new Date(iso);
  const time = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  return `${at.getDate()} ${MONTHS[at.getMonth()]} ${at.getFullYear()}, ${time}`;
}

/** A time in a line of meta: short (DESIGN.md §9.2), with the full date and time in its tooltip. */
export function When({ at, now }: { at: string; now: number }) {
  return (
    <time dateTime={at} title={now ? fullDateTime(at) : undefined}>
      {whenLabel(at, now)}
    </time>
  );
}

/** Today in the browser, as YYYY-MM-DD. */
export function todayYmd() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export function addDays(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string) {
  const ms = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(to) - ms(from)) / 86_400_000);
}
