"use client";

import { useState } from "react";
import { DEBT_FLOW, stepValid } from "@/lib/debtFlow";
import type { FormValues } from "@/lib/debtFlow";
import { iconMap } from "@/components/icons";
import FormField from "./form-field";
import ConfirmReview from "./confirm-review";

export interface FormSubmitData {
  values: FormValues;
  ref: string;
}

interface IntakeFormProps {
  onSubmit: (data: FormSubmitData) => void;
}

export default function IntakeForm({ onSubmit }: IntakeFormProps) {
  const steps = DEBT_FLOW.steps;
  const [idx, setIdx] = useState(0);
  const [values, setValues] = useState<FormValues>({});
  const [touched, setTouched] = useState(false);

  const step = steps[idx];
  const formSteps = steps.filter((s) => s.block === "form").length;
  const canNext = stepValid(step, values);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const next = () => {
    if (step.block === "form" && !canNext) {
      setTouched(true);
      return;
    }
    if (idx < steps.length - 1) {
      setIdx(idx + 1);
      setTouched(false);
    }
  };

  const back = () => {
    if (idx > 0) {
      setIdx(idx - 1);
      setTouched(false);
    }
  };

  const confirmSubmit = () => {
    const ref = "KTB" + Math.floor(100000 + Math.random() * 899999);
    onSubmit({ values, ref });
  };

  const StepIcon = iconMap[step.icon] ?? iconMap.restructure;

  return (
    <div className="form-card">
      <div className="form-head">
        <div className="form-head-ico">
          <StepIcon />
        </div>
        <div style={{ flex: 1 }}>
          <div className="form-title">{step.title}</div>
          <div className="form-desc">แบบฟอร์มขอคำปรึกษาแก้ปัญหาหนี้ส่วนบุคคล</div>
        </div>
        <span className="step-pill">
          {Math.min(idx + 1, formSteps + 1)}/{steps.length}
        </span>
      </div>

      <div className="step-track">
        {steps.map((s, i) => (
          <span key={s.id} className="step-seg" data-on={i <= idx ? "true" : "false"} />
        ))}
      </div>

      <div className="form-body">
        {step.block === "form" ? (
          step.fields.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={values[field.key]}
              showErr={touched}
              onChange={(v) => set(field.key, v)}
            />
          ))
        ) : (
          <ConfirmReview
            values={values}
            prompt={step.prompt}
          />
        )}

        <div className="form-nav">
          {idx > 0 && (
            <button className="btn-ghost" onClick={back}>
              ย้อนกลับ
            </button>
          )}
          {step.block === "form" ? (
            <button
              className="form-submit"
              data-dim={!canNext ? "true" : "false"}
              onClick={next}
            >
              ถัดไป
            </button>
          ) : (
            <button className="form-submit" onClick={confirmSubmit}>
              ส่งให้เจ้าหน้าที่
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
