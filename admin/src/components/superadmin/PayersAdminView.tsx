"use client";

import { useState } from "react";
import { Pagination } from "@/components/Pagination";
import { useGridColumns } from "@/lib/useFitRows";

/** rows of payer cards on a page */
const ROWS_PER_PAGE = 4;
import { AsyncBoundary } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { PayerLogo } from "@/components/payers/PayerLogo";
import { integrationLabel, PayerFormModal } from "@/components/payers/PayerFormModal";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { matchesSearch } from "@/lib/search";
import { cleanSearch } from "@/lib/utils";
import type { Payer } from "@/types/enrollments";


/** Super admin → Payers: every payer as a card on one page; add one with the popup, edit with the pencil on its card. */
export function PayersAdminView() {
  const payers = useAsync<Payer[]>(() => api.get<Payer[]>("/platform/payers"), []);
  const [editing, setEditing] = useState<Payer | "new" | null>(null);
  const [search, setSearch] = useState("");

  const all = payers.data || [];
  const shown = all.filter((p) => matchesSearch(search, p.name, p.fullName, p.category, integrationLabel(p.integration), p.appForm));
  // 4 rows of cards, then the next page (cards per row follow the window width)
  const size = ROWS_PER_PAGE * useGridColumns();
  const [pageWanted, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(shown.length / size));
  const page = Math.min(pageWanted, totalPages - 1);
  const pageItems = shown.slice(page * size, page * size + size);

  return (
    <div>
      <PageHeader
        title="Payers"
        subtitle={payers.data ? (search.trim() ? shown.length + " of " + all.length + " payer(s)" : all.length + " payer(s)") : "Loading…"}
        actions={
          <button onClick={() => setEditing("new")} className="btn btn-primary">
            <Icon name="Plus" size={14} /> Add Payer
          </button>
        }
      />
      <div className="relative mb-4">
        <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
        <input
          value={search}
          onChange={(e) => {
            setSearch(cleanSearch(e.target.value));
            setPage(0);
          }}
          placeholder="Search payer, insurance company, category, integration, form..."
          className="input"
          style={{ paddingLeft: 32 }}
          aria-label="Search payers"
        />
      </div>
      <div>
        <AsyncBoundary loading={payers.loading && !payers.data} error={payers.error} onRetry={payers.reload}>
          {shown.length === 0 ? (
            <div className="card card-pad text-center text-sm text-ink-light py-10">
              {all.length === 0 ? "No payers yet — click “Add Payer”." : "No payers match “" + search.trim() + "”"}
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pageItems.map((p) => (
                <div key={p.id} className="card card-pad">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <PayerLogo name={p.name} color={p.color} logo={p.logo} />
                    <div className="flex items-center gap-1">
                      <Pill type="neutral">{p.category}</Pill>
                      <button onClick={() => setEditing(p)} className="btn-ghost p-1.5 rounded-md text-ink-light hover:text-accent" title={"Edit " + p.name} aria-label={"Edit " + p.name}>
                        <Icon name="Pencil" size={14} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-display font-semibold text-ink truncate" title={p.name}>{p.name}</h3>
                  <p className="text-xs text-ink-light mb-3 truncate" title={p.fullName || ""}>{p.fullName || "—"}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-ink-faint">Avg TAT</span>
                      <span className="font-mono font-semibold">{p.avgTatDays != null ? p.avgTatDays + "d" : "—"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-ink-faint">Integration</span>
                      <span className="font-mono uppercase">{integrationLabel(p.integration)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-ink-faint">Form</span>
                      <span className="text-right truncate" title={p.appForm || ""}>{p.appForm || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-ink-faint">Portal</span>
                      {p.portalAvailable && p.portalUrl ? (
                        <a href={p.portalUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate" title={p.portalUrl}>
                          Login page
                        </a>
                      ) : (
                        <span>{p.portalAvailable ? "Available" : "Not available"}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="card mt-3">
              <Pagination page={page} totalPages={totalPages} totalElements={shown.length} size={size} onChange={setPage} />
            </div>
            </>
          )}
        </AsyncBoundary>
      </div>

      {editing && (
        <PayerFormModal
          payer={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            payers.reload();
          }}
        />
      )}
    </div>
  );
}

