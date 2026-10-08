"use client";

import { useState } from "react";
import { AsyncBoundary } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { useShell } from "@/stores/shell";
import { api, errorMessage } from "@/lib/api";
import { fmtMoney } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { useBillingAccess } from "./shared";
import type { BillingOverviewData, BillingPackage, Subscription } from "@/types/billing";

const calcSubscriptionTotal = (pkg: BillingPackage, providerCount: number) => pkg.basePrice + pkg.perProvider * providerCount;

export function SubscriptionView() {
  const toast = useToast();
  const { publish } = useShell();
  const { canWrite } = useBillingAccess();
  const { data, loading, error, reload } = useAsync(
    () => Promise.all([api.get<BillingPackage[]>("/billing/packages"), api.get<BillingOverviewData>("/billing/overview")]),
    []
  );
  const [confirmingPkg, setConfirmingPkg] = useState<BillingPackage | null>(null);
  const [busy, setBusy] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  const packages = data?.[0] || [];
  const overview = data?.[1];
  const currentId = overview?.subscription?.packageId ?? packages.find((p) => p.current)?.id;
  const providerCount = Math.max(1, overview?.providers.active ?? 0);

  const confirmChange = async () => {
    if (!confirmingPkg) return;
    setBusy(true);
    setChangeError(null);
    try {
      await api.put<Subscription>("/billing/subscription", { packageId: confirmingPkg.id, providerCount });
      toast("Plan changed to " + confirmingPkg.name);
      setConfirmingPkg(null);
      publish("invoices");
      reload();
    } catch (e) {
      setChangeError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="card card-pad mb-4" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
        <div className="flex items-center gap-3">
          <Icon name="Info" size={18} className="text-accent" />
          <div className="text-sm text-ink">
            <span className="font-semibold">Billing model: </span>
            Monthly base fee + per-provider fee. Changes prorate to the next billing cycle.
            Per-service credentialing fees (new cred / recred) are billed separately based on the state/payer pricing matrix.
          </div>
        </div>
      </div>

      <AsyncBoundary loading={loading && !data} error={data ? null : error} onRetry={reload}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg) => {
            const isCurrent = pkg.id === currentId;
            const total = calcSubscriptionTotal(pkg, providerCount);
            return (
              <div key={pkg.id} className="card relative" style={pkg.recommended ? { borderColor: "var(--accent)", borderWidth: 2 } : {}}>
                {pkg.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: "var(--accent)", color: "white" }}>
                    Most Popular
                  </div>
                )}
                <div className="card-pad">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded flex items-center justify-center text-white font-display font-bold" style={{ background: pkg.color }}>
                      {pkg.name[0]}
                    </div>
                    <div className="font-display text-xl font-semibold">{pkg.name}</div>
                  </div>
                  <div className="mt-4">
                    <div className="font-display text-4xl font-bold text-ink">{fmtMoney(pkg.basePrice)}</div>
                    <div className="text-xs text-ink-light">base / month</div>
                  </div>
                  <div className="mt-2 text-sm text-ink-light">
                    + <span className="font-semibold text-ink">{fmtMoney(pkg.perProvider)}</span> per provider / month
                  </div>
                  <div className="mt-3 p-3 rounded-lg" style={{ background: pkg.colorSoft }}>
                    <div className="text-xs" style={{ color: pkg.color }}>
                      For your {providerCount} provider(s): <span className="font-bold">{fmtMoney(total)}/mo</span>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    {pkg.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <Icon name="Check" size={12} className="flex-shrink-0 mt-0.5" style={{ color: pkg.color }} />
                        <span className="text-ink">{f}</span>
                      </div>
                    ))}
                    {pkg.notIncluded.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs opacity-50">
                        <Icon name="X" size={12} className="flex-shrink-0 mt-0.5 text-ink-faint" />
                        <span className="text-ink-faint line-through">{f}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    {isCurrent ? (
                      <button disabled className="btn btn-secondary w-full" style={{ cursor: "default" }}>
                        <Icon name="Check" size={13} /> Current Plan
                      </button>
                    ) : canWrite ? (
                      <button
                        onClick={() => {
                          setChangeError(null);
                          setConfirmingPkg(pkg);
                        }}
                        className="btn btn-primary w-full"
                      >
                        Switch to {pkg.name}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AsyncBoundary>

      {confirmingPkg && (
        <Modal title={"Switch to " + confirmingPkg.name + "?"} onClose={() => !busy && setConfirmingPkg(null)} maxWidth={460}>
          <div className="space-y-3">
            <div className="p-4 rounded-lg" style={{ background: confirmingPkg.colorSoft }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{confirmingPkg.name}</div>
                  <div className="text-xs text-ink-light">{providerCount} providers</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-bold">{fmtMoney(calcSubscriptionTotal(confirmingPkg, providerCount))}</div>
                  <div className="text-xs text-ink-light">/ month</div>
                </div>
              </div>
            </div>
            <div className="text-xs text-ink-light">
              The new plan starts immediately. Your next invoice on the renewal date will use the new rate, prorated for the partial period if applicable.
            </div>
            {changeError && (
              <div className="px-3 py-2 rounded-lg text-sm flex items-center gap-2" style={{ background: "var(--danger-soft)", color: "#991b1b" }}>
                <Icon name="AlertCircle" size={13} /> {changeError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button onClick={() => setConfirmingPkg(null)} className="btn btn-secondary" disabled={busy}>Cancel</button>
              <button onClick={confirmChange} className="btn btn-primary" disabled={busy}>
                {busy && <span className="loader" style={{ borderTopColor: "white" }} />} Confirm Switch
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
