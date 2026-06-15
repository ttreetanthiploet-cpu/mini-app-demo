import BotAvatar from "@/components/bot-avatar";
import AgentAvatar from "@/components/agent-avatar";
import { IcBack, IcVerify, IcReset } from "@/components/icons";

const BOT_NAME = "น้องฟิน";
const AGENT_NAME = "เจ้าหน้าที่ ณัฐพล";

type HeaderProps = {
  mode: "bot" | "agent";
  onBack: () => void;
  onReset: () => void;
};

export default function Header({ mode, onBack, onReset }: HeaderProps) {
  const isAgent = mode === "agent";
  return (
    <div className="chat-header">
      <button className="hdr-btn" aria-label="ย้อนกลับ" onClick={onBack}>
        <IcBack />
      </button>
      <div className="hdr-id">
        {isAgent ? <AgentAvatar size={38} /> : <BotAvatar size={38} />}
        <div className="hdr-meta">
          <div className="hdr-name">
            {isAgent ? AGENT_NAME : BOT_NAME}
            {!isAgent && (
              <span className="hdr-verify">
                <IcVerify />
              </span>
            )}
          </div>
          <div className="hdr-status">
            <span className="dot-online" />
            {isAgent
              ? "ทีมที่ปรึกษา · กำลังสนทนา"
              : "ที่ปรึกษาทางการเงิน · ออนไลน์"}
          </div>
        </div>
      </div>
      <button
        className="hdr-btn"
        aria-label="เริ่มใหม่"
        onClick={onReset}
        title="เริ่มบทสนทนาใหม่"
      >
        <IcReset />
      </button>
    </div>
  );
}
