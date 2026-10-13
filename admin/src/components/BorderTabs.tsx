"use client";

import { Icon } from "@/components/Icon";

/** Bordered tab buttons; the selected one is highlighted (Organizations, Payers, Custom Templates). */
export function BorderTabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; icon?: string; count?: number }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap" role="tablist">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              border: "1.5px solid " + (active ? "var(--accent)" : "var(--line-strong, #cbd5e1)"),
              background: active ? "var(--accent)" : "var(--paper)",
              color: active ? "white" : "var(--ink-light)",
              boxShadow: active ? "0 2px 8px rgba(249, 115, 22, 0.25)" : "none",
            }}
          >
            {t.icon && <Icon name={t.icon} size={15} />} {t.label}
            {t.count != null && (
              <span className="text-[11px] font-mono rounded-full px-1.5" style={{ background: active ? "rgba(255,255,255,.25)" : "var(--bg-soft-2)" }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
