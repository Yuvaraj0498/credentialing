"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AsyncBoundary } from "@/components/AsyncState";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { Pagination } from "@/components/Pagination";
import { StatCard } from "@/components/StatCard";
import { StatusPill } from "@/components/Pill";
import { useTopic } from "@/stores/shell";
import { api } from "@/lib/api";
import { fmtDate, fmtTs, cleanSearch } from "@/lib/utils";
import { useAsync, useDebounced } from "@/lib/hooks";
import type { PageResponse } from "@/types";
import { EnrollmentHistory } from "./EnrollmentHistory";
import type { Enrollment, EnrollmentSummary } from "@/types/credentialing";

const PAGE_SIZE = 25;

export function EnrollmentStatusView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get("eid") ? Number(params.get("eid")) : null;

  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);

  const list = useAsync(
    () => api.get<PageResponse<Enrollment>>("/enrollments", { q, status: statusFilter, page, size: PAGE_SIZE, sort: "updatedAt,desc" }),
    [q, statusFilter, page]
  );
  const summary = useAsync(() => api.get<EnrollmentSummary>("/enrollments/summary"), []);
  useTopic("enrollments", () => {
    list.reload();
    summary.reload();
  });

  const select = (id: number | null) => {
    const sp = new URLSearchParams(params.toString());
    if (id == null) sp.delete("eid");
    else sp.set("eid", String(id));
    router.push(pathname + "?" + sp.toString(), { scroll: false });
  };

  if (selectedId) {
    return (
      <EnrollmentHistory
        enrollmentId={selectedId}
        onBack={() => select(null)}
        onChanged={() => {
          list.reload();
          summary.reload();
        }}
      />
    );
  }

  const bs = summary.data?.byStatus;
  const stats = {
    in_progress: bs?.in_progress ?? 0,
    submitted: bs?.submitted ?? 0,
    approved: bs?.approved ?? 0,
    needs_attention: bs?.needs_attention ?? 0,
    terminated: bs?.terminated ?? 0,
  };
  const rows = list.data?.content ?? [];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard label="In Progress" value={stats.in_progress} sub="Active" icon="Loader" color="var(--accent)" />
        <StatCard label="Submitted" value={stats.submitted} sub="With payer" icon="Send" color="var(--info)" />
        <StatCard label="Approved" value={stats.approved} sub="In network" icon="CheckCircle2" color="var(--success)" />
        <StatCard label="Needs Attention" value={stats.needs_attention} sub="Action needed" icon="AlertCircle" color="var(--danger)" emphasize={stats.needs_attention > 0} />
        <StatCard label="Terminated" value={stats.terminated} sub="Off network" icon="XCircle" color="var(--ink-light)" />
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs" style={{ minWidth: 200 }}>
          <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
          <input value={search} onChange={(e) => { setSearch(cleanSearch(e.target.value)); setPage(0); }} placeholder="Search provider, payer..." className="input" style={{ paddingLeft: 32 }} />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="input" style={{ width: 180 }}>
          <option value="all">All statuses</option>
          <option value="draft">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="needs_attention">Needs Attention</option>
          <option value="on_hold">On Hold</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <AsyncBoundary loading={list.loading && !list.data} error={list.error} onRetry={list.reload}>
          {rows.length === 0 ? (
            <EmptyState icon="ClipboardList" title="No enrollments match" />
          ) : (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Provider</th><th>Payer</th><th>Status</th><th>Submitted</th><th>Effective</th><th>TAT</th><th>Last Activity</th><th className="text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((e) => (
                      <tr key={e.id} className="cursor-pointer" onClick={() => select(e.id)}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Avatar name={e.providerName} size={26} />
                            <Link href={`/providers/${e.providerId}`} onClick={(ev) => ev.stopPropagation()} className="font-medium hover:underline">{e.providerName}</Link>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: e.payerColor }}></div>
                            <span>{e.payerName}</span>
                          </div>
                        </td>
                        <td><StatusPill status={e.status} /></td>
                        <td className="text-xs text-ink-light">{e.submittedDate ? fmtDate(e.submittedDate) : "—"}</td>
                        <td className="text-xs text-ink-light">{e.effectiveDate ? fmtDate(e.effectiveDate) : "—"}</td>
                        <td className="font-mono text-xs">{e.tatDays != null ? e.tatDays + " days" : "—"}</td>
                        <td className="text-xs text-ink-light">{e.lastActivityAt ? fmtTs(e.lastActivityAt) : "—"}</td>
                        <td className="text-right">
                          <button className="btn btn-ghost text-xs"><Icon name="History" size={11} /> History ({e.eventCount})</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {list.data && (
                <Pagination page={list.data.page} totalPages={list.data.totalPages} totalElements={list.data.totalElements} size={list.data.size} onChange={setPage} />
              )}
            </>
          )}
        </AsyncBoundary>
      </div>
    </div>
  );
}
