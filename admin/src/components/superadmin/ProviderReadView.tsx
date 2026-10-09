"use client";

import { useState } from "react";
import { AsyncBoundary } from "@/components/AsyncState";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { DocStatusBadge, Pill, ProviderStatusPill } from "@/components/Pill";
import { api, errorMessage } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDateShort } from "@/lib/utils";
import { useToast } from "@/stores/toast";
import type { DocumentRow, ProviderDetail } from "@/types/providers";
import { Breadcrumbs } from "./Breadcrumbs";

type Tab = "overview" | "enrollments" | "activity" | "info";

/**
 * Super admin → Providers → one provider. Same layout as the admin's provider page, read-only: the Overview tab
 * shows the provider's documents (download when a file is uploaded); the other tabs are empty for now.
 */
export function ProviderReadView({ providerId, orgId, backHref }: { providerId: number; orgId: number | null; backHref: string }) {
  const q = useAsync<ProviderDetail>(() => api.get<ProviderDetail>("/providers/" + providerId, undefined, { orgId }), [providerId, orgId]);
  const [tab, setTab] = useState<Tab>("overview");
  const p = q.data;
  const name = p ? p.firstName + " " + p.lastName : "Provider";

  return (
    <div>
      <Breadcrumbs items={[{ label: "Providers", href: backHref }, { label: name }]} />
      <AsyncBoundary loading={q.loading && !p} error={q.error} onRetry={q.reload}>
        {p && (
          <>
            {/* Provider header card */}
            <div className="card card-pad mb-6">
              <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                <Avatar name={p.firstName + " " + p.lastName} size={56} />
                <div className="flex-1 min-w-0">
                  <h1 className="font-display text-3xl font-bold text-ink mb-1">{name}</h1>
                  {p.specialty && <p className="text-sm text-ink-light">{p.specialty}</p>}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-ink-light">
                    <span className="flex items-center gap-1"><Icon name="IdCard" size={12} /> NPI: {p.npi || "—"}</span>
                    {p.email && <span className="flex items-center gap-1"><Icon name="Mail" size={12} /> {p.email}</span>}
                    {p.practiceId && <span className="flex items-center gap-1"><Icon name="MapPin" size={12} /> Practice: {p.practiceName || "—"}</span>}
                    {p.telemed && <Pill type="info">Telemed</Pill>}
                    {p.locationId && <span className="flex items-center gap-1"><Icon name="Building" size={12} /> {p.locationName}</span>}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <ProviderStatusPill status={p.status} />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs mb-6 overflow-x-auto">
              <div className={"tab " + (tab === "overview" ? "active" : "")} onClick={() => setTab("overview")}>Overview</div>
              <div className={"tab " + (tab === "enrollments" ? "active" : "")} onClick={() => setTab("enrollments")}>Enrollments</div>
              <div className={"tab " + (tab === "activity" ? "active" : "")} onClick={() => setTab("activity")}>Activity &amp; Time</div>
              <div className={"tab " + (tab === "info" ? "active" : "")} onClick={() => setTab("info")}>Provider Information</div>
            </div>

            {tab === "overview" && <DocumentsCard docs={p.documents} orgId={orgId} />}
            {tab === "enrollments" && <EmptyTab icon="FileCheck2" title="Enrollments" />}
            {tab === "activity" && <EmptyTab icon="Clock" title="Activity & Time" />}
            {tab === "info" && <EmptyTab icon="User" title="Provider Information" />}
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}

function DocumentsCard({ docs, orgId }: { docs: DocumentRow[]; orgId: number | null }) {
  const toast = useToast();
  const [busy, setBusy] = useState<number | null>(null);
  const download = async (d: DocumentRow) => {
    setBusy(d.id);
    try {
      await api.download("/documents/" + d.id + "/download", { inline: false }, d.fileName || "document", { orgId });
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
        <Icon name="FileText" size={16} className="text-accent" />
        <h3 className="font-display font-semibold text-ink">Provider Documents</h3>
        <span className="text-xs text-ink-faint ml-1">
          {docs.filter((d) => d.status === "approved").length}/{docs.filter((d) => d.status !== "na").length} approved
        </span>
      </div>
      <table className="table-fit table-compact" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "46%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>Document Type</th>
            <th>Expiration</th>
            <th>Status</th>
            <th className="text-center">Download</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <td className="truncate font-medium text-ink" title={d.label}>
                {d.label}
                {d.critical && <span className="text-[10px] text-ink-faint ml-1">· required</span>}
              </td>
              <td className="text-xs">{d.expiresAt ? fmtDateShort(d.expiresAt) : <span className="text-ink-faint">No expiration</span>}</td>
              <td><DocStatusBadge status={d.status} /></td>
              <td className="text-center">
                {d.hasFile ? (
                  <button
                    onClick={() => download(d)}
                    disabled={busy === d.id}
                    className="btn-ghost p-1.5 rounded-md text-accent"
                    title={"Download " + (d.fileName || "document")}
                    aria-label={"Download " + d.label}
                  >
                    {busy === d.id ? <span className="loader" /> : <Icon name="Download" size={15} />}
                  </button>
                ) : (
                  <span className="text-ink-faint">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyTab({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="card">
      <EmptyState icon={icon} title={title} description="Nothing to show here yet." />
    </div>
  );
}
