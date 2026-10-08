"use client";

import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { Pill, StatusPill } from "@/components/Pill";
import { useTopic } from "@/stores/shell";
import { api } from "@/lib/api";
import { fmtMoney } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { InvoiceStatusPill, useBillingAccess } from "@/components/billing/shared";
import type { PricingCategory, ProviderBilling } from "@/types/billing";

const categoryPill = (c: PricingCategory | null) => (c === "medicare" ? "info" : c === "medicaid" ? "success" : "accent");

/**
 * Provider-level billing (prototype ProviderBillingWidget): invoiced credentialing services
 * for this provider plus estimated fees for enrollments not yet invoiced.
 * GET /api/providers/{id}/billing — platform_admin, org_admin, auditor, clerk.
 */
export function ProviderBillingWidget({ providerId }: { providerId: number }) {
  const { canRead } = useBillingAccess();
  const { data, loading, error, reload } = useAsync(() => api.get<ProviderBilling>("/providers/" + providerId + "/billing"), [providerId]);
  useTopic("enrollments", reload);
  useTopic("invoices", reload);

  const header = (
    <div className="flex items-center gap-2">
      <Icon name="Receipt" size={16} style={{ color: "var(--accent)" }} />
      <h3 className="font-display font-semibold text-ink">Provider Billing</h3>
      {data && <Pill type="neutral">{data.stateCode}</Pill>}
    </div>
  );

  if (error && !data) {
    return (
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-line">{header}</div>
        <div className="p-4"><ErrorState message={error} onRetry={reload} /></div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-line">{header}</div>
        {loading && <Loading compact />}
      </div>
    );
  }

  const empty = data.services.length === 0 && data.estimatedItems.length === 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-line">
        {header}
        <div className="text-right text-xs">
          <div><span className="text-ink-light">Billed:</span> <span className="font-mono font-semibold text-ink">{fmtMoney(data.totalBilled)}</span></div>
          <div><span className="text-ink-light">Paid:</span> <span className="font-mono font-semibold" style={{ color: "var(--success)" }}>{fmtMoney(data.totalPaid)}</span></div>
          {data.estimatedUpcoming > 0 && (
            <div><span className="text-ink-light">Upcoming (est.):</span> <span className="font-mono font-semibold text-ink">{fmtMoney(data.estimatedUpcoming)}</span></div>
          )}
        </div>
      </div>
      {empty ? (
        <EmptyState icon="Receipt" title="No billable services yet" description="Start a new enrollment to generate billing line items." />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Payer</th><th>Category</th><th>Type</th><th>State</th><th>Status</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {data.services.map((s) => (
                <tr key={"l" + s.lineId}>
                  <td>
                    <div className="font-medium">{s.payerName || "—"}</div>
                    <div className="text-[10px] text-ink-faint font-mono">
                      {canRead ? <Link href={"/billing/invoices/" + s.invoiceId} className="hover:text-accent">{s.invoiceNumber}</Link> : s.invoiceNumber}
                    </div>
                  </td>
                  <td>{s.payerCategory ? <Pill type={categoryPill(s.payerCategory)}>{s.payerCategory}</Pill> : "—"}</td>
                  <td className="text-xs">{s.serviceType === "new" ? "New Credentialing" : "Recred"}</td>
                  <td className="font-mono text-xs">{s.stateCode || data.stateCode}</td>
                  <td><InvoiceStatusPill status={s.invoiceStatus} /></td>
                  <td className="text-right font-mono font-semibold">{fmtMoney(s.amount)}</td>
                </tr>
              ))}
              {data.estimatedItems.length > 0 && (
                <tr>
                  <td colSpan={6} className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider" style={{ background: "var(--bg-soft)" }}>
                    Estimated — not yet invoiced
                  </td>
                </tr>
              )}
              {data.estimatedItems.map((e) => (
                <tr key={"e" + e.enrollmentId}>
                  <td className="font-medium">
                    <div className="flex items-center gap-2">
                      {e.payerColor && <div className="w-2 h-2 rounded-full" style={{ background: e.payerColor }}></div>}
                      {e.payerName || "—"}
                    </div>
                  </td>
                  <td>{e.payerCategory ? <Pill type={categoryPill(e.payerCategory)}>{e.payerCategory}</Pill> : "—"}</td>
                  <td className="text-xs">{e.serviceType === "new" ? "New Credentialing" : "Recred"}</td>
                  <td className="font-mono text-xs">{data.stateCode}</td>
                  <td><StatusPill status={e.enrollmentStatus} /></td>
                  <td className="text-right font-mono text-ink-light">{fmtMoney(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
