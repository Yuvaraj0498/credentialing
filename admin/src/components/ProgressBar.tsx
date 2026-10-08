"use client";



export function ProgressBar({ filled, total, color }: { filled: number; total: number; color?: string }) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="progress flex-1" style={{ minWidth: 60, maxWidth: 120 }}>
        <div className="progress-bar" style={{ width: pct + "%", background: color || "var(--accent)" }}></div>
      </div>
      <span className="text-xs font-medium" style={{ color: "var(--ink-light)", whiteSpace: "nowrap" }}>
        {filled}/{total} ({pct}%)
      </span>
    </div>
  );
}
