import { IcShield } from "@/components/icons";
import { buildSummaryRows } from "@/lib/debtFlow";
import type { FormValues } from "@/lib/debtFlow";

interface ConfirmReviewProps {
  values: FormValues;
  prompt: string;
}

export default function ConfirmReview({ values, prompt }: ConfirmReviewProps) {
  const rows = buildSummaryRows(values);

  return (
    <div className="confirm-block">
      <div className="confirm-review">
        {rows.map(([k, v]) => (
          <div className="summary-row" key={k}>
            <span className="summary-k">{k}</span>
            <span className="summary-v">{v}</span>
          </div>
        ))}
      </div>
      <div className="confirm-prompt">
        <span className="confirm-q">
          <IcShield />
        </span>
        {prompt}
      </div>
    </div>
  );
}
