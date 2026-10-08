"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Loading } from "@/components/AsyncState";
import { Modal } from "@/components/Modal";
import { Pill } from "@/components/Pill";
import { api, errorMessage } from "@/lib/api";
import { fmtDate, fmtMoney } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { AddCardModal } from "./AddCardModal";
import { brandColor } from "@/components/billing/shared";
import type { InvoiceSummary, PayInvoiceResponse, PaymentMethod } from "@/types/billing";

/**
 * Pay an invoice. Card processing is deferred: the API answers with an
 * `integration: "deferred"` message, which is shown as an info toast; the invoice stays due.
 */
export function PaymentModal({ invoice, onClose, onDone }: { invoice: Pick<InvoiceSummary, "id" | "number" | "invoiceDate" | "total">; onClose: () => void; onDone?: () => void }) {
  const toast = useToast();
  const methods = useAsync(() => api.get<PaymentMethod[]>("/billing/payment-methods"), []);
  const [selected, setSelected] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = methods.data || [];
  const fallback = list.find((m) => m.isDefault && !m.expired) || list.find((m) => !m.expired);
  const selectedMethod = selected ?? fallback?.id ?? null;

  const handlePay = async () => {
    if (!selectedMethod) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await api.post<PayInvoiceResponse>("/billing/invoices/" + invoice.id + "/pay", { paymentMethodId: selectedMethod });
      toast(res.message, "info");
      onDone?.();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setProcessing(false);
    }
  };

  if (methods.loading && !methods.data) {
    return (
      <Modal title="Pay Invoice" subtitle={invoice.number + " · " + fmtDate(invoice.invoiceDate)} onClose={onClose} maxWidth={460}>
        <Loading />
      </Modal>
    );
  }

  if (methods.error && !methods.data) {
    return (
      <Modal title="Pay Invoice" subtitle={invoice.number + " · " + fmtDate(invoice.invoiceDate)} onClose={onClose} maxWidth={460}>
        <div className="text-sm text-ink-light mb-4">{methods.error}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={methods.reload} className="btn btn-primary"><Icon name="RefreshCw" size={13} /> Try again</button>
        </div>
      </Modal>
    );
  }

  if (list.length === 0 || showAddCard) {
    return (
      <AddCardModal
        onClose={() => (showAddCard && list.length > 0 ? setShowAddCard(false) : onClose())}
        onAdded={(pm) => {
          setShowAddCard(false);
          setSelected(pm.id);
          methods.reload();
        }}
      />
    );
  }

  return (
    <Modal title="Pay Invoice" subtitle={invoice.number + " · " + fmtDate(invoice.invoiceDate)} onClose={processing ? undefined : onClose} maxWidth={460}>
      <div className="space-y-4">
        <div className="card card-pad" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-ink-light">Total Due</div>
              <div className="font-display text-3xl font-bold text-accent">{fmtMoney(invoice.total)}</div>
            </div>
            <Icon name="Receipt" size={32} className="text-accent" />
          </div>
        </div>

        <div>
          <label className="label">Payment Method</label>
          <div className="space-y-2">
            {list.map((m) => (
              <label
                key={m.id}
                className={"flex items-center gap-3 p-3 rounded-lg border " + (m.expired ? "opacity-50 cursor-not-allowed border-line" : "cursor-pointer " + (selectedMethod === m.id ? "border-accent bg-accent-soft" : "border-line hover:border-accent"))}
              >
                <input type="radio" checked={selectedMethod === m.id} disabled={m.expired} onChange={() => setSelected(m.id)} />
                <div className="w-12 h-8 rounded flex items-center justify-center text-white font-bold text-[10px]" style={{ background: brandColor(m.brand) }}>
                  {m.brand.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">•••• {m.last4}</div>
                  <div className="text-xs text-ink-light">Expires {m.exp}</div>
                </div>
                {m.expired ? <Pill type="danger">Expired</Pill> : m.isDefault && <Pill type="success">Default</Pill>}
              </label>
            ))}
            <button onClick={() => setShowAddCard(true)} className="w-full text-left p-3 rounded-lg border border-line border-dashed hover:border-accent text-sm text-ink-light hover:text-accent">
              <Icon name="Plus" size={13} className="inline mr-1" /> Add new card
            </button>
          </div>
        </div>

        <div className="p-2 rounded text-xs flex items-start gap-2" style={{ background: "var(--info-soft)", color: "#1e40af" }}>
          <Icon name="Shield" size={11} className="mt-0.5" />
          <span><strong>Note:</strong> Online card payments (Stripe, PCI-compliant) arrive in a later phase. Until then your invoice remains due after clicking Pay.</span>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg text-sm flex items-center gap-2" style={{ background: "var(--danger-soft)", color: "#991b1b" }}>
            <Icon name="AlertCircle" size={13} /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button onClick={onClose} className="btn btn-secondary" disabled={processing}>Cancel</button>
          <button onClick={handlePay} disabled={!selectedMethod || processing} className="btn btn-primary">
            {processing ? <><span className="loader"></span> Processing...</> : <><Icon name="Lock" size={13} /> Pay {fmtMoney(invoice.total)}</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
