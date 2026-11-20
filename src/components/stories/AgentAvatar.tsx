import { Mascot } from "./Mascot";

/** The agent's avatar: the orange plush mascot (robots are their own shape; people are circles). */
export function AgentAvatar({ size = 28 }: { size?: 20 | 28 | 32 }) {
  return <Mascot size={size} />;
}
