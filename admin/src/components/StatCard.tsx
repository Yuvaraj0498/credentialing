"use client";

import { type ReactNode } from "react";
import { Icon } from "./Icon";

export function StatCard({ label, value, sub, icon, color, emphasize }: { label: ReactNode; value: ReactNode; sub?: ReactNode; icon: string; color?: string; emphasize?: boolean }) {
  return (
    <div className={"card card-pad " + (emphasize ? "border-l-4" : "")} style={emphasize ? { borderLeftColor: color, background: "var(--accent-soft)" } : {}}>
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium text-ink-light">{label}</div>
        <Icon name={icon} size={14} style={{ color }} />
      </div>
      <div className="font-display text-3xl font-bold mt-2" style={{ color: emphasize ? color : "var(--ink)" }}>{value}</div>
      <div className="text-xs text-ink-faint mt-1">{sub}</div>
    </div>
  );
}
