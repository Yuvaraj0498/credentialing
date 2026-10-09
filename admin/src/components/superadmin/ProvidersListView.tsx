"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import type { Client } from "@/types/organization";
import type { ProviderListItem } from "@/types/providers";
import { adminLabel } from "./OrganizationsView";
import type { AdminSummary } from "./types";

const ROW_H = 49;

/**
 * Super admin → Providers (read-only): choose the org admin, then one of their organizations (clients);
 * that organization's providers are listed below. A row opens the provider.
 */
export function ProvidersListView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const adminId = params.get("admin") || "";
  const clientId = params.get("client") || "";

  const admins = useAsync<AdminSummary[]>(() => api.get<AdminSummary[]>("/platform/admins"), []);
  const adminList = [...(admins.data || [])].sort((a, b) => a.name.localeCompare(b.name));
  const admin = adminList.find((a) => String(a.userId) === adminId);
  const orgId = admin?.orgId ?? null;
  const clients = useAsync<Client[]>(orgId ? () => api.get<Client[]>("/clients", undefined, { orgId }) : null, [orgId]);
  const clientList = [...(clients.data || [])].sort((a, b) => a.name.localeCompare(b.name));
  const client = clientList.find((c) => String(c.id) === clientId);

  const setQuery = (admin: string, client: string) => {
    const qs = new URLSearchParams();
    if (admin) qs.set("admin", admin);
    if (client) qs.set("client", client);
    router.replace(pathname + (qs.toString() ? "?" + qs : ""), { scroll: false });
  };

  return (
    <div>
      <PageHeader title="Providers" subtitle="Choose an org admin and one of their organizations to see its providers." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="label" htmlFor="sa-p-admin">Org Admin</label>
          <select id="sa-p-admin" value={adminId} onChange={(e) => setQuery(e.target.value, "")} className="input" disabled={admins.loading}>
            <option value="">{admins.loading ? "Loading admins…" : "— Select an org admin —"}</option>
            {adminList.map((a) => (
              <option key={a.userId} value={a.userId}>{adminLabel(a)}</option>
            ))}
          </select>
          {admins.error && <div className="field-error">{admins.error}</div>}
        </div>
        <div>
          <label className="label" htmlFor="sa-p-client">Organization</label>
          <select id="sa-p-client" value={clientId} onChange={(e) => setQuery(adminId, e.target.value)} className="input" disabled={!admin || clients.loading}>
            <option value="">{!admin ? "Choose an org admin first" : clients.loading ? "Loading organizations…" : clientList.length ? "— Select an organization —" : "No organizations under this admin"}</option>
            {clientList.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {clients.error && <div className="field-error">{clients.error}</div>}
        </div>
      </div>
      {admin && client ? (
        <ProviderTable key={orgId + ":" + client.id} orgId={admin.orgId} clientId={client.id} adminId={adminId} />
      ) : (
        <div className="card card-pad text-center text-sm text-ink-light py-10">
          {admin ? "Select an organization to see its providers." : "Select an org admin, then an organization, to see the providers."}
        </div>
      )}
    </div>
  );
}

function ProviderTable({ orgId, clientId, adminId }: { orgId: number; clientId: number; adminId: string }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [page, setPage] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const size = useFitRows(tableRef, ROW_H);
  const list = useAsync<PageResponse<ProviderListItem>>(
    () => api.get<PageResponse<ProviderListItem>>("/providers", { q, clientId, page, size, sort: "lastName,asc" }, { orgId }),
    [orgId, clientId, q, page, size]
  );
  const data = list.data;
  const rows = data?.content || [];

  return (
    <div>
      <div className="relative mb-3">
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
              <col style={{ width: "22%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "21%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Specialty</th>
                <th>Status</th>
                <th>Documents</th>
                <th>Email</th>
                <th>NPI</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-sm text-ink-light" style={{ height: ROW_H }}>
                    {q ? "No providers match “" + q + "”" : "No providers in this organization"}
                  </td>
                </tr>
              )}
              {rows.map((p) => {
                const name = p.firstName + " " + p.lastName + (p.suffix ? ", " + p.suffix : "");
                return (
                  <tr
                    key={p.id}
                    className="cursor-pointer hover:bg-soft"
                    style={{ height: ROW_H }}
                    onClick={() => router.push("/all-providers/" + p.id + "?org=" + orgId + "&admin=" + adminId + "&client=" + clientId)}
                  >
                    <td className="truncate font-medium text-accent" title={name}>{name}</td>
                    <td className="truncate text-ink-light" title={p.specialty || ""}>{p.specialty || "—"}</td>
                    <td className="truncate"><ProviderStatusPill status={p.status} /></td>
                    <td><ProgressBar filled={p.documents.approved} total={p.documents.required} /></td>
                    <td className="truncate text-xs text-ink-light" title={p.email || ""}>{p.email || "—"}</td>
                    <td className="truncate font-mono text-xs text-ink-light">{p.npi || "—"}</td>
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
