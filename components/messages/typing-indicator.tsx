import BotAvatar from "@/components/bot-avatar";
import AgentAvatar from "@/components/agent-avatar";

interface TypingIndicatorProps {
  who?: "bot" | "agent";
}

export default function TypingIndicator({ who = "bot" }: TypingIndicatorProps) {
  const avatar = who === "agent" ? <AgentAvatar size={28} /> : <BotAvatar size={28} />;
  return (
    <div className="row">
      <div className="avatar-slot">{avatar}</div>
      <div className="bubble bot" style={{ padding: 0 }}>
        <div className="typing">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
