"use client";

import { useEffect } from "react";
import { Icon } from "./Icon";

export function Toast({ message, type = "success", onClose }: { message: string; type?: "success" | "error" | "warn" | "info"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  const icon = type === "success" ? "CheckCircle2" : type === "error" ? "XCircle" : type === "warn" ? "AlertTriangle" : "Info";
  const colors = {
    success: { bg: "var(--success-soft)", text: "#065f46", border: "var(--success)" },
    error: { bg: "var(--danger-soft)", text: "#991b1b", border: "var(--danger)" },
    warn: { bg: "var(--warn-soft)", text: "#854d0e", border: "var(--warn)" },
    info: { bg: "var(--info-soft)", text: "#1e40af", border: "var(--info)" },
  };
  const c = colors[type] || colors.success;
  return (
    <div className="fixed bottom-6 right-6 z-50 slide-up" style={{ maxWidth: 360 }}>
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4" style={{ background: c.bg, color: c.text, borderLeftColor: c.border }}>
        <Icon name={icon} size={18} />
        <div className="flex-1 text-sm font-medium">{message}</div>
        <button onClick={onClose} className="opacity-60 hover:opacity-100" aria-label="Close">
          <Icon name="X" size={14} />
        </button>
      </div>
    </div>
  );
}
