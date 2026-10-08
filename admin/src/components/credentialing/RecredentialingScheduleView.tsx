"use client";

import { useState } from "react";
import Link from "next/link";
import { AsyncBoundary } from "@/components/AsyncState";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { StatCard } from "@/components/StatCard";
import { useShell } from "@/stores/shell";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { fmtDate } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import type { Enrollment, RecredItem, RecredScheduleResponse, RecredWindow } from "@/types/credentialing";

export function RecredentialingScheduleView() {
  const { can } = useAuth();
  const { publish } = useShell();
  const toast = useToast();
  const [filter, setFilter] = useState<RecredWindow>("all");
  const [startingId, setStartingId] = useState<number | null>(null);
  const canStart = can("create", "enrollment");

  const { data, loading, error, reload } = useAsync(() => api.get<RecredScheduleResponse>("/recredentialing/schedule", { window: filter }), [filter]);

  const c = data?.counts ?? { all: 0, overdue: 0, due30: 0, due60: 0, due90: 0, future: 0 };
  const counts = { all: c.all, overdue: c.overdue, "30": c.due30, "60": c.due60, "90": c.due90 };
  const filtered = data?.items ?? [];

  const start = async (s: RecredItem) => {
    setStartingId(s.enrollmentId);
    try {
      await api.post<Enrollment>(`/enrollments/${s.enrollmentId}/recredential`);
      toast("Re-credentialing started for " + s.providerName + " · " + s.payerName);
      publish("enrollments");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Re-credentialing Schedule"
        subtitle="Upcoming re-credentialing events. Most payers require recredentialing every 2 years."
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard label="All Active" value={counts.all} sub="Enrollments" icon="ClipboardList" color="var(--ink)" />
        <StatCard label="Overdue" value={counts.overdue} sub="Past recred date" icon="AlertTriangle" color="var(--danger)" emphasize={counts.overdue > 0} />
        <StatCard label="Due in 30 days" value={counts["30"]} sub="Urgent" icon="Clock" color="var(--danger)" emphasize={counts["30"] > 0} />
        <StatCard label="Due in 60 days" value={counts["60"]} sub="Start now" icon="Clock" color="var(--warn)" />
        <StatCard label="Due in 90 days" value={counts["90"]} sub="Plan ahead" icon="Calendar" color="var(--info)" />
      </div>

      <div className="flex items-center gap-1 border-b border-line mb-4 overflow-x-auto">
        {([
          { id: "all", label: "All", count: counts.all },
          { id: "overdue", label: "Overdue", count: counts.overdue },
          { id: "30", label: "≤30 days", count: counts.overdue + counts["30"] },
          { id: "60", label: "≤60 days", count: counts.overdue + counts["30"] + counts["60"] },
          { id: "90", label: "≤90 days", count: counts.overdue + counts["30"] + counts["60"] + counts["90"] },
        ] as { id: RecredWindow; label: string; count: number }[]).map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)}
                  className={"px-4 py-2 text-sm font-medium relative whitespace-nowrap " + (filter === t.id ? "text-accent" : "text-ink-light hover:text-ink")}>
            {t.label} <span className="text-ink-faint ml-1">{t.count}</span>
            {filter === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--accent)" }}></div>}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <AsyncBoundary loading={loading && !data} error={error} onRetry={reload}>
          {filtered.length === 0 ? (
            <EmptyState icon="CheckCircle2" title="Nothing due yet" description="No re-credentialings match this filter." />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Provider</th><th>Payer</th><th>Originally Effective</th><th>Recred Due</th><th>Days Remaining</th><th className="text-right">Action</th></tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.enrollmentId}>
                      <td>
                        <Link href={`/providers/${s.providerId}`} className="flex items-center gap-2"><Avatar name={s.providerName} size={26} /><span className="font-medium">{s.providerName}</span></Link>
                      </td>
                      <td><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: s.payerColor }}></div><span>{s.payerName}</span></div></td>
                      <td className="text-xs text-ink-light">{fmtDate(s.effectiveDate)}</td>
                      <td className="text-xs">{fmtDate(s.dueDate)}</td>
                      <td>
                        <Pill type={s.bucket === "overdue" ? "danger" : s.bucket === "30" ? "danger" : s.bucket === "60" ? "warn" : s.bucket === "90" ? "info" : "neutral"}>
                          {s.daysUntil < 0 ? Math.abs(s.daysUntil) + "d overdue" : s.daysUntil + " days"}
                        </Pill>
                      </td>
                      <td className="text-right">
                        {s.openRecredEnrollmentId ? (
                          <span className="text-xs text-ink-faint" title={"Re-credentialing enrollment #" + s.openRecredEnrollmentId + " is already open"}>Recred in progress</span>
                        ) : canStart ? (
                          <button onClick={() => start(s)} disabled={startingId === s.enrollmentId} className="btn btn-primary" style={{ fontSize: 11, padding: "4px 10px" }}>
                            {startingId === s.enrollmentId && <span className="loader" style={{ borderTopColor: "white", width: 10, height: 10 }} />} Start Recred
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      </div>
    </div>
  );
}
