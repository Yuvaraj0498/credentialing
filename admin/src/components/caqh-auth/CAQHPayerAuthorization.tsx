"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/Modal";
import { DeferredNotice } from "@/components/AlertBox";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { api, errorMessage } from "@/lib/api";
import { useUser } from "@/stores/auth";
import { useAsync } from "@/lib/hooks";
import { fmtDate } from "@/lib/utils";
import { useToast } from "@/stores/toast";
import { providerName, useProvidersLite } from "@/components/enrollments/shared";
import type { CaqhAuthItem, CaqhAuthList } from "@/types/caqh-auth";

const ATTEST_LABEL: Record<string, string> = { attested: "Complete", complete: "Complete", expired: "Expired", pending: "Pending", incomplete: "Incomplete" };

/**
 * Port of the prototype CAQHPayerAuthorization (L13549).
 * Staff pick a provider; a provider user manages their own record.
 */
export function CAQHPayerAuthorization() {
  const user = useUser();
  const toast = useToast();
  const isProvider = user.role === "provider";
  const canWrite = isProvider || ["platform_admin", "org_admin", "clerk"].includes(user.role);

  const providers = useProvidersLite(!isProvider);
  const [pickedProvider, setSelectedProvider] = useState<number | null>(null);
  const [authInProgress, setAuthInProgress] = useState<Record<number, boolean>>({});
  const [confirmAll, setConfirmAll] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const selectedProvider = isProvider ? user.providerId : (pickedProvider ?? providers.data?.[0]?.id ?? null);

  const auth = useAsync<CaqhAuthList>(selectedProvider ? () => api.get("/providers/" + selectedProvider + "/caqh-authorizations") : null, [selectedProvider]);

  const toggleAuthorization = async (payer: CaqhAuthItem) => {
    if (!selectedProvider) return;
    setAuthInProgress((s) => ({ ...s, [payer.payerId]: true }));
    const nowAuthorizing = !payer.authorized;
    try {
      const updated = await api.put<CaqhAuthItem>("/providers/" + selectedProvider + "/caqh-authorizations/" + payer.payerId, { authorized: nowAuthorizing });
      auth.setData((prev) => {
        if (!prev) return prev as unknown as CaqhAuthList;
        const items = prev.items.map((i) => (i.payerId === updated.payerId ? updated : i));
        return { ...prev, items, authorizedCount: items.filter((i) => i.authorized).length };
      });
      toast(nowAuthorizing ? "Authorized " + payer.payerName + " — they can now pull your CAQH profile" : "Revoked " + payer.payerName + " — future pulls blocked");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setAuthInProgress((s) => ({ ...s, [payer.payerId]: false }));
    }
  };

  const bulkAuthorize = async () => {
    if (!selectedProvider) return;
    setBulkBusy(true);
    try {
      const res = await api.post<CaqhAuthList>("/providers/" + selectedProvider + "/caqh-authorizations/authorize-all");
      auth.setData(res);
      setConfirmAll(false);
      toast("Authorized all " + res.capableCount + " CAQH-capable payers");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBulkBusy(false);
    }
  };

  const data = auth.data;
  const capable = data?.items || [];
  const nonCaqh = data?.nonCaqhPayers || [];
  const authorizedCount = capable.filter((a) => a.authorized).length;
  const profileStatus = data?.caqhAttestationStatus ? ATTEST_LABEL[data.caqhAttestationStatus.toLowerCase()] || data.caqhAttestationStatus : data?.caqhId ? "On file" : "Not linked";

  return (
    <div>
      <PageHeader title="CAQH Payer Authorization" subtitle="Control which payers can pull your CAQH ProView data. Attest once, share with many." />

      <div className="card card-pad mb-4" style={{ background: "var(--info-soft)", borderColor: "var(--info)" }}>
        <div className="flex items-start gap-3">
          <Icon name="Info" size={18} className="text-info flex-shrink-0 mt-0.5" />
          <div className="text-xs text-ink">
            <strong>How CAQH ProView authorization works:</strong> When you complete your CAQH profile, participating payers can only see your data if{" "}
            <em>you explicitly authorize them</em>. This is the &quot;attest once, share with many&quot; model — you update your profile once every 120 days, and every authorized
            payer sees the latest data. Payers that don&apos;t participate in CAQH need their own credentialing packet.
          </div>
        </div>
      </div>

      {isProvider && !user.providerId ? (
        <div className="card">
          <EmptyState icon="UserX" title="Provider record not linked" description="Your user account is not linked to a provider record. Contact your organization administrator." />
        </div>
      ) : (
        <>
          <div className="card card-pad mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label">Provider</label>
                {isProvider ? (
                  <div className="input" style={{ background: "var(--bg-soft)" }}>
                    {data?.providerName || user.displayName}
                  </div>
                ) : (
                  <select value={selectedProvider ?? ""} onChange={(e) => setSelectedProvider(e.target.value ? Number(e.target.value) : null)} className="input" disabled={providers.loading}>
                    {providers.loading && <option value="">Loading providers…</option>}
                    {!providers.loading && !(providers.data || []).length && <option value="">No providers</option>}
                    {(providers.data || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {providerName(p)} — NPI {p.npi || "—"}
                      </option>
                    ))}
                  </select>
                )}
                {providers.error && <div className="field-error">{providers.error}</div>}
              </div>
              <div className="flex items-end">
                {canWrite && (
                  <button onClick={() => setConfirmAll(true)} className="btn btn-primary w-full" disabled={!data || capable.length === 0 || authorizedCount === capable.length}>
                    <Icon name="CheckCheck" size={13} /> Authorize All CAQH Payers ({capable.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {auth.error ? (
            <ErrorState message={auth.error} onRetry={auth.reload} />
          ) : auth.loading || !data ? (
            selectedProvider || providers.loading ? (
              <Loading />
            ) : (
              <div className="card">
                <EmptyState icon="Users" title="No providers yet" />
              </div>
            )
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <StatCard label="CAQH Authorized" value={authorizedCount} sub={"of " + capable.length + " capable payers"} icon="ShieldCheck" color="var(--success)" />
                <StatCard label="Not Yet Authorized" value={capable.length - authorizedCount} sub="Pending your approval" icon="ShieldQuestion" color="var(--warn)" />
                <StatCard label="Non-CAQH Payers" value={nonCaqh.length} sub="Require manual packet" icon="ShieldX" color="var(--ink-light)" />
                <StatCard
                  label="CAQH Profile Status"
                  value={profileStatus}
                  sub={data.caqhLastAttested ? "Last attested " + fmtDate(data.caqhLastAttested) : data.caqhId ? "CAQH ID " + data.caqhId : "No CAQH ID on file"}
                  icon="Shield"
                  color="var(--info)"
                />
              </div>

              <DeferredNotice className="mb-4">
                Authorizations are recorded here. Syncing them to CAQH ProView and pulling payer data will be available in a later phase.
              </DeferredNotice>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* CAQH-capable payers */}
                <div className="card">
                  <div className="p-4 border-b border-line" style={{ background: "var(--success-soft)" }}>
                    <div className="flex items-center gap-2">
                      <Icon name="ShieldCheck" size={16} className="text-success" />
                      <h3 className="font-display font-semibold text-ink">CAQH-Participating Payers</h3>
                    </div>
                    <p className="text-xs text-ink-light mt-1">Toggle to authorize each payer to pull your CAQH profile</p>
                  </div>
                  <div className="p-2">
                    {capable.length === 0 && <EmptyState icon="ShieldQuestion" title="No CAQH-participating payers" />}
                    {capable.map((payer) => {
                      const inProgress = authInProgress[payer.payerId];
                      return (
                        <div
                          key={payer.payerId}
                          className="p-3 rounded-lg mb-2 flex items-center gap-3"
                          style={{ background: payer.authorized ? "var(--success-soft)" : "var(--bg-soft)", border: "1px solid var(--border)" }}
                        >
                          <div className="w-2 h-10 rounded" style={{ background: payer.color }}></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{payer.payerName}</div>
                            <div className="text-[10px] text-ink-light">
                              {payer.authorized ? (
                                <>
                                  <Icon name="CheckCircle2" size={9} className="inline text-success" /> Authorized {fmtDate(payer.authorizedAt?.slice(0, 10))}
                                  {payer.lastDataPull && <> · Last pulled {fmtDate(payer.lastDataPull.slice(0, 10))}</>}
                                </>
                              ) : payer.revokedAt ? (
                                "Revoked " + fmtDate(payer.revokedAt.slice(0, 10)) + " · payer cannot see CAQH data"
                              ) : (
                                "Not authorized · payer cannot see CAQH data"
                              )}
                            </div>
                          </div>
                          {canWrite && (
                            <button onClick={() => toggleAuthorization(payer)} disabled={inProgress} className={"btn text-xs " + (payer.authorized ? "btn-secondary" : "btn-primary")}>
                              {inProgress ? (
                                <span className="loader"></span>
                              ) : payer.authorized ? (
                                <>
                                  <Icon name="X" size={11} /> Revoke
                                </>
                              ) : (
                                <>
                                  <Icon name="Check" size={11} /> Authorize
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Non-CAQH payers */}
                <div className="card">
                  <div className="p-4 border-b border-line" style={{ background: "var(--bg-soft)" }}>
                    <div className="flex items-center gap-2">
                      <Icon name="ShieldX" size={16} className="text-ink-light" />
                      <h3 className="font-display font-semibold text-ink">Non-CAQH Payers</h3>
                    </div>
                    <p className="text-xs text-ink-light mt-1">These payers require a manual credentialing packet</p>
                  </div>
                  <div className="p-2">
                    {nonCaqh.length === 0 ? (
                      <EmptyState icon="ShieldCheck" title="All configured payers participate in CAQH" description="Nothing needs a manual packet." />
                    ) : (
                      nonCaqh.map((payer) => (
                        <div key={payer.payerId} className="p-3 rounded-lg mb-2 flex items-center gap-3" style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}>
                          <div className="w-2 h-10 rounded" style={{ background: payer.color }}></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{payer.payerName}</div>
                            <div className="text-[10px] text-ink-light">Manual packet required</div>
                          </div>
                          {payer.portalUrl && (
                            <a href={payer.portalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-xs">
                              <Icon name="ExternalLink" size={11} /> Portal
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {confirmAll && data && (
        <ConfirmDialog
          title="Authorize all CAQH payers"
          message={"Authorize ALL CAQH-participating payers to access " + data.providerName + "'s CAQH profile?"}
          confirmLabel="Authorize all"
          danger={false}
          busy={bulkBusy}
          onConfirm={bulkAuthorize}
          onClose={() => setConfirmAll(false)}
        />
      )}
    </div>
  );
}
