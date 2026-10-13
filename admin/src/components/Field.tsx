"use client";

import { isValidElement, type ReactNode } from "react";

/** The plain text of a label ("First Name *" → "First Name"). */
function labelText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(labelText).join("");
  if (isValidElement(node)) return labelText((node.props as { children?: ReactNode }).children);
  return "";
}

/**
 * Error messages read as a sentence with the field's name: "Required" → "First Name is required",
 * "9 digits required" → "Tax ID must be 9 digits", "At least 8 characters" → "Password must be at least 8 characters".
 * Messages that already say what is wrong are shown as they are.
 */
export function readableError(error: string, label?: ReactNode): string {
  const name = labelText(label).replace(/\*/g, "").replace(/\s+/g, " ").trim();
  const msg = error.trim();
  if (!name) return /^required\.?$/i.test(msg) ? "This field is required" : msg;
  if (/^(required|this field is required)\.?$/i.test(msg)) return name + " is required";
  let m = /^(\d+(?:\s*-\s*\d+)?) digits?( required)?\.?$/i.exec(msg);
  if (m) return name + " must be " + m[1].replace(/\s+/g, "") + " digits";
  m = /^at least (\d+) characters?\.?$/i.exec(msg);
  if (m) return name + " must be at least " + m[1] + " characters";
  m = /^at most (\d+) characters?\.?$/i.exec(msg);
  if (m) return name + " must be at most " + m[1] + " characters";
  if (/^valid email required\.?$/i.test(msg)) return "Enter a valid email address";
  return msg;
}

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
      {error ? <div className="field-error">{readableError(error, label)}</div> : hint ? <div className="text-[11px] text-ink-faint mt-1">{hint}</div> : null}
    </div>
  );
}
