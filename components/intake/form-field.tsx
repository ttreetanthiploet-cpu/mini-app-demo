import { fieldError } from "@/lib/debtFlow";
import type { FieldDef } from "@/lib/debtFlow";
import { groupDigits } from "@/lib/utils";

interface FormFieldProps {
  field: FieldDef;
  value: string | undefined;
  showErr: boolean;
  onChange: (val: string) => void;
}

export default function FormField({ field, value, showErr, onChange }: FormFieldProps) {
  const err = showErr ? fieldError(field, value) : null;

  return (
    <div className="field">
      <label className="field-label">
        {field.label}
        {field.required && <span className="req">*</span>}
      </label>

      {field.input === "select" ? (
        <select
          className="field-select"
          data-err={!!err}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>
            เลือก{field.label}
          </option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.money ? (
        <div className="field-amount">
          <span className="baht">฿</span>
          <input
            className="field-input"
            data-err={!!err}
            inputMode="numeric"
            value={groupDigits(value)}
            placeholder="0"
            onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
          />
        </div>
      ) : (
        <input
          className="field-input"
          data-err={!!err}
          inputMode={field.input === "number" ? "numeric" : "text"}
          value={value || ""}
          placeholder={field.input === "number" ? "0" : ""}
          onChange={(e) =>
            onChange(
              field.input === "number"
                ? e.target.value.replace(/[^\d]/g, "")
                : e.target.value
            )
          }
        />
      )}

      {err && <span className="field-err">{err}</span>}
    </div>
  );
}
