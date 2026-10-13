"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
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
  enabled: boolean;
}

/**
 * Admin → Payers (left column): every payer with a checkbox. Ticking one switches it on for the organization (the
 * same setting as super admin → Organizations → Payers); the payer cards on the right show the ticked ones.
 */
export function PayerChecklist({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const payers = useAsync<OrgPayer[]>(() => api.get<OrgPayer[]>("/payers/org-settings"), []);
  const [busy, setBusy] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const all = payers.data || [];
  const shown = all.filter((p) => matchesSearch(search, p.name, p.fullName, p.category));
  const enabledCount = all.filter((p) => p.enabled).length;

  const toggle = async (p: OrgPayer) => {
    setBusy(p.id);
    try {
      await api.patch("/payers/" + p.id + "/org-enabled", { enabled: !p.enabled });
      payers.setData(all.map((x) => (x.id === p.id ? { ...x, enabled: !p.enabled } : x)));
      toast(p.name + (p.enabled ? " disabled" : " enabled"));
      onChanged();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <aside className="card w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-4 flex flex-col" style={{ maxHeight: "calc(100vh - 32px)" }}>
      <div className="px-3 pt-3 pb-2 border-b border-line">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-ink text-sm">Payers</h3>
          {payers.data && (
            <span className="text-[11px] text-ink-light">
              <strong className="text-ink">{enabledCount}</strong> of {all.length} enabled
            </span>
          )}
        </div>
        <div className="relative mt-2">
          <Icon name="Search" size={12} className="absolute" style={{ left: 8, top: 9, color: "var(--ink-faint)" }} />
          <input value={search} onChange={(e) => setSearch(cleanSearch(e.target.value))} placeholder="Find a payer..." className="input input-sm" style={{ paddingLeft: 26 }} aria-label="Find a payer" />
        </div>
      </div>
      <div className="overflow-y-auto py-1" style={{ minHeight: 120 }}>
        {payers.error ? (
          <div className="text-xs p-3" style={{ color: "var(--danger)" }}>{payers.error}</div>
        ) : !payers.data ? (
          <div className="text-xs text-ink-faint p-3">Loading payers…</div>
        ) : shown.length === 0 ? (
          <div className="text-xs text-ink-faint p-3">No payers match “{search.trim()}”</div>
        ) : (
          shown.map((p) => (
            <label
              key={p.id}
              className="payer-check flex items-center gap-2.5 px-3 py-1.5 text-sm cursor-pointer"
              style={{ opacity: busy === p.id ? 0.5 : 1 }}
              title={p.fullName || p.name}
            >
              <input type="checkbox" checked={p.enabled} disabled={busy === p.id} onChange={() => toggle(p)} className="flex-shrink-0" style={{ width: 16, height: 16 }} />
              <span className={"truncate " + (p.enabled ? "text-ink" : "text-ink-light")}>{p.name}</span>
            </label>
          ))
        )}
      </div>
    </aside>
  );
}
