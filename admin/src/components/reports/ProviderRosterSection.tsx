"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { Pagination } from "@/components/Pagination";
import { Pill, StatusPill } from "@/components/Pill";
import { ProgressBar } from "@/components/ProgressBar";
import { useTopic } from "@/stores/shell";
import { api, errorMessage } from "@/lib/api";
import { fmtDate, todayISO, cleanSearch } from "@/lib/utils";
import { useAsync, useDebounced } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import type { PageResponse } from "@/types";
import { DocumentStatusGrid } from "./DocumentStatusGrid";
import { esc, openPrintWindow, writePrintWindow } from "@/lib/export";
import type { DocumentStatusReport, ReappointmentReport, RosterRow } from "@/types/reports";

type ColumnId = "name" | "specialty" | "status" | "docs" | "email" | "npi" | "caqh" | "location" | "practice" | "license" | "deaExpires" | "dateAdded";

const ALL_COLUMNS: { id: ColumnId; label: string; default: boolean }[] = [
  { id: "name", label: "Provider", default: true },
  { id: "specialty", label: "Specialty", default: true },
  { id: "status", label: "Status", default: true },
  { id: "docs", label: "Required Documents", default: true },
  { id: "email", label: "Email", default: true },
  { id: "npi", label: "NPI", default: true },
  { id: "caqh", label: "CAQH #", default: false },
  { id: "location", label: "Location", default: true },
  { id: "practice", label: "Practice", default: true },
  { id: "license", label: "License", default: false },
  { id: "deaExpires", label: "DEA Expires", default: false },
  { id: "dateAdded", label: "Date Added", default: false },
];

const COLS_KEY = "zc_roster_columns";
const PAGE_SIZE = 25;

type SubTab = "roster" | "checklist" | "docStatus" | "reappt";

function loadVisibleCols(): Set<ColumnId> {
  const defaults = new Set(ALL_COLUMNS.filter((c) => c.default).map((c) => c.id));
  try {
    const raw = localStorage.getItem(COLS_KEY);
    if (!raw) return defaults;
    const ids = (JSON.parse(raw) as string[]).filter((id): id is ColumnId => ALL_COLUMNS.some((c) => c.id === id));
    return ids.length ? new Set(ids) : defaults;
  } catch {
    return defaults;
  }
}

function saveVisibleCols(cols: Set<ColumnId>) {
  try {
    localStorage.setItem(COLS_KEY, JSON.stringify([...cols]));
  } catch {
    /* storage unavailable */
  }
}

const licenseText = (p: RosterRow) => (p.licenseNumber ? p.licenseNumber + (p.licenseState ? " (" + p.licenseState + ")" : "") : "—");

export function ProviderRosterSection() {
  const toast = useToast();
  const [tab, setTab] = useState<SubTab>("roster");
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ field: ColumnId; dir: "asc" | "desc" }>({ field: "name", dir: "asc" });
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<ColumnId>>(loadVisibleCols);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const sortParam = sort.field + "," + sort.dir;
  const roster = useAsync(
    tab === "roster" ? () => api.get<PageResponse<RosterRow>>("/reports/provider-roster", { q, page, size: PAGE_SIZE, sort: sortParam }) : null,
    [tab, q, page, sortParam]
  );
  const docTabs = tab === "checklist" || tab === "docStatus";
  const docStatus = useAsync(docTabs ? () => api.get<DocumentStatusReport>("/reports/document-status", { q }) : null, [docTabs, q]);
  const reappt = useAsync(tab === "reappt" ? () => api.get<ReappointmentReport>("/reports/reappointments", { q }) : null, [tab, q]);
  useTopic("providers", () => {
    if (tab === "roster") roster.reload();
    else if (docTabs) docStatus.reload();
    else reappt.reload();
  });

  const toggleSort = (field: ColumnId) => {
    setSort((s) => (s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" }));
    setPage(0);
  };

  const handleExportExcel = async () => {
    setExporting("csv");
    try {
      await api.download("/reports/provider-roster/export.csv", { q, sort: sortParam }, "provider-roster-" + todayISO() + ".csv");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    const win = openPrintWindow();
    if (!win) {
      toast("Allow pop-ups to export the PDF", "error");
      return;
    }
    win.document.write("<p style='font-family:sans-serif;padding:32px'>Preparing report…</p>");
    setExporting("pdf");
    try {
      const rows: RosterRow[] = [];
      for (let p = 0; ; p++) {
        const res = await api.get<PageResponse<RosterRow>>("/reports/provider-roster", { q, page: p, size: 500, sort: sortParam });
        rows.push(...res.content);
        if (p >= res.totalPages - 1) break;
      }
      let html = "<h1>Provider Roster</h1><p>Generated " + esc(new Date().toLocaleString()) + " · " + rows.length + " providers</p>";
      html += "<table><thead><tr><th>Provider</th><th>Specialty</th><th>Status</th><th>Docs</th><th>NPI</th><th>Location</th></tr></thead><tbody>";
      rows.forEach((p) => {
        const statusClass = p.status === "active" ? "pill-success" : p.status === "draft" ? "pill-warn" : "pill-info";
        html += "<tr><td><strong>" + esc(p.firstName + " " + p.lastName) + "</strong></td>";
        html += "<td>" + esc(p.specialty || "—") + "</td>";
        html += "<td><span class='pill " + statusClass + "'>" + esc(p.status) + "</span></td>";
        html += "<td>" + p.docsApproved + "/" + p.docsTotal + "</td>";
        html += "<td>" + esc(p.npi || "—") + "</td>";
        html += "<td>" + esc(p.locationName || "—") + "</td></tr>";
      });
      html += "</tbody></table>";
      writePrintWindow(win, "Provider Roster", html);
    } catch (e) {
      win.close();
      toast(errorMessage(e), "error");
    } finally {
      setExporting(null);
    }
  };

  const tabs: { id: SubTab; label: string }[] = [
    { id: "roster", label: "Provider Roster" },
    { id: "checklist", label: "Provider Checklist" },
    { id: "docStatus", label: "Document Status" },
    { id: "reappt", label: "Reappointment Tracking" },
  ];

  const cols = ALL_COLUMNS.filter((c) => visibleCols.has(c.id));
  const noResults = (
    <EmptyState icon="Users" title="No providers found" description={q ? "No providers match “" + q + "”." : "Add providers to see them in this report."} />
  );

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between flex-wrap gap-3 p-5 border-b border-line">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">Provider Roster</h3>
          <p className="text-xs text-ink-light mt-1">View all providers with their credentialing progress and document compliance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel} disabled={!!exporting} className="btn btn-secondary">
            {exporting === "csv" ? <span className="loader" /> : <Icon name="Download" size={13} />} Excel
          </button>
          <button onClick={handleExportPDF} disabled={!!exporting} className="btn btn-primary">
            {exporting === "pdf" ? <span className="loader" style={{ borderTopColor: "white" }} /> : <Icon name="FileText" size={13} />} PDF
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1 px-5 pt-3 border-b border-line overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={"px-4 py-2 text-xs font-medium whitespace-nowrap " + (tab === t.id ? "text-accent border-b-2 border-accent" : "text-ink-light hover:text-ink")}>{t.label}</button>
        ))}
      </div>
      <div className="px-5 py-3 flex items-center gap-2 border-b border-line relative">
        <div className="relative flex-1 max-w-xs">
          <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(cleanSearch(e.target.value));
              setPage(0);
            }}
            placeholder="Search by name, NPI, specialty..."
            className="input"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <div className="relative">
          <button onClick={() => setColumnsOpen(!columnsOpen)} className="btn btn-secondary text-xs"><Icon name="Columns" size={12} /> Columns ({visibleCols.size}/{ALL_COLUMNS.length}) <Icon name="ChevronDown" size={11} /></button>
          {columnsOpen && (
            <div className="absolute top-full right-0 mt-1 card p-3 z-10 slide-up" style={{ minWidth: 220, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
              <div className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-2">Visible Columns</div>
              {ALL_COLUMNS.map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-soft px-1 rounded">
                  <input
                    type="checkbox"
                    checked={visibleCols.has(c.id)}
                    onChange={(e) => {
                      const next = new Set(visibleCols);
                      if (e.target.checked) next.add(c.id);
                      else next.delete(c.id);
                      setVisibleCols(next);
                      saveVisibleCols(next);
                    }}
                  />
                  <span className="text-xs">{c.label}</span>
                </label>
              ))}
              <button onClick={() => setColumnsOpen(false)} className="text-xs text-accent mt-2 hover:underline">Done</button>
            </div>
          )}
        </div>
      </div>

      {tab === "roster" && (
        <div className="p-0">
          {roster.error && !roster.data ? (
            <div className="p-5"><ErrorState message={roster.error} onRetry={roster.reload} /></div>
          ) : roster.loading && !roster.data ? (
            <Loading />
          ) : roster.data && roster.data.content.length === 0 ? (
            noResults
          ) : roster.data ? (
            <>
              <div className="overflow-x-auto" style={{ opacity: roster.loading ? 0.6 : 1 }}>
                <table>
                  <thead>
                    <tr>
                      {cols.map((c) => (
                        <th key={c.id} onClick={() => toggleSort(c.id)} className="cursor-pointer select-none whitespace-nowrap">
                          {c.label}
                          {sort.field === c.id && <Icon name={sort.dir === "asc" ? "ChevronUp" : "ChevronDown"} size={10} className="ml-1" />}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roster.data.content.map((p) => (
                      <tr key={p.providerId}>
                        {visibleCols.has("name") && <td><Link href={"/providers/" + p.providerId} className="font-medium text-accent">{p.firstName} {p.lastName}</Link></td>}
                        {visibleCols.has("specialty") && <td className="text-ink-light text-xs">{p.specialty || "—"}</td>}
                        {visibleCols.has("status") && <td><StatusPill status={p.statusKey} /></td>}
                        {visibleCols.has("docs") && <td><ProgressBar filled={p.docsApproved} total={p.docsTotal} /></td>}
                        {visibleCols.has("email") && <td className="text-ink-light text-xs">{p.email || "—"}</td>}
                        {visibleCols.has("npi") && <td className="font-mono text-xs text-ink-light">{p.npi || "—"}</td>}
                        {visibleCols.has("caqh") && <td className="font-mono text-xs text-ink-light">{p.caqhId || "—"}</td>}
                        {visibleCols.has("location") && <td className="text-ink-light text-xs">{p.locationName || "—"}</td>}
                        {visibleCols.has("practice") && <td className="text-ink-light text-xs">{p.practiceName || "—"}</td>}
                        {visibleCols.has("license") && <td className="font-mono text-xs text-ink-light">{licenseText(p)}</td>}
                        {visibleCols.has("deaExpires") && <td className="text-xs text-ink-light">{p.deaExpires ? fmtDate(p.deaExpires) : "—"}</td>}
                        {visibleCols.has("dateAdded") && <td className="text-xs text-ink-light">{p.dateAdded ? fmtDate(p.dateAdded) : "—"}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={roster.data.page} totalPages={roster.data.totalPages} totalElements={roster.data.totalElements} size={roster.data.size} onChange={setPage} />
            </>
          ) : null}
        </div>
      )}

      {tab === "checklist" && (
        <SubTabBody state={docStatus} empty={noResults} isEmpty={(d) => d.providers.length === 0}>
          {(d) => (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Provider</th>
                    {d.docTypes.map((dt) => (
                      <th key={dt.docType} title={dt.label}>{dt.label.slice(0, 8)}{dt.label.length > 8 ? "..." : ""}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.providers.map((p) => (
                    <tr key={p.providerId}>
                      <td><Link href={"/providers/" + p.providerId} className="font-medium">{p.name}</Link></td>
                      {d.docTypes.map((dt) => {
                        const s = p.statuses[dt.docType] || "missing";
                        return (
                          <td key={dt.docType} className="text-center" title={dt.label + ": " + s.replace("_", " ")}>
                            <Icon
                              name={s === "approved" ? "CheckCircle2" : s === "na" ? "MinusCircle" : s === "expired" ? "XCircle" : "Circle"}
                              size={14}
                              style={{ color: s === "approved" ? "var(--success)" : s === "expired" ? "var(--danger)" : "var(--ink-faint)" }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SubTabBody>
      )}

      {tab === "docStatus" && (
        <SubTabBody state={docStatus} empty={noResults} isEmpty={() => false}>
          {(d) => (
            <div className="p-5">
              <DocumentStatusGrid data={d} />
            </div>
          )}
        </SubTabBody>
      )}

      {tab === "reappt" && (
        <SubTabBody state={reappt} empty={noResults} isEmpty={(d) => d.rows.length === 0}>
          {(d) => (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Provider</th><th>Last Credentialed</th><th>Next Reappointment</th><th>Status</th><th>Days Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((r) => (
                    <tr key={r.providerId}>
                      <td><Link href={"/providers/" + r.providerId} className="font-medium">{r.name}</Link></td>
                      <td className="text-xs text-ink-light">{fmtDate(r.lastCredentialed)}</td>
                      <td className="text-xs text-ink-light">{fmtDate(r.nextReappointment)}</td>
                      <td>
                        <Pill type={r.status === "overdue" ? "danger" : r.status === "due_soon" ? "warn" : r.status === "current" ? "success" : "neutral"}>{r.statusLabel}</Pill>
                      </td>
                      <td className="font-mono text-xs">{r.daysLeft !== null ? r.daysLeft + " days" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SubTabBody>
      )}
    </div>
  );
}

function SubTabBody<T>({
  state,
  empty,
  isEmpty,
  children,
}: {
  state: { data: T | undefined; loading: boolean; error: string | null; reload: () => Promise<void> };
  empty: React.ReactNode;
  isEmpty: (d: T) => boolean;
  children: (d: T) => React.ReactNode;
}) {
  if (state.error && !state.data) {
    return (
      <div className="p-5">
        <ErrorState message={state.error} onRetry={state.reload} />
      </div>
    );
  }
  if (!state.data) return <Loading />;
  if (isEmpty(state.data)) return <>{empty}</>;
  return <div style={{ opacity: state.loading ? 0.6 : 1 }}>{children(state.data)}</div>;
}
