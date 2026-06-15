import { IcCheck, IcLock } from "@/components/icons";
import { buildSummaryRows } from "@/lib/debtFlow";
import type { FormValues } from "@/lib/debtFlow";

export type SummaryData = {
  values: FormValues;
  ref: string;
};

type SummaryCardProps = {
  data: SummaryData;
};

export default function SummaryCard({ data }: SummaryCardProps) {
  const rows = buildSummaryRows(data.values);

  return (
    <div className="summary-card">
      <div className="summary-head">
        <div className="summary-check">
          <IcCheck />
        </div>
        <div className="summary-head-txt">
          <div className="summary-title">ส่งข้อมูลเรียบร้อยแล้ว</div>
          <div className="summary-sub">ทีมที่ปรึกษาได้รับคำขอของคุณแล้ว</div>
        </div>
        <span className="ref-pill">{data.ref}</span>
      </div>

      <div className="summary-body">
        {rows.map(([k, val]) => (
          <div className="summary-row" key={k}>
            <span className="summary-k">{k}</span>
            <span className="summary-v">{val}</span>
          </div>
        ))}
      </div>

      <div className="summary-foot">
        <span className="lock-ico">
          <IcLock />
        </span>
        ข้อมูลถูกล็อกและเข้ารหัส ใช้เพื่อการให้คำปรึกษาเท่านั้น
      </div>
    </div>
  );
}
