"use client";

import { useState } from "react";
import { DEFAULT_PHONE_CODE, PHONE_CODES, digitsOnly, joinPhone, splitPhone } from "@/lib/validation";

/**
 * Phone / mobile input used everywhere: country code (+91 default, or +1) and a 10-digit number.
 * The value is "+91 9876543210" ("" while no digits are entered).
 */
export function PhoneInput({
  value,
  onChange,
  invalid = false,
  disabled = false,
  id,
  autoComplete = "tel-national",
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
  autoComplete?: string;
}) {
  const parts = splitPhone(value);
  // the chosen code is kept while the number is still empty
  const [code, setCode] = useState(value ? parts.code : DEFAULT_PHONE_CODE);
  const shownCode = value ? parts.code : code;
  return (
    <div className="flex gap-1.5">
      <select
        value={shownCode}
        onChange={(e) => {
          setCode(e.target.value);
          onChange(joinPhone(e.target.value, parts.digits));
        }}
        className={"input" + (invalid ? " input-error" : "")}
        style={{ width: 76, flexShrink: 0, paddingLeft: 8, paddingRight: 4 }}
        disabled={disabled}
        aria-label="Country code"
      >
        {PHONE_CODES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input
        id={id}
        value={parts.digits}
        onChange={(e) => onChange(joinPhone(shownCode, digitsOnly(e.target.value, 10)))}
        className={"input font-mono flex-1 min-w-0" + (invalid ? " input-error" : "")}
        inputMode="numeric"
        placeholder="10 digits"
        maxLength={10}
        disabled={disabled}
        autoComplete={autoComplete}
      />
    </div>
  );
}
