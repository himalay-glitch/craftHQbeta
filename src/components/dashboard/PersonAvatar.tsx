// Soft tint plus dark initials. The colour is fixed per person (from their initials), never random.
const TINTS = [
  "bg-[#E3ECFD] text-[#1F57C3]",
  "bg-[#DDF3EA] text-[#1F6B4F]",
  "bg-[#FCEFD6] text-[#7A4A00]",
  "bg-[#EEE7FD] text-[#5B3FC4]",
  "bg-[#FCE4EC] text-[#A6264F]",
  "bg-[#DDF2F4] text-[#17646B]",
];

function tintFor(key: string) {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length];
}

const SIZE = { 20: "size-5 text-[9px]", 24: "size-6 text-[10px]", 28: "size-7 text-[11px]" } as const;

export function PersonAvatar({ initials, size = 20 }: { initials: string; size?: keyof typeof SIZE }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-none items-center justify-center rounded-full font-semibold tracking-[0.02em] ${SIZE[size]} ${tintFor(initials)}`}
    >
      {initials}
    </span>
  );
}
