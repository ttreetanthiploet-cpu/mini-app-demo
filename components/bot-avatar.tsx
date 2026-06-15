interface BotAvatarProps {
  size?: number;
  float?: boolean;
}

export default function BotAvatar({ size = 28, float = false }: BotAvatarProps) {
  return (
    <div
      className={float ? "mascot-float" : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(155deg, color-mix(in oklab, var(--accent), #fff 15%) 0%, var(--accent-dark) 100%)",
        boxShadow: "0 6px 14px -6px color-mix(in oklab, var(--accent), #000 35%)",
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ display: "block" }}>
        <ellipse cx="38" cy="30" rx="26" ry="16" fill="#fff" opacity="0.16" />
        <path d="M27 49a23 23 0 0 1 46 0" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.92" />
        <rect x="22.5" y="47" width="9" height="15" rx="4.5" fill="#fff" opacity="0.92" />
        <rect x="68.5" y="47" width="9" height="15" rx="4.5" fill="#fff" opacity="0.92" />
        <path d="M73 60v6a8 8 0 0 1-8 8h-9" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
        <circle cx="40" cy="54" r="5" fill="#fff" />
        <circle cx="60" cy="54" r="5" fill="#fff" />
        <path d="M40 66q10 9 20 0" fill="none" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" />
        <circle cx="31" cy="62" r="3.4" fill="#fff" opacity="0.28" />
        <circle cx="69" cy="62" r="3.4" fill="#fff" opacity="0.28" />
      </svg>
    </div>
  );
}
