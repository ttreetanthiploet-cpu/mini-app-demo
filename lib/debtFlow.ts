export type FieldInput = "number" | "select" | "text";

export interface FieldDef {
  key: string;
  label: string;
  input: FieldInput;
  required?: boolean;
  min?: number;
  money?: boolean;
  options?: string[];
}

export interface FormStep {
  id: string;
  block: "form";
  title: string;
  icon: string;
  fields: FieldDef[];
}

export interface ConfirmStep {
  id: string;
  block: "confirm";
  title: string;
  icon: string;
  prompt: string;
}

export type FlowStep = FormStep | ConfirmStep;

export interface FlowDef {
  id: string;
  steps: FlowStep[];
}

export type FormValues = Record<string, string>;

export const DEBT_FLOW: FlowDef = {
  id: "debt_intake",
  steps: [
    {
      id: "income",
      block: "form",
      title: "ข้อมูลรายได้",
      icon: "wallet",
      fields: [
        { key: "monthly_income", label: "รายได้ต่อเดือน (บาท)", input: "number", required: true, min: 0, money: true },
        { key: "employment_type", label: "ประเภทการจ้างงาน", input: "select", required: true, options: ["พนักงานประจำ", "ฟรีแลนซ์", "เจ้าของกิจการ"] },
      ],
    },
    {
      id: "debts",
      block: "form",
      title: "รายละเอียดหนี้",
      icon: "loan",
      fields: [
        { key: "total_outstanding", label: "ยอดหนี้คงค้างทั้งหมด (บาท)", input: "number", required: true, min: 0, money: true },
        { key: "monthly_payment", label: "ค่างวดผ่อนต่อเดือน (บาท)", input: "number", required: true, min: 0, money: true },
        { key: "debt_accounts", label: "จำนวนบัญชีหนี้", input: "number", required: true, min: 1 },
      ],
    },
    {
      id: "goal",
      block: "form",
      title: "เป้าหมายการจัดการหนี้",
      icon: "restructure",
      fields: [
        { key: "goal", label: "เป้าหมายของคุณ", input: "select", required: true, options: ["ลดค่างวด", "ปิดหนี้เร็วขึ้น", "รวมหนี้"] },
      ],
    },
    {
      id: "submit_to_officer",
      block: "confirm",
      title: "ยืนยันการส่งข้อมูล",
      icon: "agentChip",
      prompt: "ต้องการส่งข้อมูลให้เจ้าหน้าที่พิจารณาหรือไม่",
    },
  ],
};

import { fmtBaht, groupDigits } from "@/lib/utils";

export function buildSummaryRows(values: FormValues): [string, string][] {
  const rows: [string, string][] = [];
  DEBT_FLOW.steps.forEach((s) => {
    if (s.block !== "form") return;
    s.fields.forEach((f) => {
      const raw = values[f.key];
      let display = raw || "—";
      if (raw) {
        if (f.money) display = "฿ " + fmtBaht(raw);
        else if (f.input === "number") display = groupDigits(raw);
      }
      rows.push([f.label, display]);
    });
  });
  return rows;
}

export function fieldError(field: FieldDef, raw: string | undefined): string | null {
  const v = raw === undefined || raw === null ? "" : String(raw);
  if (field.required && v.trim() === "") return "กรุณากรอกข้อมูล";
  if (v.trim() === "") return null;
  if (field.input === "number") {
    const n = Number(v.replace(/[^\d.]/g, ""));
    if (Number.isNaN(n)) return "กรุณากรอกตัวเลข";
    if (field.min !== undefined && n < field.min)
      return `ต้องไม่น้อยกว่า ${field.min.toLocaleString("th-TH")}`;
  }
  return null;
}

export function stepValid(step: FlowStep, values: FormValues): boolean {
  if (step.block !== "form") return true;
  return step.fields.every((f) => !fieldError(f, values[f.key]));
}
