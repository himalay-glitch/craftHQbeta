import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, Info } from "lucide-react";
import type { Story } from "@/types/dashboard";
import { StatusPill } from "@/components/ui/StatusPill";
import { NEED_STATUS, rowAction, storyRef, type SortMode } from "./format";
import { PersonAvatar } from "./PersonAvatar";
import { Tip } from "./Tip";

interface QueueTableProps {
  stories: Story[];
  selectedId: number | null;
  sort: SortMode;
  onSort: () => void;
  onOpen: (id: number) => void;
}

// Header row 36 px: 12/16 grey, regular, sentence case, a 1 px #E8E8E8 rule. Sticky under the top bar.
const TH =
  "sticky top-[var(--bar-h)] z-10 h-9 border-b border-[var(--line)] bg-white px-3 align-middle text-[12px] leading-4 " +
  "font-normal text-[var(--tx2)]";
// Rows 46 px: 15/22 text and a 1 px #E8E8E8 rule. The first and last cells sit 16 px in, level with the cards' text.
const TD = "h-[46px] border-b border-[var(--line)] px-3 align-middle text-[15px] leading-[22px]";

const ARIA_SORT = { group: undefined, "updated-desc": "descending", "updated-asc": "ascending" } as const;

/** The stories that need a person, on screens 768 px and wider. A real table; each row opens its story. */
export function QueueTable({ stories, selectedId, sort, onSort, onOpen }: QueueTableProps) {
  const reduced = useReducedMotion();
  const SortIcon = sort === "updated-desc" ? ArrowDown : sort === "updated-asc" ? ArrowUp : ArrowUpDown;

  return (
    // Boxed like the cards: 1 px #E3E3E3 on all sides, 12 px corners. `overflow-clip` rounds the corners
    // without making a scroll container, so the header still sticks under the top bar.
    // The Action column gives way when the table is under 1000 px (a window under about 1120 px beside the rail, 1240 px with the
    // sidebar open), where it would be too narrow to read; Story then takes its space. It's also in the panel.
    <div className="@container overflow-clip rounded-[12px] border border-[var(--card-line)]">
      <table className="w-full table-fixed border-separate border-spacing-0 text-left">
        <thead>
          <tr>
            <th scope="col" className={`${TH} w-[34%] pl-4 @max-[999px]:w-auto`}>
              Story
            </th>
            <th scope="col" className={`${TH} w-[176px]`}>
              Status
            </th>
            <th scope="col" className={`${TH} @max-[999px]:hidden`}>
              Action
            </th>
            <th scope="col" className={`${TH} w-[72px]`}>
              Owner
            </th>
            <th scope="col" className={`${TH} w-[144px]`}>
              <span className="inline-flex items-center gap-1">
                Waiting on
                <Tip label={"Whose turn it is. Stuck stories aren’t waiting on anyone: the agent isn’t picking them up."}>
                  <button
                    type="button"
                    aria-label="About Waiting on"
                    className="inline-flex size-4 items-center justify-center rounded-full hover:text-[var(--tx)]"
                  >
                    <Info aria-hidden="true" size={14} strokeWidth={1.5} />
                  </button>
                </Tip>
              </span>
            </th>
            <th scope="col" aria-sort={ARIA_SORT[sort]} className={`${TH} w-[112px] pr-4 text-right`}>
              <button
                type="button"
                onClick={onSort}
                className="group inline-flex items-center gap-1 rounded-[4px] transition-colors duration-[120ms] hover:text-[var(--tx)]"
              >
                <SortIcon
                  aria-hidden="true"
                  size={12}
                  strokeWidth={1.75}
                  className={sort === "group" ? "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" : ""}
                />
                Updated
                <span className="sr-only">
                  {sort === "group" ? ", sort by newest" : sort === "updated-desc" ? ", sorted newest first" : ", sorted oldest first"}
                </span>
              </button>
            </th>
          </tr>
        </thead>
        {/* The box's bottom edge replaces the last row's rule. */}
        <tbody className="[&>tr:last-child>td]:border-b-0">
          <AnimatePresence initial={false}>
            {stories.map((s) => {
              const selected = s.id === selectedId;
              const action = rowAction(s);
              return (
                <motion.tr
                  key={s.id}
                  layout={reduced ? false : "position"}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                  onClick={() => onOpen(s.id)}
                  className={`cursor-pointer transition-colors duration-[80ms] ${
                    selected
                      ? "bg-[var(--row-sel)] hover:bg-[var(--row-sel-h)]"
                      : "hover:bg-[var(--row-h)] has-[:focus-visible]:bg-[var(--row-h)]"
                  }`}
                >
                  <td className={`${TD} pl-4`}>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-11 flex-none text-[13px] text-[var(--tx2)] tabular-nums">{storyRef(s.id)}</span>
                      <button
                        type="button"
                        data-story={s.id}
                        aria-current={selected ? "true" : undefined}
                        title={s.title}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(s.id);
                        }}
                        className="min-w-0 truncate rounded-[4px] text-left text-[var(--tx)]"
                      >
                        {s.title}
                      </button>
                    </span>
                  </td>
                  <td className={TD}>
                    <StatusPill status={NEED_STATUS[s.need!]} />
                  </td>
                  <td className={`${TD} truncate text-[var(--tx2)] @max-[999px]:hidden`} title={action}>
                    {action}
                  </td>
                  <td className={TD}>
                    {s.owner && (
                      <>
                        <PersonAvatar initials={s.owner} />
                        <span className="sr-only">Owner {s.owner}</span>
                      </>
                    )}
                  </td>
                  <td className={`${TD} truncate`}>{s.waitingOn}</td>
                  <td className={`${TD} pr-4 text-right text-[var(--tx2)] tabular-nums`}>{s.updated}</td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
