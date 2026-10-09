"use client";

import { useState } from "react";
import { AsyncBoundary } from "@/components/AsyncState";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { DocStatusBadge, ProviderStatusPill } from "@/components/Pill";
import { ProviderInfo } from "@/components/providers/ProviderInfo";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDate } from "@/lib/utils";
import type { ProviderDetail } from "@/types/providers";
import { Breadcrumbs } from "./Breadcrumbs";

/** Super admin → Providers → one provider: details and documents, read-only (like the admin's provider page). */
export function ProviderReadView({ providerId, orgId }: { providerId: number; orgId: number | null }) {
  const q = useAsync<ProviderDetail>(() => api.get<ProviderDetail>("/providers/" + providerId, undefined, { orgId }), [providerId, orgId]);
  const [tab, setTab] = useState<"details" | "documents">("details");
  const p = q.data;
  const name = p ? p.firstName + " " + p.lastName + (p.suffix ? ", " + p.suffix : "") : "Provider";

  return (
    <div>
      <Breadcrumbs items={[{ label: "Providers", href: "/all-providers" }, { label: name }]} />
      <AsyncBoundary loading={q.loading && !p} error={q.error} onRetry={q.reload}>
        {p && (
          <>
            <div className="card mb-3" style={{ padding: "14px 18px" }}>
              <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                <Avatar name={p.firstName + " " + p.lastName} size={40} />
                <div className="flex-1 min-w-0">
                  <h1 className="font-display text-xl font-bold text-ink truncate">{name}</h1>
                  <p className="text-sm text-ink-light">{p.specialty || "—"}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-ink-light">
                    <span className="flex items-center gap-1"><Icon name="IdCard" size={12} /> NPI: {p.npi || "—"}</span>
                    {p.email && <span className="flex items-center gap-1"><Icon name="Mail" size={12} /> {p.email}</span>}
                    {p.practiceName && <span className="flex items-center gap-1"><Icon name="Briefcase" size={12} /> {p.practiceName}</span>}
                    {p.locationName && <span className="flex items-center gap-1"><Icon name="MapPin" size={12} /> {p.locationName}</span>}
                  </div>
                </div>
                <ProviderStatusPill status={p.status} />
              </div>
            </div>

            <div className="tabs mb-3">
              <div className={"tab " + (tab === "details" ? "active" : "")} onClick={() => setTab("details")}>Provider Details</div>
              <div className={"tab " + (tab === "documents" ? "active" : "")} onClick={() => setTab("documents")}>
                Provider Documents <span className="ml-1 text-[10px] opacity-60">({p.documents.filter((d) => d.status === "approved").length}/{p.documents.filter((d) => d.status !== "na").length})</span>
              </div>
            </div>

            {tab === "details" && <ProviderInfo provider={p} />}
            {tab === "documents" && (
              <div className="card overflow-hidden">
                <table className="table-fit table-compact" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "28%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "28%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "14%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Status</th>
                      <th>File</th>
                      <th>Expiration</th>
                      <th>Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.documents.map((d) => (
                      <tr key={d.id}>
                        <td className="truncate font-medium text-ink" title={d.label}>
                          {d.label}
                          {d.critical && <span className="text-[10px] text-ink-faint ml-1">· required</span>}
                        </td>
                        <td><DocStatusBadge status={d.status} /></td>
                        <td className="truncate text-xs text-ink-light" title={d.fileName || ""}>{d.fileName || "—"}</td>
                        <td className="text-xs">{d.expiresAt ? fmtDate(d.expiresAt) : <span className="text-ink-faint">No expiration</span>}</td>
                        <td className="text-xs text-ink-light">{d.uploadedAt ? fmtDate(d.uploadedAt) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}
