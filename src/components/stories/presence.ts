// Who's in CraftHQ right now, for the green dot on a person's face (Shubham, 26 Nov: the old Stories page showed who's
// online, and it's a good signal: you can see who can answer or pick something up without asking). Front end only: a
// fixed sample until the CraftHQ API sends presence. You aren't listed: a dot on your own face says nothing.

/** true: online now. Otherwise when they were last here, in words. */
const SEEN: Record<string, true | string> = {
  DT: true,
  S: true,
  MS: true,
  P: "20m ago",
  R: "2h ago",
  E: "yesterday",
};

export const isOnline = (initials?: string) => Boolean(initials && SEEN[initials] === true);

/** "Online now", "Last here 2h ago", or nothing when we don't know. */
export function seenText(initials?: string) {
  const seen = initials ? SEEN[initials] : undefined;
  if (seen === true) return "Online now";
  return seen ? `Last here ${seen}` : undefined;
}
