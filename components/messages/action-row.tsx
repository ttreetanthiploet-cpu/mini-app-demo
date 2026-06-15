import { IcBill, IcTopup, IcTransfer } from "@/components/icons";

interface Action {
  key: string;
  Icon: React.FC;
  label: string;
}

const ACTIONS: Action[] = [
  { key: "bill", Icon: IcBill, label: "ชำระบิล" },
  { key: "topup", Icon: IcTopup, label: "เติมเงิน" },
  { key: "transfer", Icon: IcTransfer, label: "โอนเงิน" },
];

interface ActionRowProps {
  onAction: (action: Action) => void;
}

export default function ActionRow({ onAction }: ActionRowProps) {
  return (
    <div className="actions-row">
      {ACTIONS.map((a) => (
        <button key={a.key} className="action-btn" onClick={() => onAction(a)}>
          <span className="action-ico">
            <a.Icon />
          </span>
          <span className="action-lbl">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
