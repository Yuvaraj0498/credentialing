"use client";

import { useRouter } from "next/navigation";
import { AsyncBoundary } from "@/components/AsyncState";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Pill";
import { StatCard } from "@/components/StatCard";
import { BarChart } from "@/components/Charts";
import { useTopic } from "@/stores/shell";
import { api } from "@/lib/api";
import { fmtDate, fmtMoney } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { InvoiceStatusPill, capText } from "./shared";
import type { BillingOverviewData } from "@/types/billing";

export function BillingOverview() {
  const { data, loading, error, reload } = useAsync(() => api.get<BillingOverviewData>("/billing/overview"), []);
  useTopic("invoices", reload);
  return (
    <AsyncBoundary loading={loading && !data} error={data ? null : error} onRetry={reload}>
      {data && <OverviewBody data={data} />}
    </AsyncBoundary>
  );
}

function OverviewBody({ data }: { data: BillingOverviewData }) {
  const router = useRouter();
  const sub = data.subscription;
  const mrr = sub ? sub.monthlyTotal : 0;
  const outstanding = data.outstanding.amount;

  // Show the year up to the current month (prototype showed Jan..current month).
  const now = new Date();
  const months = data.year === now.getFullYear() ? data.spendByMonth.filter((m) => m.month <= now.getMonth() + 1) : data.spendByMonth;
  const spend = months.map((m) => ({ label: m.label, value: Math.round(m.amount) }));

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Monthly Recurring" value={fmtMoney(mrr)} sub={sub ? sub.packageName + " plan" : "No plan"} icon="TrendingUp" color="var(--accent)" />
        <StatCard label="Total Billed" value={fmtMoney(data.totalBilled)} sub={data.invoiceCount + " invoices"} icon="DollarSign" color="var(--info)" />
        <StatCard label="Total Paid" value={fmtMoney(data.totalPaid)} sub={data.paidCount + " paid"} icon="CheckCircle2" color="var(--success)" />
        <StatCard label="Outstanding" value={fmtMoney(outstanding)} sub={outstanding > 0 ? "Action needed" : "All caught up"} icon="AlertCircle" color="var(--danger)" emphasize={outstanding > 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card card-pad lg:col-span-2">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <h3 className="font-display font-semibold text-ink">Current Subscription</h3>
              <p className="text-xs text-ink-light mt-0.5">Active plan and renewal info</p>
            </div>
            {sub && (
              <Pill type={sub.status === "active" || sub.status === "trialing" ? "success" : "danger"}>
                {sub.status === "active" ? "Active" : sub.status === "trialing" ? "Trial" : sub.status === "past_due" ? "Past due" : "Canceled"} · Renews {fmtDate(sub.nextRenewalDate)}
              </Pill>
            )}
          </div>
          {sub ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-display font-bold text-lg" style={{ background: sub.color || "var(--accent)" }}>
                  {sub.packageName[0]}
                </div>
                <div className="flex-1">
                  <div className="font-display text-lg font-semibold">{sub.packageName}</div>
                  <div className="text-xs text-ink-light">{fmtMoney(sub.basePrice)} base + {fmtMoney(sub.perProvider)} per provider</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-bold text-ink">{fmtMoney(mrr)}</div>
                  <div className="text-xs text-ink-light">/ month</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-line text-xs">
                <div>
                  <div className="text-ink-faint">Providers</div>
                  <div className="font-semibold">{data.providers.active} / {capText(data.providers.cap)}</div>
                </div>
                <div>
                  <div className="text-ink-faint">AI Uploads</div>
                  <div className="font-semibold">{data.usage.aiUploadsThisMonth} / {capText(data.usage.aiUploadsLimit)}</div>
                </div>
                <div>
                  <div className="text-ink-faint">Support</div>
                  <div className="font-semibold">{sub.primarySupport || "—"}</div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icon="Package" title="No active subscription" description="Pick a package to start." />
          )}
        </div>

        <div className="card card-pad">
          <h3 className="font-display font-semibold text-ink mb-4">Spending This Year</h3>
          {spend.every((s) => s.value === 0) ? (
            <div className="text-xs text-ink-faint text-center" style={{ paddingTop: 70, height: 180 }}>No invoices in {data.year} yet.</div>
          ) : (
            <BarChart data={spend} color="var(--accent)" height={180} />
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h3 className="font-display font-semibold text-ink">Recent Invoices</h3>
        </div>
        {data.recentInvoices.length === 0 ? (
          <EmptyState icon="FileText" title="No invoices yet" />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Invoice #</th><th>Date</th><th>Amount</th><th>Status</th><th>Method</th></tr>
              </thead>
              <tbody>
                {data.recentInvoices.map((i) => (
                  <tr key={i.id} className="cursor-pointer" onClick={() => router.push("/billing/invoices/" + i.id)}>
                    <td className="font-mono text-xs font-medium text-accent">{i.number}</td>
                    <td className="text-xs text-ink-light">{fmtDate(i.invoiceDate)}</td>
                    <td className="font-mono text-sm font-semibold">{fmtMoney(i.total)}</td>
                    <td><InvoiceStatusPill status={i.status} /></td>
                    <td className="text-xs text-ink-light">{i.paidMethodLabel || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
