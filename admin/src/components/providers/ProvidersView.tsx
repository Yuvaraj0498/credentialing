"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusPill } from "@/components/Pill";
import { useTopic } from "@/stores/shell";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { useAsync, useDebounced } from "@/lib/hooks";
import type { PageResponse } from "@/types";
import { AddProviderModal } from "@/components/modals/AddProviderModal";
import { listStatusKey, SearchInput } from "./shared";
import type { AssignmentSummary, ProviderListItem } from "@/types/providers";

const PAGE_SIZE = 25;

/** Prototype ProvidersView (L1393) with server-side search, filter, sort and paging. */
export function ProvidersView() {
  const router = useRouter();
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const q = useDebounced(search.trim());

  const list = useAsync(
    () => api.get<PageResponse<ProviderListItem>>("/providers", { q, status: statusFilter, page, size: PAGE_SIZE, sort: "lastName," + sortDir }),
    [q, statusFilter, page, sortDir]
  );
  // Unfiltered total for the "x of y providers" subtitle.
  const summary = useAsync(() => api.get<AssignmentSummary>("/providers/assignment-summary"), []);

  useTopic("providers", () => {
    list.reload();
    summary.reload();
  });

  const data = list.data;
  const total = summary.data?.total ?? data?.totalElements ?? 0;
  const rows = data?.content || [];
  const allChecked = rows.length > 0 && rows.every((p) => checked.has(p.id));

  const toggle = (id: number) =>
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div>
      <PageHeader
        title="Providers"
        subtitle={data ? data.totalElements + " of " + total + " providers" : "Loading providers…"}
        actions={
          <>
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(0);
              }}
              placeholder="Search providers..."
              width={280}
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="input"
              style={{ width: 140 }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="terminated">Terminated</option>
            </select>
            {can("create", "provider") && (
              <button onClick={() => setShowAdd(true)} className="btn btn-primary">
                <Icon name="Plus" size={14} /> Add Provider
              </button>
            )}
          </>
        }
      />

      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : (
        <div className="card overflow-hidden">
          {list.loading && !data ? (
            <Loading />
          ) : (
            // Like the prototype: no matches = the table headings with an empty body (no message).
            <div style={{ opacity: list.loading ? 0.6 : 1 }}>
              <table className="table-fit">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={() => setChecked(allChecked ? new Set() : new Set(rows.map((p) => p.id)))}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
                      Provider {sortDir === "asc" ? "↑" : "↓"}
                    </th>
                    <th>Specialty</th>
                    <th>Status</th>
                    <th>Required Documents</th>
                    <th>Email</th>
                    <th>NPI</th>
                    <th>CAQH #</th>
                    <th>Location</th>
                    <th>Practice</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="cursor-pointer" onClick={() => router.push("/providers/" + p.id)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={checked.has(p.id)} onChange={() => toggle(p.id)} aria-label={"Select " + p.firstName + " " + p.lastName} />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Icon name="ClipboardList" size={14} className="text-ink-faint" />
                          <span className="font-medium text-accent">
                            {p.firstName} {p.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="text-ink-light">{p.specialty || "—"}</td>
                      <td className="nowrap">
                        <StatusPill status={listStatusKey(p.status)} />
                      </td>
                      <td>
                        <ProgressBar filled={p.documents.approved} total={p.documents.required} />
                      </td>
                      <td className="text-ink-light text-xs break-any">{p.email || "—"}</td>
                      <td className="font-mono text-xs text-ink-light nowrap">{p.npi || "—"}</td>
                      <td className="font-mono text-xs text-ink-light nowrap">{p.caqhId || "—"}</td>
                      <td className="text-ink-light text-xs">{p.locationName || "—"}</td>
                      <td className="text-ink-light text-xs">{p.practiceName || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && data.totalElements > 0 && <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} size={data.size} onChange={setPage} />}
        </div>
      )}

      {showAdd && (
        <AddProviderModal
          onClose={() => setShowAdd(false)}
          onCreated={(id) => {
            setShowAdd(false);
            if (id) router.push("/providers/" + id);
            else {
              list.reload();
              summary.reload();
            }
          }}
        />
      )}
    </div>
  );
}
