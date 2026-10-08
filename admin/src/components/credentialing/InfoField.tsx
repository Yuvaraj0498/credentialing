import type { ReactNode } from "react";

/** Prototype's read-only `Field({label, val})` (label over value). */
export function InfoField({ label, val }: { label: ReactNode; val?: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-medium text-ink-faint uppercase tracking-wider">{label}</div>
      <div className="text-sm text-ink mt-0.5">{val || "—"}</div>
    </div>
  );
}

export const isWriter = (role?: string | null) => role === "platform_admin" || role === "org_admin" || role === "clerk";
