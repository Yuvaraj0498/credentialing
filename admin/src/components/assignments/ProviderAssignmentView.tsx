"use client";

import { useState } from "react";
import { cleanSearch } from "@/lib/utils";
import { AccessDenied } from "@/components/AlertBox";
import { Avatar } from "@/components/Avatar";
import { ConfirmDialog } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { Pill } from "@/components/Pill";
import { StatCard } from "@/components/StatCard";
import { useShell, useTopic } from "@/stores/shell";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { ROLE_LABEL } from "@/lib/constants";
import { useAsync, useDebounced } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import type { PageResponse } from "@/types";
import { providerStatusLabel, useLocations } from "@/components/providers/shared";
import type { AssignmentSummary, BulkAssignResult, ProviderListItem } from "@/types/providers";
import { AssignProviderToLocationModal } from "@/components/modals/AssignProviderToLocationModal";

const PAGE_SIZE = 50;

/** Prototype ProviderAssignmentView (L14369) with server-side filtering and a single bulk-assign transaction. */
export function ProviderAssignmentView() {
  const { user, can } = useAuth();
  if (!can("update", "provider")) return <AccessDenied action="update" entity="provider" role={user ? ROLE_LABEL[user.role] : undefined} />;
  return <AssignmentScreen />;
}

function AssignmentScreen() {
  const toast = useToast();
  const { publish } = useShell();
  const [filterLocation, setFilterLocation] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkTargetLocation, setBulkTargetLocation] = useState("");
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [assigningOne, setAssigningOne] = useState<ProviderListItem | null>(null);
  const q = useDebounced(search.trim());

  const summary = useAsync(() => api.get<AssignmentSummary>("/providers/assignment-summary"), []);
  const locations = useLocations();
  const list = useAsync(
    () =>
      api.get<PageResponse<ProviderListItem>>("/providers", {
        q,
        page,
        size: PAGE_SIZE,
        sort: "lastName,asc",
        unassigned: filterLocation === "unassigned" ? true : undefined,
        locationId: filterLocation !== "all" && filterLocation !== "unassigned" ? filterLocation : undefined,
      }),
    [q, page, filterLocation]
  );

  const refresh = () => {
    list.reload();
    summary.reload();
  };
  useTopic("providers", refresh);

  const rows = list.data?.content || [];
  const s = summary.data;
  const locs = locations.data || [];
  const allSelected = rows.length > 0 && rows.every((p) => selected.has(p.id));

  const toggleSelected = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) rows.forEach((p) => next.delete(p.id));
      else rows.forEach((p) => next.add(p.id));
      return next;
    });

  const applyBulk = () => {
    if (selected.size === 0) return toast("No providers selected", "warn");
    if (!bulkTargetLocation) return toast("Pick a target location", "warn");
    setConfirmBulk(true);
  };

  const targetLoc = bulkTargetLocation && bulkTargetLocation !== "__unassign" ? locs.find((l) => String(l.id) === bulkTargetLocation) : null;

  const doBulk = async () => {
    setBulkBusy(true);
    try {
      const res = await api.post<BulkAssignResult>("/providers/bulk-assign", {
        providerIds: Array.from(selected),
        locationId: bulkTargetLocation === "__unassign" ? null : Number(bulkTargetLocation),
      });
      toast("Updated " + res.updated + " provider(s)");
      setSelected(new Set());
      setBulkTargetLocation("");
      setConfirmBulk(false);
      publish("providers");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Provider Assignments" subtitle="Link providers to organization practice locations. Supports single and bulk reassignment." />

      {/* Location summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Providers" value={s ? s.total : "—"} sub="All assignments" icon="Users" color="var(--accent)" />
        <StatCard label="Assigned" value={s ? s.assigned : "—"} sub="To a location" icon="MapPin" color="var(--success)" />
        <StatCard label="Unassigned" value={s ? s.unassigned : "—"} sub="Need location" icon="AlertTriangle" color="var(--warn)" emphasize={!!s && s.unassigned > 0} />
        <StatCard label="Locations" value={s ? s.locations : "—"} sub="Available" icon="Building2" color="var(--info)" />
      </div>
      {summary.error && (
        <div className="text-xs mb-3" style={{ color: "var(--danger)" }}>
          {summary.error} <button className="underline" onClick={summary.reload}>Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs" style={{ minWidth: 200 }}>
          <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(cleanSearch(e.target.value));
              setPage(0);
            }}
            placeholder="Search name, NPI, specialty..."
            className="input"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <select
          value={filterLocation}
          onChange={(e) => {
            setFilterLocation(e.target.value);
            setPage(0);
          }}
          className="input"
          style={{ minWidth: 240, width: "auto" }}
        >
          <option value="all">All providers ({s?.total ?? "…"})</option>
          <option value="unassigned">Unassigned ({s?.unassigned ?? "…"})</option>
          {(s?.byLocation || []).map((l) => (
            <option key={l.locationId} value={l.locationId}>
              {l.locationName} ({l.count})
            </option>
          ))}
        </select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="card card-pad mb-4" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
          <div className="flex items-center gap-3 flex-wrap">
            <Icon name="CheckSquare" size={16} className="text-accent" />
            <span className="text-sm font-semibold">{selected.size} selected</span>
            <select value={bulkTargetLocation} onChange={(e) => setBulkTargetLocation(e.target.value)} className="input" style={{ minWidth: 240, flex: "0 1 auto", width: "auto" }}>
              <option value="">— Assign to location —</option>
              <option value="__unassign">(Unassign)</option>
              {locs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.legalName || ""}
                </option>
              ))}
            </select>
            <button onClick={applyBulk} disabled={!bulkTargetLocation || bulkBusy} className="btn btn-primary">
              <Icon name="Check" size={13} /> Apply to {selected.size}
            </button>
            <button onClick={() => setSelected(new Set())} className="btn btn-ghost">Clear</button>
          </div>
        </div>
      )}

      {/* Providers table */}
      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : (
        <div className="card overflow-hidden">
          {list.loading && !list.data ? (
            <Loading />
          ) : rows.length === 0 ? (
            <EmptyState icon="Users" title="No providers match" />
          ) : (
            <div className="table-scroll" style={{ opacity: list.loading ? 0.6 : 1 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all on this page" />
                    </th>
                    <th>Provider</th>
                    <th>NPI</th>
                    <th>Specialty</th>
                    <th>Current Location</th>
                    <th>Practice</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const loc = locs.find((l) => l.id === p.locationId);
                    return (
                      <tr key={p.id} style={{ background: selected.has(p.id) ? "var(--accent-soft)" : "transparent" }}>
                        <td>
                          <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelected(p.id)} aria-label={"Select " + p.firstName + " " + p.lastName} />
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Avatar name={p.firstName + " " + p.lastName} size={28} />
                            <div>
                              <div className="text-sm font-medium">
                                {p.firstName} {p.lastName}
                                {p.suffix ? ", " + p.suffix : ""}
                              </div>
                              <div className="text-[10px] text-ink-light">{providerStatusLabel(p.status) || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="font-mono text-xs">{p.npi || "—"}</td>
                        <td className="text-xs">{p.specialty || "—"}</td>
                        <td>
                          {p.locationId ? (
                            <div className="flex items-center gap-1.5">
                              <Icon name="MapPin" size={11} className="text-success" style={{ color: "var(--success)" }} />
                              <span className="text-sm">{p.locationName || loc?.name}</span>
                            </div>
                          ) : (
                            <Pill type="warn">Unassigned</Pill>
                          )}
                        </td>
                        <td className="text-xs text-ink-light">{loc?.legalName || "—"}</td>
                        <td className="text-right">
                          <button onClick={() => setAssigningOne(p)} className="btn btn-ghost text-xs">
                            <Icon name="MapPin" size={11} /> Reassign
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} totalElements={list.data.totalElements} size={list.data.size} onChange={setPage} />}
        </div>
      )}

      {assigningOne && (
        <AssignProviderToLocationModal
          provider={assigningOne}
          locations={locations.data}
          onClose={() => setAssigningOne(null)}
          onSaved={() => {
            setAssigningOne(null);
            publish("providers");
          }}
        />
      )}
      {confirmBulk && (
        <ConfirmDialog
          title="Apply bulk assignment?"
          message={"Assign " + selected.size + " provider(s) to " + (targetLoc?.name || "Unassigned") + "?"}
          confirmLabel={"Apply to " + selected.size}
          danger={false}
          busy={bulkBusy}
          onConfirm={doBulk}
          onClose={() => setConfirmBulk(false)}
        />
      )}
    </div>
  );
}

