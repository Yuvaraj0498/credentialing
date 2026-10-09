"use client";

import { useState } from "react";
import { AsyncBoundary } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import { PayerLogo } from "@/components/payers/PayerLogo";
import { api, errorMessage } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { matchesSearch } from "@/lib/search";
import { cleanSearch } from "@/lib/utils";
import { useToast } from "@/stores/toast";

interface OrgPayer {
  id: number;
  name: string;
  fullName: string | null;
  category: string;
  color: string | null;
  logo: string | null;
  integration: string;
  enabled: boolean;
}

/**
 * Super admin → Organizations → one admin → Payers: every payer is on for every admin by default; switching one off
 * hides it from that admin's organization (their Payers page, pickers, payer logins).
 */
export function OrgPayersPanel({ orgId, adminName }: { orgId: number; adminName: string }) {
  const toast = useToast();
  const payers = useAsync<OrgPayer[]>(() => api.get<OrgPayer[]>("/platform/organizations/" + orgId + "/payers"), [orgId]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const all = payers.data || [];
  const shown = all.filter((p) => matchesSearch(search, p.name, p.fullName, p.category, p.integration));
  const enabledCount = all.filter((p) => p.enabled).length;

  const toggle = async (p: OrgPayer) => {
    setBusy(p.id);
    try {
      await api.patch("/platform/organizations/" + orgId + "/payers/" + p.id, { enabled: !p.enabled });
      payers.setData(all.map((x) => (x.id === p.id ? { ...x, enabled: !p.enabled } : x)));
      toast(p.name + (p.enabled ? " disabled for " : " enabled for ") + adminName);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="relative flex-1" style={{ minWidth: 220 }}>
          <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(cleanSearch(e.target.value))}
            placeholder="Search payer, insurance company, category..."
            className="input"
            style={{ paddingLeft: 32 }}
            aria-label="Search payers"
          />
        </div>
        {payers.data && (
          <div className="text-xs text-ink-light">
            <strong className="text-ink">{enabledCount}</strong> of {all.length} payers enabled for this admin
          </div>
        )}
      </div>
      <div className="card overflow-hidden">
        <AsyncBoundary loading={payers.loading && !payers.data} error={payers.error} onRetry={payers.reload}>
          {shown.length === 0 ? (
            <div className="text-center text-sm text-ink-light py-8">{all.length === 0 ? "No payers yet" : "No payers match “" + search.trim() + "”"}</div>
          ) : (
            <div className="divide-y divide-line">
              {shown.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <PayerLogo name={p.name} color={p.color} logo={p.logo} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{p.name}</div>
                    <div className="text-xs text-ink-light truncate">{p.fullName || "—"}</div>
                  </div>
                  <div className="hidden sm:block"><Pill type="neutral">{p.category}</Pill></div>
                  <div className="flex items-center gap-2" style={{ minWidth: 118, justifyContent: "flex-end" }}>
                    <span className="text-xs" style={{ color: p.enabled ? "var(--success, #059669)" : "var(--ink-faint)" }}>{p.enabled ? "Enabled" : "Disabled"}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.enabled}
                      aria-label={(p.enabled ? "Disable " : "Enable ") + p.name}
                      onClick={() => toggle(p)}
                      disabled={busy === p.id}
                      style={{
                        width: 36,
                        height: 20,
                        borderRadius: 999,
                        position: "relative",
                        background: p.enabled ? "var(--success, #059669)" : "var(--line-strong, #cbd5e1)",
                        transition: "background .15s",
                        opacity: busy === p.id ? 0.6 : 1,
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ position: "absolute", top: 2, left: p.enabled ? 18 : 2, width: 16, height: 16, borderRadius: 999, background: "white", boxShadow: "0 1px 2px rgba(0,0,0,.25)", transition: "left .15s" }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AsyncBoundary>
      </div>
    </div>
  );
}
