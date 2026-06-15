interface SystemDividerProps {
  text: string;
}

export default function SystemDivider({ text }: SystemDividerProps) {
  return (
    <div className="sys-divider">
      <span>{text}</span>
    </div>
  );
}
