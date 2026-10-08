"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { Pagination } from "@/components/Pagination";
import { useTopic } from "@/stores/shell";
import { api, errorMessage } from "@/lib/api";
import { fmtDate, fmtMoney, todayISO } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import type { PageResponse } from "@/types";
import { PaymentModal } from "@/components/modals/PaymentModal";
import { InvoiceStatusPill, isPayable, useBillingAccess } from "./shared";
import type { InvoiceSummary } from "@/types/billing";

const PAGE_SIZE = 20;

export function InvoicesView() {
  const router = useRouter();
  const toast = useToast();
  const { canWrite } = useBillingAccess();
  const [page, setPage] = useState(0);
  const [payInvoice, setPayInvoice] = useState<InvoiceSummary | null>(null);
  const [exporting, setExporting] = useState(false);
  const { data, loading, error, reload } = useAsync(() => api.get<PageResponse<InvoiceSummary>>("/billing/invoices", { status: "all", page, size: PAGE_SIZE }), [page]);
  useTopic("invoices", reload);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await api.download("/billing/invoices/export.csv", { status: "all" }, "invoices-" + todayISO() + ".csv");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setExporting(false);
    }
  };

  const open = (i: InvoiceSummary) => router.push("/billing/invoices/" + i.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-ink-light">{data ? data.totalElements + " invoice(s)" : " "}</div>
        <button onClick={handleExportCSV} disabled={exporting || !data || data.totalElements === 0} className="btn btn-secondary">
          {exporting ? <span className="loader" /> : <Icon name="Download" size={13} />} Export CSV
        </button>
      </div>
      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <Loading />
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon="FileText" title="No invoices yet" description="Invoices are generated monthly when your subscription renews." />
      ) : (
        <div className="card overflow-hidden" style={{ opacity: loading ? 0.6 : 1 }}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th><th>Date</th><th>Due Date</th><th>Items</th><th>Total</th><th>Status</th><th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((i) => (
                  <tr key={i.id} className="cursor-pointer" onClick={() => open(i)}>
                    <td className="font-mono text-xs font-medium text-accent">{i.number}</td>
                    <td className="text-xs text-ink-light">{fmtDate(i.invoiceDate)}</td>
                    <td className="text-xs text-ink-light">{fmtDate(i.dueDate)}</td>
                    <td className="text-xs text-ink-light">{i.lineCount} line item(s)</td>
                    <td className="font-mono text-sm font-semibold">{fmtMoney(i.total)}</td>
                    <td><InvoiceStatusPill status={i.status} /></td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      {isPayable(i.status) && canWrite ? (
                        <button onClick={() => setPayInvoice(i)} className="btn btn-primary" style={{ fontSize: 11, padding: "4px 10px" }}>Pay Now</button>
                      ) : (
                        <button onClick={() => open(i)} className="btn btn-ghost" style={{ fontSize: 11 }}><Icon name="Eye" size={11} /> View</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} size={data.size} onChange={setPage} />
        </div>
      )}

      {payInvoice && <PaymentModal invoice={payInvoice} onClose={() => setPayInvoice(null)} onDone={reload} />}
    </div>
  );
}
