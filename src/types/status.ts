// The ticket statuses and their tones, as DESIGN.md §7.12 and §3.1 define them. Shared by every area.

/** DESIGN.md §3.1 tones. Every status belongs to exactly one. */
export type StatusTone = "neutral" | "active" | "attention" | "positive" | "negative";

/** DESIGN.md §7.12 ticket statuses. A status never says "you": it means the same to everyone looking. */
export type TicketStatus =
  | "draft"
  | "asking"
  | "needs_input"
  | "building"
  | "checking"
  | "in_review"
  | "merged"
  | "failed"
  | "closed";
