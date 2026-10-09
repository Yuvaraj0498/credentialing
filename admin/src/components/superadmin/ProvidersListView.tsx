"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AsyncBoundary } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ProviderStatusPill } from "@/components/Pill";
import { ProgressBar } from "@/components/ProgressBar";
import { api } from "@/lib/api";
import { useAsync, useDebounced } from "@/lib/hooks";
import { useFitRows } from "@/lib/useFitRows";
import { cleanSearch } from "@/lib/utils";
import type { PageResponse } from "@/types";

const ROW_H = 49;

export interface PlatformProvider {
  id: number;
  firstName: string;
  lastName: string;
  suffix: string | null;
  specialty: string | null;
  status: string;
  email: string | null;
  npi: string | null;
  orgId: number;
  orgName: string | null;
  practiceName: string | null;
  locationName: string | null;
  documents: { approved: number; required: number; missingCritical: number };
}

/** Super admin → Providers (read-only): every organization's providers. A row opens the provider. */
export function ProvidersListView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [page, setPage] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const size = useFitRows(tableRef, ROW_H);
  const list = useAsync<PageResponse<PlatformProvider>>(() => api.get<PageResponse<PlatformProvider>>("/platform/providers", { q, page, size }), [q, page, size]);
  const data = list.data;
  const rows = data?.content || [];

  return (
    <div>
      <PageHeader title="Providers" subtitle={data ? data.totalElements + " provider(s) across all organizations" : "Loading…"} />
      <div className="relative mb-4">
        <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
        <input
          value={search}
          onChange={(e) => {
            setSearch(cleanSearch(e.target.value));
            setPage(0);
          }}
          placeholder="Search name, NPI, specialty, email..."
          className="input"
          style={{ paddingLeft: 32 }}
          aria-label="Search providers"
        />
      </div>
      <div className="card overflow-hidden" ref={tableRef} style={{ opacity: list.loading && data ? 0.6 : 1 }}>
        <AsyncBoundary loading={list.loading && !data} error={list.error} onRetry={list.reload}>
          <table className="table-fit" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "19%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "22%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Organization</th>
                <th>Specialty</th>
                <th>Status</th>
                <th>Documents</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-sm text-ink-light" style={{ height: ROW_H }}>
                    {q ? "No providers match “" + q + "”" : "No providers yet"}
                  </td>
                </tr>
              )}
              {rows.map((p) => {
                const name = p.firstName + " " + p.lastName + (p.suffix ? ", " + p.suffix : "");
                return (
                  <tr key={p.id} className="cursor-pointer hover:bg-soft" style={{ height: ROW_H }} onClick={() => router.push("/all-providers/" + p.id + "?org=" + p.orgId)}>
                    <td className="truncate font-medium text-accent" title={name}>{name}</td>
                    <td className="truncate" title={p.orgName || ""}>{p.orgName || "—"}</td>
                    <td className="truncate text-ink-light" title={p.specialty || ""}>{p.specialty || "—"}</td>
                    <td className="truncate"><ProviderStatusPill status={p.status} /></td>
                    <td><ProgressBar filled={p.documents.approved} total={p.documents.required} /></td>
                    <td className="truncate text-xs text-ink-light" title={p.email || ""}>{p.email || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data && <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} size={data.size} onChange={setPage} />}
        </AsyncBoundary>
      </div>
    </div>
  );
}
