"use client";

import { useMemo, useState } from "react";
import { cleanSearch } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { useAsync } from "@/lib/hooks";
import { providerName, useProvidersLite } from "@/components/enrollments/shared";
import type { ProviderLite } from "@/types/enrollments";
import { ProviderPayerLoginModal } from "@/components/modals/ProviderPayerLoginModal";
import type { CredentialMatrix, Payer, PayerOverviewItem } from "@/types/payers";

interface PayerRow {
  payer: Payer;
  avgTatDays: number | null;
}

/** Loads GET /payers/overview, falling back to GET /payers when the overview is unavailable. */
async function loadPayerRows(): Promise<PayerRow[]> {
  try {
    const items = await api.get<PayerOverviewItem[]>("/payers/overview", { activeOnly: true });
    return items.map((i) => ({ payer: i.payer, avgTatDays: i.avgTatDays ?? i.payer.avgTatDays }));
  } catch {
    const payers = await api.get<Payer[]>("/payers", { activeOnly: true });
    return payers.map((p) => ({ payer: p, avgTatDays: p.avgTatDays }));
  }
}

/** Port of the prototype PayersView (L3580) plus the provider × payer login matrix. */
export function PayersView() {
  const { can } = useAuth();
  const canCreds = can("list", "credential_vault");
  const canEditCreds = can("update", "credential_vault") || can("create", "credential_vault");
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [search, setSearch] = useState("");
  const [provModal, setProvModal] = useState<{ providerId: number; providerName: string; payer: Payer; has: boolean } | null>(null);

  const rows = useAsync(loadPayerRows, []);
  const providers = useProvidersLite();
  const matrix = useAsync<CredentialMatrix>(canCreds ? () => api.get("/payer-credentials/matrix") : null, [canCreds]);

  const payers = useMemo(() => (rows.data || []).map((r) => r.payer), [rows.data]);
  const selectedProvider: ProviderLite | undefined = providers.data?.find((p) => String(p.id) === selectedProviderId);
  const perProvider = useMemo(() => {
    if (!selectedProviderId || !matrix.data) return null;
    const row = matrix.data.providers.find((p) => String(p.providerId) === selectedProviderId);
    const map: Record<number, { username: string; updatedAt: string }> = {};
    (row?.credentials || []).forEach((c) => (map[c.payerId] = c));
    return map;
  }, [selectedProviderId, matrix.data]);

  const filteredRows = (rows.data || []).filter(
    ({ payer: p }) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.fullName || "").toLowerCase().includes(search.toLowerCase())
  );
  const configuredCount = selectedProvider && perProvider ? Object.keys(perProvider).filter((k) => perProvider[Number(k)]?.username).length : 0;

  const reloadCreds = () => {
    matrix.reload();
  };

  // Portal logins belong to a provider: the button works only after a provider is chosen.
  const openForCard = (p: Payer) => {
    if (selectedProvider) setProvModal({ providerId: selectedProvider.id, providerName: providerName(selectedProvider), payer: p, has: !!perProvider?.[p.id]?.username });
  };

  return (
    <div>
      <PageHeader title="Payers" subtitle="All insurance payers your organization works with. Select a provider to manage their payer portal credentials." />

      {/* Provider selector bar */}
      {canCreds && (
        <div
          className="card card-pad mb-4"
          style={{ background: selectedProvider ? "var(--accent-soft)" : "var(--info-soft)", borderColor: selectedProvider ? "var(--accent)" : "var(--info)" }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <Icon name={selectedProvider ? "UserCheck" : "Info"} size={18} className={selectedProvider ? "text-accent" : "text-info"} />
            <div className="flex-1 min-w-0">
              {selectedProvider ? (
                <div>
                  <div className="text-sm text-ink">
                    Managing credentials for <strong>{providerName(selectedProvider)}</strong>
                    {selectedProvider.suffix ? ", " + selectedProvider.suffix : ""} ({selectedProvider.specialty || "—"})
                  </div>
                  <div className="text-xs text-ink-light mt-0.5">
                    <strong>{configuredCount}</strong> of <strong>{payers.length}</strong> payer portals configured for this provider
                  </div>
                </div>
              ) : (
                <div className="text-xs text-ink">
                  <strong>Choose a provider first</strong> — Portal Login is enabled once a provider is selected. Each provider has their own login credentials per payer, stored securely.
                </div>
              )}
            </div>
            <select value={selectedProviderId} onChange={(e) => setSelectedProviderId(e.target.value)} className="input" style={{ minWidth: 280, maxWidth: "100%" }} disabled={providers.loading}>
              <option value="">{providers.loading ? "Loading providers…" : "— Choose provider —"}</option>
              {(providers.data || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {providerName(p)} {p.suffix ? "," + p.suffix : ""} — NPI {p.npi || "—"}
                </option>
              ))}
            </select>
          </div>
          {(providers.error || matrix.error) && <div className="text-xs mt-2" style={{ color: "var(--danger)" }}>{providers.error || matrix.error}</div>}
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative w-full">
        <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
        <input value={search} onChange={(e) => setSearch(cleanSearch(e.target.value))} placeholder="Search payers..." className="input" style={{ paddingLeft: 32 }} />
      </div>

      {rows.error ? (
        <ErrorState message={rows.error} onRetry={rows.reload} />
      ) : rows.loading ? (
        <Loading />
      ) : filteredRows.length === 0 ? (
        <div className="card">
          <EmptyState icon="CreditCard" title={search ? "No payers match" : "No payers yet"} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRows.map(({ payer: p, avgTatDays }) => {
            const providerCred = perProvider ? perProvider[p.id] : null;
            const providerHasCreds = !!providerCred?.username;

            return (
              <div key={p.id} className="card card-pad card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: p.color }}>
                    {p.name.slice(0, 2)}
                  </div>
                  <Pill type="neutral">{p.category}</Pill>
                </div>
                <h3 className="font-display font-semibold text-ink">{p.name}</h3>
                <p className="text-xs text-ink-light mb-3">{p.fullName}</p>
                <div className="space-y-1 text-xs mb-3">
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Avg TAT</span>
                    <span className="font-mono font-semibold">{avgTatDays != null ? avgTatDays + "d" : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Integration</span>
                    <span className="font-mono uppercase">{p.integration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Form</span>
                    <span className="text-right">{p.appForm || "—"}</span>
                  </div>
                </div>
                {selectedProvider && providerHasCreds && providerCred && (
                  <div className="mb-3 p-2 rounded text-[11px] font-mono" style={{ background: "var(--bg-soft)" }}>
                    <div className="flex items-center gap-1 text-ink">
                      <Icon name="User" size={10} className="text-ink-faint" />
                      <span className="truncate">{providerCred.username}</span>
                    </div>
                    {providerCred.updatedAt && <div className="text-[9px] text-ink-faint mt-0.5">Updated {new Date(providerCred.updatedAt).toLocaleDateString()}</div>}
                  </div>
                )}
                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <div className="text-xs">
                    {!selectedProvider && (
                      <span className="flex items-center gap-1 text-ink-faint">
                        <Icon name="UserRound" size={11} /> Choose a provider
                      </span>
                    )}
                    {selectedProvider && providerHasCreds && (
                      <span className="flex items-center gap-1 text-success">
                        <Icon name="CheckCircle2" size={11} /> Configured
                      </span>
                    )}
                    {selectedProvider && !providerHasCreds && (
                      <span className="flex items-center gap-1 text-ink-faint">
                        <Icon name="Lock" size={11} /> No credentials
                      </span>
                    )}
                  </div>
                  {canCreds && (
                    <button
                      onClick={() => openForCard(p)}
                      className="btn btn-primary"
                      style={{ fontSize: 11, padding: "5px 10px" }}
                      disabled={!selectedProvider || (!canEditCreds && !providerHasCreds)}
                      title={!selectedProvider ? "Choose a provider first" : undefined}
                    >
                      <Icon name="LogIn" size={11} /> {providerHasCreds ? "Update Login" : "Portal Login"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {provModal && (
        <ProviderPayerLoginModal
          providerId={provModal.providerId}
          providerName={provModal.providerName}
          payer={provModal.payer}
          hasExisting={provModal.has}
          onSaved={() => {
            setProvModal(null);
            reloadCreds();
          }}
          onClose={() => setProvModal(null)}
        />
      )}
    </div>
  );
}
