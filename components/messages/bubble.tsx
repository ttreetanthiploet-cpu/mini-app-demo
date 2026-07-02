import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import BotAvatar from "@/components/bot-avatar";
import AgentAvatar from "@/components/agent-avatar";

interface BubbleProps {
  kind: "bot" | "user" | "agent";
  text: string;
  time: string;
  agentUsed?: string;
}

export default function Bubble({ kind, text, time, agentUsed }: BubbleProps) {
  const isUser = kind === "user";
  const avatar = kind === "agent" ? <AgentAvatar size={28} /> : <BotAvatar size={28} />;

  return (
    <div className={`row ${isUser ? "user" : ""}`}>
      {!isUser && <div className="avatar-slot">{avatar}</div>}
      <div>
        <div className={`bubble ${kind}`}>
          {isUser ? (
            text
          ) : (
            <div className="md-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  a: (props) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div className="msg-time">
          {agentUsed && <span className="agent-used">{agentUsed} · </span>}
          {time}
        </div>
      </div>
    </div>
  );
}
