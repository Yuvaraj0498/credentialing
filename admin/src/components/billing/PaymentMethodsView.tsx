"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import { api, errorMessage } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { AddCardModal } from "@/components/modals/AddCardModal";
import { brandColor, useBillingAccess } from "./shared";
import type { PaymentMethod } from "@/types/billing";

export function PaymentMethodsView() {
  const toast = useToast();
  const { canWrite } = useBillingAccess();
  const { data, loading, error, reload, setData } = useAsync(() => api.get<PaymentMethod[]>("/billing/payment-methods"), []);
  const [showAdd, setShowAdd] = useState(false);
  const [removing, setRemoving] = useState<PaymentMethod | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const methods = data || [];

  const setDefault = async (id: number) => {
    setBusyId(id);
    try {
      const list = await api.patch<PaymentMethod[]>("/billing/payment-methods/" + id + "/default");
      setData(list);
      toast("Default payment method updated");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await api.delete("/billing/payment-methods/" + removing.id);
      toast("Payment method removed");
      setRemoving(null);
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="font-display font-semibold text-ink">Payment Methods</h3>
          <p className="text-xs text-ink-light mt-0.5">Manage cards used for subscription and service fees.</p>
        </div>
        {canWrite && <button onClick={() => setShowAdd(true)} className="btn btn-primary"><Icon name="Plus" size={13} /> Add Payment Method</button>}
      </div>

      <div className="p-3 rounded-lg mb-4 text-xs" style={{ background: "var(--warn-soft)", color: "#a16207" }}>
        <Icon name="AlertTriangle" size={12} /> <strong>Card payments not live yet:</strong> No real cards are charged. Only card metadata (brand, last 4, expiry) is stored; Stripe Elements with PCI-compliant tokenization arrives in a later phase.
      </div>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <Loading />
      ) : methods.length === 0 ? (
        <EmptyState icon="CreditCard" title="No payment methods" description="Add a card to enable invoice payments and auto-renewal." />
      ) : (
        <div className="space-y-3">
          {methods.map((m) => (
            <div key={m.id} className="card card-pad flex items-center gap-3">
              <div className="w-14 h-9 rounded flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: brandColor(m.brand) }}>
                {m.brand.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink">{m.brand} •••• {m.last4}</div>
                <div className="text-xs text-ink-light">Expires {m.exp} · {m.billingName}</div>
              </div>
              {m.expired && <Pill type="danger">Expired</Pill>}
              {m.isDefault && <Pill type="success">Default</Pill>}
              {canWrite && (
                <div className="flex gap-1">
                  {!m.isDefault && (
                    <button onClick={() => setDefault(m.id)} disabled={busyId !== null} className="btn btn-ghost text-xs">
                      {busyId === m.id && <span className="loader" />} Set Default
                    </button>
                  )}
                  <button onClick={() => setRemoving(m)} className="btn-ghost p-1 hover:text-danger" aria-label="Remove card"><Icon name="Trash2" size={13} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddCardModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            reload();
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Remove payment method?"
          message={<>Remove <strong>{removing.brand} •••• {removing.last4}</strong> from your account?</>}
          confirmLabel="Remove"
          busy={removeBusy}
          onConfirm={remove}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
