import BotAvatar from "@/components/bot-avatar";
import AgentAvatar from "@/components/agent-avatar";

interface BubbleProps {
  kind: "bot" | "user" | "agent";
  text: string;
  time: string;
}

export default function Bubble({ kind, text, time }: BubbleProps) {
  const isUser = kind === "user";
  const avatar = kind === "agent" ? <AgentAvatar size={28} /> : <BotAvatar size={28} />;

  return (
    <div className={`row ${isUser ? "user" : ""}`}>
      {!isUser && <div className="avatar-slot">{avatar}</div>}
      <div>
        <div className={`bubble ${kind}`}>{text}</div>
        <div className="msg-time">{time}</div>
      </div>
    </div>
  );
}
