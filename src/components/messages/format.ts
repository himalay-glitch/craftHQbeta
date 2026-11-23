import type { Message } from "@/types/messages";
import type { Segment } from "@/types/stories";
import { storyRef } from "@/components/dashboard/format";
import { names } from "@/components/stories/RichText";
import { firstName } from "./team";

/** One line of a message for a list: chips as they were typed ("@Deepak", "#hq-34"). */
export function previewOf(text: Segment[], files: number) {
  const words = text
    .map((seg) => (typeof seg === "string" ? seg : seg.type === "person" ? `@${seg.name.split(" ")[0]}` : seg.type === "agent" ? "@agent" : `#${storyRef(seg.id)}`))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (words) return words;
  return files === 1 ? "Sent a file" : `Sent ${files} files`;
}

/** Under your own message: whether the people it's for have seen it. */
export function receipt(m: Message, viewer: string) {
  const to = m.to.filter((id) => id !== viewer);
  const seen = to.filter((id) => m.seen[id]);
  if (!to.length) return null;
  if (!seen.length) return "Not seen yet";
  if (seen.length === to.length) return to.length === 1 ? "Seen" : "Seen by everyone";
  return `Seen by ${names(seen.map(firstName))}`;
}
