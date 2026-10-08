"use client";

import { AsyncBoundary } from "@/components/AsyncState";
import { StatCard } from "@/components/StatCard";
import { DonutChart, HorizontalBars, LineChart } from "@/components/Charts";
import { useTopic } from "@/stores/shell";
import { api } from "@/lib/api";
import { STATUS } from "@/lib/constants";
import { useAsync } from "@/lib/hooks";
import type { PayerEnrollmentReportData } from "@/types/reports";

const STATUS_COLORS: Record<string, string> = {
  draft: "#eab308",
  in_progress: "#f97316",
  submitted: "#3b82f6",
  approved: "#10b981",
  needs_attention: "#ef4444",
  on_hold: "#a855f7",
  terminated: "#64748b",
};

const tat = (n: number | null) => (n != null ? Math.round(n) + "d" : "—");

export function PayerEnrollmentReport() {
  const { data, loading, error, reload } = useAsync(() => api.get<PayerEnrollmentReportData>("/reports/payer-enrollment"), []);
  useTopic("enrollments", reload);

  return (
    <AsyncBoundary loading={loading && !data} error={data ? null : error} onRetry={reload}>
      {data && <PayerEnrollmentBody data={data} />}
    </AsyncBoundary>
  );
}

function PayerEnrollmentBody({ data }: { data: PayerEnrollmentReportData }) {
  const topPayers = data.byPayer.slice(0, 6).map((p) => ({ name: p.payerName, color: p.color, count: p.total }));
  const trend = data.monthlyTrend.map((m) => ({ label: m.label, value: m.submitted }));
  const segments = Object.keys(STATUS)
    .filter((k) => (data.byStatus[k] || 0) > 0)
    .map((k) => ({ label: STATUS[k].label, value: data.byStatus[k] || 0, color: STATUS_COLORS[k] || "#94a3b8" }));

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <StatCard label="Total Enrollments" value={data.total} sub="Across all payers" icon="ClipboardList" color="var(--ink)" />
        <StatCard label="In Progress" value={data.inProgress} sub="Active enrollments" icon="Loader" color="var(--accent)" />
        <StatCard label="Submitted" value={data.submitted} sub="With payers" icon="Send" color="var(--info)" />
        <StatCard label="Approved" value={data.approved} sub="Completed" icon="CheckCircle2" color="var(--success)" />
        <StatCard label="Needs Attention" value={data.needsAttention} sub="Requires review" icon="XCircle" color="var(--danger)" />
        <StatCard label="Avg TAT" value={tat(data.avgTatDays)} sub="Approved applications" icon="Clock" color="var(--info)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card card-pad">
          <h3 className="font-display font-semibold text-ink mb-1">Enrollments by Payer</h3>
          <p className="text-xs text-ink-light mb-4">Top payers by volume</p>
          {topPayers.length === 0 ? <div className="text-xs text-ink-faint py-6 text-center">No enrollments yet.</div> : <HorizontalBars items={topPayers} />}
        </div>
        <div className="card card-pad">
          <h3 className="font-display font-semibold text-ink mb-1">Monthly Enrollment Trend</h3>
          <p className="text-xs text-ink-light mb-4">New enrollments per month</p>
          {trend.length >= 2 ? (
            <LineChart data={trend} color="#3b82f6" height={160} />
          ) : (
            <div className="text-xs text-ink-faint py-6 text-center">Not enough data for a trend yet.</div>
          )}
        </div>
        <div className="card card-pad">
          <h3 className="font-display font-semibold text-ink mb-1">Payer TAT Summary</h3>
          <p className="text-xs text-ink-light mb-4">Average turnaround time by payer</p>
          {data.byPayer.length === 0 ? (
            <div className="text-xs text-ink-faint py-6 text-center">No turnaround data yet.</div>
          ) : (
            <div className="space-y-2">
              {data.byPayer.slice(0, 5).map((p) => (
                <div key={p.payerId} className="flex items-center justify-between py-1 border-b border-line last:border-0">
                  <span className="text-sm text-ink">{p.payerName}</span>
                  <span className="text-sm font-mono font-semibold text-ink">{tat(p.avgTatDays)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card card-pad">
          <h3 className="font-display font-semibold text-ink mb-1">Status Breakdown</h3>
          <p className="text-xs text-ink-light mb-4">Enrollments by current status</p>
          <DonutChart segments={segments} />
        </div>
        <div className="card lg:col-span-2 overflow-hidden">
          <div className="p-5 pb-3">
            <h3 className="font-display font-semibold text-ink mb-1">Payer Breakdown</h3>
            <p className="text-xs text-ink-light">Enrollment status and turnaround vs. payer benchmark</p>
          </div>
          {data.byPayer.length === 0 ? (
            <div className="text-xs text-ink-faint py-6 text-center">No enrollments yet.</div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Payer</th><th>Total</th><th>In Progress</th><th>Submitted</th><th>Approved</th><th>Needs Attention</th><th>Avg TAT</th><th>Benchmark</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byPayer.map((p) => (
                    <tr key={p.payerId}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: p.color }}></div>
                          <span className="font-medium">{p.payerName}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs">{p.total}</td>
                      <td className="font-mono text-xs">{p.inProgress}</td>
                      <td className="font-mono text-xs">{p.submitted}</td>
                      <td className="font-mono text-xs">{p.approved}</td>
                      <td className="font-mono text-xs">{p.needsAttention}</td>
                      <td className="font-mono text-xs font-semibold">{tat(p.avgTatDays)}</td>
                      <td className="font-mono text-xs text-ink-light">{tat(p.benchmarkTatDays)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
