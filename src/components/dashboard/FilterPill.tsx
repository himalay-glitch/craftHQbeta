import type { ReactNode } from "react";
import { DropdownMenu } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { MENU_CONTENT, MENU_ITEM } from "./classes";

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  /** Shown before the label in the menu, for example an avatar. */
  icon?: ReactNode;
  count?: number;
}

interface FilterPillProps<T extends string> {
  /** "Next step", "Owner". */
  name: string;
  value: T;
  defaultValue: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  /** Show the value even at the default, when the default is itself a filter (Show: Mine). */
  showDefaultValue?: boolean;
  /** Label when a value is chosen; defaults to "Name: Value". */
  formatActive?: (label: string) => string;
}

// The reference's pill: 30 px, fully round, 1 px #CBCBCB, 13 px text, 16 px chevron 8 px after it.
const PILL =
  "inline-flex h-[30px] items-center gap-2 rounded-full border border-[var(--ctl)] pr-3 pl-3.5 text-[13px] leading-[18px] " +
  "whitespace-nowrap text-[var(--tx)] outline-offset-2 transition-colors duration-[120ms] hover:border-[var(--ctl-h)] " +
  "hover:bg-[var(--ctl-bg-h)] data-[state=open]:border-[var(--ctl-h)] data-[state=open]:bg-[var(--ctl-bg-h)]";

/** An Asana-style filter pill. Shows "Name" at its default and "Name: Value" otherwise. */
export function FilterPill<T extends string>({
  name,
  value,
  defaultValue,
  options,
  onChange,
  showDefaultValue,
  formatActive,
}: FilterPillProps<T>) {
  const current = options.find((o) => o.value === value) ?? options[0];
  const isDefault = value === defaultValue;
  const text =
    isDefault && !showDefaultValue ? name : formatActive && !isDefault ? formatActive(current.label) : `${name}: ${current.label}`;

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className={`${PILL} ${isDefault ? "bg-white" : "bg-[var(--ctl-bg-on)]"}`}>
        <span>{text}</span>
        <ChevronDown aria-hidden="true" size={16} strokeWidth={1.5} className="text-[var(--tx2)]" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={4} collisionPadding={8} className={MENU_CONTENT}>
          <DropdownMenu.RadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
            {options.map((o) => (
              <DropdownMenu.RadioItem key={o.value} value={o.value} className={MENU_ITEM}>
                {o.icon}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.count !== undefined && (
                  <span className="text-[13px] text-[var(--tx2)] tabular-nums">{o.count}</span>
                )}
                <span className="flex size-4 items-center justify-center">
                  <DropdownMenu.ItemIndicator>
                    <Check aria-hidden="true" size={16} strokeWidth={1.75} />
                  </DropdownMenu.ItemIndicator>
                </span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
