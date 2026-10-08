"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AccessDenied } from "@/components/AlertBox";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { api } from "@/lib/api";
import { fmtDate, fmtMoney } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { esc, exportPDF } from "@/lib/export";
import { BillingHeader, billingTabHref } from "./BillingView";
import { PaymentModal } from "@/components/modals/PaymentModal";
import { capitalize, cityLine, invoicePillType, isPayable, useBillingAccess } from "./shared";
import type { InvoiceDetailData, InvoiceLine } from "@/types/billing";

/** Route /billing/invoices/[id] — billing header + tabs, then the prototype InvoiceDetail. */
export function InvoiceDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { canRead, role } = useBillingAccess();
  const { data, loading, error, reload } = useAsync(canRead ? () => api.get<InvoiceDetailData>("/billing/invoices/" + id) : null, [id, canRead]);

  if (!canRead) {
    return (
      <div>
        <PageHeader title="Billing & Subscription" subtitle="Manage your subscription, invoices, pricing, and payment methods" />
        <AccessDenied action="view" entity="billing" role={role} />
      </div>
    );
  }

  return (
    <div>
      <BillingHeader tab="invoices" onTab={(t) => router.push(billingTabHref(t))} />
      {error && !data ? (
        <div>
          <button onClick={() => router.push("/billing?tab=invoices")} className="btn btn-ghost mb-4"><Icon name="ChevronLeft" size={14} /> Back to Invoices</button>
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : loading && !data ? (
        <Loading />
      ) : data ? (
        <InvoiceDetail data={data} onBack={() => router.push("/billing?tab=invoices")} onPaid={reload} />
      ) : null}
    </div>
  );
}

const lineTitle = (l: InvoiceLine) => (l.lineType === "subscription" ? (l.packageName || "Plan") + " Subscription" : "Credentialing Service — " + (l.providerName || "—"));
const lineSub = (l: InvoiceLine) => (l.lineType === "subscription" ? "Monthly recurring" : l.serviceType === "recred" ? "Re-credentialing" : "New credentialing");

export function InvoiceDetail({ data, onBack, onPaid }: { data: InvoiceDetailData; onBack: () => void; onPaid: () => void }) {
  const toast = useToast();
  const { canWrite } = useBillingAccess();
  const [paying, setPaying] = useState(false);
  const { invoice, from, billTo, lines } = data;
  const subLines = lines.filter((l) => l.lineType === "subscription");
  const svcLines = lines.filter((l) => l.lineType === "service");
  const paid = invoice.status === "paid";

  const downloadPdf = () => {
    let html = "<h1>Invoice " + esc(invoice.number) + "</h1>";
    html += "<p>Date: " + esc(fmtDate(invoice.invoiceDate)) + " · Due: " + esc(fmtDate(invoice.dueDate)) + "</p>";
    html += "<p><strong>From:</strong> " + esc(from.name) + (from.address ? ", " + esc(from.address) : "") + (cityLine(from) ? ", " + esc(cityLine(from)) : "") + "<br/>";
    html += "<strong>Bill To:</strong> " + esc(billTo.name) + (billTo.address ? ", " + esc(billTo.address) : "") + (cityLine(billTo) ? ", " + esc(cityLine(billTo)) : "") + "</p>";
    html += "<table><thead><tr><th>Item</th><th>Details</th><th>Amount</th></tr></thead><tbody>";
    subLines.forEach((l) => {
      html += "<tr><td>" + esc(l.packageName) + " subscription</td><td>" + esc(l.providerCount) + " providers (" + esc(fmtDate(l.periodStart)) + " - " + esc(fmtDate(l.periodEnd)) + ")</td><td>" + esc(fmtMoney(l.amount)) + "</td></tr>";
    });
    svcLines.forEach((l) => {
      html += "<tr><td>Credentialing — " + esc(l.providerName) + "</td><td>" + esc(l.payerName) + " (" + esc(l.stateCode) + ") · " + (l.serviceType === "recred" ? "Recred" : "New") + "</td><td>" + esc(fmtMoney(l.amount)) + "</td></tr>";
    });
    html += "</tbody></table>";
    html += "<p style='text-align:right;'>Subtotal: " + esc(fmtMoney(invoice.subtotal)) + "<br/>Tax: " + esc(fmtMoney(invoice.tax)) + "</p>";
    html += "<p style='text-align:right;font-weight:bold;font-size:18px;'>Total: " + esc(fmtMoney(invoice.total)) + "</p>";
    if (!exportPDF("Invoice " + invoice.number, html)) toast("Allow pop-ups to download the PDF", "error");
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <button onClick={onBack} className="btn btn-ghost"><Icon name="ChevronLeft" size={14} /> Back to Invoices</button>
        <div className="flex gap-2">
          <button onClick={downloadPdf} className="btn btn-secondary"><Icon name="Download" size={13} /> Download PDF</button>
          {isPayable(invoice.status) && canWrite && (
            <button onClick={() => setPaying(true)} className="btn btn-primary"><Icon name="CreditCard" size={13} /> Pay Now</button>
          )}
        </div>
      </div>

      <div className="card card-pad">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="atano-logo text-2xl mb-1"><span className="a-mark">▲</span>ZmartCredential</div>
            <div className="text-xs text-ink-light">{from.name}</div>
            <div className="text-xs text-ink-light">{[from.address, cityLine(from)].filter(Boolean).join(", ")}</div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-bold text-ink">INVOICE</div>
            <div className="font-mono text-sm text-accent font-semibold">{invoice.number}</div>
            <Pill type={invoicePillType(invoice.status)}>{invoice.status}</Pill>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-xs">
          <div>
            <div className="text-ink-faint uppercase tracking-wider mb-1">Bill To</div>
            <div className="font-semibold text-ink">{billTo.name}</div>
            {billTo.address && <div className="text-ink-light">{billTo.address}</div>}
            {cityLine(billTo) && <div className="text-ink-light">{cityLine(billTo)}</div>}
            {billTo.email && <div className="text-ink-light">{billTo.email}</div>}
          </div>
          <div>
            <div className="text-ink-faint uppercase tracking-wider mb-1">Invoice Date</div>
            <div className="font-semibold text-ink">{fmtDate(invoice.invoiceDate)}</div>
            <div className="text-ink-faint uppercase tracking-wider mt-2 mb-1">Due Date</div>
            <div className="font-semibold text-ink">{fmtDate(invoice.dueDate)}</div>
          </div>
          <div>
            <div className="text-ink-faint uppercase tracking-wider mb-1">Status</div>
            <Pill type={invoicePillType(invoice.status)}>{paid ? "Paid " + fmtDate(invoice.paidDate) : capitalize(invoice.status)}</Pill>
            {invoice.paidMethodLabel && <div className="text-xs text-ink-light mt-2">{invoice.paidMethodLabel}</div>}
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Description</th><th>Details</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr><td colSpan={3} className="text-center text-xs text-ink-faint">No line items.</td></tr>
              )}
              {subLines.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div className="font-medium">{lineTitle(l)}</div>
                    <div className="text-xs text-ink-light">{lineSub(l)}</div>
                  </td>
                  <td className="text-xs text-ink-light">
                    {l.providerCount ?? 0} providers · {fmtDate(l.periodStart)} – {fmtDate(l.periodEnd)}
                    <div>{fmtMoney(l.basePrice)} base + {l.providerCount ?? 0} × {fmtMoney(l.perProvider)}</div>
                  </td>
                  <td className="text-right font-mono font-semibold">{fmtMoney(l.amount)}</td>
                </tr>
              ))}
              {svcLines.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div className="font-medium">{lineTitle(l)}</div>
                    <div className="text-xs text-ink-light">{lineSub(l)}</div>
                  </td>
                  <td className="text-xs text-ink-light">
                    {l.payerName || "—"} ({l.stateCode || "—"}) · {capitalize(l.payerCategory) || "Commercial"}
                    {l.description && <div>{l.description}</div>}
                  </td>
                  <td className="text-right font-mono">{fmtMoney(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-4 mt-4 border-t border-line space-y-1">
          <div className="flex justify-between text-sm"><span className="text-ink-light">Subtotal</span><span className="font-mono">{fmtMoney(invoice.subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-ink-light">Tax</span><span className="font-mono">{fmtMoney(invoice.tax)}</span></div>
          <div className="flex justify-between text-xl font-display font-bold pt-2 border-t border-line"><span>Total</span><span className="font-mono">{fmtMoney(invoice.total)}</span></div>
        </div>
      </div>

      {paying && <PaymentModal invoice={invoice} onClose={() => setPaying(false)} onDone={onPaid} />}
    </div>
  );
}
