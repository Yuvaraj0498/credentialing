"use client";

// SVG charts ported from the prototype (BarChart, LineChart, DonutChart, horizontal bars).

export interface ChartPoint {
  label: string;
  value: number;
}

export function BarChart({ data, color = "var(--accent)", height = 200 }: { data: ChartPoint[]; color?: string; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ position: "relative", height }}>
      <svg viewBox={"0 0 " + Math.max(1, data.length * 60) + " 200"} preserveAspectRatio="none" className="w-full h-full">
        {data.map((d, i) => {
          const h = (d.value / max) * 160;
          return (
            <g key={i}>
              <rect x={i * 60 + 10} y={180 - h} width="40" height={h} fill={color} rx="3" />
              <text x={i * 60 + 30} y={195} fontSize="10" textAnchor="middle" fill="var(--ink-light)">{d.label}</text>
              <text x={i * 60 + 30} y={175 - h} fontSize="11" fontWeight="600" textAnchor="middle" fill="var(--ink)">{d.value}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function LineChart({ data, color = "var(--info)", height = 160 }: { data: ChartPoint[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 280,
    h = 140;
  const stepX = w / (data.length - 1);
  const points = data.map((d, i) => [i * stepX, h - (d.value / max) * (h - 20) - 10]);
  const pathD = "M " + points.map((p) => p[0].toFixed(0) + " " + p[1].toFixed(0)).join(" L ");
  const areaD = pathD + " L " + w + " " + h + " L 0 " + h + " Z";
  return (
    <div style={{ height }}>
      <svg viewBox={"0 0 " + w + " " + (h + 20)} className="w-full h-full" preserveAspectRatio="none">
        <path d={areaD} fill={color} opacity="0.15" />
        <path d={pathD} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="3" fill={color} />
            <text x={p[0]} y={h + 15} fontSize="9" textAnchor="middle" fill="var(--ink-faint)">{data[i].label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function DonutChart({ segments, size = 160 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 60,
    cx = size / 2,
    cy = size / 2;
  const visible = segments.filter((s) => s.value > 0);
  const arcs = visible
    .map((s, idx) => {
      const portion = s.value / total;
      const angle = portion * Math.PI * 2;
      const start = -Math.PI / 2 + visible.slice(0, idx).reduce((acc, x) => acc + (x.value / total) * Math.PI * 2, 0);
      const end = start + angle;
      const x1 = cx + r * Math.cos(start),
        y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end),
        y2 = cy + r * Math.sin(end);
      const large = angle > Math.PI ? 1 : 0;
      const d =
        portion === 1
          ? "M " + cx + " " + (cy - r) + " A " + r + " " + r + " 0 1 1 " + (cx - 0.01) + " " + (cy - r) + " Z"
          : "M " + cx + " " + cy + " L " + x1 + " " + y1 + " A " + r + " " + r + " 0 " + large + " 1 " + x2 + " " + y2 + " Z";
      return { d, color: s.color };
    });
  const realTotal = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size}>
        {arcs.length === 0 && <circle cx={cx} cy={cy} r={r} fill="var(--bg-soft-2)" />}
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} />
        ))}
        <circle cx={cx} cy={cy} r="32" fill="var(--bg)" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--ink)">{realTotal}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="var(--ink-light)">Total</text>
      </svg>
      <div className="space-y-1 text-xs">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: s.color }}></div>
            <span className="text-ink">{s.label}</span>
            <span className="text-ink-light font-mono ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal labelled bars (prototype EnrollmentsByPayerChart). */
export function HorizontalBars({ items }: { items: { name: string; color: string; count: number }[] }) {
  const max = Math.max(...items.map((c) => c.count), 1);
  return (
    <div className="space-y-3">
      {items.map((c, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: c.color }}></div>
              <span className="text-ink font-medium">{c.name}</span>
            </div>
            <span className="text-ink-light font-mono">{c.count}</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: (c.count / max) * 100 + "%", background: c.color }}></div>
          </div>
        </div>
      ))}
    </div>
  );
}
