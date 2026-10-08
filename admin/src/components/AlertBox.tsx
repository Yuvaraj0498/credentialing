"use client";

import { type ReactNode } from "react";
import { Icon } from "./Icon";

/** Notice for features whose external integration ships in a later phase. */
export function DeferredNotice({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={"p-3 rounded-lg flex items-start gap-2 text-xs " + className} style={{ background: "var(--info-soft)", color: "#1e40af" }}>
      <Icon name="Info" size={14} className="mt-0.5 flex-shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function AlertBox({ type = "danger", children }: { type?: "danger" | "warn" | "success" | "info"; children: ReactNode }) {
  const map = {
    danger: { bg: "var(--danger-soft)", color: "#991b1b", icon: "AlertCircle" },
    warn: { bg: "var(--warn-soft)", color: "#854d0e", icon: "AlertTriangle" },
    success: { bg: "var(--success-soft)", color: "#065f46", icon: "CheckCircle2" },
    info: { bg: "var(--info-soft)", color: "#1e40af", icon: "Info" },
  }[type];
  return (
    <div className="px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: map.bg, color: map.color, fontSize: 13 }}>
      <Icon name={map.icon} size={14} /> {children}
    </div>
  );
}

/** Access-denied panel (prototype AccessDenied). */
export function AccessDenied({ action = "view", entity = "this page", role }: { action?: string; entity?: string; role?: string }) {
  return (
    <div className="card p-10 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ background: "var(--danger-soft)" }}>
        <Icon name="ShieldAlert" size={22} style={{ color: "var(--danger)" }} />
      </div>
      <div className="font-display font-semibold text-ink">Access denied</div>
      <div className="text-sm text-ink-light mt-1">
        Your role{role ? ` (${role})` : ""} does not have permission to {action} {entity}.
      </div>
    </div>
  );
}
