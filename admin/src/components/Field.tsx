"use client";

import { type ReactNode } from "react";

export function Field({ label, error, children, required, hint, className = "" }: { label?: ReactNode; error?: string; children: ReactNode; required?: boolean; hint?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && (
        <label className="label">
          {label}
          {required && <span style={{ color: "var(--danger)" }}> *</span>}
        </label>
      )}
      {children}
      {error ? <div className="field-error">{error}</div> : hint ? <div className="text-[11px] text-ink-faint mt-1">{hint}</div> : null}
    </div>
  );
}
