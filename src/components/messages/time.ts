// Time labels for messages. `now` comes from a ticking hook (stories/clock.ts), so Date.now() never runs
// during render; 0 means "not read yet", and the labels fall back to the date.

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dateLabel = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const timeLabel = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

function isYesterday(d: Date, now: Date) {
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  return sameDay(d, y);
}

/** For lists: "Just now", "9m", "2h", "Yesterday", "Nov 18". */
export function ago(at: number, now: number) {
  if (!now) return dateLabel(new Date(at));
  const d = new Date(at);
  const n = new Date(now);
  const mins = Math.floor((now - at) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  if (sameDay(d, n)) return `${Math.floor(mins / 60)}h`;
  if (isYesterday(d, n)) return "Yesterday";
  return dateLabel(d);
}

/** The day a message belongs to, for dividers: "Today", "Yesterday", "Nov 18". */
export function day(at: number, now: number) {
  if (!now) return dateLabel(new Date(at));
  const d = new Date(at);
  const n = new Date(now);
  if (sameDay(d, n)) return "Today";
  if (isYesterday(d, n)) return "Yesterday";
  return dateLabel(d);
}

/** Beside a name in a conversation: "Just now", "10:42 AM" today, otherwise the day. */
export function stamp(at: number, now: number) {
  if (now && now - at < 60_000) return "Just now";
  if (now && sameDay(new Date(at), new Date(now))) return timeLabel(new Date(at));
  return day(at, now);
}
