"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { StatCard } from "@/components/StatCard";
import { HorizontalBars } from "@/components/Charts";
import { useTopic } from "@/stores/shell";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import type { DashboardPayerCount, DashboardSummary } from "@/types/dashboard";

export function DashboardView() {
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => api.get<DashboardSummary>("/dashboard/summary"), []);
  useTopic("providers", reload);
  useTopic("enrollments", reload);

  if (error && !data) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Overview of credentialing activity across your organization." />
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }
  if (loading && !data) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Overview of credentialing activity across your organization." />
        <Loading />
      </div>
    );
  }
  if (!data) return null;

  const { stats } = data;
  const avgTat = stats.avgTatDays != null ? Math.round(stats.avgTatDays) + "d" : "—";
  const expirations = data.upcomingExpirations;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of credentialing activity across your organization." />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Link href="/providers" className="block">
          <StatCard label="Total Providers" value={stats.totalProviders} sub={stats.activeProviders + " active"} icon="Users" color="var(--accent)" />
        </Link>
        <Link href="/reports" className="block">
          <StatCard label="Missing Documents" value={stats.missingDocuments} sub="Documents required" icon="FileX" color="var(--danger)" emphasize />
        </Link>
        <Link href="/reports?tab=payer" className="block">
          <StatCard label="Avg Turnaround" value={avgTat} sub="Approved applications" icon="Clock" color="var(--info)" />
        </Link>
        <Link href="/enrollments" className="block">
          <StatCard label="Active Enrollments" value={stats.activeEnrollments} sub={stats.approvedEnrollments + " approved"} icon="Activity" color="var(--success)" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Enrollments by payer */}
        <div className="card card-pad lg:col-span-2">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-ink">Enrollments by Payer</h3>
              <p className="text-xs text-ink-light">Top payers by volume</p>
            </div>
          </div>
          <EnrollmentsByPayerChart items={data.enrollmentsByPayer} />
        </div>

        {/* TAT summary */}
        <div className="card card-pad">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-ink">Payer TAT Summary</h3>
              <p className="text-xs text-ink-light">Average turnaround by payer</p>
            </div>
          </div>
          {data.payerTat.length === 0 ? (
            <div className="text-xs text-ink-faint py-6 text-center">No turnaround data yet.</div>
          ) : (
            <div className="space-y-2">
              {data.payerTat.slice(0, 6).map((p) => (
                <div key={p.payerId} className="flex items-center justify-between py-1.5 border-b border-line last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: p.color }}></div>
                    <span className="text-sm text-ink">{p.payerName}</span>
                  </div>
                  <span className="text-sm font-mono font-semibold text-ink">{p.avgTatDays != null ? Math.round(p.avgTatDays) + "d" : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document expirations */}
      <div className="card mb-6">
        <div className="flex items-baseline justify-between p-5 pb-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">Upcoming Document Expirations</h3>
            <p className="text-xs text-ink-light">{data.upcomingExpirationsTotal} document(s) expiring in 90 days</p>
          </div>
          <button onClick={() => router.push("/reports")} className="btn btn-ghost" style={{ fontSize: 12 }}>View all <Icon name="ArrowRight" size={12} /></button>
        </div>
        {expirations.length === 0 ? (
          <EmptyState icon="CheckCircle2" title="All documents current" description="No documents expiring in the next 90 days." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Document</th>
                  <th>Expires</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {expirations.map((e, i) => {
                  const urgent = e.daysLeft <= 0;
                  const soon = e.daysLeft > 0 && e.daysLeft <= 30;
                  return (
                    <tr key={e.providerId + "-" + e.docType + "-" + i} className="cursor-pointer" onClick={() => router.push("/providers/" + e.providerId)}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar name={e.providerName} size={28} />
                          <span className="font-medium">{e.providerName}</span>
                        </div>
                      </td>
                      <td>{e.docLabel}</td>
                      <td>{fmtDate(e.expiresAt)}</td>
                      <td><Pill type={urgent ? "danger" : soon ? "warn" : "info"}>{urgent ? "Expired " + Math.abs(e.daysLeft) + "d ago" : "In " + e.daysLeft + " days"}</Pill></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** Prototype EnrollmentsByPayerChart: top 6 payers by enrollment volume. */
export function EnrollmentsByPayerChart({ items }: { items: DashboardPayerCount[] }) {
  if (items.length === 0) return <div className="text-xs text-ink-faint py-6 text-center">No enrollments yet.</div>;
  const top = [...items].sort((a, b) => b.total - a.total).slice(0, 6);
  return <HorizontalBars items={top.map((p) => ({ name: p.payerName, color: p.color, count: p.total }))} />;
}
