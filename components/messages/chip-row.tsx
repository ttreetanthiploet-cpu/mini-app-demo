export interface ChipItem {
  label: string;
  act: string;
  text?: string;
}

interface ChipRowProps {
  items: ChipItem[];
  onTap: (chip: ChipItem) => void;
}

export default function ChipRow({ items, onTap }: ChipRowProps) {
  return (
    <div className="chips">
      {items.map((c, i) => (
        <button key={i} className="chip" onClick={() => onTap(c)}>
          {c.label}
        </button>
      ))}
    </div>
  );
}
