interface AgentAvatarProps {
  size?: number;
}

export default function AgentAvatar({ size = 28 }: AgentAvatarProps) {
  return (
    <div
      className="avatar-agent"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      ณ
    </div>
  );
}
