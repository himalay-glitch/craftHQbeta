import { BotAvatar } from "@/components/ask/BotAvatar";

/**
 * Who speaks on a story: the PM, the only bot you talk to (robots are their own shape; people are circles).
 * The Builder, Asker and Checker work out of sight; their work shows as quiet lines and in the activity log.
 */
export function AgentAvatar({ size = 28 }: { size?: 20 | 28 | 32 | 36 | 40 }) {
  return <BotAvatar id="pm" size={size} bare />;
}
