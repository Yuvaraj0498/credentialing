"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AsyncBoundary } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { Pill } from "@/components/Pill";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { matchesSearch } from "@/lib/search";
import { useFitRows } from "@/lib/useFitRows";
import { cleanSearch } from "@/lib/utils";
import type { AdminSummary } from "./types";

const ROW_H = 49;

/** Super admin → Organizations (read-only): every organization with its admin. A row opens its structure. */
export function OrganizationsView() {
  const router = useRouter();
  const admins = useAsync<AdminSummary[]>(() => api.get<AdminSummary[]>("/platform/admins"), []);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const size = useFitRows(tableRef, ROW_H);

  const all = admins.data || [];
  const shown = all.filter((a) => matchesSearch(search, a.name, a.email, a.phone, a.orgName, a.planName, a.orgStatus));
  const totalPages = Math.max(1, Math.ceil(shown.length / size));
  const current = Math.min(page, totalPages - 1);
  const rows = shown.slice(current * size, current * size + size);

  return (
    <div>
      <PageHeader title="Organizations" subtitle={admins.data ? all.length + " organization(s) — open one to see its clients, practices and locations" : "Loading…"} />
      <div className="relative mb-4">
        <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
        <input
          value={search}
          onChange={(e) => {
            setSearch(cleanSearch(e.target.value));
            setPage(0);
          }}
          placeholder="Search admin, organization, email, plan..."
          className="input"
          style={{ paddingLeft: 32 }}
          aria-label="Search organizations"
        />
      </div>
      <div className="card overflow-hidden" ref={tableRef}>
        <AsyncBoundary loading={admins.loading && !admins.data} error={admins.error} onRetry={admins.reload}>
          <table className="table-fit" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Org Admin</th>
                <th>Organization</th>
                <th>Email</th>
                <th className="text-right">Providers</th>
                <th className="text-right">Users</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-sm text-ink-light" style={{ height: ROW_H }}>
                    {all.length === 0 ? "No organizations yet" : "No organizations match “" + search.trim() + "”"}
                  </td>
                </tr>
              )}
              {rows.map((a) => (
                <tr key={a.userId} className="cursor-pointer hover:bg-soft" style={{ height: ROW_H }} onClick={() => router.push("/organizations/" + a.orgId)}>
                  <td className="truncate font-medium text-accent" title={a.name}>{a.name}</td>
                  <td className="truncate" title={a.orgName || ""}>{a.orgName || "—"}</td>
                  <td className="truncate text-xs text-ink-light" title={a.email}>{a.email}</td>
                  <td className="text-right font-mono text-xs">{a.providerCount}</td>
                  <td className="text-right font-mono text-xs">{a.userCount}</td>
                  <td>
                    {a.disabled ? <Pill type="neutral">Disabled</Pill> : a.orgStatus === "suspended" ? <Pill type="danger">Suspended</Pill> : <Pill type="success">Active</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={current} totalPages={totalPages} totalElements={shown.length} size={size} onChange={setPage} />
        </AsyncBoundary>
      </div>
    </div>
  );
}
