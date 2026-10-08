"use client";

import { useState } from "react";
import Link from "next/link";
import { AsyncBoundary } from "@/components/AsyncState";
import { Avatar } from "@/components/Avatar";
import { DeferredNotice } from "@/components/AlertBox";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { StatCard } from "@/components/StatCard";
import { api, errorMessage } from "@/lib/api";
import { useUser } from "@/stores/auth";
import { fmtDate, cleanSearch } from "@/lib/utils";
import { useAsync, useDebounced } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { ExclusionCheckModal } from "@/components/modals/ExclusionCheckModal";
import { isWriter } from "./InfoField";
import type { DeferredResponse, SanctionsResponse, SanctionsRow } from "@/types/credentialing";

export function SanctionsMonitoringView() {
  const me = useUser();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [running, setRunning] = useState(false);
  const [deferred, setDeferred] = useState<string | null>(null);
  const [checking, setChecking] = useState<SanctionsRow | null>(null);

  const { data, loading, error, reload } = useAsync(() => api.get<SanctionsResponse>("/sanctions/monitoring", { q }), [q]);

  const st = data?.stats ?? { total: 0, clear: 0, flagged: 0, never: 0, dueSoon: 0, overdue: 0 };
  const stats = {
    total: st.total,
    current: Math.max(0, st.total - st.never - st.overdue - st.dueSoon),
    dueSoon: st.dueSoon,
    overdue: st.overdue,
    flagged: st.flagged,
  };
  const filtered = data?.items ?? [];

  const runAll = async () => {
    setRunning(true);
    try {
      const res = await api.post<DeferredResponse>("/sanctions/run-all");
      setDeferred(res.message);
      toast(res.message, "info");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setRunning(false);
    }
  };

  const statusOf = (h: SanctionsRow) =>
    h.status === "never" ? { pill: "neutral", label: "Never Checked" } : h.overdue ? { pill: "danger", label: "Overdue" } : h.dueSoon ? { pill: "warn", label: "Due Soon" } : { pill: "success", label: "Current" };

  return (
    <div>
      <PageHeader
        title="Sanctions Monitoring"
        subtitle="Continuous monitoring of providers against OIG, SAM, and state medical board exclusion lists"
        actions={
          isWriter(me.role) && (
            <button onClick={runAll} disabled={running} className="btn btn-primary">
              {running ? <span className="loader" style={{ borderTopColor: "white" }} /> : <Icon name="RefreshCw" size={14} />} Run All Checks Now
            </button>
          )
        }
      />

      {deferred && <DeferredNotice className="mb-4">{deferred}</DeferredNotice>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard label="Total Providers" value={stats.total} sub={st.never > 0 ? st.never + " never checked" : "Monitored"} icon="Shield" color="var(--ink)" />
        <StatCard label="Current" value={stats.current} sub="Checks valid" icon="CheckCircle2" color="var(--success)" />
        <StatCard label="Due Soon" value={stats.dueSoon} sub="Within 10 days" icon="Clock" color="var(--warn)" />
        <StatCard label="Overdue" value={stats.overdue} sub="Action needed" icon="AlertTriangle" color="var(--danger)" emphasize={stats.overdue > 0} />
        <StatCard label="Flagged" value={stats.flagged} sub="Have history" icon="Flag" color="var(--accent)" emphasize={stats.flagged > 0} />
      </div>

      <div className="card card-pad mb-4" style={{ background: "var(--info-soft)" }}>
        <div className="flex items-start gap-2 text-xs text-ink">
          <Icon name="Info" size={14} style={{ color: "var(--info)", marginTop: 1 }} />
          <div>
            <span className="font-semibold">Monitoring schedule: </span>
            All active providers should be checked against OIG LEIE, SAM.gov, NPI Registry, and their state medical board every {data?.intervalDays ?? 30} days. Results are logged and any flagged finding triggers an immediate notification. Automatic checks will run in a later phase — record results manually with <strong>Check</strong>.
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-3 border-b border-line">
          <div className="relative" style={{ maxWidth: 320 }}>
            <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
            <input value={search} onChange={(e) => setSearch(cleanSearch(e.target.value))} placeholder="Search by name or NPI..." className="input" style={{ paddingLeft: 32 }} />
          </div>
        </div>
        <AsyncBoundary loading={loading && !data} error={error} onRetry={reload}>
          {filtered.length === 0 ? (
            <EmptyState icon="Shield" title={q ? "No providers match" : "No providers to monitor"} description={q ? "Try a different name or NPI." : "Providers appear here once they are added."} />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Provider</th><th>NPI</th><th>Last Check</th><th>Next Check</th><th>Status</th><th>Flags</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map((h) => {
                    const s = statusOf(h);
                    return (
                      <tr key={h.providerId}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Avatar name={h.name} size={28} />
                            <span className="font-medium">{h.name}</span>
                          </div>
                        </td>
                        <td className="font-mono text-xs">{h.npi || "—"}</td>
                        <td className="text-xs text-ink-light">{fmtDate(h.lastChecked)}</td>
                        <td className="text-xs text-ink-light">{fmtDate(h.nextDue)}</td>
                        <td><Pill type={s.pill}>{s.label}</Pill></td>
                        <td>
                          {h.flags.length > 0 ? (
                            <span title={h.flags.join("\n")}><Pill type="warn">{h.flags.length} flag(s)</Pill></span>
                          ) : (
                            <span className="text-ink-faint text-xs">None</span>
                          )}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <button onClick={() => setChecking(h)} className="btn btn-ghost text-xs"><Icon name="ShieldCheck" size={11} /> Check</button>
                          <Link href={`/providers/${h.providerId}`} className="btn btn-ghost text-xs"><Icon name="ExternalLink" size={11} /> View</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      </div>

      {checking && (
        <ExclusionCheckModal
          provider={{ id: checking.providerId, name: checking.name, npi: checking.npi }}
          onClose={() => setChecking(null)}
          onRecorded={reload}
        />
      )}
    </div>
  );
}
